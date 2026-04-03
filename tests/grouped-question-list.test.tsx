import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/question-list-item", () => ({
  QuestionListItem: ({
    questionId,
    lastAnsweredAt,
    nextReviewAt,
  }: {
    questionId: string;
    lastAnsweredAt: Date | null;
    nextReviewAt: Date | null;
  }) => (
    <div
      data-question-id={questionId}
      data-last-answered-at={lastAnsweredAt ? lastAnsweredAt.toISOString() : "never"}
      data-next-review-at={nextReviewAt ? nextReviewAt.toISOString() : "none"}
    />
  ),
}));

import { GroupedQuestionList } from "@/app/components/grouped-question-list";

describe("GroupedQuestionList", () => {
  it("uses the most recent attempt time for last answered at", () => {
    const html = renderToStaticMarkup(
      <GroupedQuestionList
        questions={[
          {
            id: "question-1",
            nodeId: "node-1",
            body: "What is a process?",
            reviewStates: [
              {
                lastAnsweredAt: new Date("2026-04-03T08:30:00.000Z"),
                nextReviewAt: new Date("2026-04-10T10:00:00.000Z"),
              },
            ],
          },
        ]}
        nodePathById={new Map([["node-1", "Operating Systems"]])}
        fallbackPath="Operating Systems"
        returnTo="/subject/subject-1"
        now={new Date("2026-04-03T09:00:00.000Z")}
        emptyMessage="No questions"
      />,
    );

    expect(html).toContain('data-last-answered-at="2026-04-03T08:30:00.000Z"');
    expect(html).toContain('data-next-review-at="2026-04-10T10:00:00.000Z"');
  });

  it("shows never when the question has no attempts", () => {
    const html = renderToStaticMarkup(
      <GroupedQuestionList
        questions={[
          {
            id: "question-1",
            nodeId: "node-1",
            body: "What is a process?",
            reviewStates: [
              {
                lastAnsweredAt: null,
                nextReviewAt: new Date("2026-04-10T10:00:00.000Z"),
              },
            ],
          },
        ]}
        nodePathById={new Map([["node-1", "Operating Systems"]])}
        fallbackPath="Operating Systems"
        returnTo="/subject/subject-1"
        now={new Date("2026-04-03T09:00:00.000Z")}
        emptyMessage="No questions"
      />,
    );

    expect(html).toContain('data-last-answered-at="never"');
  });
});
