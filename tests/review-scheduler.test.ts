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
  it("maps low scores to short intervals", () => {
    const reviewedAt = new Date("2026-03-25T00:00:00.000Z");

    const struggling = computeNextReviewState({
      llmScore: 20,
      reviewedAt,
      currentIntervalDays: 7,
      currentRepetitionCount: 3,
    });

    expect(struggling.status).toBe(REVIEW_STATUS.STRUGGLING);
    expect(struggling.intervalDays).toBe(1);
    expect(struggling.repetitionCount).toBe(0);

    const learning = computeNextReviewState({
      llmScore: 45,
      reviewedAt,
      currentIntervalDays: 3,
      currentRepetitionCount: 2,
    });

    expect(learning.status).toBe(REVIEW_STATUS.LEARNING);
    expect(learning.intervalDays).toBe(1);
    expect(learning.repetitionCount).toBe(0);
  });

  it("maps medium scores to 3-day intervals", () => {
    const reviewedAt = new Date("2026-03-25T00:00:00.000Z");
    const next = computeNextReviewState({
      llmScore: 65,
      reviewedAt,
      currentIntervalDays: 1,
      currentRepetitionCount: 1,
    });

    expect(next.status).toBe(REVIEW_STATUS.REVIEW);
    expect(next.intervalDays).toBe(3);
    expect(next.repetitionCount).toBe(2);
    expect(next.nextReviewAt.toISOString()).toBe("2026-03-28T00:00:00.000Z");
  });

  it("maps high scores to 7 days first, then doubles", () => {
    const reviewedAt = new Date("2026-03-25T00:00:00.000Z");

    const firstHigh = computeNextReviewState({
      llmScore: 90,
      reviewedAt,
      currentIntervalDays: 3,
      currentRepetitionCount: 2,
    });

    expect(firstHigh.status).toBe(REVIEW_STATUS.REVIEW);
    expect(firstHigh.intervalDays).toBe(7);

    const doubled = computeNextReviewState({
      llmScore: 95,
      reviewedAt,
      currentIntervalDays: 7,
      currentRepetitionCount: 3,
    });

    expect(doubled.status).toBe(REVIEW_STATUS.MASTERED);
    expect(doubled.intervalDays).toBe(14);
    expect(doubled.repetitionCount).toBe(4);
  });

  it("resets interval after repeated low scores", () => {
    const reviewedAt = new Date("2026-03-25T00:00:00.000Z");

    const afterLow = computeNextReviewState({
      llmScore: 25,
      reviewedAt,
      currentIntervalDays: 14,
      currentRepetitionCount: 6,
    });

    expect(afterLow.intervalDays).toBe(1);
    expect(afterLow.repetitionCount).toBe(0);
    expect(afterLow.status).toBe(REVIEW_STATUS.STRUGGLING);
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
