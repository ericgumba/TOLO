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
    concept: {
      findFirst: vi.fn(),
    },
    generatedQuestion: {
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
import GeneratedQuizPage from "@/app/quiz/generated/[generatedQuestionId]/page";

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
  const generatedQuestionId = "c12345678901234567890126";
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
    prismaMock.concept.findFirst.mockResolvedValue({
      id: questionId,
      title: "socket",
      node: {
        id: nodeId,
        title: "Topic",
        level: "TOPIC",
      },
    });
    prismaMock.generatedQuestion.findFirst.mockResolvedValue({
      id: generatedQuestionId,
      body: "Explain TCP.",
      concept: {
        node: {
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      },
    });
    prismaMock.reviewState.upsert.mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the main quiz session and updates lastQuizAccessedAt", async () => {
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
        promptId: questionId,
        nodeId,
        promptBody: "socket",
        from: `/subject/${nodeId}`,
        mode: "review",
      }),
    );
    expect(prismaMock.reviewState.upsert).toHaveBeenCalledWith({
      where: {
        userId_conceptId: {
          userId,
          conceptId: questionId,
        },
      },
      create: {
        userId,
        conceptId: questionId,
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

  it("renders a generated-question quiz session without touching review state", async () => {
    const tree = await GeneratedQuizPage({
      params: Promise.resolve({ generatedQuestionId }),
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
        promptId: generatedQuestionId,
        questionKind: "generated",
        nodeId,
        promptBody: "Explain TCP.",
        from: `/subject/${nodeId}`,
        mode: "review",
      }),
    );
    expect(prismaMock.reviewState.upsert).not.toHaveBeenCalled();
  });

  it("redirects to the dashboard when the main question is missing", async () => {
    prismaMock.concept.findFirst.mockResolvedValue(null);

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

  it("redirects to the dashboard when the generated question is missing", async () => {
    prismaMock.generatedQuestion.findFirst.mockResolvedValue(null);

    await expect(
      GeneratedQuizPage({
        params: Promise.resolve({ generatedQuestionId }),
        searchParams: Promise.resolve({
          from: `/subject/${nodeId}`,
        }),
      }),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(prismaMock.reviewState.upsert).not.toHaveBeenCalled();
  });
});
