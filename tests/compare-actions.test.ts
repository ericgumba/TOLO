import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  prismaMock,
  generateConceptComparisonQuestionsMock,
  gradeConceptComparisonMock,
  assertCanUseLlmMock,
  logLlmUsageMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  prismaMock: {
    concept: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    conceptRelationship: {
      findMany: vi.fn(),
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    conceptRelationshipPrompt: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    conceptRelationshipAttempt: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  generateConceptComparisonQuestionsMock: vi.fn(),
  gradeConceptComparisonMock: vi.fn(),
  assertCanUseLlmMock: vi.fn(),
  logLlmUsageMock: vi.fn(),
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

vi.mock("@/lib/llm/generate-concept-comparison-questions", () => ({
  generateConceptComparisonQuestions: generateConceptComparisonQuestionsMock,
}));

vi.mock("@/lib/llm/grade-concept-comparison", () => ({
  gradeConceptComparison: gradeConceptComparisonMock,
}));

vi.mock("@/lib/llm/usage-limit", () => ({
  assertCanUseLlm: assertCanUseLlmMock,
  logLlmUsage: logLlmUsageMock,
  LlmDailyLimitExceededError: class LlmDailyLimitExceededError extends Error {},
}));

import { runCompareInteractionAction, startCompareSessionAction } from "@/app/actions/compare";
import { initialCompareInteractionState } from "@/lib/compare/session-state";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("compare actions", () => {
  const userId = "c12345678901234567890123";
  const sourceConceptId = "c12345678901234567890124";
  const targetConceptId = "c12345678901234567890125";
  const subjectId = "c12345678901234567890126";
  const relationshipId = "c12345678901234567890127";
  const promptId = "c12345678901234567890128";

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });

    prismaMock.$transaction.mockImplementation(async (callback: (tx: typeof prismaMock) => Promise<unknown>) => callback(prismaMock));
    prismaMock.conceptRelationship.findMany.mockResolvedValue([]);
    prismaMock.conceptRelationship.upsert.mockResolvedValue({ id: relationshipId });
    prismaMock.conceptRelationshipPrompt.findMany.mockResolvedValue([]);
    prismaMock.conceptRelationshipPrompt.create.mockImplementation(async ({ data }: {
      data: { prompt: string; category: string };
    }) => ({
      id: `${data.category.toLowerCase()}-prompt-id`.replace(/[^a-z-]/g, ""),
      category: data.category,
      prompt: data.prompt,
    }));
    prismaMock.conceptRelationshipPrompt.deleteMany.mockResolvedValue({ count: 0 });

    assertCanUseLlmMock.mockResolvedValue(undefined);
    logLlmUsageMock.mockResolvedValue(undefined);
  });

  it("persists a compare relationship and prompt set when starting compare mode", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
      id: sourceConceptId,
      title: "process",
      nodeId: subjectId,
      node: {
        id: subjectId,
        title: "Operating Systems",
        level: "SUBJECT",
      },
    });
    prismaMock.concept.findMany.mockResolvedValue([
      { id: targetConceptId, title: "thread" },
      { id: "c12345678901234567890129", title: "virtual memory" },
    ]);
    generateConceptComparisonQuestionsMock.mockResolvedValue({
      ok: true,
      value: {
        relatedConcept: {
          id: targetConceptId,
          title: "thread",
        },
        rationale: "Threads are a strong related concept because they execute inside processes.",
        interactions: [
          { category: "COMPARE", label: "Compare", question: "Compare process and thread." },
          { category: "PART_WHOLE", label: "Part vs whole", question: "How is a thread part of a process?" },
          { category: "DEPENDENCY", label: "Dependency / prerequisite", question: "Why do processes matter before threads?" },
          { category: "ANALOGY", label: "Analogy", question: "Give an analogy for process vs thread." },
          { category: "TRADEOFF", label: "Tradeoff", question: "What tradeoffs exist between processes and threads?" },
          { category: "MECHANISM_LINK", label: "Mechanism link", question: "What mechanism links a thread to its process?" },
        ],
      },
    });

    const result = await startCompareSessionAction({ sourceConceptId });

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Expected successful compare session start.");
    }

    expect(result.relationshipId).toBe(relationshipId);
    expect(result.relatedConcept).toEqual({ id: targetConceptId, title: "thread" });
    expect(result.interactions).toHaveLength(6);
    expect(result.interactions[0]).toEqual({
      promptId: "compare-prompt-id",
      category: "COMPARE",
      label: "Compare",
      question: "Compare process and thread.",
    });
    expect(prismaMock.conceptRelationship.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pairKey: `${sourceConceptId}:${targetConceptId}` },
        create: expect.objectContaining({
          subjectId,
          conceptAId: sourceConceptId,
          conceptBId: targetConceptId,
          rationale: "Threads are a strong related concept because they execute inside processes.",
        }),
      }),
    );
    expect(prismaMock.conceptRelationshipPrompt.create).toHaveBeenCalledTimes(6);
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "QUESTION_GENERATION");
  });

  it("reuses an existing compare relationship session instead of calling the LLM again", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
      id: sourceConceptId,
      title: "process",
      nodeId: subjectId,
      node: {
        id: subjectId,
        title: "Operating Systems",
        level: "SUBJECT",
      },
    });
    prismaMock.concept.findMany.mockResolvedValue([{ id: targetConceptId, title: "thread" }]);
    prismaMock.conceptRelationship.findMany.mockResolvedValue([
      {
        id: relationshipId,
        conceptA: {
          id: sourceConceptId,
          title: "process",
        },
        conceptB: {
          id: targetConceptId,
          title: "thread",
        },
        prompts: [
          { id: "compare-prompt-id", category: "COMPARE", prompt: "Persisted compare prompt." },
          { id: "part-whole-prompt-id", category: "PART_WHOLE", prompt: "Persisted part whole prompt." },
          { id: "dependency-prompt-id", category: "DEPENDENCY", prompt: "Persisted dependency prompt." },
          { id: "analogy-prompt-id", category: "ANALOGY", prompt: "Persisted analogy prompt." },
          { id: "tradeoff-prompt-id", category: "TRADEOFF", prompt: "Persisted tradeoff prompt." },
          { id: "mechanism-link-prompt-id", category: "MECHANISM_LINK", prompt: "Persisted mechanism link prompt." },
        ],
      },
    ]);

    const result = await startCompareSessionAction({ sourceConceptId });

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Expected successful compare session start.");
    }

    expect(result.interactions).toEqual([
      { promptId: "compare-prompt-id", category: "COMPARE", label: "Compare", question: "Persisted compare prompt." },
      {
        promptId: "part-whole-prompt-id",
        category: "PART_WHOLE",
        label: "Part vs whole",
        question: "Persisted part whole prompt.",
      },
      {
        promptId: "dependency-prompt-id",
        category: "DEPENDENCY",
        label: "Dependency / prerequisite",
        question: "Persisted dependency prompt.",
      },
      { promptId: "analogy-prompt-id", category: "ANALOGY", label: "Analogy", question: "Persisted analogy prompt." },
      { promptId: "tradeoff-prompt-id", category: "TRADEOFF", label: "Tradeoff", question: "Persisted tradeoff prompt." },
      {
        promptId: "mechanism-link-prompt-id",
        category: "MECHANISM_LINK",
        label: "Mechanism link",
        question: "Persisted mechanism link prompt.",
      },
    ]);
    expect(generateConceptComparisonQuestionsMock).not.toHaveBeenCalled();
    expect(prismaMock.conceptRelationship.upsert).not.toHaveBeenCalled();
    expect(prismaMock.conceptRelationshipPrompt.create).not.toHaveBeenCalled();
    expect(logLlmUsageMock).not.toHaveBeenCalled();
  });

  it("regenerates questions for the current pair when forced", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
      id: sourceConceptId,
      title: "process",
      nodeId: subjectId,
      node: {
        id: subjectId,
        title: "Operating Systems",
        level: "SUBJECT",
      },
    });
    prismaMock.concept.findMany.mockResolvedValue([{ id: targetConceptId, title: "thread" }]);
    prismaMock.conceptRelationship.findMany.mockResolvedValue([
      {
        id: relationshipId,
        conceptA: {
          id: sourceConceptId,
          title: "process",
        },
        conceptB: {
          id: targetConceptId,
          title: "thread",
        },
        prompts: [
          { id: "compare-prompt-id", category: "COMPARE", prompt: "Persisted compare prompt." },
          { id: "part-whole-prompt-id", category: "PART_WHOLE", prompt: "Persisted part whole prompt." },
          { id: "dependency-prompt-id", category: "DEPENDENCY", prompt: "Persisted dependency prompt." },
          { id: "analogy-prompt-id", category: "ANALOGY", prompt: "Persisted analogy prompt." },
          { id: "tradeoff-prompt-id", category: "TRADEOFF", prompt: "Persisted tradeoff prompt." },
          { id: "mechanism-link-prompt-id", category: "MECHANISM_LINK", prompt: "Persisted mechanism link prompt." },
        ],
      },
    ]);
    prismaMock.conceptRelationshipPrompt.findMany.mockResolvedValue([
      { id: "compare-prompt-id", category: "COMPARE", prompt: "Persisted compare prompt." },
      { id: "part-whole-prompt-id", category: "PART_WHOLE", prompt: "Persisted part whole prompt." },
      { id: "dependency-prompt-id", category: "DEPENDENCY", prompt: "Persisted dependency prompt." },
      { id: "analogy-prompt-id", category: "ANALOGY", prompt: "Persisted analogy prompt." },
      { id: "tradeoff-prompt-id", category: "TRADEOFF", prompt: "Persisted tradeoff prompt." },
      { id: "mechanism-link-prompt-id", category: "MECHANISM_LINK", prompt: "Persisted mechanism link prompt." },
    ]);
    prismaMock.conceptRelationshipPrompt.create.mockImplementation(async ({ data }: {
      data: { prompt: string; category: string };
    }) => ({
      id: `${data.category.toLowerCase()}-prompt-id`.replace(/[^a-z-]/g, ""),
      category: data.category,
      prompt: data.prompt,
    }));
    generateConceptComparisonQuestionsMock.mockResolvedValue({
      ok: true,
      value: {
        relatedConcept: {
          id: targetConceptId,
          title: "thread",
        },
        rationale: "Threads are a strong related concept because they execute inside processes.",
        interactions: [
          { category: "COMPARE", label: "Compare", question: "New compare prompt." },
          { category: "PART_WHOLE", label: "Part vs whole", question: "New part whole prompt." },
          { category: "DEPENDENCY", label: "Dependency / prerequisite", question: "New dependency prompt." },
          { category: "ANALOGY", label: "Analogy", question: "New analogy prompt." },
          { category: "TRADEOFF", label: "Tradeoff", question: "New tradeoff prompt." },
          { category: "MECHANISM_LINK", label: "Mechanism link", question: "New mechanism link prompt." },
        ],
      },
    });

    const result = await startCompareSessionAction({
      sourceConceptId,
      targetConceptId,
      forceRegenerate: true,
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") {
      throw new Error("Expected successful forced compare regeneration.");
    }

    expect(generateConceptComparisonQuestionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceConcept: "process",
        fixedRelatedConcept: {
          id: targetConceptId,
          title: "thread",
        },
      }),
    );
    expect(prismaMock.conceptRelationship.upsert).toHaveBeenCalled();
    expect(prismaMock.conceptRelationshipPrompt.deleteMany).toHaveBeenCalledWith({
      where: {
        relationshipId,
      },
    });
    expect(prismaMock.conceptRelationshipPrompt.create).toHaveBeenCalledTimes(6);
    expect(result.interactions[0]).toEqual({
      promptId: "compare-prompt-id",
      category: "COMPARE",
      label: "Compare",
      question: "New compare prompt.",
    });
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "QUESTION_GENERATION");
  });

  it("stores a compare attempt after successful grading", async () => {
    prismaMock.concept.findFirst
      .mockResolvedValueOnce({
        id: sourceConceptId,
        title: "process",
        nodeId: subjectId,
        node: {
          id: subjectId,
          title: "Operating Systems",
          level: "SUBJECT",
        },
      })
      .mockResolvedValueOnce({
        id: targetConceptId,
        title: "thread",
        nodeId: subjectId,
      });
    prismaMock.conceptRelationship.findUnique.mockResolvedValue({
      id: relationshipId,
      prompts: [
        {
          id: promptId,
          category: "COMPARE",
          prompt: "Compare process and thread.",
        },
      ],
    });
    gradeConceptComparisonMock.mockResolvedValue({
      ok: true,
      value: {
        score: 84,
        feedback: "You identified the main distinction.",
        correction: "Processes own resources; threads are execution paths inside a process.",
      },
    });
    prismaMock.conceptRelationshipAttempt.create.mockResolvedValue({ id: "attempt-1" });

    const state = await runCompareInteractionAction(
      initialCompareInteractionState,
      buildFormData({
        sourceConceptId,
        targetConceptId,
        relationshipId,
        promptId,
        category: "COMPARE",
        answer: "A process owns resources and a thread runs inside it.",
        from: `/subject/${subjectId}`,
      }),
    );

    expect(state.status).toBe("submitted");
    expect(state.feedback).toEqual(
      expect.objectContaining({
        llmScore: 84,
        llmFeedback: "You identified the main distinction.",
        llmCorrection: "Processes own resources; threads are execution paths inside a process.",
        answeredAtIso: expect.any(String),
      }),
    );
    expect(gradeConceptComparisonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceConcept: "process",
        targetConcept: "thread",
        prompt: "Compare process and thread.",
        answer: "A process owns resources and a thread runs inside it.",
      }),
    );
    expect(prismaMock.conceptRelationshipAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        relationshipId,
        promptId,
        category: "COMPARE",
        prompt: "Compare process and thread.",
        userAnswer: "A process owns resources and a thread runs inside it.",
        llmScore: 84,
      }),
      select: {
        id: true,
      },
    });
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "GRADE");
  });
});
