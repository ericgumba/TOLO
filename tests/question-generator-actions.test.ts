import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  revalidatePathMock,
  prismaMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  prismaMock: {
    concept: {
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
  addGeneratedConceptToNodeAction,
  removeGeneratedConceptFromNodeAction,
} from "@/app/actions/concepts";

describe("generated question mutation actions", () => {
  const userId = "c12345678901234567890123";
  const nodeId = "c12345678901234567890124";
  const createdConceptId = "c12345678901234567890126";
  const returnTo = `/subject/${nodeId}`;

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });

    prismaMock.concept.findMany.mockResolvedValue([
      { title: "process" },
      { title: "thread" },
    ]);
    prismaMock.node.findFirst.mockResolvedValue({ id: nodeId, level: "SUBJECT" });
    prismaMock.concept.create.mockResolvedValue({ id: createdConceptId });
    prismaMock.concept.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("creates a question with initial review state when adding a generated preview question", async () => {
    const result = await addGeneratedConceptToNodeAction({
      nodeId,
      title: "How does a process differ from a thread?",
      returnTo,
    });

    expect(prismaMock.node.findFirst).toHaveBeenCalledWith({
      where: {
        id: nodeId,
        userId,
      },
      select: {
        id: true,
        level: true,
      },
    });
    expect(prismaMock.concept.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        nodeId,
        title: "How does a process differ from a thread?",
        conceptTags: undefined,
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
      select: {
        id: true,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(returnTo);
    expect(result).toEqual({ status: "success", conceptId: createdConceptId });
  });

  it("rejects adding a generated question when the node is not owned by the user", async () => {
    prismaMock.node.findFirst.mockResolvedValue(null);

    const result = await addGeneratedConceptToNodeAction({
      nodeId,
      title: "How does a process differ from a thread?",
      returnTo,
    });

    expect(prismaMock.concept.create).not.toHaveBeenCalled();
    expect(result.status).toBe("error");
    expect(result.error).toContain("subject");
  });

  it("skips adding a duplicate generated question on the same node", async () => {
    prismaMock.concept.findMany.mockResolvedValue([
      { title: "process" },
      { title: "How does a process differ from a thread?" },
    ]);

    const result = await addGeneratedConceptToNodeAction({
      nodeId,
      title: "  how does a process differ from a thread?  ",
      returnTo,
    });

    expect(prismaMock.concept.create).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "duplicate" });
  });

  it("removes a generated question that was previously added", async () => {
    const result = await removeGeneratedConceptFromNodeAction({
      conceptId: createdConceptId,
      returnTo,
    });

    expect(prismaMock.concept.deleteMany).toHaveBeenCalledWith({
      where: {
        id: createdConceptId,
        userId,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith(returnTo);
    expect(result).toEqual({ status: "success" });
  });
});
