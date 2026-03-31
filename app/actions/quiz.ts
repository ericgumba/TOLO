"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import {
  generatedQuestionAddAllSchema,
  generatedQuestionAddSchema,
  questionAttemptCreateSchema,
  questionAttemptResetSchema,
  questionHintRequestSchema,
} from "@/lib/auth/validation";
import { generateQuestionHint } from "@/lib/llm/generate-question-hint";
import { gradeQuestionAttempt } from "@/lib/llm/grade-question-attempt";
import { LlmRequestTimeoutError } from "@/lib/llm/request";
import { assertCanUseLlm, LlmDailyLimitExceededError, logLlmUsage } from "@/lib/llm/usage-limit";
import { prisma } from "@/lib/prisma";
import {
  getGeneratedQuestionSuggestionsFromFields,
  normalizeQuestionText,
} from "@/lib/quiz/generated-questions";
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
  existingMainQuestionBodies: string[];
  quizHistory: QuizHistoryItem[];
  currentQuestionBody: string;
};

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
  generatedQuestions?: string[];
  addedCount?: number;
  skippedCount?: number;
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
  if (input.generatedQuestions) {
    input.generatedQuestions.slice(0, 3).forEach((question, index) => {
      params.set(`generated${index + 1}`, question);
    });
  }
  if (typeof input.addedCount === "number") {
    params.set("added", String(input.addedCount));
  }
  if (typeof input.skippedCount === "number") {
    params.set("skipped", String(input.skippedCount));
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

  const [existingAttempts, existingMainQuestions] = await Promise.all([
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
        nodeId: question.nodeId,
        questionType: "MAIN",
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        body: true,
      },
    }),
  ]);

  return {
    question,
    context,
    existingAttempts,
    existingMainQuestionBodies: existingMainQuestions.map((item) => item.body),
    quizHistory: existingAttempts.map((attempt) => ({
      question: question.body,
      answer: attempt.userAnswer,
    })),
    currentQuestionBody: question.body,
  };
}

function getAttemptDelegate() {
  return (
    prisma as unknown as {
      questionAttempt?: {
        create: (args: unknown) => Promise<unknown>;
        deleteMany: (args: unknown) => Promise<unknown>;
      };
    }
  ).questionAttempt;
}

function buildMainQuestionCreateData(input: { userId: string; nodeId: string; body: string }) {
  return {
    userId: input.userId,
    nodeId: input.nodeId,
    body: input.body,
    questionType: "MAIN" as const,
    reviewStates: {
      create: {
        userId: input.userId,
        status: "NEW" as const,
        intervalDays: 1,
        repetitionCount: 0,
        nextReviewAt: new Date(),
      },
    },
  };
}

function revalidateQuizPaths(questionId: string, from: string) {
  revalidatePath("/dashboard");
  revalidatePath(from);
  revalidatePath(`/quiz/${questionId}`);
}

async function addGeneratedQuestionsToNode(input: {
  userId: string;
  nodeId: string;
  candidates: string[];
}): Promise<{ addedCount: number; skippedCount: number }> {
  const existingMainQuestions = await prisma.question.findMany({
    where: {
      userId: input.userId,
      nodeId: input.nodeId,
      questionType: "MAIN",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      body: true,
    },
  });

  const seen = new Set(
    existingMainQuestions.map((item) => normalizeQuestionText(item.body)).filter((value) => value.length > 0),
  );

  let addedCount = 0;
  let skippedCount = 0;

  for (const candidate of input.candidates) {
    const normalized = normalizeQuestionText(candidate);

    if (normalized.length === 0 || seen.has(normalized)) {
      skippedCount += 1;
      continue;
    }

    await prisma.question.create({
      data: buildMainQuestionCreateData({
        userId: input.userId,
        nodeId: input.nodeId,
        body: candidate,
      }),
    });

    seen.add(normalized);
    addedCount += 1;
  }

  return {
    addedCount,
    skippedCount,
  };
}

