"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { compareInteractionSchema, compareSessionStartSchema } from "@/lib/auth/validation";
import { COMPARE_INTERACTION_CATEGORIES, COMPARE_INTERACTION_LABELS } from "@/lib/compare/prompt";
import { buildConceptRelationshipPairKey, orderConceptRelationshipPair } from "@/lib/compare/relationships";
import { generateConceptComparisonQuestions } from "@/lib/llm/generate-concept-comparison-questions";
import { type CompareInteractionState, type PersistedCompareGeneratedInteraction } from "@/lib/compare/session-state";
import { gradeConceptComparison } from "@/lib/llm/grade-concept-comparison";
import { type LlmCallFailureReason } from "@/lib/llm/result";
import { assertCanUseLlm, LlmDailyLimitExceededError, logLlmUsage } from "@/lib/llm/usage-limit";
import { prisma } from "@/lib/prisma";

function buildErrorState(
  previousState: CompareInteractionState,
  errorCode: CompareInteractionState["errorCode"],
  draftAnswer: string,
): CompareInteractionState {
  return {
    ...previousState,
    status: "error",
    draftAnswer,
    errorCode,
  };
}

function mapComparisonFailureReasonToErrorCode(
  reason: LlmCallFailureReason,
):
  | "compare_timeout"
  | "compare_provider_http_error"
  | "compare_invalid_response"
  | "compare_network_error" {
  if (reason === "timeout") {
    return "compare_timeout";
  }

  if (reason === "http_error") {
    return "compare_provider_http_error";
  }

  if (reason === "invalid_response") {
    return "compare_invalid_response";
  }

  return "compare_network_error";
}

function mapCompareGenerationFailureReasonToErrorCode(
  reason: LlmCallFailureReason,
): "compare_timeout" | "compare_provider_http_error" | "compare_invalid_response" | "compare_network_error" {
  return mapComparisonFailureReasonToErrorCode(reason);
}

async function persistCompareRelationshipSession(input: {
  subjectId: string;
  sourceConceptId: string;
  targetConceptId: string;
  rationale: string | null;
  interactions: Array<{
    category: PersistedCompareGeneratedInteraction["category"];
    label: string;
    question: string;
  }>;
}): Promise<{
  relationshipId: string;
  interactions: PersistedCompareGeneratedInteraction[];
}> {
  const [conceptAId, conceptBId] = orderConceptRelationshipPair(input.sourceConceptId, input.targetConceptId);
  const pairKey = buildConceptRelationshipPairKey(input.sourceConceptId, input.targetConceptId);

  return prisma.$transaction(async (tx) => {
    const relationship = await tx.conceptRelationship.upsert({
      where: {
        pairKey,
      },
      create: {
        subjectId: input.subjectId,
        conceptAId,
        conceptBId,
        pairKey,
        rationale: input.rationale,
      },
      update: {
        subjectId: input.subjectId,
        conceptAId,
        conceptBId,
        rationale: input.rationale,
      },
      select: {
        id: true,
      },
    });

    const existingPrompts = await tx.conceptRelationshipPrompt.findMany({
      where: {
        relationshipId: relationship.id,
      },
      select: {
        id: true,
        category: true,
        prompt: true,
      },
    });

    const existingPromptByCategory = new Map(existingPrompts.map((prompt) => [prompt.category, prompt]));
    const missingInteractions = input.interactions.filter((interaction) => !existingPromptByCategory.has(interaction.category));

    const createdPrompts = await Promise.all(
      missingInteractions.map((interaction) =>
        tx.conceptRelationshipPrompt.upsert({
          where: {
            relationshipId_category: {
              relationshipId: relationship.id,
              category: interaction.category,
            },
          },
          create: {
            relationshipId: relationship.id,
            category: interaction.category,
            prompt: interaction.question,
          },
          update: {},
          select: {
            id: true,
            category: true,
            prompt: true,
          },
        }),
      ),
    );

    const promptByCategory = new Map([...existingPrompts, ...createdPrompts].map((prompt) => [prompt.category, prompt]));

    return {
      relationshipId: relationship.id,
      interactions: COMPARE_INTERACTION_CATEGORIES.map((category) => {
        const prompt = promptByCategory.get(category);

        if (!prompt) {
          throw new Error(`Missing persisted compare prompt for category ${category}.`);
        }

        return {
          promptId: prompt.id,
          category,
          label: COMPARE_INTERACTION_LABELS[category],
          question: prompt.prompt,
        };
      }),
    };
  });
}

