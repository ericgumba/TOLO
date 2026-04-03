"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  generatedNodeQuestionAddSchema,
  questionCreateSchema,
  questionDeleteSchema,
  questionGenerateSchema,
  questionSettingsSchema,
} from "@/lib/auth/validation";
import { generateQuestionsForNode } from "@/lib/llm/generate-questions";
import { type LlmCallFailureReason } from "@/lib/llm/result";
import { assertCanUseLlm, LlmDailyLimitExceededError, logLlmUsage } from "@/lib/llm/usage-limit";
import { GENERATED_QUESTION_COUNT } from "@/lib/questions/generation";
import {
  type AddGeneratedQuestionResult,
  type GeneratedQuestionPreviewState,
  type RemoveGeneratedQuestionResult,
} from "@/lib/questions/question-generator-preview";
import { prisma } from "@/lib/prisma";
import { normalizeQuestionText } from "@/lib/quiz/generated-questions";
import { getNodeGenerationContextForUser } from "@/lib/tree/service";

async function requireAuthUserId(): Promise<string> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user.id;
}

function normalizeReturnTo(returnTo?: string): string {
  return returnTo?.startsWith("/") ? returnTo : "/dashboard";
}

function mapGenerationFailureReasonToError(reason: LlmCallFailureReason): string {
  if (reason === "timeout") {
    return "Question generation timed out. Please retry.";
  }

  if (reason === "http_error") {
    return "Question generation failed because the LLM provider returned an HTTP error. Please retry.";
  }

  if (reason === "invalid_response") {
    return "LLM returned an invalid response. Please retry.";
  }

  return "Could not generate questions right now.";
}

async function createQuestionForUser(userId: string, nodeId: string, body: string) {
  return prisma.question.create({
    data: {
      userId,
      nodeId,
      body,
      reviewStates: {
        create: {
          userId,
          status: "NEW",
          intervalDays: 1,
          repetitionCount: 0,
          nextReviewAt: new Date(),
        },
      },
    },
  });
}

