import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  revalidatePathMock,
  prismaMock,
  gradeQuestionAttemptMock,
  generateQuestionHintMock,
  generateQuestionAnswerMock,
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
    generatedQuestion: {
      createMany: vi.fn(),
    },
    node: {
      findFirst: vi.fn(),
    },
  },
  gradeQuestionAttemptMock: vi.fn(),
  generateQuestionHintMock: vi.fn(),
  generateQuestionAnswerMock: vi.fn(),
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

vi.mock("@/lib/llm/reveal-question-answer", () => ({
  revealQuestionAnswer: generateQuestionAnswerMock,
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
      generatedQuestions: [],
      node: {
        parentId: null,
        id: nodeId,
        title: "Topic",
        level: "TOPIC",
      },
    });
    prismaMock.node.findFirst.mockResolvedValue(null);
    prismaMock.question.findMany.mockResolvedValue([{ body: "Base question" }]);
    prismaMock.generatedQuestion.createMany.mockResolvedValue({ count: 3 });
    gradeQuestionAttemptMock.mockResolvedValue({
      ok: true,
      value: {
        score: 82,
        feedback: "Good answer.",
        correction: "No correction needed.",
        suggestedQuestion: "What is a hypervisor?",
        generatedQuestions: ["Generated question one?", "Generated question two?", "Generated question three?"],
      },
    });
    generateQuestionHintMock.mockResolvedValue({
      ok: true,
      value: "Think about the resources and execution context involved.",
    });
    generateQuestionAnswerMock.mockResolvedValue({
      ok: true,
      value: "TCP detects loss or reordering with sequence numbers and acknowledgments, retransmits missing data, reorders buffered segments, and uses flow control to avoid overwhelming the receiver.",
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
    expect(state.suggestedQuestion).toBe("What is a hypervisor?");
    expect(state.generatedQuestions).toEqual([
      "Generated question one?",
      "Generated question two?",
      "Generated question three?",
    ]);
    expect(gradeQuestionAttemptMock).toHaveBeenCalledWith(
      "Base question",
      "First answer",
      [
        {
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      ],
      [],
      ["Base question"],
      { includeGeneratedQuestions: true },
    );
    expect(prismaMock.generatedQuestion.createMany).toHaveBeenCalledWith({
      data: [
        {
          questionId,
          category: "EXPLAIN",
          body: "Generated question one?",
        },
        {
          questionId,
          category: "ANALYZE",
          body: "Generated question two?",
        },
        {
          questionId,
          category: "EVALUATE",
          body: "Generated question three?",
        },
      ],
      skipDuplicates: true,
    });
    expect(upsertReviewStateFromAttemptMock).toHaveBeenCalledTimes(1);
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "GRADE");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/subject/${nodeId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/quiz/${questionId}`);
  });

  it("reuses already attached generated questions instead of creating new ones", async () => {
    prismaMock.question.findFirst.mockResolvedValue({
      id: questionId,
      body: "Base question",
      nodeId,
      generatedQuestions: [
        {
          category: "EXPLAIN",
          body: "Attached explain question?",
        },
        {
          category: "ANALYZE",
          body: "Attached analyze question?",
        },
      ],
      node: {
        parentId: null,
        id: nodeId,
        title: "Topic",
        level: "TOPIC",
      },
    });

    const state = await runQuizInteractionAction(
      initialQuizInteractionState,
      buildFormData({
        questionId,
        answer: "Another answer",
        from: `/subject/${nodeId}`,
        intent: "submit",
      }),
    );

    expect(gradeQuestionAttemptMock).toHaveBeenCalledWith(
      "Base question",
      "Another answer",
      [
        {
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      ],
      [],
      ["Base question"],
      { includeGeneratedQuestions: false },
    );
    expect(prismaMock.generatedQuestion.createMany).not.toHaveBeenCalled();
    expect(state.suggestedQuestion).toBe("What is a hypervisor?");
    expect(state.generatedQuestions).toEqual(["Attached explain question?", "Attached analyze question?"]);
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
    expect(state.suggestedQuestion).toBeNull();
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

  it("reveals the answer after the third hint instead of returning an error", async () => {
    const state = await runQuizInteractionAction(
      {
        ...initialQuizInteractionState,
        draftAnswer: "Draft answer",
        activeHints: ["Hint 1", "Hint 2", "Hint 3"],
      },
      buildFormData({
        questionId,
        answer: "Draft answer",
        from: `/subject/${nodeId}`,
        intent: "reveal",
      }),
    );

    expect(state.status).toBe("idle");
    expect(state.feedback).toBeNull();
    expect(state.suggestedQuestion).toBeNull();
    expect(state.generatedQuestions).toEqual([]);
    expect(state.activeHints).toEqual(["Hint 1", "Hint 2", "Hint 3"]);
    expect(state.revealedAnswer).toBe(
      "TCP detects loss or reordering with sequence numbers and acknowledgments, retransmits missing data, reorders buffered segments, and uses flow control to avoid overwhelming the receiver.",
    );
    expect(generateQuestionAnswerMock).toHaveBeenCalledWith({
      question: "Base question",
      context: [
        {
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      ],
      quizHistory: [],
      existingHints: ["Hint 1", "Hint 2", "Hint 3"],
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

  it("still rejects stale hint requests after three hints", async () => {
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
