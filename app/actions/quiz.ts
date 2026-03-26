"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { questionAttemptCreateSchema, questionAttemptResetSchema } from "@/lib/auth/validation";
import { gradeQuestionAttempt } from "@/lib/llm/grade-question-attempt";
import { prisma } from "@/lib/prisma";

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

  const scoring = await gradeQuestionAttempt(question.body, parsed.data.answer, context);
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

  let nextQuestionId = question.id;

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

    console.log("ERICGUMBA Created attempt for question", question.id, "with score", scoring.score);
    console.log("ERICGUMBA Created follow-up question for question", question.id, "with body", scoring.followupQuestion);

    const createdFollowUpQuestion = prisma.question.create({
      data: {
        userId: session.user.id,
        nodeId: question.nodeId,
        parentQuestionId: question.id,
        body: scoring.followupQuestion,
        questionType: "FOLLOW_UP",
      },
      select: {
        id: true,
      },
    });

    const [, followUpQuestion] = await Promise.all([createdAttempt, createdFollowUpQuestion]);
    nextQuestionId = followUpQuestion.id;
  } catch {
    redirect(
      `/quiz/${question.id}?from=${encodeURIComponent(from)}&error=attempt_save_failed`,
    );
  }

  revalidatePath(`/quiz/${question.id}`);
  revalidatePath(`/quiz/${nextQuestionId}`);
  redirect(`/quiz/${nextQuestionId}?from=${encodeURIComponent(from)}&submitted=1`);
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
    await attemptDelegate.deleteMany({
      where: {
        questionId: question.id,
        userId: session.user.id,
      },
    });
  } catch {
    redirect(`/quiz/${question.id}?from=${encodeURIComponent(from)}&error=attempt_reset_failed`);
  }

  revalidatePath(`/quiz/${question.id}`);
  redirect(`/quiz/${question.id}?from=${encodeURIComponent(from)}&reset=1`);
}
