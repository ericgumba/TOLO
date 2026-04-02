import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";

const {
  authMock,
  redirectMock,
  prismaMock,
  quizSessionMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  prismaMock: {
    question: {
      findFirst: vi.fn(),
    },
    reviewState: {
      upsert: vi.fn(),
    },
  },
  quizSessionMock: vi.fn(() => null),
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

vi.mock("@/app/components/quiz/quiz-session", () => ({
  QuizSession: quizSessionMock,
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
    vi.setSystemTime(new Date("2026-04-01T12:00:00.000Z"));
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });
    prismaMock.question.findFirst.mockResolvedValue({
      id: questionId,
      body: "Base question",
      node: {
        id: nodeId,
        title: "Topic",
        level: "TOPIC",
      },
    });
    prismaMock.reviewState.upsert.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the quiz session and updates lastQuizAccessedAt", async () => {
    const tree = await QuizPage({
      params: Promise.resolve({ questionId }),
      searchParams: Promise.resolve({
        from: `/subject/${nodeId}`,
        mode: "review",
      }),
    });

    const quizSessionElement = collectElements(
      tree,
      (value) => isValidElement(value) && value.type === quizSessionMock,
    )[0];

    expect(isValidElement(quizSessionElement)).toBe(true);
    expect(quizSessionElement?.props).toEqual(
      expect.objectContaining({
        questionId,
        nodeId,
        questionBody: "Base question",
        from: `/subject/${nodeId}`,
        mode: "review",
      }),
    );
    expect(prismaMock.reviewState.upsert).toHaveBeenCalledWith({
      where: {
        userId_questionId: {
          userId,
          questionId,
        },
      },
      create: {
        userId,
        questionId,
        status: "NEW",
        intervalDays: 1,
        repetitionCount: 0,
        nextReviewAt: new Date("2026-04-01T12:00:00.000Z"),
        lastQuizAccessedAt: new Date("2026-04-01T12:00:00.000Z"),
      },
      update: {
        lastQuizAccessedAt: new Date("2026-04-01T12:00:00.000Z"),
      },
    });
  });

  it("redirects to the dashboard when the question is missing", async () => {
    prismaMock.question.findFirst.mockResolvedValue(null);

    await expect(
      QuizPage({
        params: Promise.resolve({ questionId }),
        searchParams: Promise.resolve({
          from: `/subject/${nodeId}`,
        }),
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(prismaMock.reviewState.upsert).not.toHaveBeenCalled();
  });
});
