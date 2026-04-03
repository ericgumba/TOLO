"use server";

import { NodeLevel, SubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { nodeCreateSchema, nodeDeleteSchema, nodeTocDeleteSchema, nodeUpdateSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";
import { canCreateNode, resolveChildLevel } from "@/lib/tree/rules";
import { getNodeForUser, getTreeCountSnapshot, getUserSubscription } from "@/lib/tree/service";

async function requireAuthUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user.id;
}

async function deleteNodeForUser(nodeId: string, userId: string) {
  const node = await getNodeForUser(nodeId, userId);

  if (!node) {
    redirect("/dashboard?error=Node%20not%20found");
  }

  try {
    await prisma.node.delete({
      where: { id: node.id },
    });
  } catch {
    redirect("/dashboard?error=Unable%20to%20delete%20node.%20Run%20migrations%20and%20try%20again");
  }
}

export async function createNodeAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = nodeCreateSchema.safeParse({
    title: formData.get("title"),
    parentId: formData.get("parentId") || undefined,
    returnTo: formData.get("returnTo") || undefined,
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20node%20input");
  }

  const parentNode = parsed.data.parentId
    ? await getNodeForUser(parsed.data.parentId, userId)
    : null;

  if (parsed.data.parentId && !parentNode) {
    redirect("/dashboard?error=Parent%20node%20not%20found");
  }

  const childLevel = resolveChildLevel(parentNode?.level ?? null);
  if (!childLevel) {
    redirect("/dashboard?error=Invalid%20hierarchy");
  }

  const [counts, subscriptionStatus] = await Promise.all([
    getTreeCountSnapshot(userId),
    getUserSubscription(userId),
  ]);

  const decision = canCreateNode(
    subscriptionStatus as SubscriptionStatus,
    childLevel,
    parentNode
      ? {
          id: parentNode.id,
          level: parentNode.level as NodeLevel,
        }
      : null,
    counts,
  );

  if (!decision.allowed) {
    redirect(`/dashboard?error=${encodeURIComponent(decision.reason ?? "Creation not allowed")}`);
  }

  await prisma.node.create({
    data: {
      userId,
      parentId: parentNode?.id ?? null,
      title: parsed.data.title,
      level: childLevel as NodeLevel,
    },
  });

  revalidatePath("/dashboard");
  if (parsed.data.returnTo) {
    revalidatePath(parsed.data.returnTo);
    redirect(parsed.data.returnTo);
  }

  redirect("/dashboard");
}

export async function updateNodeAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = nodeUpdateSchema.safeParse({
    nodeId: formData.get("nodeId"),
    title: formData.get("title"),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20update%20input");
  }

  const node = await getNodeForUser(parsed.data.nodeId, userId);

  if (!node) {
    redirect("/dashboard?error=Node%20not%20found");
  }

  await prisma.node.update({
    where: { id: node.id },
    data: {
      title: parsed.data.title,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteNodeAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = nodeDeleteSchema.safeParse({
    nodeId: formData.get("nodeId"),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20delete%20input");
  }

  await deleteNodeForUser(parsed.data.nodeId, userId);

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function deleteNodeFromTocAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = nodeTocDeleteSchema.safeParse({
    nodeId: formData.get("nodeId"),
    returnTo: formData.get("returnTo"),
    confirmDelete: formData.get("confirmDelete"),
  });

  if (!parsed.success) {
    redirect("/dashboard?error=Invalid%20delete%20input");
  }

  await deleteNodeForUser(parsed.data.nodeId, userId);

  revalidatePath("/dashboard");
  revalidatePath(parsed.data.returnTo);
  redirect(parsed.data.returnTo);
}
