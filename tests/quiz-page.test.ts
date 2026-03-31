import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";

const {
  authMock,
  redirectMock,
  prismaMock,
  quizBodyMock,
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
  quizBodyMock: vi.fn(() => null),
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
  QuizBody: quizBodyMock,
}));

vi.mock("@/app/components/quiz/status-banners", () => ({
  StatusBanners: () => null,
}));

import QuizPage from "@/app/quiz/[questionId]/page";

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

  it("passes generated MAIN-question suggestions to the quiz body from query params", async () => {
    prismaMock.questionAttempt.findMany.mockResolvedValue([
      {
        userAnswer: "Saved answer",
        llmScore: 85,
        llmFeedback: "Nice work.",
        llmCorrection: "Tighten one detail.",
        answeredAt: new Date("2026-03-30T11:00:00.000Z"),
      },
    ]);

    const tree = await QuizPage({
      params: Promise.resolve({ questionId }),
      searchParams: Promise.resolve({
        from: `/subject/${nodeId}`,
        submitted: "1",
        generated1: "Generated question one?",
        generated2: "Generated question two?",
        generated3: "Generated question three?",
      }),
    });

    const quizBodyElement = collectElements(tree, (value) => isValidElement(value) && value.type === quizBodyMock)[0];

    expect(isValidElement(quizBodyElement)).toBe(true);
    expect(quizBodyElement?.props.generatedQuestions).toEqual([
      "Generated question one?",
      "Generated question two?",
      "Generated question three?",
    ]);
    expect(prismaMock.question.findMany).not.toHaveBeenCalled();
  });
});
