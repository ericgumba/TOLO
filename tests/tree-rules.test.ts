import { describe, expect, it } from "vitest";

import {
  SUBSCRIPTION,
  canCreateNode,
  isAllowedChildLevel,
  NODE_LEVEL,
  resolveChildLevel,
  type TreeCountSnapshot,
} from "@/lib/tree/rules";

describe("tree rules", () => {
  it("allows only top-level subjects", () => {
    expect(isAllowedChildLevel(null, NODE_LEVEL.SUBJECT)).toBe(true);
    expect(isAllowedChildLevel(NODE_LEVEL.SUBJECT, NODE_LEVEL.SUBJECT)).toBe(false);
    expect(resolveChildLevel(null)).toBe(NODE_LEVEL.SUBJECT);
    expect(resolveChildLevel(NODE_LEVEL.SUBJECT)).toBeNull();
  });

  it("lets paid users create subjects and rejects nested nodes", () => {
    const counts: TreeCountSnapshot = {
      subjects: 100,
    };

    expect(canCreateNode(SUBSCRIPTION.PAID, NODE_LEVEL.SUBJECT, null, counts)).toEqual({
      allowed: true,
    });

    expect(canCreateNode(SUBSCRIPTION.PAID, NODE_LEVEL.SUBJECT, { id: "s1", level: NODE_LEVEL.SUBJECT }, counts)).toEqual({
      allowed: false,
      reason: "Invalid hierarchy: only top-level subjects can be created.",
    });
  });

  it("enforces the free subject limit", () => {
    const counts: TreeCountSnapshot = {
      subjects: 1,
    };

    expect(canCreateNode(SUBSCRIPTION.FREE, NODE_LEVEL.SUBJECT, null, counts)).toEqual({
      allowed: false,
      reason: "Free plan allows only 1 subject.",
    });
  });
});
