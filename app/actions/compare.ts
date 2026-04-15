"use server";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { compareInteractionSchema, compareSessionStartSchema } from "@/lib/auth/validation";
import { generateConceptComparisonQuestions } from "@/lib/llm/generate-concept-comparison-questions";
import { type CompareInteractionState } from "@/lib/compare/session-state";
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

type StartCompareSessionResult =
  | {
      status: "success";
      relatedConcept: {
        id: string;
        title: string;
      };
      interactions: import("@/lib/compare/session-state").CompareGeneratedInteraction[];
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

  return {
    status: "success",
    relatedConcept: result.value.relatedConcept,
    interactions: result.value.interactions,
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
    prompt: formData.get("prompt"),
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
    prompt: parsed.data.prompt,
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

  return {
    status: "submitted",
    draftAnswer: trimmedAnswer,
    submittedAnswer: trimmedAnswer,
    feedback: {
      llmScore: result.value.score,
      llmFeedback: result.value.feedback,
      llmCorrection: result.value.correction,
      answeredAtIso: new Date().toISOString(),
    },
    errorCode: null,
  };
}
