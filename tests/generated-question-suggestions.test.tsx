import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GeneratedQuestionSuggestions } from "@/app/components/quiz/generated-question-suggestions";

describe("GeneratedQuestionSuggestions", () => {
  it("renders the suggestions across explain, analyze, evaluate, apply, and teach types", () => {
    const questions = ["Explain 1", "Analyze 1", "Evaluate 1", "Apply 1", "Teach 1"];

    const html = renderToStaticMarkup(
      <GeneratedQuestionSuggestions
        questions={questions}
        questionStatuses={{}}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onAddAll={vi.fn()}
        pendingQuestion={null}
        pendingQuestionAction={null}
        addAllPending={false}
      />,
    );

    expect(html).toContain(">Explain<");
    expect(html).toContain(">Analyze<");
    expect(html).toContain(">Evaluate<");
    expect(html).toContain(">Apply<");
    expect(html).toContain(">Teach<");
    expect(html).toContain("Explain 1");
    expect(html).toContain("Analyze 1");
    expect(html).toContain("Evaluate 1");
    expect(html).toContain("Apply 1");
    expect(html).toContain("Teach 1");
  });

  it("keeps type positions and shows added questions with a remove action", () => {
    const questions = ["Explain 1", "Analyze 1", "Evaluate 1", "Apply 1", "Teach 1"];

    const html = renderToStaticMarkup(
      <GeneratedQuestionSuggestions
        questions={questions}
        questionStatuses={{
          "Explain 1": { kind: "added", questionId: "question-1" },
        }}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onAddAll={vi.fn()}
        pendingQuestion={null}
        pendingQuestionAction={null}
        addAllPending={false}
      />,
    );

    expect(html).toContain(">Explain<");
    expect(html).toContain(">Analyze<");
    expect(html).toContain(">Evaluate<");
    expect(html).toContain(">Apply<");
    expect(html).toContain(">Teach<");
    expect(html).toContain("Explain 1");
    expect(html).toContain("Analyze 1");
    expect(html).toContain("Evaluate 1");
    expect(html).toContain("Apply 1");
    expect(html).toContain("Teach 1");
    expect(html).toContain("Added");
    expect(html).toContain("Remove");
  });
});
