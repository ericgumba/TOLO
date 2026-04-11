import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { AttachedGeneratedQuestions } from "@/app/components/attached-generated-questions";

describe("AttachedGeneratedQuestions", () => {
  it("renders study-lens links to generated-question quiz pages", () => {
    const html = renderToStaticMarkup(
      <AttachedGeneratedQuestions
        questions={[
          { id: "generated-1", body: "Explain TCP." },
          { id: "generated-2", body: "Analyze TCP." },
        ]}
        returnTo="/subject/subject-1"
      />,
    );

    expect(html).toContain("Study Lenses");
    expect(html).toContain("href=\"/quiz/generated/generated-1?from=%2Fsubject%2Fsubject-1\"");
    expect(html).toContain("href=\"/quiz/generated/generated-2?from=%2Fsubject%2Fsubject-1\"");
    expect(html).toContain("Explain TCP.");
    expect(html).toContain("Analyze TCP.");
    expect(html).toContain(">Explain<");
    expect(html).toContain(">Analyze<");
  });

  it("returns nothing when there are no generated questions", () => {
    const html = renderToStaticMarkup(<AttachedGeneratedQuestions questions={[]} returnTo="/subject/subject-1" />);

    expect(html).toBe("");
  });
});
