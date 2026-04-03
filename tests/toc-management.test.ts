import { NodeLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getTocDeleteDescription, getTocDeleteReturnTo } from "@/lib/tree/toc-management";

describe("getTocDeleteReturnTo", () => {
  it("returns the dashboard when deleting a subject", () => {
    expect(
      getTocDeleteReturnTo(
        {
          id: "subject-1",
          level: NodeLevel.SUBJECT,
          parentId: null,
        },
        {
          subjectId: "subject-1",
        },
      ),
    ).toBe("/dashboard");
  });

  it("returns the subject page when deleting the active topic", () => {
    expect(
      getTocDeleteReturnTo(
        {
          id: "topic-1",
          level: NodeLevel.TOPIC,
          parentId: "subject-1",
        },
        {
          subjectId: "subject-1",
          activeTopicId: "topic-1",
        },
      ),
    ).toBe("/subject/subject-1");
  });

  it("stays on the current topic view when deleting a sibling topic", () => {
    expect(
      getTocDeleteReturnTo(
        {
          id: "topic-2",
          level: NodeLevel.TOPIC,
          parentId: "subject-1",
        },
        {
          subjectId: "subject-1",
          activeTopicId: "topic-1",
          activeSubtopicId: "subtopic-1",
        },
      ),
    ).toBe("/subject/subject-1/topic/topic-1?subtopic=subtopic-1");
  });

  it("returns the topic page when deleting the active subtopic", () => {
    expect(
      getTocDeleteReturnTo(
        {
          id: "subtopic-1",
          level: NodeLevel.SUBTOPIC,
          parentId: "topic-1",
        },
        {
          subjectId: "subject-1",
          activeTopicId: "topic-1",
          activeSubtopicId: "subtopic-1",
        },
      ),
    ).toBe("/subject/subject-1/topic/topic-1");
  });
});

describe("getTocDeleteDescription", () => {
  it("describes subject deletion", () => {
    expect(getTocDeleteDescription(NodeLevel.SUBJECT)).toContain("nested topics and subtopics");
  });

  it("describes topic deletion", () => {
    expect(getTocDeleteDescription(NodeLevel.TOPIC)).toContain("nested subtopics");
  });

  it("describes subtopic deletion", () => {
    expect(getTocDeleteDescription(NodeLevel.SUBTOPIC)).toContain("attached questions");
  });
});
