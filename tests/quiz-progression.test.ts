import { describe, expect, it } from "vitest";

import { getQuizProgressState } from "@/lib/quiz/progression";

describe("getQuizProgressState", () => {
  it("keeps the quiz active while there are still asked questions to answer", () => {
    expect(
      getQuizProgressState({
        attemptsCount: 2,
        totalQuestionCount: 4,
        followUpCount: 3,
      }),
    ).toEqual({
      activeQuestionIndex: 2,
      isComplete: false,
    });
  });

  it("marks the quiz complete once the follow-up limit is reached and all asked questions are answered", () => {
    expect(
      getQuizProgressState({
        attemptsCount: 4,
        totalQuestionCount: 4,
        followUpCount: 3,
      }),
    ).toEqual({
      activeQuestionIndex: 3,
      isComplete: true,
    });
  });

  it("does not mark the quiz complete before the follow-up limit is reached", () => {
    expect(
      getQuizProgressState({
        attemptsCount: 2,
        totalQuestionCount: 2,
        followUpCount: 1,
      }),
    ).toEqual({
      activeQuestionIndex: 1,
      isComplete: false,
    });
  });
});
