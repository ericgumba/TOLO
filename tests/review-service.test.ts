import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    concept: {
      findFirst: vi.fn(),
    },
    reviewState: {
      findUnique: vi.fn(),
      update: vi.fn(),
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

  it("records last answered at even when the review is not due yet", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
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
    expect(prismaMock.reviewState.update).toHaveBeenCalledWith({
      where: {
        userId_conceptId: {
          userId: "user-1",
          conceptId: "question-1",
        },
      },
      data: {
        lastAnsweredAt: new Date("2026-03-25T12:00:00.000Z"),
      },
    });
  });

  it("updates the review state when the answer is submitted after the review is due", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
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
    expect(prismaMock.reviewState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          intervalDays: 1,
          repetitionCount: 1,
          status: "LEARNING",
          lastAnsweredAt: new Date("2026-03-26T12:00:00.000Z"),
        }),
        update: expect.objectContaining({
          intervalDays: 1,
          repetitionCount: 1,
          status: "LEARNING",
          lastAnsweredAt: new Date("2026-03-26T12:00:00.000Z"),
        }),
      }),
    );
  });

  it("advances the interval ladder even when the score is low", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
      id: "question-1",
    });
    prismaMock.reviewState.findUnique.mockResolvedValue({
      status: "LEARNING",
      intervalDays: 7,
      repetitionCount: 2,
      lastReviewedAt: new Date("2026-03-25T00:00:00.000Z"),
      nextReviewAt: new Date("2026-03-26T00:00:00.000Z"),
    });

    await upsertReviewStateFromAttempt({
      userId: "user-1",
      questionId: "question-1",
      llmScore: 15,
      reviewedAt: new Date("2026-03-26T12:00:00.000Z"),
    });

    expect(prismaMock.reviewState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          intervalDays: 14,
          repetitionCount: 3,
          status: "MASTERED",
        }),
      }),
    );
  });
});
