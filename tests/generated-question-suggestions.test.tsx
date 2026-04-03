import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { GeneratedQuestionSuggestions } from "@/app/components/quiz/generated-question-suggestions";

describe("GeneratedQuestionSuggestions", () => {
  it("renders the suggestions in easy, medium, and hard tiers", () => {
    const questions = ["Easy 1", "Medium 1", "Hard 1"];

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

    expect(html).toContain(">Easy<");
    expect(html).toContain(">Medium<");
    expect(html).toContain(">Hard<");
    expect(html).toContain("Easy 1");
    expect(html).toContain("Medium 1");
    expect(html).toContain("Hard 1");
  });

  it("keeps tier positions and shows added questions with a remove action", () => {
    const questions = ["Easy 1", "Medium 1", "Hard 1"];

    const html = renderToStaticMarkup(
      <GeneratedQuestionSuggestions
        questions={questions}
        questionStatuses={{
          "Easy 1": { kind: "added", questionId: "question-1" },
        }}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onAddAll={vi.fn()}
        pendingQuestion={null}
        pendingQuestionAction={null}
        addAllPending={false}
      />,
    );

    expect(html).toContain(">Easy<");
    expect(html).toContain(">Medium<");
    expect(html).toContain(">Hard<");
    expect(html).toContain("Easy 1");
    expect(html).toContain("Medium 1");
    expect(html).toContain("Hard 1");
    expect(html).toContain("Added");
    expect(html).toContain("Remove");
  });
});
