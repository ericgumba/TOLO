"use server";

import { GeneratedQuestionCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { quizInteractionSchema } from "@/lib/auth/validation";
import { generateQuestionHint } from "@/lib/llm/generate-question-hint";
import { gradeQuestionAttempt } from "@/lib/llm/grade-question-attempt";
import { revealQuestionAnswer } from "@/lib/llm/reveal-question-answer";
import { type LlmCallFailureReason } from "@/lib/llm/result";
import { assertCanUseLlm, LlmDailyLimitExceededError, logLlmUsage } from "@/lib/llm/usage-limit";
import { prisma } from "@/lib/prisma";
import { normalizeQuestionText } from "@/lib/quiz/generated-questions";
import { GENERATED_QUESTION_SUGGESTION_COUNT } from "@/lib/quiz/constants";
import { type QuizInteractionState } from "@/lib/quiz/session-state";
import { upsertReviewStateFromAttempt } from "@/lib/review/service";

type QuestionContextNode = {
  id: string;
  title: string;
  level: "SUBJECT" | "TOPIC" | "SUBTOPIC";
};

type LoadedQuizState = {
  question: {
    id: string;
    body: string;
    nodeId: string;
    node: {
      parentId: string | null;
      id: string;
      title: string;
      level: "SUBJECT" | "TOPIC" | "SUBTOPIC";
    };
  };
  context: QuestionContextNode[];
  existingQuestionBodies: string[];
  generatedQuestions: string[];
};

const GENERATED_QUESTION_CATEGORY_ORDER: GeneratedQuestionCategory[] = [
  "EXPLAIN",
  "ANALYZE",
  "EVALUATE",
  "APPLY",
  "TEACH",
];

function sortGeneratedQuestionsByCategory(
  generatedQuestions: Array<{
    category: GeneratedQuestionCategory;
    body: string;
  }>,
): string[] {
  return [...generatedQuestions]
    .sort(
      (left, right) =>
        GENERATED_QUESTION_CATEGORY_ORDER.indexOf(left.category) -
        GENERATED_QUESTION_CATEGORY_ORDER.indexOf(right.category),
    )
    .map((item) => item.body);
}

function normalizeFrom(value?: string): string {
  return value?.startsWith("/") ? value : "/dashboard";
}

function buildErrorState(
  previousState: QuizInteractionState,
  errorCode: QuizInteractionState["errorCode"],
  draftAnswer: string,
): QuizInteractionState {
  return {
    ...previousState,
    status: "error",
    draftAnswer,
    errorCode,
  };
}

function mapGradingFailureReasonToErrorCode(
  reason: LlmCallFailureReason,
):
  | "attempt_timeout"
  | "attempt_provider_http_error"
  | "attempt_invalid_response"
  | "attempt_network_error" {
  if (reason === "timeout") {
    return "attempt_timeout";
  }

  if (reason === "http_error") {
    return "attempt_provider_http_error";
  }

  if (reason === "invalid_response") {
    return "attempt_invalid_response";
  }

  return "attempt_network_error";
}

function mapHintFailureReasonToErrorCode(
  reason: LlmCallFailureReason,
):
  | "hint_timeout"
  | "hint_provider_http_error"
  | "hint_invalid_response"
  | "hint_network_error" {
  if (reason === "timeout") {
    return "hint_timeout";
  }

  if (reason === "http_error") {
    return "hint_provider_http_error";
  }

  if (reason === "invalid_response") {
    return "hint_invalid_response";
  }

  return "hint_network_error";
}

async function loadQuizState(userId: string, questionId: string): Promise<LoadedQuizState | null> {
  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      userId,
    },
    select: {
      id: true,
      body: true,
      nodeId: true,
      node: {
        select: {
          parentId: true,
          id: true,
          title: true,
          level: true,
        },
      },
      generatedQuestions: {
        select: {
          category: true,
          body: true,
        },
      },
    },
  });

  if (!question) {
    return null;
  }

  const context: QuestionContextNode[] = [];
  let currentParentId = question.node.parentId;

  while (currentParentId) {
    const parentNode = await prisma.node.findFirst({
      where: {
        id: currentParentId,
        userId,
      },
      select: {
        id: true,
        title: true,
        level: true,
        parentId: true,
      },
    });

    if (!parentNode) {
      break;
    }

    context.unshift({
      id: parentNode.id,
      title: parentNode.title,
      level: parentNode.level,
    });

    currentParentId = parentNode.parentId;
  }

  context.push({
    id: question.node.id,
    title: question.node.title,
    level: question.node.level,
  });

  const existingQuestions = await prisma.question.findMany({
    where: {
      userId,
      nodeId: question.nodeId,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      body: true,
    },
  });

  return {
    question,
    context,
    existingQuestionBodies: existingQuestions.map((item) => item.body),
    generatedQuestions: sortGeneratedQuestionsByCategory(question.generatedQuestions),
  };
}

