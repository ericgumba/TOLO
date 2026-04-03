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
  it("advances from 1 day to 3 days regardless of score", () => {
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

    expect(lowScore.status).toBe(REVIEW_STATUS.REVIEW);
    expect(lowScore.intervalDays).toBe(3);
    expect(lowScore.repetitionCount).toBe(1);
    expect(highScore.status).toBe(REVIEW_STATUS.REVIEW);
    expect(highScore.intervalDays).toBe(3);
    expect(highScore.repetitionCount).toBe(1);
  });

  it("advances through the fixed interval ladder", () => {
    const reviewedAt = new Date("2026-03-25T00:00:00.000Z");
    const toSeven = computeNextReviewState({
      llmScore: 65,
      reviewedAt,
      currentIntervalDays: 3,
      currentRepetitionCount: 1,
    });

    const toFourteen = computeNextReviewState({
      llmScore: 25,
      reviewedAt,
      currentIntervalDays: 7,
      currentRepetitionCount: 2,
    });

    const toThirty = computeNextReviewState({
      llmScore: 90,
      reviewedAt,
      currentIntervalDays: 14,
      currentRepetitionCount: 3,
    });

    const toSixty = computeNextReviewState({
      llmScore: 90,
      reviewedAt,
      currentIntervalDays: 30,
      currentRepetitionCount: 4,
    });

    expect(toSeven.status).toBe(REVIEW_STATUS.REVIEW);
    expect(toSeven.intervalDays).toBe(7);
    expect(toSeven.repetitionCount).toBe(2);
    expect(toSeven.nextReviewAt.toISOString()).toBe("2026-04-01T00:00:00.000Z");

    expect(toFourteen.status).toBe(REVIEW_STATUS.MASTERED);
    expect(toFourteen.intervalDays).toBe(14);
    expect(toFourteen.repetitionCount).toBe(3);

    expect(toThirty.status).toBe(REVIEW_STATUS.MASTERED);
    expect(toThirty.intervalDays).toBe(30);
    expect(toThirty.repetitionCount).toBe(4);

    expect(toSixty.status).toBe(REVIEW_STATUS.MASTERED);
    expect(toSixty.intervalDays).toBe(60);
    expect(toSixty.repetitionCount).toBe(5);
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
