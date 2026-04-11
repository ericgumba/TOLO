import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  revalidatePathMock,
  prismaMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  revalidatePathMock: vi.fn(),
  prismaMock: {
    concept: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    reviewState: {
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
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

import { deleteConceptAction, resetConceptReviewStateAction } from "@/app/actions/concepts";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("question settings actions", () => {
  const userId = "c12345678901234567890123";
  const questionId = "c12345678901234567890124";

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });
    prismaMock.concept.findFirst.mockResolvedValue(null);
    prismaMock.concept.delete.mockResolvedValue({ id: questionId });
    prismaMock.reviewState.upsert.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]));
  });

  it("resets review state for a question", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
      id: questionId,
    });

    await expect(
      resetConceptReviewStateAction(
        buildFormData({
          questionId,
          returnTo: "/subject/c12345678901234567890125",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/subject/c12345678901234567890125");

    expect(prismaMock.reviewState.upsert).toHaveBeenCalledTimes(1);
    expect(prismaMock.reviewState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_conceptId: {
            userId,
            conceptId: questionId,
          },
        },
        update: expect.objectContaining({
          status: "NEW",
          intervalDays: 1,
          repetitionCount: 0,
          lastReviewedAt: null,
          nextReviewAt: expect.any(Date),
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/dashboard");
    expect(revalidatePathMock).toHaveBeenCalledWith("/subject/c12345678901234567890125");
    expect(revalidatePathMock).toHaveBeenCalledWith(`/quiz/${questionId}`);
  });

  it("deletes a question when confirmed", async () => {
    prismaMock.concept.findFirst.mockResolvedValue({
      id: questionId,
    });

    await expect(
      deleteConceptAction(
        buildFormData({
          questionId,
          returnTo: "/subject/c12345678901234567890125",
          confirmDelete: "DELETE",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/subject/c12345678901234567890125");

    expect(prismaMock.concept.delete).toHaveBeenCalledWith({
      where: {
        id: questionId,
      },
      select: {
        id: true,
      },
    });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejects delete action when confirmation token is missing", async () => {
    await expect(
      deleteConceptAction(
        buildFormData({
          questionId,
          returnTo: "/dashboard",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/dashboard?error=Invalid%20concept%20settings");

    expect(prismaMock.concept.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.concept.delete).not.toHaveBeenCalled();
  });
});
