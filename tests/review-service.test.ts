import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    question: {
      findFirst: vi.fn(),
    },
    reviewState: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import { upsertReviewStateFromAttempt } from "@/lib/review/service";

describe("upsertReviewStateFromAttempt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips updating the review state when the answer is submitted before the review is due", async () => {
    prismaMock.question.findFirst.mockResolvedValue({
      id: "question-1",
    });
    prismaMock.reviewState.findUnique.mockResolvedValue({
      status: "LEARNING",
      intervalDays: 1,
      repetitionCount: 0,
      lastReviewedAt: new Date("2026-03-25T00:00:00.000Z"),
      nextReviewAt: new Date("2026-03-26T00:00:00.000Z"),
    });

    await upsertReviewStateFromAttempt({
      userId: "user-1",
      questionId: "question-1",
      llmScore: 90,
      reviewedAt: new Date("2026-03-25T12:00:00.000Z"),
    });

    expect(prismaMock.reviewState.upsert).not.toHaveBeenCalled();
  });

  it("updates the review state when the answer is submitted after the review is due", async () => {
    prismaMock.question.findFirst.mockResolvedValue({
      id: "question-1",
    });
    prismaMock.reviewState.findUnique.mockResolvedValue({
      status: "LEARNING",
      intervalDays: 1,
      repetitionCount: 0,
      lastReviewedAt: new Date("2026-03-25T00:00:00.000Z"),
      nextReviewAt: new Date("2026-03-26T00:00:00.000Z"),
    });

    await upsertReviewStateFromAttempt({
      userId: "user-1",
      questionId: "question-1",
      llmScore: 90,
      reviewedAt: new Date("2026-03-26T12:00:00.000Z"),
    });

    expect(prismaMock.reviewState.upsert).toHaveBeenCalledOnce();
  });
});
