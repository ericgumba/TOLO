"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { questionAttemptCreateSchema, questionAttemptResetSchema } from "@/lib/auth/validation";
import { gradeQuestionAttempt } from "@/lib/llm/grade-question-attempt";
import { prisma } from "@/lib/prisma";

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

export async function submitQuestionAttemptAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = questionAttemptCreateSchema.safeParse({
    questionId: formData.get("questionId"),
    answer: formData.get("answer"),
    from: formData.get("from") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20quiz%20submission");
  }

  const question = await prisma.question.findFirst({
    where: {
      id: parsed.data.questionId,
      userId: session.user.id,
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
    },
  });

  if (!question) {
    redirect("/dashboard?error=Question%20not%20found");
  }

  const context: Array<{
    id: string;
    title: string;
    level: "SUBJECT" | "TOPIC" | "SUBTOPIC";
  }> = [];

  let currentParentId = question.node.parentId;

  while (currentParentId) {
    const parentNode = await prisma.node.findFirst({
      where: {
        id: currentParentId,
        userId: session.user.id,
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
        userId: session.user.id,
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
        userId: session.user.id,
        parentQuestionId: question.id,
        questionType: "FOLLOW_UP",
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        body: true,
      },
    }),
  ]);

  const questionSequence = [question.body, ...existingFollowUpQuestions.map((item) => item.body)];
  const currentQuestionBody = questionSequence[existingAttempts.length] ?? question.body;
  const quizHistory = existingAttempts.map((attempt, index) => ({
    question: questionSequence[index] ?? question.body,
    answer: attempt.userAnswer,
  }));

  const scoring = await gradeQuestionAttempt(
    currentQuestionBody,
    parsed.data.answer,
    context,
    quizHistory,
    questionSequence,
  );
  const followUpQuestion = buildUniqueFollowUpQuestion(scoring.followupQuestion, questionSequence, currentQuestionBody);
  const attemptDelegate = (
    prisma as unknown as {
      questionAttempt?: {
        create: (args: unknown) => Promise<unknown>;
      };
    }
  ).questionAttempt;
  const from = parsed.data.from?.startsWith("/") ? parsed.data.from : "/dashboard";

  if (!attemptDelegate) {
    redirect(
      `/quiz/${question.id}?from=${encodeURIComponent(from)}&error=attempt_model_unavailable`,
    );
  }

  try {
    const createdAttempt = attemptDelegate.create({
      data: {
        questionId: question.id,
        userId: session.user.id,
        userAnswer: parsed.data.answer,
        llmScore: scoring.score,
        llmFeedback: scoring.feedback,
        llmCorrection: scoring.correction,
      },
    });

    const createdFollowUpQuestion = prisma.question.create({
      data: {
        userId: session.user.id,
        nodeId: question.nodeId,
        parentQuestionId: question.id,
        body: followUpQuestion,
        questionType: "FOLLOW_UP",
      },
    });

    await Promise.all([createdAttempt, createdFollowUpQuestion]);
  } catch {
    redirect(
      `/quiz/${question.id}?from=${encodeURIComponent(from)}&error=attempt_save_failed`,
    );
  }

  revalidatePath(`/quiz/${question.id}`);
  redirect(`/quiz/${question.id}?from=${encodeURIComponent(from)}&submitted=1`);
}

export async function resetQuestionAttemptAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const parsed = questionAttemptResetSchema.safeParse({
    questionId: formData.get("questionId"),
    from: formData.get("from") || undefined,
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
  const from = parsed.data.from?.startsWith("/") ? parsed.data.from : "/dashboard";

  if (!attemptDelegate) {
    redirect(`/quiz/${question.id}?from=${encodeURIComponent(from)}&error=attempt_model_unavailable`);
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
    redirect(`/quiz/${question.id}?from=${encodeURIComponent(from)}&error=attempt_reset_failed`);
  }

  revalidatePath(`/quiz/${question.id}`);
  redirect(`/quiz/${question.id}?from=${encodeURIComponent(from)}&reset=1`);
}
