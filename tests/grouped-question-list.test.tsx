import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/concept-list-item", () => ({
  ConceptListItem: ({
    conceptId,
    generatedQuestions,
    lastAnsweredAt,
    nextReviewAt,
  }: {
    conceptId: string;
    generatedQuestions?: Array<{ id: string; body: string }>;
    lastAnsweredAt: Date | null;
    nextReviewAt: Date | null;
  }) => (
    <div
      data-concept-id={conceptId}
      data-generated-questions={generatedQuestions?.map((question) => question.body).join(" | ") ?? ""}
      data-generated-question-ids={generatedQuestions?.map((question) => question.id).join(" | ") ?? ""}
      data-last-answered-at={lastAnsweredAt ? lastAnsweredAt.toISOString() : "never"}
      data-next-review-at={nextReviewAt ? nextReviewAt.toISOString() : "none"}
    />
  ),
}));

import { GroupedConceptList } from "@/app/components/grouped-concept-list";

describe("GroupedConceptList", () => {
  it("uses the most recent attempt time for last answered at", () => {
    const html = renderToStaticMarkup(
      <GroupedConceptList
        concepts={[
          {
            id: "question-1",
            nodeId: "node-1",
            title: "process",
            generatedQuestions: [],
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
      <GroupedConceptList
        concepts={[
          {
            id: "question-1",
            nodeId: "node-1",
            title: "process",
            generatedQuestions: [],
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

  it("sorts attached generated questions by study lens before rendering", () => {
    const html = renderToStaticMarkup(
      <GroupedConceptList
        concepts={[
          {
            id: "question-1",
            nodeId: "node-1",
            title: "TCP",
            generatedQuestions: [
              { id: "generated-3", category: "TEACH", body: "Teach TCP." },
              { id: "generated-1", category: "EXPLAIN", body: "Explain TCP." },
              { id: "generated-2", category: "APPLY", body: "Apply TCP." },
            ],
            reviewStates: [
              {
                lastAnsweredAt: null,
                nextReviewAt: new Date("2026-04-10T10:00:00.000Z"),
              },
            ],
          },
        ]}
        nodePathById={new Map([["node-1", "Networking"]])}
        fallbackPath="Networking"
        returnTo="/subject/subject-1"
        now={new Date("2026-04-03T09:00:00.000Z")}
        emptyMessage="No questions"
      />,
    );

    expect(html).toContain('data-generated-questions="Explain TCP. | Apply TCP. | Teach TCP."');
    expect(html).toContain('data-generated-question-ids="generated-1 | generated-2 | generated-3"');
  });
});