type StartCompareSessionResult =
  | {
      status: "success";
      relationshipId: string;
      relatedConcept: {
        id: string;
        title: string;
      };
      interactions: PersistedCompareGeneratedInteraction[];
    }
  | {
      status: "no_match";
      message: string;
    }
  | {
      status: "error";
      errorCode: "compare_timeout" | "compare_provider_http_error" | "compare_invalid_response" | "compare_network_error" | "llm_daily_limit_reached" | "compare_save_failed";
    };

export async function startCompareSessionAction(input: { sourceConceptId: string }): Promise<StartCompareSessionResult> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = compareSessionStartSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      errorCode: "compare_save_failed",
    };
  }

  const sourceConcept = await prisma.concept.findFirst({
    where: {
      id: parsed.data.sourceConceptId,
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      nodeId: true,
      node: {
        select: {
          id: true,
          title: true,
          level: true,
        },
      },
    },
  });

  if (!sourceConcept) {
    return {
      status: "error",
      errorCode: "compare_save_failed",
    };
  }

  const candidates = await prisma.concept.findMany({
    where: {
      userId: session.user.id,
      nodeId: sourceConcept.nodeId,
      id: {
        not: sourceConcept.id,
      },
    },
    orderBy: {
      title: "asc",
    },
    select: {
      id: true,
      title: true,
    },
  });

  if (candidates.length === 0) {
    return {
      status: "no_match",
      message: "Add another concept to this subject to enable compare mode.",
    };
  }

  try {
    await assertCanUseLlm(session.user.id);
  } catch (error) {
    if (error instanceof LlmDailyLimitExceededError) {
      return {
        status: "error",
        errorCode: "llm_daily_limit_reached",
      };
    }

    return {
      status: "error",
      errorCode: "compare_save_failed",
    };
  }

  const result = await generateConceptComparisonQuestions({
    sourceConcept: sourceConcept.title,
    candidates,
    context: [
      {
        id: sourceConcept.node.id,
        title: sourceConcept.node.title,
        level: sourceConcept.node.level,
      },
    ],
  });

  if (!result.ok) {
    return {
      status: "error",
      errorCode: mapCompareGenerationFailureReasonToErrorCode(result.reason),
    };
  }

  try {
    await logLlmUsage(session.user.id, "QUESTION_GENERATION");
  } catch {
    return {
      status: "error",
      errorCode: "compare_save_failed",
    };
  }

  if (!result.value) {
    return {
      status: "no_match",
      message: `No strong comparison relationship was found for ${sourceConcept.title} in this subject.`,
    };
  }

  let persistedSession: {
    relationshipId: string;
    interactions: PersistedCompareGeneratedInteraction[];
  };

  try {
    persistedSession = await persistCompareRelationshipSession({
      subjectId: sourceConcept.nodeId,
      sourceConceptId: sourceConcept.id,
      targetConceptId: result.value.relatedConcept.id,
      rationale: result.value.rationale,
      interactions: result.value.interactions,
    });
  } catch {
    return {
      status: "error",
      errorCode: "compare_save_failed",
    };
  }

  return {
    status: "success",
    relationshipId: persistedSession.relationshipId,
    relatedConcept: result.value.relatedConcept,
    interactions: persistedSession.interactions,
  };
}

