import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  revalidatePathMock,
  prismaMock,
  gradeQuestionAttemptMock,
  generateQuestionHintMock,
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
    },
    node: {
      findFirst: vi.fn(),
    },
  },
  gradeQuestionAttemptMock: vi.fn(),
  generateQuestionHintMock: vi.fn(),
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

vi.mock("@/lib/llm/generate-question-hint", () => ({
  generateQuestionHint: generateQuestionHintMock,
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

import { runQuizInteractionAction } from "@/app/actions/quiz";
import { initialQuizInteractionState } from "@/lib/quiz/session-state";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("runQuizInteractionAction", () => {
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
      node: {
        parentId: null,
        id: nodeId,
        title: "Topic",
        level: "TOPIC",
      },
    });
    prismaMock.node.findFirst.mockResolvedValue(null);
    prismaMock.question.findMany.mockResolvedValue([{ body: "Base question" }]);
    gradeQuestionAttemptMock.mockResolvedValue({
      ok: true,
      value: {
        score: 82,
        feedback: "Good answer.",
        correction: "No correction needed.",
        generatedQuestions: ["Generated question one?", "Generated question two?", "Generated question three?"],
      },
    });
    generateQuestionHintMock.mockResolvedValue({
      ok: true,
      value: "Think about the resources and execution context involved.",
    });
    assertCanUseLlmMock.mockResolvedValue(undefined);
    logLlmUsageMock.mockResolvedValue(undefined);
    upsertReviewStateFromAttemptMock.mockResolvedValue(undefined);
  });

  it("returns ephemeral feedback and suggestions after a successful submit", async () => {
    const state = await runQuizInteractionAction(
      initialQuizInteractionState,
      buildFormData({
        questionId,
        answer: "First answer",
        from: `/subject/${nodeId}`,
        intent: "submit",
      }),
    );

    expect(state.status).toBe("submitted");
    expect(state.submittedAnswer).toBe("First answer");
    expect(state.feedback).toEqual(
      expect.objectContaining({
        llmScore: 82,
        llmFeedback: "Good answer.",
        llmCorrection: "No correction needed.",
        answeredAtIso: expect.any(String),
      }),
    );
    expect(state.generatedQuestions).toEqual([
      "Generated question one?",
      "Generated question two?",
      "Generated question three?",
    ]);
    expect(upsertReviewStateFromAttemptMock).toHaveBeenCalledTimes(1);
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "GRADE");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/subject/${nodeId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/quiz/${questionId}`);
  });

  it("returns updated hints without persisting an attempt", async () => {
    const state = await runQuizInteractionAction(
      {
        ...initialQuizInteractionState,
        draftAnswer: "Draft answer",
        activeHints: ["Start by defining the core unit."],
      },
      buildFormData({
        questionId,
        answer: "Draft answer",
        from: `/subject/${nodeId}`,
        intent: "hint",
      }),
    );

    expect(state.status).toBe("idle");
    expect(state.feedback).toBeNull();
    expect(state.generatedQuestions).toEqual([]);
    expect(state.activeHints).toEqual([
      "Start by defining the core unit.",
      "Think about the resources and execution context involved.",
    ]);
    expect(generateQuestionHintMock).toHaveBeenCalledWith({
      question: "Base question",
      context: [
        {
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      ],
      quizHistory: [],
      hintLevel: 2,
      existingHints: ["Start by defining the core unit."],
    });
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "HINT");
    expect(upsertReviewStateFromAttemptMock).not.toHaveBeenCalled();
  });

  it("returns an error state when grading fails", async () => {
    gradeQuestionAttemptMock.mockResolvedValue({
      ok: false,
      reason: "http_error",
    });

    const state = await runQuizInteractionAction(
      initialQuizInteractionState,
      buildFormData({
        questionId,
        answer: "First answer",
        from: `/subject/${nodeId}`,
        intent: "submit",
      }),
    );

    expect(state.status).toBe("error");
    expect(state.errorCode).toBe("attempt_provider_http_error");
    expect(logLlmUsageMock).not.toHaveBeenCalled();
    expect(upsertReviewStateFromAttemptMock).not.toHaveBeenCalled();
  });

  it("returns an error state when the user asks for too many hints", async () => {
    const state = await runQuizInteractionAction(
      {
        ...initialQuizInteractionState,
        activeHints: ["Hint 1", "Hint 2", "Hint 3"],
      },
      buildFormData({
        questionId,
        answer: "",
        from: `/subject/${nodeId}`,
        intent: "hint",
      }),
    );

    expect(state.status).toBe("error");
    expect(state.errorCode).toBe("hint_limit_reached");
    expect(generateQuestionHintMock).not.toHaveBeenCalled();
    expect(logLlmUsageMock).not.toHaveBeenCalled();
  });
});
