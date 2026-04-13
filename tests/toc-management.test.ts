import { NodeLevel } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { getTocDeleteDescription, getTocDeleteLabel, getTocDeleteReturnTo } from "@/lib/tree/toc-management";

describe("toc management", () => {
  it("always returns the dashboard after a sidebar delete", () => {
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

  it("labels subjects explicitly", () => {
    expect(getTocDeleteLabel(NodeLevel.SUBJECT)).toBe("subject");
  });

  it("describes subject deletion in the new model", () => {
    expect(getTocDeleteDescription(NodeLevel.SUBJECT)).toContain("attached concepts");
    expect(getTocDeleteDescription(NodeLevel.SUBJECT)).toContain("tags");
  });
});
