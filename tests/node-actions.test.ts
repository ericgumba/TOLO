import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  revalidatePathMock,
  prismaMock,
  getNodeForUserMock,
  getTreeCountSnapshotMock,
  getUserSubscriptionMock,
  canCreateNodeMock,
  resolveChildLevelMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  revalidatePathMock: vi.fn(),
  prismaMock: {
    node: {
      delete: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  getNodeForUserMock: vi.fn(),
  getTreeCountSnapshotMock: vi.fn(),
  getUserSubscriptionMock: vi.fn(),
  canCreateNodeMock: vi.fn(),
  resolveChildLevelMock: vi.fn(),
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

vi.mock("@/lib/tree/service", () => ({
  getNodeForUser: getNodeForUserMock,
  getTreeCountSnapshot: getTreeCountSnapshotMock,
  getUserSubscription: getUserSubscriptionMock,
}));

vi.mock("@/lib/tree/rules", () => ({
  canCreateNode: canCreateNodeMock,
  resolveChildLevel: resolveChildLevelMock,
}));

import { deleteNodeAction, deleteNodeFromTocAction } from "@/app/actions/nodes";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("node delete actions", () => {
  const userId = "c12345678901234567890123";
  const nodeId = "c12345678901234567890124";

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });
    getNodeForUserMock.mockResolvedValue({
      id: nodeId,
      userId,
      title: "Virtualization",
      level: "TOPIC",
      parentId: "c12345678901234567890125",
    });
    prismaMock.node.delete.mockResolvedValue({ id: nodeId });
  });

  it("keeps the existing dashboard delete flow", async () => {
    await expect(
      deleteNodeAction(
        buildFormData({
          nodeId,
        }),
      ),
    ).rejects.toThrow("REDIRECT:/dashboard");

    expect(prismaMock.node.delete).toHaveBeenCalledWith({
      where: {
        id: nodeId,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
  });

  it("rejects toc delete when confirmation is missing", async () => {
    await expect(
      deleteNodeFromTocAction(
        buildFormData({
          nodeId,
          returnTo: "/subject/subject-1",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/dashboard?error=Invalid%20delete%20input");

    expect(prismaMock.node.delete).not.toHaveBeenCalled();
  });

  it("deletes and redirects back to the provided toc path", async () => {
    await expect(
      deleteNodeFromTocAction(
        buildFormData({
          nodeId,
          returnTo: "/subject/subject-1/topic/topic-1?subtopic=subtopic-1",
          confirmDelete: "DELETE",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/subject/subject-1/topic/topic-1?subtopic=subtopic-1");

    expect(prismaMock.node.delete).toHaveBeenCalledWith({
      where: {
        id: nodeId,
      },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/subject/subject-1/topic/topic-1?subtopic=subtopic-1");
  });
});
