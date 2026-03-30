import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  prismaMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  prismaMock: {
    question: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    questionAttempt: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    reviewState: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/app/components/quiz/quiz-header", () => ({
  QuizHeader: () => null,
}));

vi.mock("@/app/components/quiz/quiz-body", () => ({
  QuizBody: () => null,
}));

vi.mock("@/app/components/quiz/status-banners", () => ({
  StatusBanners: () => null,
}));

import QuizPage from "@/app/quiz/[questionId]/page";

describe("QuizPage", () => {
  const userId = "c12345678901234567890123";
  const questionId = "c12345678901234567890124";
  const nodeId = "c12345678901234567890125";

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-30T12:00:00.000Z"));
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });
    prismaMock.question.findFirst.mockResolvedValue({
      id: questionId,
      body: "Base question",
      questionType: "MAIN",
      node: {
        id: nodeId,
        title: "Topic",
        level: "TOPIC",
      },
    });
    prismaMock.questionAttempt.findFirst.mockResolvedValue({
      answeredAt: new Date("2026-03-30T11:00:00.000Z"),
    });
    prismaMock.questionAttempt.findMany.mockResolvedValue([]);
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.questionAttempt.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.question.deleteMany.mockResolvedValue({ count: 1 });
    prismaMock.reviewState.findUnique.mockResolvedValue({
      nextReviewAt: new Date("2026-03-31T12:00:00.000Z"),
    });
    prismaMock.reviewState.upsert.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("automatically resets quiz progress when the question needs review", async () => {
    prismaMock.reviewState.findUnique.mockResolvedValue({
      nextReviewAt: new Date("2026-03-30T11:00:00.000Z"),
    });

    await QuizPage({
      params: Promise.resolve({ questionId }),
      searchParams: Promise.resolve({ from: `/subject/${nodeId}` }),
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.questionAttempt.deleteMany).toHaveBeenCalledWith({
      where: {
        questionId,
        userId,
      },
    });
    expect(prismaMock.question.deleteMany).toHaveBeenCalledWith({
      where: {
        userId,
        parentQuestionId: questionId,
        questionType: "FOLLOW_UP",
      },
    });
  });

  it("does not reset quiz progress when the review is not due", async () => {
    await QuizPage({
      params: Promise.resolve({ questionId }),
      searchParams: Promise.resolve({ from: `/subject/${nodeId}` }),
    });

    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(prismaMock.questionAttempt.deleteMany).not.toHaveBeenCalled();
    expect(prismaMock.question.deleteMany).not.toHaveBeenCalled();
  });
});
