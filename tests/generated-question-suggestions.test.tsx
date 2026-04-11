import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GeneratedQuestionSuggestions } from "@/app/components/quiz/generated-question-suggestions";

describe("GeneratedQuestionSuggestions", () => {
  it("renders clickable study-lens links for generated questions", () => {
    const questions = [
      { id: "generated-1", body: "Explain 1" },
      { id: "generated-2", body: "Analyze 1" },
      { id: "generated-3", body: "Evaluate 1" },
      { id: "generated-4", body: "Apply 1" },
      { id: "generated-5", body: "Teach 1" },
    ];

    const html = renderToStaticMarkup(
      <GeneratedQuestionSuggestions questions={questions} returnTo="/subject/subject-1" />,
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
    expect(html).toContain("These study questions are now attached to the original concept");
    expect(html).toContain('href="/quiz/generated/generated-1?from=%2Fsubject%2Fsubject-1"');
    expect(html).toContain('href="/quiz/generated/generated-5?from=%2Fsubject%2Fsubject-1"');
  });

  it("renders read-only generated questions without add or remove controls", () => {
    const questions = [
      { id: "generated-1", body: "Explain 1" },
      { id: "generated-2", body: "Analyze 1" },
      { id: "generated-3", body: "Evaluate 1" },
      { id: "generated-4", body: "Apply 1" },
      { id: "generated-5", body: "Teach 1" },
    ];

    const html = renderToStaticMarkup(
      <GeneratedQuestionSuggestions questions={questions} returnTo="/subject/subject-1" />,
    );

    expect(html).not.toContain("Add all");
    expect(html).not.toContain("Remove");
  });
});
