import { SubscriptionStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import { canUseLlm, FREE_DAILY_LLM_LIMIT } from "@/lib/llm/usage-limit";

describe("canUseLlm", () => {
  it("enforces free-user daily limit", () => {
    expect(canUseLlm(SubscriptionStatus.FREE, 0)).toBe(true);
    expect(canUseLlm(SubscriptionStatus.FREE, FREE_DAILY_LLM_LIMIT - 1)).toBe(true);
    expect(canUseLlm(SubscriptionStatus.FREE, FREE_DAILY_LLM_LIMIT)).toBe(false);
    expect(canUseLlm(SubscriptionStatus.FREE, FREE_DAILY_LLM_LIMIT + 1)).toBe(false);
  });

  it("allows paid users regardless of count", () => {
    expect(canUseLlm(SubscriptionStatus.PAID, 0)).toBe(true);
    expect(canUseLlm(SubscriptionStatus.PAID, FREE_DAILY_LLM_LIMIT)).toBe(true);
    expect(canUseLlm(SubscriptionStatus.PAID, 999)).toBe(true);
  });
});