function revalidateQuizPaths(questionId: string, from: string) {
  revalidatePath("/dashboard");
  revalidatePath(from);
  revalidatePath(`/quiz/${questionId}`);
}

export async function runQuizInteractionAction(
  previousState: QuizInteractionState,
  formData: FormData,
): Promise<QuizInteractionState> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = quizInteractionSchema.safeParse({
    questionId: formData.get("questionId"),
    intent: formData.get("intent"),
    answer: formData.get("answer") || undefined,
    from: formData.get("from") || undefined,
    mode: formData.get("mode") || undefined,
  });

  const draftAnswer =
    typeof formData.get("answer") === "string" ? String(formData.get("answer")) : previousState.draftAnswer;

  if (!parsed.success) {
    return buildErrorState(previousState, "attempt_save_failed", draftAnswer);
  }

  const loaded = await loadQuizState(session.user.id, parsed.data.questionId);

  if (!loaded) {
    return buildErrorState(
      previousState,
      parsed.data.intent === "hint" ? "hint_generation_failed" : "attempt_save_failed",
      draftAnswer,
    );
  }

  const from = normalizeFrom(parsed.data.from);

  if (parsed.data.intent === "hint") {
    const existingHints = previousState.activeHints;

    if (existingHints.length >= 3) {
      return buildErrorState(previousState, "hint_limit_reached", draftAnswer);
    }

    try {
      await assertCanUseLlm(session.user.id);
    } catch (error) {
      if (error instanceof LlmDailyLimitExceededError) {
        return buildErrorState(previousState, "llm_daily_limit_reached", draftAnswer);
      }

      return buildErrorState(previousState, "hint_generation_failed", draftAnswer);
    }

    const hintLevel = (existingHints.length + 1) as 1 | 2 | 3;
    const hintResult = await generateQuestionHint({
      question: loaded.question.body,
      context: loaded.context,
      quizHistory: [],
      hintLevel,
      existingHints,
    });

    if (!hintResult.ok) {
      return buildErrorState(previousState, mapHintFailureReasonToErrorCode(hintResult.reason), draftAnswer);
    }

    const nextHint = hintResult.value.trim();

    if (nextHint.length === 0) {
      return buildErrorState(previousState, "hint_invalid_response", draftAnswer);
    }

    const existingNormalized = new Set(existingHints.map(normalizeQuestionText));
    const finalHint = existingNormalized.has(normalizeQuestionText(nextHint))
      ? `Think first about the missing mechanism in this answer (hint ${hintLevel}).`
      : nextHint;

    try {
      await logLlmUsage(session.user.id, "HINT");
    } catch {
      return buildErrorState(previousState, "hint_generation_failed", draftAnswer);
    }

    return {
      status: "idle",
      draftAnswer,
      submittedAnswer: null,
      feedback: null,
      suggestedQuestion: null,
      activeHints: [...existingHints, finalHint],
      revealedAnswer: previousState.revealedAnswer,
      generatedQuestions: [],
      errorCode: null,
    };
  }

  if (parsed.data.intent === "reveal") {
    const existingHints = previousState.activeHints;

    if (existingHints.length < 3) {
      return buildErrorState(previousState, "hint_generation_failed", draftAnswer);
    }

    if (previousState.revealedAnswer) {
      return {
        ...previousState,
        draftAnswer,
        errorCode: null,
      };
    }

    try {
      await assertCanUseLlm(session.user.id);
    } catch (error) {
      if (error instanceof LlmDailyLimitExceededError) {
        return buildErrorState(previousState, "llm_daily_limit_reached", draftAnswer);
      }

      return buildErrorState(previousState, "hint_generation_failed", draftAnswer);
    }

    const revealedAnswerResult = await revealQuestionAnswer({
      question: loaded.question.body,
      context: loaded.context,
      quizHistory: [],
      existingHints,
    });

    if (!revealedAnswerResult.ok) {
      return buildErrorState(previousState, mapHintFailureReasonToErrorCode(revealedAnswerResult.reason), draftAnswer);
    }

    const revealedAnswer = revealedAnswerResult.value.trim();

    if (revealedAnswer.length === 0) {
      return buildErrorState(previousState, "hint_invalid_response", draftAnswer);
    }

    try {
      await logLlmUsage(session.user.id, "HINT");
    } catch {
      return buildErrorState(previousState, "hint_generation_failed", draftAnswer);
    }

    return {
      status: "idle",
      draftAnswer,
      submittedAnswer: null,
      feedback: null,
      suggestedQuestion: null,
      activeHints: existingHints,
      revealedAnswer,
      generatedQuestions: [],
      errorCode: null,
    };
  }

  const trimmedAnswer = draftAnswer.trim();

  if (trimmedAnswer.length === 0) {
    return buildErrorState(previousState, "attempt_save_failed", draftAnswer);
  }

  try {
    await assertCanUseLlm(session.user.id);
  } catch (error) {
    if (error instanceof LlmDailyLimitExceededError) {
      return buildErrorState(previousState, "llm_daily_limit_reached", trimmedAnswer);
    }

    return buildErrorState(previousState, "attempt_save_failed", trimmedAnswer);
  }

  const scoringResult = await gradeQuestionAttempt(
    loaded.question.body,
    trimmedAnswer,
    loaded.context,
    [],
    loaded.existingQuestionBodies,
    {
      includeGeneratedQuestions: loaded.generatedQuestions.length === 0,
    },
  );

  if (!scoringResult.ok) {
    return buildErrorState(previousState, mapGradingFailureReasonToErrorCode(scoringResult.reason), trimmedAnswer);
  }

  try {
    await logLlmUsage(session.user.id, "GRADE");
  } catch {
    return buildErrorState(previousState, "attempt_save_failed", trimmedAnswer);
  }

  const answeredAt = new Date();
  let generatedQuestions = loaded.generatedQuestions;

  try {
    await upsertReviewStateFromAttempt({
      userId: session.user.id,
      questionId: loaded.question.id,
      llmScore: scoringResult.value.score,
      reviewedAt: answeredAt,
    });

    if (generatedQuestions.length === 0 && scoringResult.value.generatedQuestions.length > 0) {
      generatedQuestions = scoringResult.value.generatedQuestions.slice(0, GENERATED_QUESTION_SUGGESTION_COUNT);

      await prisma.generatedQuestion.createMany({
        data: generatedQuestions.map((body, index) => ({
          questionId: loaded.question.id,
          category: GENERATED_QUESTION_CATEGORY_ORDER[index] ?? "TEACH",
          body,
        })),
        skipDuplicates: true,
      });
    }
  } catch {
    return buildErrorState(previousState, "attempt_save_failed", trimmedAnswer);
  }

  revalidateQuizPaths(loaded.question.id, from);

  return {
    status: "submitted",
    draftAnswer: trimmedAnswer,
    submittedAnswer: trimmedAnswer,
    feedback: {
      llmScore: scoringResult.value.score,
      llmFeedback: scoringResult.value.feedback,
      llmCorrection: scoringResult.value.correction,
      answeredAtIso: answeredAt.toISOString(),
    },
    suggestedQuestion: scoringResult.value.suggestedQuestion,
    activeHints: previousState.activeHints,
    revealedAnswer: previousState.revealedAnswer,
    generatedQuestions,
    errorCode: null,
  };
}
