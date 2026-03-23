"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { questionAttemptCreateSchema } from "@/lib/auth/validation";
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
    },
  });

  if (!question) {
    redirect("/dashboard?error=Question%20not%20found");
  }

  const scoring = await gradeQuestionAttempt(question.body, parsed.data.answer);
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
    await attemptDelegate.create({
      data: {
        questionId: question.id,
        userId: session.user.id,
        userAnswer: parsed.data.answer,
        llmScore: scoring.score,
        llmFeedback: scoring.feedback,
        llmCorrection: scoring.correction,
      },
    });
  } catch {
    redirect(
      `/quiz/${question.id}?from=${encodeURIComponent(from)}&error=attempt_save_failed`,
    );
  }

  revalidatePath(`/quiz/${question.id}`);
  redirect(`/quiz/${question.id}?from=${encodeURIComponent(from)}&submitted=1`);
}
