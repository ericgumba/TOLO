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

export type NodeGenerationContext = {
  targetNode: {
    id: string;
    title: string;
    level: NodeLevel;
  };
  targetLabel: string;
  scopeNodeIds: string[];
};

export async function getTreeForUser(userId: string): Promise<TreeNode[]> {
  const nodes = await prisma.node.findMany({
    where: { userId },
    orderBy: [{ createdAt: "asc" }],
  });

  const map = new Map<string, TreeNode>();

  for (const node of nodes) {
    map.set(node.id, {
      id: node.id,
      title: node.title,
      level: node.level,
      parentId: node.parentId,
      children: [],
    });
  }

  const roots: TreeNode[] = [];

  for (const node of map.values()) {
    if (!node.parentId) {
      roots.push(node);
      continue;
    }

    const parent = map.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    }
  }

  return roots.filter((node) => node.level === NodeLevel.SUBJECT);
}

export async function getTreeCountSnapshot(userId: string): Promise<TreeCountSnapshot> {
  const [subjects, topicsByParent, subtopicsByParent] = await Promise.all([
    prisma.node.count({
      where: {
        userId,
        level: NodeLevel.SUBJECT,
      },
    }),
    prisma.node.groupBy({
      by: ["parentId"],
      where: {
        userId,
        level: NodeLevel.TOPIC,
        parentId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),
    prisma.node.groupBy({
      by: ["parentId"],
      where: {
        userId,
        level: NodeLevel.SUBTOPIC,
        parentId: {
          not: null,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  const topicsBySubjectId: Record<string, number> = {};
  const subtopicsByTopicId: Record<string, number> = {};

  for (const item of topicsByParent) {
    if (item.parentId) {
      topicsBySubjectId[item.parentId] = item._count._all;
    }
  }

  for (const item of subtopicsByParent) {
    if (item.parentId) {
      subtopicsByTopicId[item.parentId] = item._count._all;
    }
  }

  return {
    subjects,
    topicsBySubjectId,
    subtopicsByTopicId,
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
  const nodes = await prisma.node.findMany({
    where: {
      userId,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      level: true,
      parentId: true,
    },
  });

  const map = new Map<string, TreeNode>();

  for (const node of nodes) {
    map.set(node.id, {
      id: node.id,
      title: node.title,
      level: node.level,
      parentId: node.parentId,
      children: [],
    });
  }

  for (const node of map.values()) {
    if (!node.parentId) {
      continue;
    }

    const parent = map.get(node.parentId);
    if (parent) {
      parent.children.push(node);
    }
  }

  const subject = map.get(subjectId);
  if (!subject || subject.level !== NodeLevel.SUBJECT) {
    return null;
  }

  return subject;
}

export async function getTopicTreeForUser(
  subjectId: string,
  topicId: string,
  userId: string,
): Promise<{ subject: TreeNode; topic: TreeNode } | null> {
  const subject = await getSubjectTreeForUser(subjectId, userId);

  if (!subject) {
    return null;
  }

  const topic = subject.children.find((item) => item.id === topicId);
  if (!topic) {
    return null;
  }

  return { subject, topic };
}

export async function getNodeGenerationContextForUser(
  nodeId: string,
  userId: string,
): Promise<NodeGenerationContext | null> {
  const nodes = await prisma.node.findMany({
    where: {
      userId,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      level: true,
      parentId: true,
    },
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  const targetNode = byId.get(nodeId);

  if (!targetNode) {
    return null;
  }

  const childIdsByParentId = new Map<string | null, string[]>();
  for (const node of nodes) {
    const key = node.parentId ?? null;
    const existing = childIdsByParentId.get(key) ?? [];
    existing.push(node.id);
    childIdsByParentId.set(key, existing);
  }

  const pathSegments: string[] = [];
  let currentNode: (typeof targetNode) | null = targetNode;
  while (currentNode) {
    pathSegments.unshift(currentNode.title);
    currentNode = currentNode.parentId ? byId.get(currentNode.parentId) ?? null : null;
  }

  const queue = [targetNode.id];
  const scopeNodeIds = new Set<string>([targetNode.id]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) {
      continue;
    }

    for (const childId of childIdsByParentId.get(currentId) ?? []) {
      if (scopeNodeIds.has(childId)) {
        continue;
      }

      scopeNodeIds.add(childId);
      queue.push(childId);
    }
  }

  return {
    targetNode: {
      id: targetNode.id,
      title: targetNode.title,
      level: targetNode.level,
    },
    targetLabel: pathSegments.join(" : "),
    scopeNodeIds: Array.from(scopeNodeIds),
  };
}
