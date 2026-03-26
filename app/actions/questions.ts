"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { questionCreateSchema } from "@/lib/auth/validation";
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
    },
  });

  revalidatePath("/dashboard");
  if (parsed.data.returnTo) {
    revalidatePath(parsed.data.returnTo);
    redirect(parsed.data.returnTo);
  }

  redirect("/dashboard");
}