export async function runCompareInteractionAction(
  previousState: CompareInteractionState,
  formData: FormData,
): Promise<CompareInteractionState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = compareInteractionSchema.safeParse({
    sourceConceptId: formData.get("sourceConceptId"),
    targetConceptId: formData.get("targetConceptId"),
    relationshipId: formData.get("relationshipId"),
    promptId: formData.get("promptId"),
    category: formData.get("category"),
    answer: formData.get("answer") || undefined,
    from: formData.get("from") || undefined,
  });

  const draftAnswer = typeof formData.get("answer") === "string" ? String(formData.get("answer")) : previousState.draftAnswer;

  if (!parsed.success) {
    return buildErrorState(previousState, "compare_save_failed", draftAnswer);
  }

  if (parsed.data.sourceConceptId === parsed.data.targetConceptId) {
    return buildErrorState(previousState, "compare_save_failed", draftAnswer);
  }

  const [sourceConcept, targetConcept] = await Promise.all([
    prisma.concept.findFirst({
      where: {
        id: parsed.data.sourceConceptId,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        nodeId: true,
        node: {
          select: {
            id: true,
            title: true,
            level: true,
          },
        },
      },
    }),
    prisma.concept.findFirst({
      where: {
        id: parsed.data.targetConceptId,
        userId: session.user.id,
      },
      select: {
        id: true,
        title: true,
        nodeId: true,
      },
    }),
  ]);

  if (!sourceConcept || !targetConcept || sourceConcept.nodeId !== targetConcept.nodeId) {
    return buildErrorState(previousState, "compare_save_failed", draftAnswer);
  }

  const pairKey = buildConceptRelationshipPairKey(sourceConcept.id, targetConcept.id);

  const relationship = await prisma.conceptRelationship.findUnique({
    where: {
      pairKey,
    },
    select: {
      id: true,
      prompts: {
        where: {
          id: parsed.data.promptId,
        },
        select: {
          id: true,
          category: true,
          prompt: true,
        },
      },
    },
  });

  if (!relationship || relationship.id !== parsed.data.relationshipId) {
    return buildErrorState(previousState, "compare_save_failed", draftAnswer);
  }

  const persistedPrompt = relationship.prompts[0];

  if (!persistedPrompt || persistedPrompt.category !== parsed.data.category) {
    return buildErrorState(previousState, "compare_save_failed", draftAnswer);
  }

  const trimmedAnswer = draftAnswer.trim();

  if (trimmedAnswer.length === 0) {
    return buildErrorState(previousState, "compare_save_failed", draftAnswer);
  }

  try {
    await assertCanUseLlm(session.user.id);
  } catch (error) {
    if (error instanceof LlmDailyLimitExceededError) {
      return buildErrorState(previousState, "llm_daily_limit_reached", trimmedAnswer);
    }

    return buildErrorState(previousState, "compare_save_failed", trimmedAnswer);
  }

  const result = await gradeConceptComparison({
    sourceConcept: sourceConcept.title,
    targetConcept: targetConcept.title,
    answer: trimmedAnswer,
    prompt: persistedPrompt.prompt,
    context: [
      {
        id: sourceConcept.node.id,
        title: sourceConcept.node.title,
        level: sourceConcept.node.level,
      },
    ],
  });

  if (!result.ok) {
    return buildErrorState(previousState, mapComparisonFailureReasonToErrorCode(result.reason), trimmedAnswer);
  }

  try {
    await logLlmUsage(session.user.id, "GRADE");
  } catch {
    return buildErrorState(previousState, "compare_save_failed", trimmedAnswer);
  }

  const answeredAt = new Date();

  try {
    await prisma.conceptRelationshipAttempt.create({
      data: {
        userId: session.user.id,
        relationshipId: relationship.id,
        promptId: persistedPrompt.id,
        category: persistedPrompt.category,
        prompt: persistedPrompt.prompt,
        userAnswer: trimmedAnswer,
        llmScore: result.value.score,
        llmFeedback: result.value.feedback,
        llmCorrection: result.value.correction,
        answeredAt,
      },
      select: {
        id: true,
      },
    });
  } catch {
    return buildErrorState(previousState, "compare_save_failed", trimmedAnswer);
  }

  return {
    status: "submitted",
    draftAnswer: trimmedAnswer,
    submittedAnswer: trimmedAnswer,
    feedback: {
      llmScore: result.value.score,
      llmFeedback: result.value.feedback,
      llmCorrection: result.value.correction,
      answeredAtIso: answeredAt.toISOString(),
    },
    errorCode: null,
  };
}
