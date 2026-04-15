import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/concepts", () => ({
  addTagToConceptAction: vi.fn(),
  deleteConceptAction: vi.fn(),
  resetConceptReviewStateAction: vi.fn(),
}));

import { ConceptListItem } from "@/app/components/concept-list-item";

describe("ConceptListItem", () => {
  it("renders clickable unlocked study categories after the concept has been defined", () => {
    const html = renderToStaticMarkup(
      <ConceptListItem
        conceptId="question-1"
        conceptTitle="TCP"
        canCompare
        compareHref="/compare/question-1?from=%2Fsubject%2Fsubject-1"
        conceptScore={91}
        tags={["Networking", "Transport"]}
        generatedQuestionScores={[
          { id: "generated-1", category: "EXPLAIN", body: "Explain how TCP guarantees ordered delivery.", score: 88 },
          { id: "generated-2", category: "ANALYZE", body: "Analyze what changes when TCP loses acknowledgments.", score: 81 },
          { id: "generated-3", category: "EVALUATE", body: "Evaluate TCP against UDP for video streaming.", score: null },
          { id: "generated-4", category: "APPLY", body: "Apply TCP to a file transfer scenario.", score: 74 },
          { id: "generated-5", category: "TEACH", body: "Teach TCP to a beginner using a simple analogy.", score: 67 },
        ]}
        returnTo="/subject/subject-1"
        lastAnsweredAt={null}
        nextReviewAt={new Date("2026-04-11T10:00:00.000Z")}
        now={new Date("2026-04-10T10:00:00.000Z")}
      />,
    );

    expect(html).toContain(">TCP<");
    expect(html).toContain(">Compare<");
    expect(html).toContain('href="/compare/question-1?from=%2Fsubject%2Fsubject-1"');
    expect(html).toContain(">Networking<");
    expect(html).toContain(">Transport<");
    expect(html).toContain(">Add Tag<");
    expect(html).toContain('name="tagName"');
    expect(html).toContain('value="question-1"');
    expect(html).toContain(">Define<");
    expect(html).toContain(">Explain<");
    expect(html).toContain(">Analyze<");
    expect(html).toContain(">Evaluate<");
    expect(html).toContain(">Apply<");
    expect(html).toContain(">Teach<");
    expect(html).toContain(">91<");
    expect(html).toContain(">88<");
    expect(html).toContain(">81<");
    expect(html).toContain(">74<");
    expect(html).toContain(">67<");
    expect(html).toContain(">—<");
    expect(html).toContain("Define TCP in your own words.");
    expect(html).toContain("Explain how TCP guarantees ordered delivery.");
    expect(html).toContain("Teach TCP to a beginner using a simple analogy.");
    expect(html).toContain('href="/quiz/question-1?from=%2Fsubject%2Fsubject-1"');
    expect(html).toContain('href="/quiz/generated/generated-1?from=%2Fsubject%2Fsubject-1"');
    expect(html).toContain('href="/quiz/generated/generated-5?from=%2Fsubject%2Fsubject-1"');
    expect(html.match(/Last answered at: Never/g)).toHaveLength(1);
    expect(html.match(/Next review: in 1 day/g)).toHaveLength(1);
  });

  it("does not show category links before the concept has been defined", () => {
    const html = renderToStaticMarkup(
      <ConceptListItem
        conceptId="question-1"
        conceptTitle="TCP"
        canCompare={false}
        compareHref={undefined}
        conceptScore={null}
        tags={[]}
        generatedQuestionScores={[
          { id: "generated-1", category: "EXPLAIN", body: "Explain TCP.", score: 88 },
          { id: "generated-2", category: "ANALYZE", body: "Analyze TCP.", score: 81 },
        ]}
        returnTo="/subject/subject-1"
        lastAnsweredAt={null}
        nextReviewAt={new Date("2026-04-11T10:00:00.000Z")}
        now={new Date("2026-04-10T10:00:00.000Z")}
      />,
    );

    expect(html).not.toContain(">Define<");
    expect(html).not.toContain(">Explain<");
    expect(html).toContain(">Compare<");
    expect(html).toContain("disabled");
    expect(html).not.toContain("/quiz/generated/generated-1");
    expect(html).not.toContain("Define TCP in your own words.");
  });
});
