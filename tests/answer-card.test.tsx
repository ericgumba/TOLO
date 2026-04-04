import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { AnswerCard } from "@/app/components/quiz/answer-card";

describe("AnswerCard", () => {
  it("renders a microphone button in editable mode", () => {
    const html = renderToStaticMarkup(
      <AnswerCard
        questionId="c12345678901234567890124"
        from="/subject/c12345678901234567890125"
        draftAnswer=""
        editable
        hints={[]}
        formAction={vi.fn()}
        onDraftAnswerChange={vi.fn()}
      />,
    );

    expect(html).toContain("Use microphone");
    expect(html).toContain('name="answer"');
  });

  it("switches the hint button to reveal the answer after three hints", () => {
    const html = renderToStaticMarkup(
      <AnswerCard
        questionId="c12345678901234567890124"
        from="/subject/c12345678901234567890125"
        draftAnswer=""
        editable
        hints={["Hint 1", "Hint 2", "Hint 3"]}
        formAction={vi.fn()}
        onDraftAnswerChange={vi.fn()}
      />,
    );

    expect(html).toContain("Reveal answer");
  });

  it("renders the revealed answer inline", () => {
    const html = renderToStaticMarkup(
      <AnswerCard
        questionId="c12345678901234567890124"
        from="/subject/c12345678901234567890125"
        draftAnswer=""
        editable
        hints={["Hint 1", "Hint 2", "Hint 3"]}
        revealedAnswer="TCP uses sequence numbers, acknowledgments, retransmission timers, and buffering to recover ordered delivery."
        formAction={vi.fn()}
        onDraftAnswerChange={vi.fn()}
      />,
    );

    expect(html).toContain("Revealed answer");
    expect(html).toContain("TCP uses sequence numbers");
  });

  it("does not render the microphone button in read-only mode", () => {
    const html = renderToStaticMarkup(
      <AnswerCard
        questionId="c12345678901234567890124"
        from="/subject/c12345678901234567890125"
        answer="TCP uses acknowledgments."
        editable={false}
      />,
    );

    expect(html).not.toContain("Use microphone");
    expect(html).toContain("TCP uses acknowledgments.");
  });
});
