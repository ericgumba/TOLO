import { describe, expect, it } from "vitest";

import {
  REVIEW_STATUS,
  computeNextReviewState,
  createInitialReviewState,
  shouldAdvanceReviewState,
} from "@/lib/review/scheduler";

describe("createInitialReviewState", () => {
  it("initializes a NEW review state due immediately", () => {
    const now = new Date("2026-03-25T00:00:00.000Z");
    const initial = createInitialReviewState(now);

    expect(initial.status).toBe(REVIEW_STATUS.NEW);
    expect(initial.intervalDays).toBe(1);
    expect(initial.repetitionCount).toBe(0);
    expect(initial.lastReviewedAt).toBeNull();
    expect(initial.nextReviewAt.toISOString()).toBe(now.toISOString());
  });
});

describe("computeNextReviewState", () => {
  it("keeps the first due answer at 1 day regardless of score", () => {
    const reviewedAt = new Date("2026-03-25T00:00:00.000Z");

    const lowScore = computeNextReviewState({
      llmScore: 20,
      reviewedAt,
      currentIntervalDays: 1,
      currentRepetitionCount: 0,
    });

    const highScore = computeNextReviewState({
      llmScore: 95,
      reviewedAt,
      currentIntervalDays: 1,
      currentRepetitionCount: 0,
    });

    expect(lowScore.status).toBe(REVIEW_STATUS.LEARNING);
    expect(lowScore.intervalDays).toBe(1);
    expect(lowScore.repetitionCount).toBe(1);
    expect(highScore.status).toBe(REVIEW_STATUS.LEARNING);
    expect(highScore.intervalDays).toBe(1);
    expect(highScore.repetitionCount).toBe(1);
  });

  it("advances through the fixed interval ladder", () => {
    const reviewedAt = new Date("2026-03-25T00:00:00.000Z");
    const toTwo = computeNextReviewState({
      llmScore: 65,
      reviewedAt,
      currentIntervalDays: 1,
      currentRepetitionCount: 1,
    });

    const toThree = computeNextReviewState({
      llmScore: 25,
      reviewedAt,
      currentIntervalDays: 2,
      currentRepetitionCount: 2,
    });

    const toSeven = computeNextReviewState({
      llmScore: 65,
      reviewedAt,
      currentIntervalDays: 3,
      currentRepetitionCount: 3,
    });

    const toFourteen = computeNextReviewState({
      llmScore: 25,
      reviewedAt,
      currentIntervalDays: 7,
      currentRepetitionCount: 4,
    });

    const toThirty = computeNextReviewState({
      llmScore: 90,
      reviewedAt,
      currentIntervalDays: 14,
      currentRepetitionCount: 5,
    });

    const toSixty = computeNextReviewState({
      llmScore: 90,
      reviewedAt,
      currentIntervalDays: 30,
      currentRepetitionCount: 6,
    });

    expect(toTwo.status).toBe(REVIEW_STATUS.REVIEW);
    expect(toTwo.intervalDays).toBe(2);
    expect(toTwo.repetitionCount).toBe(2);
    expect(toTwo.nextReviewAt.toISOString()).toBe("2026-03-27T00:00:00.000Z");

    expect(toThree.status).toBe(REVIEW_STATUS.REVIEW);
    expect(toThree.intervalDays).toBe(3);
    expect(toThree.repetitionCount).toBe(3);
    expect(toThree.nextReviewAt.toISOString()).toBe("2026-03-28T00:00:00.000Z");

    expect(toSeven.status).toBe(REVIEW_STATUS.REVIEW);
    expect(toSeven.intervalDays).toBe(7);
    expect(toSeven.repetitionCount).toBe(4);
    expect(toSeven.nextReviewAt.toISOString()).toBe("2026-04-01T00:00:00.000Z");

    expect(toFourteen.status).toBe(REVIEW_STATUS.MASTERED);
    expect(toFourteen.intervalDays).toBe(14);
    expect(toFourteen.repetitionCount).toBe(5);

    expect(toThirty.status).toBe(REVIEW_STATUS.MASTERED);
    expect(toThirty.intervalDays).toBe(30);
    expect(toThirty.repetitionCount).toBe(6);

    expect(toSixty.status).toBe(REVIEW_STATUS.MASTERED);
    expect(toSixty.intervalDays).toBe(60);
    expect(toSixty.repetitionCount).toBe(7);
  });

  it("caps at the last fixed interval", () => {
    const reviewedAt = new Date("2026-03-25T00:00:00.000Z");

    const next = computeNextReviewState({
      llmScore: 10,
      reviewedAt,
      currentIntervalDays: 120,
      currentRepetitionCount: 10,
    });

    expect(next.intervalDays).toBe(120);
    expect(next.repetitionCount).toBe(11);
    expect(next.status).toBe(REVIEW_STATUS.MASTERED);
  });
});

describe("shouldAdvanceReviewState", () => {
  it("returns true when the review is due", () => {
    expect(
      shouldAdvanceReviewState({
        reviewedAt: new Date("2026-03-25T00:00:00.000Z"),
        nextReviewAt: new Date("2026-03-25T00:00:00.000Z"),
      }),
    ).toBe(true);

    expect(
      shouldAdvanceReviewState({
        reviewedAt: new Date("2026-03-26T00:00:00.000Z"),
        nextReviewAt: new Date("2026-03-25T00:00:00.000Z"),
      }),
    ).toBe(true);
  });

  it("returns false when the answer is submitted before the review is due", () => {
    expect(
      shouldAdvanceReviewState({
        reviewedAt: new Date("2026-03-25T00:00:00.000Z"),
        nextReviewAt: new Date("2026-03-26T00:00:00.000Z"),
      }),
    ).toBe(false);
  });
});
