import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/concepts", () => ({
  deleteConceptAction: vi.fn(),
  resetConceptReviewStateAction: vi.fn(),
}));

import { ConceptListItem } from "@/app/components/concept-list-item";

describe("ConceptListItem", () => {
  it("renders attached generated questions with clickable study-lens links", () => {
    const html = renderToStaticMarkup(
      <ConceptListItem
        conceptId="question-1"
        conceptTitle="What is TCP?"
        generatedQuestions={[
          { id: "generated-1", body: "Why does TCP need flow control?" },
          { id: "generated-2", body: "How would TCP behave without acknowledgments?" },
          { id: "generated-3", body: "When is TCP a better fit than UDP?" },
          { id: "generated-4", body: "How would you apply TCP to a file transfer scenario?" },
          { id: "generated-5", body: "How would you teach TCP to a beginner?" },
        ]}
        returnTo="/subject/subject-1"
        lastAnsweredAt={null}
        nextReviewAt={new Date("2026-04-11T10:00:00.000Z")}
        now={new Date("2026-04-10T10:00:00.000Z")}
      />,
    );

    expect(html).toContain("Study Lenses");
    expect(html).toContain(">Explain<");
    expect(html).toContain(">Analyze<");
    expect(html).toContain(">Evaluate<");
    expect(html).toContain(">Apply<");
    expect(html).toContain(">Teach<");
    expect(html).toContain("Why does TCP need flow control?");
    expect(html).toContain("How would TCP behave without acknowledgments?");
    expect(html).toContain("When is TCP a better fit than UDP?");
    expect(html).toContain("How would you apply TCP to a file transfer scenario?");
    expect(html).toContain("How would you teach TCP to a beginner?");
    expect(html).toContain('href="/quiz/generated/generated-1?from=%2Fsubject%2Fsubject-1"');
    expect(html.match(/Last answered at: Never/g)).toHaveLength(1);
    expect(html.match(/Next review: in 1 day/g)).toHaveLength(1);
  });
});