async function loadOwnedQuestionForSuggestionAction(userId: string, questionId: string) {
  return prisma.question.findFirst({
    where: {
      id: questionId,
      userId,
    },
    select: {
      id: true,
      nodeId: true,
    },
  });
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
      loaded.existingMainQuestionBodies,
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

  const attemptDelegate = getAttemptDelegate();

  if (!attemptDelegate) {
    redirect(buildQuizUrl({ questionId: loaded.question.id, from, mode, error: "attempt_model_unavailable" }));
  }

  try {
    await logLlmUsage(session.user.id, "GRADE");
  } catch {
    redirect(buildQuizUrl({ questionId: loaded.question.id, from, mode, error: "attempt_save_failed" }));
  }

  try {
    await attemptDelegate.create({
      data: {
        questionId: loaded.question.id,
        userId: session.user.id,
        userAnswer: parsed.data.answer,
        llmScore: scoring.score,
        llmFeedback: scoring.feedback,
        llmCorrection: scoring.correction,
      },
    });

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
  redirect(
    buildQuizUrl({
      questionId: loaded.question.id,
      from,
      mode,
      submitted: true,
      generatedQuestions: scoring.generatedQuestions,
    }),
  );
}

export async function addGeneratedQuestionAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = generatedQuestionAddSchema.safeParse({
    questionId: formData.get("questionId"),
    from: formData.get("from") || undefined,
    mode: formData.get("mode") || undefined,
    candidateIndex: formData.get("candidateIndex"),
    generated1: formData.get("generated1") || undefined,
    generated2: formData.get("generated2") || undefined,
    generated3: formData.get("generated3") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20generated%20question%20request");
  }

  const from = normalizeFrom(parsed.data.from);
  const mode = normalizeMode(parsed.data.mode);
  const generatedQuestions = getGeneratedQuestionSuggestionsFromFields(parsed.data);
  const candidate = generatedQuestions[parsed.data.candidateIndex];

  if (!candidate) {
    redirect(
      buildQuizUrl({
        questionId: parsed.data.questionId,
        from,
        mode,
        generatedQuestions,
        error: "generated_question_add_failed",
      }),
    );
  }

  const question = await loadOwnedQuestionForSuggestionAction(session.user.id, parsed.data.questionId);
  if (!question) {
    redirect("/dashboard?error=Question%20not%20found");
  }

  let result;
  try {
    result = await addGeneratedQuestionsToNode({
      userId: session.user.id,
      nodeId: question.nodeId,
      candidates: [candidate],
    });
  } catch {
    redirect(
      buildQuizUrl({
        questionId: question.id,
        from,
        mode,
        generatedQuestions,
        error: "generated_question_add_failed",
      }),
    );
  }

  const remainingQuestions = generatedQuestions.filter((_, index) => index !== parsed.data.candidateIndex);

  revalidateQuizPaths(question.id, from);
  redirect(
    buildQuizUrl({
      questionId: question.id,
      from,
      mode,
      generatedQuestions: remainingQuestions,
      addedCount: result.addedCount,
      skippedCount: result.skippedCount,
    }),
  );
}

export async function addAllGeneratedQuestionsAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = generatedQuestionAddAllSchema.safeParse({
    questionId: formData.get("questionId"),
    from: formData.get("from") || undefined,
    mode: formData.get("mode") || undefined,
    generated1: formData.get("generated1") || undefined,
    generated2: formData.get("generated2") || undefined,
    generated3: formData.get("generated3") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20generated%20question%20request");
  }

  const from = normalizeFrom(parsed.data.from);
  const mode = normalizeMode(parsed.data.mode);
  const generatedQuestions = getGeneratedQuestionSuggestionsFromFields(parsed.data);

  if (generatedQuestions.length === 0) {
    redirect(
      buildQuizUrl({
        questionId: parsed.data.questionId,
        from,
        mode,
        error: "generated_question_add_failed",
      }),
    );
  }

  const question = await loadOwnedQuestionForSuggestionAction(session.user.id, parsed.data.questionId);
  if (!question) {
    redirect("/dashboard?error=Question%20not%20found");
  }

  let result;
  try {
    result = await addGeneratedQuestionsToNode({
      userId: session.user.id,
      nodeId: question.nodeId,
      candidates: generatedQuestions,
    });
  } catch {
    redirect(
      buildQuizUrl({
        questionId: question.id,
        from,
        mode,
        generatedQuestions,
        error: "generated_question_add_failed",
      }),
    );
  }

  revalidateQuizPaths(question.id, from);
  redirect(
    buildQuizUrl({
      questionId: question.id,
      from,
      mode,
      addedCount: result.addedCount,
      skippedCount: result.skippedCount,
    }),
  );
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

  const existingNormalized = new Set(existingHints.map(normalizeQuestionText));
  const finalHint = existingNormalized.has(normalizeQuestionText(nextHint))
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

  const attemptDelegate = getAttemptDelegate();
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
