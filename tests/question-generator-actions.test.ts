import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  revalidatePathMock,
  prismaMock,
  assertCanUseLlmMock,
  logLlmUsageMock,
  generateMainQuestionsForNodeMock,
  getNodeGenerationContextForUserMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  prismaMock: {
    question: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    node: {
      findFirst: vi.fn(),
    },
  },
  assertCanUseLlmMock: vi.fn(),
  logLlmUsageMock: vi.fn(),
  generateMainQuestionsForNodeMock: vi.fn(),
  getNodeGenerationContextForUserMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/llm/usage-limit", () => ({
  assertCanUseLlm: assertCanUseLlmMock,
  logLlmUsage: logLlmUsageMock,
  LlmDailyLimitExceededError: class LlmDailyLimitExceededError extends Error {},
}));

vi.mock("@/lib/llm/generate-main-questions", () => ({
  generateMainQuestionsForNode: generateMainQuestionsForNodeMock,
}));

vi.mock("@/lib/tree/service", () => ({
  getNodeGenerationContextForUser: getNodeGenerationContextForUserMock,
}));

import {
  addGeneratedQuestionToNodeAction,
  generateMainQuestionsPreviewAction,
} from "@/app/actions/questions";
import { initialGeneratedQuestionPreviewState } from "@/lib/questions/question-generator-preview";
import { LlmDailyLimitExceededError } from "@/lib/llm/usage-limit";

describe("node question generator actions", () => {
  const userId = "c12345678901234567890123";
  const nodeId = "c12345678901234567890124";
  const returnTo = `/subject/${nodeId}`;

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });

    getNodeGenerationContextForUserMock.mockResolvedValue({
      targetNode: {
        id: nodeId,
        title: "Operating Systems",
        level: "SUBJECT",
      },
      targetLabel: "Operating Systems",
      scopeNodeIds: [nodeId, "c12345678901234567890125"],
    });

    prismaMock.question.findMany.mockResolvedValue([
      { body: "What is a process?" },
      { body: "What is a thread?" },
    ]);
    prismaMock.node.findFirst.mockResolvedValue({ id: nodeId });
    prismaMock.question.create.mockResolvedValue({ id: "created-question-id" });
    assertCanUseLlmMock.mockResolvedValue(undefined);
    logLlmUsageMock.mockResolvedValue(undefined);
    generateMainQuestionsForNodeMock.mockResolvedValue([
      "How does a process differ from a thread?",
      "Why does process isolation matter?",
      "How do scheduling decisions affect performance?",
      "What tradeoffs come with kernel threads?",
      "How would you explain context switching?",
    ]);
  });

  it("returns preview questions for a user-owned node and logs QUESTION_GENERATION usage", async () => {
    const formData = new FormData();
    formData.set("nodeId", nodeId);
    formData.set("returnTo", returnTo);
    formData.set("notes", "From chapter 3 of the OS book.");

    const state = await generateMainQuestionsPreviewAction(initialGeneratedQuestionPreviewState, formData);

    expect(assertCanUseLlmMock).toHaveBeenCalledWith(userId);
    expect(generateMainQuestionsForNodeMock).toHaveBeenCalledWith({
      targetLabel: "Operating Systems",
      nodeLevel: "SUBJECT",
      notes: "From chapter 3 of the OS book.",
      existingQuestions: ["What is a process?", "What is a thread?"],
      desiredCount: 5,
    });
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "QUESTION_GENERATION");
    expect(state.status).toBe("success");
    expect(state.targetLabel).toBe("Operating Systems");
    expect(state.generatedQuestions.map((question) => question.body)).toEqual([
      "How does a process differ from a thread?",
      "Why does process isolation matter?",
      "How do scheduling decisions affect performance?",
      "What tradeoffs come with kernel threads?",
      "How would you explain context switching?",
    ]);
  });

  it("rejects preview generation when the node does not belong to the user", async () => {
    getNodeGenerationContextForUserMock.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("nodeId", nodeId);
    formData.set("returnTo", returnTo);

    const state = await generateMainQuestionsPreviewAction(initialGeneratedQuestionPreviewState, formData);

    expect(generateMainQuestionsForNodeMock).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
    expect(state.error).toContain("node");
  });

  it("rejects preview generation when the free-user LLM limit is exhausted", async () => {
    assertCanUseLlmMock.mockRejectedValue(new LlmDailyLimitExceededError());

    const formData = new FormData();
    formData.set("nodeId", nodeId);
    formData.set("returnTo", returnTo);

    const state = await generateMainQuestionsPreviewAction(initialGeneratedQuestionPreviewState, formData);

    expect(generateMainQuestionsForNodeMock).not.toHaveBeenCalled();
    expect(logLlmUsageMock).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
    expect(state.error).toContain("Daily LLM limit");
  });

  it("creates a MAIN question with initial review state when adding a generated preview question", async () => {
    const result = await addGeneratedQuestionToNodeAction({
      nodeId,
      body: "How does a process differ from a thread?",
      returnTo,
    });

    expect(prismaMock.node.findFirst).toHaveBeenCalledWith({
      where: {
        id: nodeId,
        userId,
      },
      select: {
        id: true,
      },
    });
    expect(prismaMock.question.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        nodeId,
        body: "How does a process differ from a thread?",
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
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(returnTo);
    expect(result).toEqual({ status: "success" });
  });

  it("rejects adding a generated question when the node is not owned by the user", async () => {
    prismaMock.node.findFirst.mockResolvedValue(null);

    const result = await addGeneratedQuestionToNodeAction({
      nodeId,
      body: "How does a process differ from a thread?",
      returnTo,
    });

    expect(prismaMock.question.create).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.error).toContain("node");
  });
});
