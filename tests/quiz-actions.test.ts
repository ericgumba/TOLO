import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  revalidatePathMock,
  prismaMock,
  gradeQuestionAttemptMock,
  assertCanUseLlmMock,
  logLlmUsageMock,
  upsertReviewStateFromAttemptMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  revalidatePathMock: vi.fn(),
  prismaMock: {
    question: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
    },
    node: {
      findFirst: vi.fn(),
    },
    questionAttempt: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
  gradeQuestionAttemptMock: vi.fn(),
  assertCanUseLlmMock: vi.fn(),
  logLlmUsageMock: vi.fn(),
  upsertReviewStateFromAttemptMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/llm/grade-question-attempt", () => ({
  gradeQuestionAttempt: gradeQuestionAttemptMock,
}));

vi.mock("@/lib/llm/request", () => ({
  LlmRequestTimeoutError: class LlmRequestTimeoutError extends Error {},
}));

vi.mock("@/lib/llm/usage-limit", () => ({
  assertCanUseLlm: assertCanUseLlmMock,
  logLlmUsage: logLlmUsageMock,
  LlmDailyLimitExceededError: class LlmDailyLimitExceededError extends Error {},
}));

vi.mock("@/lib/review/service", () => ({
  upsertReviewStateFromAttempt: upsertReviewStateFromAttemptMock,
}));

import {
  addAllGeneratedQuestionsAction,
  addGeneratedQuestionAction,
  submitQuestionAttemptAction,
} from "@/app/actions/quiz";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("submitQuestionAttemptAction", () => {
  const userId = "c12345678901234567890123";
  const questionId = "c12345678901234567890124";
  const nodeId = "c12345678901234567890125";

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });
    prismaMock.question.findFirst.mockResolvedValue({
      id: questionId,
      body: "Base question",
      nodeId,
      questionType: "MAIN",
      node: {
        parentId: null,
        id: nodeId,
        title: "Topic",
        level: "TOPIC",
      },
    });
    prismaMock.node.findFirst.mockResolvedValue(null);
    prismaMock.questionAttempt.findMany.mockResolvedValue([]);
    prismaMock.question.findMany.mockResolvedValue([{ body: "Base question" }]);
    prismaMock.questionAttempt.create.mockResolvedValue({ id: "attempt-1" });
    prismaMock.question.create.mockResolvedValue({ id: "question-created-1" });
    gradeQuestionAttemptMock.mockResolvedValue({
      ok: true,
      value: {
        score: 82,
        feedback: "Good answer.",
        correction: "No correction needed.",
        generatedQuestions: ["Generated question one?", "Generated question two?", "Generated question three?"],
      },
    });
    assertCanUseLlmMock.mockResolvedValue(undefined);
    logLlmUsageMock.mockResolvedValue(undefined);
    upsertReviewStateFromAttemptMock.mockResolvedValue(undefined);
  });

  it("saves the attempt, updates review state, and redirects with generated MAIN-question suggestions", async () => {
    await expect(
      submitQuestionAttemptAction(
        buildFormData({
          questionId,
          answer: "First answer",
          from: `/subject/${nodeId}`,
        }),
      ),
    ).rejects.toThrow(
      `REDIRECT:/quiz/${questionId}?from=%2Fsubject%2F${nodeId}&submitted=1&generated1=Generated+question+one%3F&generated2=Generated+question+two%3F&generated3=Generated+question+three%3F`,
    );

    expect(upsertReviewStateFromAttemptMock).toHaveBeenCalledTimes(1);
    expect(prismaMock.questionAttempt.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.question.create).not.toHaveBeenCalled();
  });

  it("does not update the review state for follow-up answers", async () => {
    prismaMock.questionAttempt.findMany.mockResolvedValue([{ userAnswer: "First answer" }]);
    prismaMock.question.findMany.mockResolvedValue([{ body: "Base question" }]);

    await expect(
      submitQuestionAttemptAction(
        buildFormData({
          questionId,
          answer: "Follow-up answer",
          from: `/subject/${nodeId}`,
        }),
      ),
    ).rejects.toThrow(
      `REDIRECT:/quiz/${questionId}?from=%2Fsubject%2F${nodeId}&submitted=1&generated1=Generated+question+one%3F&generated2=Generated+question+two%3F&generated3=Generated+question+three%3F`,
    );

    expect(upsertReviewStateFromAttemptMock).not.toHaveBeenCalled();
    expect(prismaMock.question.create).not.toHaveBeenCalled();
  });

  it("does not log usage when grading fails", async () => {
    gradeQuestionAttemptMock.mockResolvedValue({
      ok: false,
      reason: "http_error",
    });

    await expect(
      submitQuestionAttemptAction(
        buildFormData({
          questionId,
          answer: "First answer",
          from: `/subject/${nodeId}`,
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/quiz/${questionId}?from=%2Fsubject%2F${nodeId}&error=attempt_provider_http_error`);

    expect(logLlmUsageMock).not.toHaveBeenCalled();
    expect(prismaMock.questionAttempt.create).not.toHaveBeenCalled();
  });

  it("adds one generated MAIN question and keeps the remaining suggestions in the redirect", async () => {
    prismaMock.question.findMany.mockResolvedValue([{ body: "Base question" }]);

    await expect(
      addGeneratedQuestionAction(
        buildFormData({
          questionId,
          from: `/subject/${nodeId}`,
          candidateIndex: "1",
          generated1: "Generated question one?",
          generated2: "Generated question two?",
          generated3: "Generated question three?",
        }),
      ),
    ).rejects.toThrow(
      `REDIRECT:/quiz/${questionId}?from=%2Fsubject%2F${nodeId}&generated1=Generated+question+one%3F&generated2=Generated+question+three%3F&added=1&skipped=0`,
    );

    expect(prismaMock.question.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.question.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        nodeId,
        body: "Generated question two?",
        questionType: "MAIN",
        reviewStates: {
          create: expect.objectContaining({
            userId,
            status: "NEW",
            intervalDays: 1,
            repetitionCount: 0,
            nextReviewAt: expect.any(Date),
          }),
        },
      }),
    });
  });

  it("adds all generated MAIN questions and skips duplicates", async () => {
    prismaMock.question.findMany.mockResolvedValue([
      { body: "Base question" },
      { body: "Generated question two?" },
    ]);

    await expect(
      addAllGeneratedQuestionsAction(
        buildFormData({
          questionId,
          from: `/subject/${nodeId}`,
          generated1: "Generated question one?",
          generated2: "Generated question two?",
          generated3: "Generated question three?",
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/quiz/${questionId}?from=%2Fsubject%2F${nodeId}&added=2&skipped=1`);

    expect(prismaMock.question.create).toHaveBeenCalledTimes(2);
    expect(prismaMock.question.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          body: "Generated question one?",
          questionType: "MAIN",
        }),
      }),
    );
    expect(prismaMock.question.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          body: "Generated question three?",
          questionType: "MAIN",
        }),
      }),
    );
  });
});
