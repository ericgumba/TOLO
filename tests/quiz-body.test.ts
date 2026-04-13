import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const {
  answerCardMock,
  feedbackCardMock,
  generatedQuestionSuggestionsMock,
  questionCardMock,
  relatedConceptCardMock,
} = vi.hoisted(() => ({
  answerCardMock: vi.fn(() => null),
  feedbackCardMock: vi.fn(() => null),
  generatedQuestionSuggestionsMock: vi.fn(() => null),
  questionCardMock: vi.fn(() => null),
  relatedConceptCardMock: vi.fn(() => null),
}));

vi.mock("@/app/components/quiz/answer-card", () => ({
  AnswerCard: answerCardMock,
}));

vi.mock("@/app/components/quiz/feedback-card", () => ({
  FeedbackCard: feedbackCardMock,
}));

vi.mock("@/app/components/quiz/generated-question-suggestions", () => ({
  GeneratedQuestionSuggestions: generatedQuestionSuggestionsMock,
}));

vi.mock("@/app/components/quiz/question-card", () => ({
  QuestionCard: questionCardMock,
}));

vi.mock("@/app/components/quiz/related-concept-card", () => ({
  RelatedConceptCard: relatedConceptCardMock,
}));

import { QuizBody } from "@/app/components/quiz/quiz-body";

function collectElements(node: ReactNode, predicate: (value: ReactNode) => boolean, results: ReactNode[] = []): ReactNode[] {
  if (Array.isArray(node)) {
    for (const child of node) {
      collectElements(child, predicate, results);
    }

    return results;
  }

  if (!isValidElement(node)) {
    return results;
  }

  if (predicate(node)) {
    results.push(node);
  }

  collectElements(node.props.children, predicate, results);
  return results;
}

describe("QuizBody", () => {
  const baseProps = {
    promptId: "c12345678901234567890124",
    promptBody: "Base question",
    from: "/subject/c12345678901234567890125",
    draftAnswer: "",
    activeHints: [] as string[],
    revealedAnswer: null as string | null,
    submission: null,
    relatedConcept: null as string | null,
    relatedConceptStatus: "idle" as const,
    generatedQuestions: [] as Array<{ id: string; body: string }>,
    formAction: vi.fn(),
    onDraftAnswerChange: vi.fn(),
    onReset: vi.fn(),
    onAddRelatedConcept: vi.fn(),
  };

  it("shows the editable answer form before submission", () => {
    const tree = QuizBody(baseProps);
    const editableAnswerCards = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === answerCardMock && value.props.editable === true,
    );
    const suggestionSections = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === generatedQuestionSuggestionsMock,
    );
    const relatedConceptCards = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === relatedConceptCardMock,
    );

    expect(editableAnswerCards).toHaveLength(1);
    expect(suggestionSections).toHaveLength(0);
    expect(relatedConceptCards).toHaveLength(0);
  });

  it("shows generated and suggested questions after submission", () => {
    const tree = QuizBody({
      ...baseProps,
      submission: {
        answer: "Saved answer",
        feedback: {
          llmScore: 90,
          llmFeedback: "Good answer.",
          llmCorrection: "No changes needed.",
          answeredAtIso: "2026-04-01T12:00:00.000Z",
        },
      },
      relatedConcept: "hypervisor",
      generatedQuestions: [
        { id: "generated-1", body: "Generated question one?" },
        { id: "generated-2", body: "Generated question two?" },
        { id: "generated-3", body: "Generated question three?" },
      ],
    });

    const editableAnswerCards = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === answerCardMock && value.props.editable === true,
    );
    const suggestionSections = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === generatedQuestionSuggestionsMock,
    );
    const relatedConceptCards = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === relatedConceptCardMock,
    );

    expect(editableAnswerCards).toHaveLength(0);
    expect(suggestionSections).toHaveLength(1);
    expect(suggestionSections[0] && isValidElement(suggestionSections[0]) ? suggestionSections[0].props.questions : []).toEqual([
      { id: "generated-1", body: "Generated question one?" },
      { id: "generated-2", body: "Generated question two?" },
      { id: "generated-3", body: "Generated question three?" },
    ]);
    expect(
      suggestionSections[0] && isValidElement(suggestionSections[0]) ? suggestionSections[0].props.returnTo : undefined,
    ).toBe("/subject/c12345678901234567890125");
    expect(relatedConceptCards).toHaveLength(1);
    expect(
      relatedConceptCards[0] && isValidElement(relatedConceptCards[0])
        ? relatedConceptCards[0].props.concept
        : undefined,
    ).toBe("hypervisor");
  });
});
