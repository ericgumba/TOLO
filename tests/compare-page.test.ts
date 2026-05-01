import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  redirectMock,
  prismaMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  prismaMock: {
    concept: {
      findFirst: vi.fn(),
    },
  },
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

import ComparePage from "@/app/compare/[conceptId]/page";

describe("ComparePage", () => {
  const userId = "c12345678901234567890123";
  const conceptId = "c12345678901234567890124";
  const nodeId = "c12345678901234567890125";

  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue({
      user: {
        id: userId,
      },
    });

    prismaMock.concept.findFirst.mockResolvedValue({
      id: conceptId,
      node: {
        id: nodeId,
      },
    });
  });

  it("redirects back to the originating subject when compare is deprecated", async () => {
    await expect(
      ComparePage({
        params: Promise.resolve({ conceptId }),
        searchParams: Promise.resolve({
          from: `/subject/${nodeId}`,
        }),
      }),
    ).rejects.toThrow(`REDIRECT:/subject/${nodeId}`);
  });

  it("redirects to the concept subject when no valid return path is provided", async () => {
    await expect(
      ComparePage({
        params: Promise.resolve({ conceptId }),
        searchParams: Promise.resolve({
          from: "javascript:alert(1)",
        }),
      }),
    ).rejects.toThrow(`REDIRECT:/subject/${nodeId}`);
  });
});
