import { NodeLevel, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { type TreeCountSnapshot } from "@/lib/tree/rules";

export type TreeNode = {
  id: string;
  title: string;
  level: NodeLevel;
  parentId: string | null;
  children: TreeNode[];
};

export async function getTreeForUser(userId: string): Promise<TreeNode[]> {
  const nodes = await prisma.node.findMany({
    where: { userId, level: NodeLevel.SUBJECT },
    orderBy: [{ createdAt: "asc" }],
  });

  return nodes.map((node) => ({
    id: node.id,
    title: node.title,
    level: node.level,
    parentId: node.parentId,
    children: [],
  }));
}

export async function getTreeCountSnapshot(userId: string): Promise<TreeCountSnapshot> {
  const subjects = await prisma.node.count({
    where: {
      userId,
      level: NodeLevel.SUBJECT,
    },
  });

  return {
    subjects,
  };
}

export async function getNodeForUser(nodeId: string, userId: string) {
  return prisma.node.findFirst({
    where: {
      id: nodeId,
      userId,
    },
  });
}

export async function getUserSubscription(userId: string): Promise<SubscriptionStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });

  return user?.subscriptionStatus ?? SubscriptionStatus.FREE;
}

export async function getSubjectTreeForUser(subjectId: string, userId: string): Promise<TreeNode | null> {
  const subject = await prisma.node.findFirst({
    where: {
      id: subjectId,
      userId,
      level: NodeLevel.SUBJECT,
    },
    select: {
      id: true,
      title: true,
      level: true,
      parentId: true,
    },
  });

  if (!subject) {
    return null;
  }

  return {
    id: subject.id,
    title: subject.title,
    level: subject.level,
    parentId: subject.parentId,
    children: [],
  };
}

export async function getTopicTreeForUser(
  subjectId: string,
  topicId: string,
  userId: string,
): Promise<{ subject: TreeNode; topic: TreeNode } | null> {
  void subjectId;
  void topicId;
  void userId;
  return null;
}
