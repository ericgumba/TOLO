export const NODE_LEVEL = {
  SUBJECT: "SUBJECT",
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
};

export type CreateNodeDecision = {
  allowed: boolean;
  reason?: string;
};

export function isAllowedChildLevel(parentLevel: NodeLevel | null, childLevel: NodeLevel): boolean {
  return parentLevel === null && childLevel === NODE_LEVEL.SUBJECT;
}

export function resolveChildLevel(parentLevel: NodeLevel | null): NodeLevel | null {
  return parentLevel === null ? NODE_LEVEL.SUBJECT : null;
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
      reason: "Invalid hierarchy: only top-level subjects can be created.",
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

  return {
    allowed: false,
    reason: "Unsupported node creation request.",
  };
}
