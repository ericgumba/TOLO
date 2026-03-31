import { isValidElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const {
  answerCardMock,
  feedbackCardMock,
  generatedQuestionSuggestionsMock,
  questionCardMock,
} = vi.hoisted(() => ({
  answerCardMock: vi.fn(() => null),
  feedbackCardMock: vi.fn(() => null),
  generatedQuestionSuggestionsMock: vi.fn(() => null),
  questionCardMock: vi.fn(() => null),
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
    questionId: "c12345678901234567890124",
    questionBody: "Base question",
    from: "/subject/c12345678901234567890125",
    attempts: [] as Array<{
      userAnswer: string;
      llmScore: number;
      llmFeedback: string;
      llmCorrection: string;
      answeredAt: Date;
    }>,
    generatedQuestions: [] as string[],
    activeHints: [] as string[],
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

    expect(editableAnswerCards).toHaveLength(1);
    expect(suggestionSections).toHaveLength(0);
  });

  it("shows generated MAIN-question suggestions instead of another editable answer form after submission", () => {
    const tree = QuizBody({
      ...baseProps,
      attempts: [
        {
          userAnswer: "Saved answer",
          llmScore: 90,
          llmFeedback: "Good answer.",
          llmCorrection: "No changes needed.",
          answeredAt: new Date("2026-03-30T12:00:00.000Z"),
        },
      ],
      generatedQuestions: ["Generated question one?", "Generated question two?", "Generated question three?"],
    });

    const editableAnswerCards = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === answerCardMock && value.props.editable === true,
    );
    const suggestionSections = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === generatedQuestionSuggestionsMock,
    );

    expect(editableAnswerCards).toHaveLength(0);
    expect(suggestionSections).toHaveLength(1);
    expect(suggestionSections[0] && isValidElement(suggestionSections[0]) ? suggestionSections[0].props.questions : []).toEqual([
      "Generated question one?",
      "Generated question two?",
      "Generated question three?",
    ]);
  });
});
