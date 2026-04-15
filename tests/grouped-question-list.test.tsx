import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/components/concept-list-item", () => ({
  ConceptListItem: ({
    conceptId,
    conceptScore,
    canCompare,
    generatedQuestionScores,
    tags,
    lastAnsweredAt,
    nextReviewAt,
  }: {
    conceptId: string;
    conceptScore: number | null;
    canCompare: boolean;
    generatedQuestionScores?: Array<{ id: string; category: string; body: string; score: number | null }>;
    tags?: string[];
    lastAnsweredAt: Date | null;
    nextReviewAt: Date | null;
  }) => (
    <div
      data-concept-id={conceptId}
      data-concept-score={conceptScore === null ? "none" : String(conceptScore)}
      data-can-compare={canCompare ? "yes" : "no"}
      data-generated-question-scores={
        generatedQuestionScores?.map((question) => `${question.id}:${question.category}:${question.score === null ? "none" : question.score}`).join(" | ") ?? ""
      }
      data-tags={tags?.join(" | ") ?? ""}
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
            score: 84,
            tags: ["Scheduling"],
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
    expect(html).toContain('data-concept-score="84"');
    expect(html).toContain('data-can-compare="no"');
    expect(html).toContain('data-tags="Scheduling"');
  });

  it("shows never when the question has no attempts", () => {
    const html = renderToStaticMarkup(
      <GroupedConceptList
        concepts={[
          {
            id: "question-1",
            nodeId: "node-1",
            title: "process",
            score: null,
            tags: [],
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
    expect(html).toContain('data-concept-score="none"');
    expect(html).toContain('data-can-compare="no"');
  });

  it("passes generated question scores through to the concept list item", () => {
    const html = renderToStaticMarkup(
      <GroupedConceptList
        concepts={[
          {
            id: "question-1",
            nodeId: "node-1",
            title: "TCP",
            score: 95,
            tags: [],
            generatedQuestions: [
              { id: "generated-3", category: "TEACH", body: "Teach TCP.", score: 71 },
              { id: "generated-1", category: "EXPLAIN", body: "Explain TCP.", score: 88 },
              { id: "generated-2", category: "APPLY", body: "Apply TCP.", score: null },
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

    expect(html).toContain('data-generated-question-scores="generated-3:TEACH:71 | generated-1:EXPLAIN:88 | generated-2:APPLY:none"');
  });

  it("enables compare when more than one concept is present in the current list", () => {
    const html = renderToStaticMarkup(
      <GroupedConceptList
        concepts={[
          {
            id: "question-1",
            nodeId: "node-1",
            title: "TCP",
            score: 95,
            tags: [],
            generatedQuestions: [],
            reviewStates: [
              {
                lastAnsweredAt: null,
                nextReviewAt: new Date("2026-04-10T10:00:00.000Z"),
              },
            ],
          },
          {
            id: "question-2",
            nodeId: "node-1",
            title: "UDP",
            score: 84,
            tags: [],
            generatedQuestions: [],
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

    expect(html.match(/data-can-compare="yes"/g)).toHaveLength(2);
  });
});
