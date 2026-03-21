export const NODE_LEVEL = {
  SUBJECT: "SUBJECT",
  TOPIC: "TOPIC",
  SUBTOPIC: "SUBTOPIC",
} as const;

export type NodeLevel = (typeof NODE_LEVEL)[keyof typeof NODE_LEVEL];

export const SUBSCRIPTION = {
  FREE: "FREE",
  PAID: "PAID",
} as const;

export type Subscription = (typeof SUBSCRIPTION)[keyof typeof SUBSCRIPTION];

export type ParentNodeForCreate = {
  id: string;
  level: NodeLevel;
};

export type TreeCountSnapshot = {
  subjects: number;
  topicsBySubjectId: Record<string, number>;
  subtopicsByTopicId: Record<string, number>;
};

export type CreateNodeDecision = {
  allowed: boolean;
  reason?: string;
};

export function isAllowedChildLevel(parentLevel: NodeLevel | null, childLevel: NodeLevel): boolean {
  if (parentLevel === null) {
    return childLevel === NODE_LEVEL.SUBJECT;
  }

  if (parentLevel === NODE_LEVEL.SUBJECT) {
    return childLevel === NODE_LEVEL.TOPIC;
  }

  if (parentLevel === NODE_LEVEL.TOPIC) {
    return childLevel === NODE_LEVEL.SUBTOPIC;
  }

  return false;
}

export function resolveChildLevel(parentLevel: NodeLevel | null): NodeLevel | null {
  if (parentLevel === null) {
    return NODE_LEVEL.SUBJECT;
  }

  if (parentLevel === NODE_LEVEL.SUBJECT) {
    return NODE_LEVEL.TOPIC;
  }

  if (parentLevel === NODE_LEVEL.TOPIC) {
    return NODE_LEVEL.SUBTOPIC;
  }

  return null;
}

export function canCreateNode(
  subscription: Subscription,
  childLevel: NodeLevel,
  parent: ParentNodeForCreate | null,
  counts: TreeCountSnapshot,
): CreateNodeDecision {
  if (!isAllowedChildLevel(parent?.level ?? null, childLevel)) {
    return {
      allowed: false,
      reason: "Invalid hierarchy: subjects can contain topics, and topics can contain subtopics.",
    };
  }

  if (subscription === SUBSCRIPTION.PAID) {
    return { allowed: true };
  }

  if (childLevel === NODE_LEVEL.SUBJECT) {
    if (counts.subjects >= 1) {
      return { allowed: false, reason: "Free plan allows only 1 subject." };
    }

    return { allowed: true };
  }

  if (childLevel === NODE_LEVEL.TOPIC && parent) {
    const current = counts.topicsBySubjectId[parent.id] ?? 0;
    if (current >= 3) {
      return { allowed: false, reason: "Free plan allows up to 3 topics per subject." };
    }

    return { allowed: true };
  }

  if (childLevel === NODE_LEVEL.SUBTOPIC && parent) {
    const current = counts.subtopicsByTopicId[parent.id] ?? 0;
    if (current >= 3) {
      return { allowed: false, reason: "Free plan allows up to 3 subtopics per topic." };
    }

    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Unsupported node creation request.",
  };
}
