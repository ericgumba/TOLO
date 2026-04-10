import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  revalidatePathMock,
  prismaMock,
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

import {
  addGeneratedQuestionToNodeAction,
  removeGeneratedQuestionFromNodeAction,
} from "@/app/actions/questions";

describe("generated question mutation actions", () => {
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

    prismaMock.question.findMany.mockResolvedValue([
      { body: "What is a process?" },
      { body: "What is a thread?" },
    ]);
    prismaMock.node.findFirst.mockResolvedValue({ id: nodeId });
    prismaMock.question.create.mockResolvedValue({ id: createdQuestionId });
    prismaMock.question.deleteMany.mockResolvedValue({ count: 1 });
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
