import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GeneratedQuestionSuggestions } from "@/app/components/quiz/generated-question-suggestions";

describe("GeneratedQuestionSuggestions", () => {
  it("renders the suggestions across explain, analyze, evaluate, apply, and teach types", () => {
    const questions = ["Explain 1", "Analyze 1", "Evaluate 1", "Apply 1", "Teach 1"];

    const html = renderToStaticMarkup(
      <GeneratedQuestionSuggestions questions={questions} />,
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
    expect(html).toContain("These study questions are now attached to the original question");
  });

  it("renders read-only generated questions without add or remove controls", () => {
    const questions = ["Explain 1", "Analyze 1", "Evaluate 1", "Apply 1", "Teach 1"];

    const html = renderToStaticMarkup(<GeneratedQuestionSuggestions questions={questions} />);

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
    expect(html).not.toContain("Add all");
    expect(html).not.toContain("Remove");
  });
});
