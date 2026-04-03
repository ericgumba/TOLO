import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  revalidatePathMock,
  prismaMock,
  assertCanUseLlmMock,
  logLlmUsageMock,
  generateQuestionsForNodeMock,
  getNodeGenerationContextForUserMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  prismaMock: {
    question: {
      findMany: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    node: {
      findFirst: vi.fn(),
    },
  },
  assertCanUseLlmMock: vi.fn(),
  logLlmUsageMock: vi.fn(),
  generateQuestionsForNodeMock: vi.fn(),
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

vi.mock("@/lib/llm/generate-questions", () => ({
  generateQuestionsForNode: generateQuestionsForNodeMock,
}));

vi.mock("@/lib/tree/service", () => ({
  getNodeGenerationContextForUser: getNodeGenerationContextForUserMock,
}));

import {
  addGeneratedQuestionToNodeAction,
  generateQuestionsPreviewAction,
  removeGeneratedQuestionFromNodeAction,
} from "@/app/actions/questions";
import { initialGeneratedQuestionPreviewState } from "@/lib/questions/question-generator-preview";
import { LlmDailyLimitExceededError } from "@/lib/llm/usage-limit";

describe("node question generator actions", () => {
  const userId = "c12345678901234567890123";
  const nodeId = "c12345678901234567890124";
  const createdQuestionId = "c12345678901234567890126";
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
    prismaMock.question.create.mockResolvedValue({ id: createdQuestionId });
    prismaMock.question.deleteMany.mockResolvedValue({ count: 1 });
    assertCanUseLlmMock.mockResolvedValue(undefined);
    logLlmUsageMock.mockResolvedValue(undefined);
    generateQuestionsForNodeMock.mockResolvedValue({
      ok: true,
      value: [
        "What is a process?",
        "How is a process different from a program?",
        "Why must the OS save a process's state during a context switch?",
      ],
    });
  });

  it("returns preview questions for a user-owned node and logs QUESTION_GENERATION usage", async () => {
    const formData = new FormData();
    formData.set("nodeId", nodeId);
    formData.set("returnTo", returnTo);
    formData.set("notes", "From chapter 3 of the OS book.");

    const state = await generateQuestionsPreviewAction(initialGeneratedQuestionPreviewState, formData);

    expect(assertCanUseLlmMock).toHaveBeenCalledWith(userId);
    expect(generateQuestionsForNodeMock).toHaveBeenCalledWith({
      targetLabel: "Operating Systems",
      nodeLevel: "SUBJECT",
      notes: "From chapter 3 of the OS book.",
      existingQuestions: ["What is a process?", "What is a thread?"],
      desiredCount: 3,
    });
    expect(logLlmUsageMock).toHaveBeenCalledWith(userId, "QUESTION_GENERATION");
    expect(state.status).toBe("success");
    expect(state.targetLabel).toBe("Operating Systems");
    expect(state.generatedQuestions.map((question) => question.body)).toEqual([
      "What is a process?",
      "How is a process different from a program?",
      "Why must the OS save a process's state during a context switch?",
    ]);
  });

  it("rejects preview generation when the node does not belong to the user", async () => {
    getNodeGenerationContextForUserMock.mockResolvedValue(null);

    const formData = new FormData();
    formData.set("nodeId", nodeId);
    formData.set("returnTo", returnTo);

    const state = await generateQuestionsPreviewAction(initialGeneratedQuestionPreviewState, formData);

    expect(generateQuestionsForNodeMock).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
    expect(state.error).toContain("node");
  });

  it("rejects preview generation when the free-user LLM limit is exhausted", async () => {
    assertCanUseLlmMock.mockRejectedValue(new LlmDailyLimitExceededError());

    const formData = new FormData();
    formData.set("nodeId", nodeId);
    formData.set("returnTo", returnTo);

    const state = await generateQuestionsPreviewAction(initialGeneratedQuestionPreviewState, formData);

    expect(generateQuestionsForNodeMock).not.toHaveBeenCalled();
    expect(logLlmUsageMock).not.toHaveBeenCalled();
    expect(state.status).toBe("error");
    expect(state.error).toContain("Daily LLM limit");
  });

  it("does not log usage when LLM generation fails", async () => {
    generateQuestionsForNodeMock.mockResolvedValue({
      ok: false,
      reason: "http_error",
    });

    const formData = new FormData();
    formData.set("nodeId", nodeId);
    formData.set("returnTo", returnTo);

    const state = await generateQuestionsPreviewAction(initialGeneratedQuestionPreviewState, formData);

    expect(state.status).toBe("error");
    expect(logLlmUsageMock).not.toHaveBeenCalled();
  });

  it("creates a question with initial review state when adding a generated preview question", async () => {
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
    expect(result).toEqual({ status: "success", questionId: createdQuestionId });
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

  it("skips adding a duplicate generated question on the same node", async () => {
    prismaMock.question.findMany.mockResolvedValue([
      { body: "What is a process?" },
      { body: "How does a process differ from a thread?" },
    ]);

    const result = await addGeneratedQuestionToNodeAction({
      nodeId,
      body: "  how does a process differ from a thread?  ",
      returnTo,
    });

    expect(prismaMock.question.create).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "duplicate" });
  });

  it("removes a generated question that was previously added", async () => {
    const result = await removeGeneratedQuestionFromNodeAction({
      questionId: createdQuestionId,
      returnTo,
    });

    expect(prismaMock.question.deleteMany).toHaveBeenCalledWith({
      where: {
        id: createdQuestionId,
        userId,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(returnTo);
    expect(result).toEqual({ status: "success" });
  });
});
