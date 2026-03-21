import { describe, expect, it } from "vitest";

import {
  SUBSCRIPTION,
  canCreateNode,
  isAllowedChildLevel,
  NODE_LEVEL,
  type TreeCountSnapshot,
} from "@/lib/tree/rules";

describe("isAllowedChildLevel", () => {
  it("allows top-level subjects only when parent is null", () => {
    expect(isAllowedChildLevel(null, NODE_LEVEL.SUBJECT)).toBe(true);
    expect(isAllowedChildLevel(null, NODE_LEVEL.TOPIC)).toBe(false);
    expect(isAllowedChildLevel(null, NODE_LEVEL.SUBTOPIC)).toBe(false);
  });

  it("allows topics under subjects and subtopics under topics", () => {
    expect(isAllowedChildLevel(NODE_LEVEL.SUBJECT, NODE_LEVEL.TOPIC)).toBe(true);
    expect(isAllowedChildLevel(NODE_LEVEL.TOPIC, NODE_LEVEL.SUBTOPIC)).toBe(true);
  });

  it("rejects unsupported parent-child combinations", () => {
    expect(isAllowedChildLevel(NODE_LEVEL.SUBJECT, NODE_LEVEL.SUBTOPIC)).toBe(false);
    expect(isAllowedChildLevel(NODE_LEVEL.TOPIC, NODE_LEVEL.TOPIC)).toBe(false);
    expect(isAllowedChildLevel(NODE_LEVEL.SUBTOPIC, NODE_LEVEL.TOPIC)).toBe(false);
  });
});

describe("canCreateNode", () => {
  it("allows paid users to create unlimited nodes", () => {
    const counts: TreeCountSnapshot = {
      subjects: 100,
      topicsBySubjectId: { s1: 100 },
      subtopicsByTopicId: { t1: 100 },
    };

    expect(canCreateNode(SUBSCRIPTION.PAID, NODE_LEVEL.SUBJECT, null, counts)).toEqual({
      allowed: true,
    });

    expect(
      canCreateNode(SUBSCRIPTION.PAID, NODE_LEVEL.TOPIC, { id: "s1", level: NODE_LEVEL.SUBJECT }, counts),
    ).toEqual({ allowed: true });

    expect(
      canCreateNode(
        SUBSCRIPTION.PAID,
        NODE_LEVEL.SUBTOPIC,
        { id: "t1", level: NODE_LEVEL.TOPIC },
        counts,
      ),
    ).toEqual({ allowed: true });
  });

  it("enforces free plan subject limit", () => {
    const counts: TreeCountSnapshot = {
      subjects: 1,
      topicsBySubjectId: {},
      subtopicsByTopicId: {},
    };

    expect(canCreateNode(SUBSCRIPTION.FREE, NODE_LEVEL.SUBJECT, null, counts)).toEqual({
      allowed: false,
      reason: "Free plan allows only 1 subject.",
    });
  });

  it("enforces free plan topic and subtopic limits", () => {
    const counts: TreeCountSnapshot = {
      subjects: 1,
      topicsBySubjectId: { s1: 3 },
      subtopicsByTopicId: { t1: 3 },
    };

    expect(
      canCreateNode(SUBSCRIPTION.FREE, NODE_LEVEL.TOPIC, { id: "s1", level: NODE_LEVEL.SUBJECT }, counts),
    ).toEqual({
      allowed: false,
      reason: "Free plan allows up to 3 topics per subject.",
    });

    expect(
      canCreateNode(
        SUBSCRIPTION.FREE,
        NODE_LEVEL.SUBTOPIC,
        { id: "t1", level: NODE_LEVEL.TOPIC },
        counts,
      ),
    ).toEqual({
      allowed: false,
      reason: "Free plan allows up to 3 subtopics per topic.",
    });
  });
});
