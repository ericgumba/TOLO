"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  questionAttemptCreateSchema,
  questionAttemptResetSchema,
  questionHintRequestSchema,
} from "@/lib/auth/validation";
import { generateQuestionHint } from "@/lib/llm/generate-question-hint";
import { gradeQuestionAttempt } from "@/lib/llm/grade-question-attempt";
import { LlmRequestTimeoutError } from "@/lib/llm/request";
import { MAX_FOLLOW_UP_QUESTIONS } from "@/lib/quiz/constants";
import { assertCanUseLlm, LlmDailyLimitExceededError, logLlmUsage } from "@/lib/llm/usage-limit";
import { prisma } from "@/lib/prisma";
import { upsertReviewStateFromAttempt } from "@/lib/review/service";

type QuestionContextNode = {
  id: string;
  title: string;
  level: "SUBJECT" | "TOPIC" | "SUBTOPIC";
};

type QuizHistoryItem = {
  question: string;
  answer: string;
};

type LoadedQuizState = {
  question: {
    id: string;
    body: string;
    nodeId: string;
    questionType: "MAIN" | "FOLLOW_UP";
    node: {
      parentId: string | null;
      id: string;
      title: string;
      level: "SUBJECT" | "TOPIC" | "SUBTOPIC";
    };
  };
  context: QuestionContextNode[];
  existingAttempts: Array<{ userAnswer: string }>;
  existingFollowUpCount: number;
  questionSequence: string[];
  quizHistory: QuizHistoryItem[];
  currentQuestionBody: string;
};

