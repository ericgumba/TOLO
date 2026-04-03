import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authMock,
  signInMock,
  redirectMock,
  hashMock,
  prismaMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  signInMock: vi.fn(),
  redirectMock: vi.fn((location: string) => {
    throw new Error(`REDIRECT:${location}`);
  }),
  hashMock: vi.fn(),
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/auth", () => ({
  auth: authMock,
  signIn: signInMock,
  signOut: vi.fn(),
}));

vi.mock("next-auth", () => ({
  AuthError: class AuthError extends Error {},
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

vi.mock("bcryptjs", () => ({
  hash: hashMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/app/components/home-banner", () => ({
  HomeBanner: () => <div>Home Banner</div>,
}));

vi.mock("@/app/components/ad-banner", () => ({
  AdBanner: ({ placement }: { placement: "top" | "right" }) => <div>Ad Banner {placement}</div>,
}));

import RootLayout from "@/app/layout";
import { signupAction } from "@/app/actions/auth";
import PrivacyPage from "@/app/privacy/page";
import SignupPage from "@/app/signup/page";
import TermsPage from "@/app/terms/page";

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe("legal pages and signup consent", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    authMock.mockResolvedValue(null);
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: "c12345678901234567890123",
    });
    hashMock.mockResolvedValue("hashed-password");
    signInMock.mockResolvedValue(undefined);
  });

  it("renders legal links and required consent on signup", async () => {
    const html = renderToStaticMarkup(
      await SignupPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(html).toContain('type="checkbox"');
    expect(html).toContain('name="legalAcceptance"');
    expect(html).toContain("required");
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain("I agree to the");
  });

  it("rejects signup when legal acceptance is missing", async () => {
    await expect(
      signupAction(
        buildFormData({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      ),
    ).rejects.toThrow("REDIRECT:/signup?error=Invalid%20signup%20input");

    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("creates an account when legal acceptance is present", async () => {
    await signupAction(
      buildFormData({
        name: "Test User",
        email: "test@example.com",
        password: "password123",
        legalAcceptance: "on",
      }),
    );

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
      where: { email: "test@example.com" },
      select: { id: true },
    });
    expect(hashMock).toHaveBeenCalledWith("password123", 10);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: {
        name: "Test User",
        email: "test@example.com",
        passwordHash: "hashed-password",
      },
    });
    expect(signInMock).toHaveBeenCalledWith("credentials", {
      email: "test@example.com",
      password: "password123",
      redirectTo: "/dashboard",
    });
  });

  it("renders the terms page", async () => {
    const html = renderToStaticMarkup(await TermsPage());

    expect(html).toContain("Terms of Service");
    expect(html).toContain("Effective Date: 03/02/2026");
    expect(html).toContain("AI-Generated Content Disclaimer");
    expect(html).toContain("13 years old");
  });

  it("renders the privacy page", async () => {
    const html = renderToStaticMarkup(await PrivacyPage());

    expect(html).toContain("Privacy Policy");
    expect(html).toContain("Effective Date: 03/02/2026");
    expect(html).toContain("stored as hashed passwords");
    expect(html).toContain("Your Rights (California Residents)");
  });

  it("renders footer links to the legal pages", () => {
    const html = renderToStaticMarkup(
      RootLayout({
        children: <div>Child Content</div>,
      }),
    );

    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/privacy"');
    expect(html).toContain("Terms");
    expect(html).toContain("Privacy");
  });
});
