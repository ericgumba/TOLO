"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { questionCreateSchema, questionDeleteSchema, questionSettingsSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";

export async function createQuestionAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

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
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!node) {
    redirect("/dashboard?error=Node%20not%20found");
  }

  await prisma.question.create({
    data: {
      userId: session.user.id,
      nodeId: parsed.data.nodeId,
      body: parsed.data.body,
      questionType: "MAIN",
      reviewStates: {
        create: {
          userId: session.user.id,
          status: "NEW",
          intervalDays: 1,
          repetitionCount: 0,
          nextReviewAt: new Date(),
        },
      },
    },
  });

  revalidatePath("/dashboard");
  if (parsed.data.returnTo) {
    revalidatePath(parsed.data.returnTo);
    redirect(parsed.data.returnTo);
  }

  redirect("/dashboard");
}

function normalizeReturnTo(returnTo?: string): string {
  return returnTo?.startsWith("/") ? returnTo : "/dashboard";
}

export async function resetQuestionReviewStateAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

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
      userId: session.user.id,
    },
    select: {
      id: true,
      questionType: true,
    },
  });

  if (!question) {
    redirect(returnTo);
  }

  if (question.questionType === "MAIN") {
    await prisma.reviewState.upsert({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId: question.id,
        },
      },
      create: {
        userId: session.user.id,
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
  }

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  revalidatePath(`/quiz/${question.id}`);
  redirect(returnTo);
}

export async function deleteQuestionAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

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
      userId: session.user.id,
    },
    select: {
      id: true,
    },
  });

  if (!question) {
    redirect(returnTo);
  }

  await prisma.$transaction([
    prisma.question.deleteMany({
      where: {
        userId: session.user.id,
        parentQuestionId: question.id,
        questionType: "FOLLOW_UP",
      },
    }),
    prisma.question.delete({
      where: {
        id: question.id,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath(returnTo);
  redirect(returnTo);
}
