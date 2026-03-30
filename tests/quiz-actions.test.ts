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

import { submitQuestionAttemptAction } from "@/app/actions/quiz";

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
    prismaMock.question.findMany.mockResolvedValue([]);
    prismaMock.questionAttempt.create.mockResolvedValue({ id: "attempt-1" });
    prismaMock.question.create.mockResolvedValue({ id: "follow-up-1" });
    gradeQuestionAttemptMock.mockResolvedValue({
      score: 82,
      feedback: "Good answer.",
      correction: "No correction needed.",
      followupQuestion: "What detail would you add next?",
    });
    assertCanUseLlmMock.mockResolvedValue(undefined);
    logLlmUsageMock.mockResolvedValue(undefined);
    upsertReviewStateFromAttemptMock.mockResolvedValue(undefined);
  });

  it("updates the review state for the first answer to the main question", async () => {
    await expect(
      submitQuestionAttemptAction(
        buildFormData({
          questionId,
          answer: "First answer",
          from: `/subject/${nodeId}`,
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/quiz/${questionId}?from=%2Fsubject%2F${nodeId}&submitted=1`);

    expect(upsertReviewStateFromAttemptMock).toHaveBeenCalledTimes(1);
  });

  it("does not update the review state for follow-up answers", async () => {
    prismaMock.questionAttempt.findMany.mockResolvedValue([{ userAnswer: "First answer" }]);
    prismaMock.question.findMany.mockResolvedValue([{ body: "Follow-up question" }]);

    await expect(
      submitQuestionAttemptAction(
        buildFormData({
          questionId,
          answer: "Follow-up answer",
          from: `/subject/${nodeId}`,
        }),
      ),
    ).rejects.toThrow(`REDIRECT:/quiz/${questionId}?from=%2Fsubject%2F${nodeId}&submitted=1`);

    expect(upsertReviewStateFromAttemptMock).not.toHaveBeenCalled();
  });
});
