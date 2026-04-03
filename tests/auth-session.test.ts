import { SubscriptionStatus } from "@prisma/client";
import type { JWT } from "next-auth/jwt";
import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";

import { applySessionClaims } from "@/lib/auth/session";

describe("applySessionClaims", () => {
  it("copies the user id and subscription status when the token has a subject", () => {
    const session = {
      user: {
        id: "old-id",
        email: "test@example.com",
        subscriptionStatus: SubscriptionStatus.FREE,
      },
    } as Session;

    const token = {
      sub: "user-123",
      subscriptionStatus: SubscriptionStatus.PAID,
    } as JWT;

    const result = applySessionClaims(session, token);

    expect(result.user.id).toBe("user-123");
    expect(result.user.subscriptionStatus).toBe(SubscriptionStatus.PAID);
  });

  it("does not overwrite the user id when the token subject is missing", () => {
    const session = {
      user: {
        id: "existing-id",
        email: "test@example.com",
        subscriptionStatus: SubscriptionStatus.FREE,
      },
    } as Session;

    const token = {
      subscriptionStatus: SubscriptionStatus.PAID,
    } as JWT;

    const result = applySessionClaims(session, token);

    expect(result.user.id).toBe("existing-id");
    expect(result.user.subscriptionStatus).toBe(SubscriptionStatus.PAID);
  });
});