export async function createQuestionAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = questionCreateSchema.safeParse({
    nodeId: formData.get("nodeId"),
    body: formData.get("body"),
    returnTo: formData.get("returnTo") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20question%20input");
  }

  const node = await prisma.node.findFirst({
    where: {
      id: parsed.data.nodeId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!node) {
    redirect("/dashboard?error=Node%20not%20found");
  }

  await createQuestionForUser(userId, parsed.data.nodeId, parsed.data.body);

  revalidatePath("/dashboard");
  if (parsed.data.returnTo) {
    revalidatePath(parsed.data.returnTo);
    redirect(parsed.data.returnTo);
  }

  redirect("/dashboard");
}

export async function generateQuestionsPreviewAction(
  _previousState: GeneratedQuestionPreviewState,
  formData: FormData,
): Promise<GeneratedQuestionPreviewState> {
  const userId = await requireAuthUserId();

  const parsed = questionGenerateSchema.safeParse({
    nodeId: formData.get("nodeId"),
    returnTo: formData.get("returnTo") || undefined,
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return {
      status: "error",
      targetLabel: "",
      generatedQuestions: [],
      error: "Invalid question generator input.",
    };
  }

  const generationContext = await getNodeGenerationContextForUser(parsed.data.nodeId, userId);

  if (!generationContext) {
    return {
      status: "error",
      targetLabel: "",
      generatedQuestions: [],
      error: "Selected node not found.",
    };
  }

  try {
    await assertCanUseLlm(userId);
  } catch (error) {
    if (error instanceof LlmDailyLimitExceededError) {
      return {
        status: "error",
        targetLabel: generationContext.targetLabel,
        generatedQuestions: [],
        error: "Daily LLM limit reached for free plan (3/day shared across hints, grading, and generation).",
      };
    }

    return {
      status: "error",
      targetLabel: generationContext.targetLabel,
      generatedQuestions: [],
      error: "Could not start question generation right now.",
    };
  }

  const existingQuestions = await prisma.question.findMany({
    where: {
      userId,
      nodeId: {
        in: generationContext.scopeNodeIds,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      body: true,
    },
  });

  const generationResult = await generateQuestionsForNode({
    targetLabel: generationContext.targetLabel,
    nodeLevel: generationContext.targetNode.level,
    notes: parsed.data.notes?.trim() || undefined,
    existingQuestions: existingQuestions.map((question) => question.body),
    desiredCount: GENERATED_QUESTION_COUNT,
  });

  if (!generationResult.ok) {
    return {
      status: "error",
      targetLabel: generationContext.targetLabel,
      generatedQuestions: [],
      error: mapGenerationFailureReasonToError(generationResult.reason),
    };
  }
  const generatedQuestions = generationResult.value;

  if (generatedQuestions.length === 0) {
    return {
      status: "error",
      targetLabel: generationContext.targetLabel,
      generatedQuestions: [],
      error: "No valid questions were generated for this node.",
    };
  }

  try {
    await logLlmUsage(userId, "QUESTION_GENERATION");
  } catch {
    return {
      status: "error",
      targetLabel: generationContext.targetLabel,
      generatedQuestions: [],
      error: "Could not record LLM usage for this request.",
    };
  }

  return {
    status: "success",
    targetLabel: generationContext.targetLabel,
    generatedQuestions: generatedQuestions.map((body) => ({
      id: randomUUID(),
      body,
    })),
    message:
      generatedQuestions.length < GENERATED_QUESTION_COUNT
        ? `Generated ${generatedQuestions.length} unique questions after filtering duplicates.`
        : undefined,
  };
}

export async function addGeneratedQuestionToNodeAction(input: {
  nodeId: string;
  body: string;
  returnTo?: string;
}): Promise<AddGeneratedQuestionResult> {
  const userId = await requireAuthUserId();

  const parsed = generatedNodeQuestionAddSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      error: "Invalid generated question input.",
    };
  }

  const returnTo = normalizeReturnTo(parsed.data.returnTo);
  const node = await prisma.node.findFirst({
    where: {
      id: parsed.data.nodeId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!node) {
    return {
      status: "error",
      error: "Selected node not found.",
    };
  }

  const normalizedCandidate = normalizeQuestionText(parsed.data.body);
  const existingQuestions = await prisma.question.findMany({
    where: {
      userId,
      nodeId: parsed.data.nodeId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      body: true,
    },
  });

  const hasDuplicate = existingQuestions.some(
    (question) => normalizeQuestionText(question.body) === normalizedCandidate,
  );

  if (hasDuplicate) {
    return {
      status: "duplicate",
    };
  }

  try {
    const createdQuestion = await createQuestionForUser(userId, parsed.data.nodeId, parsed.data.body);

    revalidatePath("/dashboard");
    revalidatePath(returnTo);

    return {
      status: "success",
      questionId: createdQuestion.id,
    };
  } catch {
    return {
      status: "error",
      error: "Could not add the generated question right now.",
    };
  }
}

export async function removeGeneratedQuestionFromNodeAction(input: {
  questionId: string;
  returnTo?: string;
}): Promise<RemoveGeneratedQuestionResult> {
  const userId = await requireAuthUserId();

  const parsed = questionSettingsSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      error: "Invalid generated question removal input.",
    };
  }

  const returnTo = normalizeReturnTo(parsed.data.returnTo);
  let deleted: { count: number };

  try {
    deleted = await prisma.question.deleteMany({
      where: {
        id: parsed.data.questionId,
        userId,
      },
    });
  } catch {
    return {
      status: "error",
      error: "Could not remove the generated question right now.",
    };
  }

  if (deleted.count === 0) {
    return {
      status: "not_found",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath(returnTo);

  return {
    status: "success",
  };
}

export async function resetQuestionReviewStateAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = questionSettingsSchema.safeParse({
    questionId: formData.get("questionId"),
    returnTo: formData.get("returnTo") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20question%20settings");
  }

  const returnTo = normalizeReturnTo(parsed.data.returnTo);
  const question = await prisma.question.findFirst({
    where: {
      id: parsed.data.questionId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!question) {
    redirect(returnTo);
  }

  await prisma.reviewState.upsert({
    where: {
      userId_questionId: {
        userId,
        questionId: question.id,
      },
    },
    create: {
      userId,
      questionId: question.id,
      status: "NEW",
      intervalDays: 1,
      repetitionCount: 0,
      lastReviewedAt: null,
      nextReviewAt: new Date(),
    },
    update: {
      status: "NEW",
      intervalDays: 1,
      repetitionCount: 0,
      lastReviewedAt: null,
      nextReviewAt: new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  revalidatePath(`/quiz/${question.id}`);
  redirect(returnTo);
}

export async function deleteQuestionAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = questionDeleteSchema.safeParse({
    questionId: formData.get("questionId"),
    returnTo: formData.get("returnTo") || undefined,
    confirmDelete: formData.get("confirmDelete"),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20question%20settings");
  }

  const returnTo = normalizeReturnTo(parsed.data.returnTo);
  const question = await prisma.question.findFirst({
    where: {
      id: parsed.data.questionId,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!question) {
    redirect(returnTo);
  }

  await prisma.question.delete({
    where: {
      id: question.id,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirect(returnTo);
}