function normalizeQuestion(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildUniqueFollowUpQuestion(candidate: string, existingQuestions: string[], currentQuestion: string): string {
  const normalizedExisting = new Set(existingQuestions.map(normalizeQuestion));
  const normalizedCandidate = normalizeQuestion(candidate);
  if (normalizedCandidate.length > 0 && !normalizedExisting.has(normalizedCandidate)) {
    return candidate.trim();
  }

  const base = currentQuestion.replace(/\?+$/, "").trim();
  const fallbackCandidates = [
    `What is one concrete example that clarifies: ${base}?`,
    `What is the most important detail you have not yet explained about: ${base}?`,
    `How would you compare two key aspects related to: ${base}?`,
  ];

  for (const fallback of fallbackCandidates) {
    const normalizedFallback = normalizeQuestion(fallback);
    if (!normalizedExisting.has(normalizedFallback)) {
      return fallback;
    }
  }

  return `What is one additional missing detail about this topic? (${existingQuestions.length + 1})`;
}

function normalizeFrom(value?: string): string {
  return value?.startsWith("/") ? value : "/dashboard";
}

function normalizeMode(value?: string): string | null {
  if (!value || value.trim().length === 0) {
    return null;
  }

  return value;
}

function getExistingHints(input: { hint1?: string; hint2?: string; hint3?: string }): string[] {
  return [input.hint1, input.hint2, input.hint3].filter(
    (hint): hint is string => typeof hint === "string" && hint.trim().length > 0,
  );
}

function buildQuizUrl(input: {
  questionId: string;
  from: string;
  mode?: string | null;
  submitted?: boolean;
  reset?: boolean;
  error?: string;
  hints?: string[];
}): string {
  const params = new URLSearchParams();
  params.set("from", input.from);

  if (input.mode) {
    params.set("mode", input.mode);
  }
  if (input.submitted) {
    params.set("submitted", "1");
  }
  if (input.reset) {
    params.set("reset", "1");
  }
  if (input.error) {
    params.set("error", input.error);
  }

  if (input.hints) {
    input.hints.slice(0, 3).forEach((hint, index) => {
      params.set(`hint${index + 1}`, hint);
    });
  }

  return `/quiz/${input.questionId}?${params.toString()}`;
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
      questionType: true,
      node: {
        select: {
          parentId: true,
          id: true,
          title: true,
          level: true,
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

  const [existingAttempts, existingFollowUpQuestions] = await Promise.all([
    prisma.questionAttempt.findMany({
      where: {
        questionId: question.id,
        userId,
      },
      orderBy: {
        answeredAt: "asc",
      },
      select: {
        userAnswer: true,
      },
    }),
    prisma.question.findMany({
      where: {
        userId,
        parentQuestionId: question.id,
        questionType: "FOLLOW_UP",
      },
      orderBy: {
        createdAt: "asc",
      },
      take: MAX_FOLLOW_UP_QUESTIONS,
      select: {
        body: true,
      },
    }),
  ]);

  const questionSequence = [question.body, ...existingFollowUpQuestions.map((item) => item.body)];
  const currentQuestionBody = questionSequence[Math.min(existingAttempts.length, questionSequence.length - 1)] ?? question.body;
  const quizHistory = existingAttempts.map((attempt, index) => ({
    question: questionSequence[Math.min(index, questionSequence.length - 1)] ?? question.body,
    answer: attempt.userAnswer,
  }));

  return {
    question,
    context,
    existingAttempts,
    existingFollowUpCount: existingFollowUpQuestions.length,
    questionSequence,
    quizHistory,
    currentQuestionBody,
  };
}

export async function submitQuestionAttemptAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = questionAttemptCreateSchema.safeParse({
    questionId: formData.get("questionId"),
    answer: formData.get("answer"),
    from: formData.get("from") || undefined,
    mode: formData.get("mode") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20quiz%20submission");
  }

  const loaded = await loadQuizState(session.user.id, parsed.data.questionId);
  if (!loaded) {
    redirect("/dashboard?error=Question%20not%20found");
  }

  const from = normalizeFrom(parsed.data.from);
  const mode = normalizeMode(parsed.data.mode);
  const isInitialMainQuestionAttempt = loaded.question.questionType === "MAIN" && loaded.existingAttempts.length === 0;

  try {
    await assertCanUseLlm(session.user.id);
  } catch (error) {
    if (error instanceof LlmDailyLimitExceededError) {
      redirect(
        buildQuizUrl({
          questionId: loaded.question.id,
          from,
          mode,
          error: "llm_daily_limit_reached",
        }),
      );
    }
    redirect(
      buildQuizUrl({
        questionId: loaded.question.id,
        from,
        mode,
        error: "attempt_save_failed",
      }),
    );
  }

  let scoring;
  try {
    scoring = await gradeQuestionAttempt(
      loaded.currentQuestionBody,
      parsed.data.answer,
      loaded.context,
      loaded.quizHistory,
      loaded.questionSequence,
    );
  } catch (error) {
    if (error instanceof LlmRequestTimeoutError) {
      redirect(
        buildQuizUrl({
          questionId: loaded.question.id,
          from,
          mode,
          error: "attempt_timeout",
        }),
      );
    }

    redirect(
      buildQuizUrl({
        questionId: loaded.question.id,
        from,
        mode,
        error: "attempt_save_failed",
      }),
    );
  }

  const shouldCreateFollowUpQuestion = loaded.existingFollowUpCount < MAX_FOLLOW_UP_QUESTIONS;
  const followUpQuestion = shouldCreateFollowUpQuestion
    ? buildUniqueFollowUpQuestion(
        scoring.followupQuestion,
        loaded.questionSequence,
        loaded.currentQuestionBody,
      )
    : null;
  const attemptDelegate = (
    prisma as unknown as {
      questionAttempt?: {
        create: (args: unknown) => Promise<unknown>;
      };
    }
  ).questionAttempt;

  if (!attemptDelegate) {
    redirect(buildQuizUrl({ questionId: loaded.question.id, from, mode, error: "attempt_model_unavailable" }));
  }

  try {
    await logLlmUsage(session.user.id, "GRADE");
  } catch {
    redirect(buildQuizUrl({ questionId: loaded.question.id, from, mode, error: "attempt_save_failed" }));
  }

  try {
    const createdAttempt = attemptDelegate.create({
      data: {
        questionId: loaded.question.id,
        userId: session.user.id,
        userAnswer: parsed.data.answer,
        llmScore: scoring.score,
        llmFeedback: scoring.feedback,
        llmCorrection: scoring.correction,
      },
    });
    const writes: Promise<unknown>[] = [createdAttempt];

    if (shouldCreateFollowUpQuestion && followUpQuestion) {
      writes.push(
        prisma.question.create({
          data: {
            userId: session.user.id,
            nodeId: loaded.question.nodeId,
            parentQuestionId: loaded.question.id,
            body: followUpQuestion,
            questionType: "FOLLOW_UP",
          },
        }),
      );
    }

    await Promise.all(writes);

    if (isInitialMainQuestionAttempt) {
      await upsertReviewStateFromAttempt({
        userId: session.user.id,
        questionId: loaded.question.id,
        llmScore: scoring.score,
        reviewedAt: new Date(),
      });
    }
  } catch {
    redirect(buildQuizUrl({ questionId: loaded.question.id, from, mode, error: "attempt_save_failed" }));
  }

  revalidatePath(`/quiz/${loaded.question.id}`);
  redirect(buildQuizUrl({ questionId: loaded.question.id, from, mode, submitted: true }));
}

export async function requestQuestionHintAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = questionHintRequestSchema.safeParse({
    questionId: formData.get("questionId"),
    from: formData.get("from") || undefined,
    mode: formData.get("mode") || undefined,
    hint1: formData.get("hint1") || undefined,
    hint2: formData.get("hint2") || undefined,
    hint3: formData.get("hint3") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20hint%20request");
  }

  const loaded = await loadQuizState(session.user.id, parsed.data.questionId);
  if (!loaded) {
    redirect("/dashboard?error=Question%20not%20found");
  }

  const from = normalizeFrom(parsed.data.from);
  const mode = normalizeMode(parsed.data.mode);
  const existingHints = getExistingHints(parsed.data);

  if (existingHints.length >= 3) {
    redirect(
      buildQuizUrl({
        questionId: loaded.question.id,
        from,
        mode,
        hints: existingHints,
        error: "hint_limit_reached",
      }),
    );
  }

  try {
    await assertCanUseLlm(session.user.id);
  } catch (error) {
    if (error instanceof LlmDailyLimitExceededError) {
      redirect(
        buildQuizUrl({
          questionId: loaded.question.id,
          from,
          mode,
          hints: existingHints,
          error: "llm_daily_limit_reached",
        }),
      );
    }
    redirect(
      buildQuizUrl({
        questionId: loaded.question.id,
        from,
        mode,
        hints: existingHints,
        error: "hint_generation_failed",
      }),
    );
  }

  const hintLevel = (existingHints.length + 1) as 1 | 2 | 3;
  const hint = await generateQuestionHint({
    question: loaded.currentQuestionBody,
    context: loaded.context,
    quizHistory: loaded.quizHistory,
    hintLevel,
    existingHints,
  });

  const nextHint = hint.trim();
  if (nextHint.length === 0) {
    redirect(
      buildQuizUrl({
        questionId: loaded.question.id,
        from,
        mode,
        hints: existingHints,
        error: "hint_generation_failed",
      }),
    );
  }

  const existingNormalized = new Set(existingHints.map(normalizeQuestion));
  const finalHint = existingNormalized.has(normalizeQuestion(nextHint))
    ? `Think first about the missing mechanism in this answer (hint ${hintLevel}).`
    : nextHint;

  try {
    await logLlmUsage(session.user.id, "HINT");
  } catch {
    redirect(
      buildQuizUrl({
        questionId: loaded.question.id,
        from,
        mode,
        hints: existingHints,
        error: "hint_generation_failed",
      }),
    );
  }

  redirect(
    buildQuizUrl({
      questionId: loaded.question.id,
      from,
      mode,
      hints: [...existingHints, finalHint],
    }),
  );
}

export async function resetQuestionAttemptAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = questionAttemptResetSchema.safeParse({
    questionId: formData.get("questionId"),
    from: formData.get("from") || undefined,
    mode: formData.get("mode") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20quiz%20reset");
  }

  const question = await prisma.question.findFirst({
    where: {
      id: parsed.data.questionId,
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!question) {
    redirect("/dashboard?error=Question%20not%20found");
  }

  const attemptDelegate = (
    prisma as unknown as {
      questionAttempt?: {
        deleteMany: (args: unknown) => Promise<unknown>;
      };
    }
  ).questionAttempt;
  const from = normalizeFrom(parsed.data.from);
  const mode = normalizeMode(parsed.data.mode);

  if (!attemptDelegate) {
    redirect(buildQuizUrl({ questionId: question.id, from, mode, error: "attempt_model_unavailable" }));
  }

  try {
    await prisma.$transaction([
      attemptDelegate.deleteMany({
        where: {
          questionId: question.id,
          userId: session.user.id,
        },
      }),
      prisma.question.deleteMany({
        where: {
          userId: session.user.id,
          parentQuestionId: question.id,
          questionType: "FOLLOW_UP",
        },
      }),
    ]);
  } catch {
    redirect(buildQuizUrl({ questionId: question.id, from, mode, error: "attempt_reset_failed" }));
  }

  revalidatePath(`/quiz/${question.id}`);
  redirect(buildQuizUrl({ questionId: question.id, from, mode, reset: true }));
}
