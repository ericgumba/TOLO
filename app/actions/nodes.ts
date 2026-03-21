"use server";

import { NodeLevel, SubscriptionStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { nodeCreateSchema, nodeDeleteSchema, nodeUpdateSchema } from "@/lib/auth/validation";
import { prisma } from "@/lib/prisma";
import { canCreateNode, resolveChildLevel } from "@/lib/tree/rules";
import { getNodeForUser, getTreeCountSnapshot, getUserSubscription } from "@/lib/tree/service";

function sanitizeNotes(raw: string | undefined) {
  const value = raw?.trim();
  return value ? value : null;
}

async function requireAuthUserId() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return session.user.id;
}

export async function createNodeAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = nodeCreateSchema.safeParse({
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
    parentId: formData.get("parentId") || undefined,
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
      notes: sanitizeNotes(parsed.data.notes),
      level: childLevel as NodeLevel,
    },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateNodeAction(formData: FormData) {
  const userId = await requireAuthUserId();

  const parsed = nodeUpdateSchema.safeParse({
    nodeId: formData.get("nodeId"),
    title: formData.get("title"),
    notes: formData.get("notes") || undefined,
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
      notes: sanitizeNotes(parsed.data.notes),
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

  const node = await getNodeForUser(parsed.data.nodeId, userId);

  if (!node) {
    redirect("/dashboard?error=Node%20not%20found");
  }

  await prisma.node.delete({
    where: { id: node.id },
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
