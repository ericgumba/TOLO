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
    concept: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    generatedQuestion: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
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
  const generatedQuestionId = "c12345678901234567890126";
  const nodeId = "c12345678901234567890125";

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });
    prismaMock.concept.findFirst.mockResolvedValue({
      id: questionId,
      title: "socket",
      nodeId,
      generatedQuestions: [],
      node: {
        parentId: null,
        id: nodeId,
        title: "Topic",
        level: "TOPIC",
      },
    });
    prismaMock.generatedQuestion.findFirst.mockResolvedValue({
      id: generatedQuestionId,
      body: "Explain TCP.",
      concept: {
        id: questionId,
        nodeId,
        node: {
          parentId: null,
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      },
    });
    prismaMock.node.findFirst.mockResolvedValue(null);
    prismaMock.concept.findMany.mockResolvedValue([{ title: "socket" }]);
    prismaMock.concept.update.mockResolvedValue({
      id: questionId,
      score: 82,
    });
    prismaMock.generatedQuestion.findMany.mockResolvedValue([
      { id: "generated-1", category: "EXPLAIN", body: "Generated question one?" },
      { id: "generated-2", category: "ANALYZE", body: "Generated question two?" },
      { id: "generated-3", category: "EVALUATE", body: "Generated question three?" },
    ]);
    prismaMock.generatedQuestion.createMany.mockResolvedValue({ count: 3 });
    prismaMock.generatedQuestion.update.mockResolvedValue({ id: generatedQuestionId, score: 82 });
    gradeQuestionAttemptMock.mockResolvedValue({
      ok: true,
      value: {
        score: 82,
        feedback: "Good answer.",
        correction: "No correction needed.",
        relatedConcept: "thread",
        generatedQuestions: ["Generated question one?", "Generated question two?", "Generated question three?"],
      },
    });
    generateQuestionHintMock.mockResolvedValue({
      ok: true,
      value: "Think about the resources and execution context involved.",
    });
    generateQuestionAnswerMock.mockResolvedValue({
      ok: true,
      value:
        "TCP detects loss or reordering with sequence numbers and acknowledgments, retransmits missing data, reorders buffered segments, and uses flow control to avoid overwhelming the receiver.",
    });
    assertCanUseLlmMock.mockResolvedValue(undefined);
    logLlmUsageMock.mockResolvedValue(undefined);
    upsertReviewStateFromAttemptMock.mockResolvedValue(undefined);
  });

  it("returns feedback and clickable generated-question links after a successful main-question submit", async () => {
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
    expect(state.relatedConcept).toBe("thread");
    expect(state.generatedQuestions).toEqual([
      { id: "generated-1", body: "Generated question one?" },
      { id: "generated-2", body: "Generated question two?" },
      { id: "generated-3", body: "Generated question three?" },
    ]);
    expect(gradeQuestionAttemptMock).toHaveBeenCalledWith(
      "socket",
      "First answer",
      [
        {
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      ],
      [],
      ["socket"],
      { includeGeneratedQuestions: true },
    );
    expect(prismaMock.generatedQuestion.createMany).toHaveBeenCalledWith({
      data: [
        {
          conceptId: questionId,
          category: "EXPLAIN",
          body: "Generated question one?",
        },
        {
          conceptId: questionId,
          category: "ANALYZE",
          body: "Generated question two?",
        },
        {
          conceptId: questionId,
          category: "EVALUATE",
          body: "Generated question three?",
        },
      ],
      skipDuplicates: true,
    });
    expect(prismaMock.generatedQuestion.findMany).toHaveBeenCalledWith({
      where: {
        conceptId: questionId,
      },
      select: {
        id: true,
        category: true,
        body: true,
      },
    });
    expect(prismaMock.generatedQuestion.updateMany).not.toHaveBeenCalled();
    expect(upsertReviewStateFromAttemptMock).toHaveBeenCalledTimes(1);
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "GRADE");
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/subject/${nodeId}`);
    expect(revalidatePathMock).toHaveBeenCalledWith(`/quiz/${questionId}`);
  });

  it("reuses already attached generated questions instead of creating new ones", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
      id: questionId,
      title: "socket",
      nodeId,
      generatedQuestions: [
        {
          id: "generated-1",
          category: "EXPLAIN",
          body: "Attached explain question?",
        },
        {
          id: "generated-2",
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
      "socket",
      "Another answer",
      [
        {
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      ],
      [],
      ["socket"],
      { includeGeneratedQuestions: false },
    );
    expect(prismaMock.generatedQuestion.createMany).not.toHaveBeenCalled();
    expect(prismaMock.generatedQuestion.findMany).not.toHaveBeenCalled();
    expect(state.relatedConcept).toBe("thread");
    expect(state.generatedQuestions).toEqual([
      { id: "generated-1", body: "Attached explain question?" },
      { id: "generated-2", body: "Attached analyze question?" },
    ]);
  });

  it("grades generated-question quizzes without creating a new study-lens set", async () => {
    const state = await runQuizInteractionAction(
      initialQuizInteractionState,
      buildFormData({
        questionId: generatedQuestionId,
        questionKind: "generated",
        answer: "Generated answer",
        from: `/subject/${nodeId}`,
        intent: "submit",
      }),
    );

    expect(gradeQuestionAttemptMock).toHaveBeenCalledWith(
      "Explain TCP.",
      "Generated answer",
      [
        {
          id: nodeId,
          title: "Topic",
          level: "TOPIC",
        },
      ],
      [],
      ["socket"],
      { includeGeneratedQuestions: false },
    );
    expect(prismaMock.generatedQuestion.createMany).not.toHaveBeenCalled();
    expect(upsertReviewStateFromAttemptMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).toHaveBeenCalledWith(`/quiz/generated/${generatedQuestionId}`);
    expect(state.generatedQuestions).toEqual([]);
    expect(state.relatedConcept).toBe("thread");
  });

  it("still returns feedback when optional score persistence fails for a main-question submit", async () => {
    prismaMock.concept.update.mockRejectedValue(new Error("column \"score\" does not exist"));

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
    expect(state.feedback?.llmScore).toBe(82);
    expect(upsertReviewStateFromAttemptMock).toHaveBeenCalledTimes(1);
  });

  it("still returns feedback when optional score persistence fails for a generated-question submit", async () => {
    prismaMock.generatedQuestion.update.mockRejectedValue(new Error("column \"score\" does not exist"));

    const state = await runQuizInteractionAction(
      initialQuizInteractionState,
      buildFormData({
        questionId: generatedQuestionId,
        questionKind: "generated",
        answer: "Generated answer",
        from: `/subject/${nodeId}`,
        intent: "submit",
      }),
    );

    expect(state.status).toBe("submitted");
    expect(state.feedback?.llmScore).toBe(82);
    expect(upsertReviewStateFromAttemptMock).not.toHaveBeenCalled();
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
    expect(state.relatedConcept).toBeNull();
    expect(state.generatedQuestions).toEqual([]);
    expect(state.activeHints).toEqual([
      "Start by defining the core unit.",
      "Think about the resources and execution context involved.",
    ]);
    expect(generateQuestionHintMock).toHaveBeenCalledWith({
      question: "socket",
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
    expect(state.relatedConcept).toBeNull();
    expect(state.generatedQuestions).toEqual([]);
    expect(state.activeHints).toEqual(["Hint 1", "Hint 2", "Hint 3"]);
    expect(state.revealedAnswer).toBe(
      "TCP detects loss or reordering with sequence numbers and acknowledgments, retransmits missing data, reorders buffered segments, and uses flow control to avoid overwhelming the receiver.",
    );
    expect(generateQuestionAnswerMock).toHaveBeenCalledWith({
      question: "socket",
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
