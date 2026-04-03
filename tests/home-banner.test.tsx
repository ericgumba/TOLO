import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authMock, connectionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  connectionMock: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: authMock,
}));

vi.mock("next/server", () => ({
  connection: connectionMock,
}));

vi.mock("@/app/actions/auth", () => ({
  logoutAction: vi.fn(),
}));

import { HomeBanner } from "@/app/components/home-banner";

describe("HomeBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the authenticated welcome state with the user's name", async () => {
    authMock.mockResolvedValue({
      user: {
        id: "c12345678901234567890123",
        name: "Eric Gumba",
        email: "eric@example.com",
      },
    });

    const html = renderToStaticMarkup(await HomeBanner());

    expect(connectionMock).toHaveBeenCalled();
    expect(html).toContain("Welcome Eric Gumba");
    expect(html).toContain("Logout");
    expect(html).not.toContain("Register");
    expect(html).not.toContain("Login");
  });

  it("renders the guest navigation when no session is present", async () => {
    authMock.mockResolvedValue(null);

    const html = renderToStaticMarkup(await HomeBanner());

    expect(connectionMock).toHaveBeenCalled();
    expect(html).toContain("Register");
    expect(html).toContain("Login");
    expect(html).toContain("Premium");
  });
});
