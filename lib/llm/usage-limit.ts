import { LlmUsageType, SubscriptionStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const FREE_DAILY_LLM_LIMIT = 3;

export class LlmDailyLimitExceededError extends Error {
  constructor() {
    super("Daily LLM usage limit reached for free plan.");
    this.name = "LlmDailyLimitExceededError";
  }
}

function getTodayRange(now: Date): { start: Date; end: Date } {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function canUseLlm(subscriptionStatus: SubscriptionStatus, todayUsageCount: number): boolean {
  if (subscriptionStatus === SubscriptionStatus.PAID) {
    return true;
  }

  return todayUsageCount < FREE_DAILY_LLM_LIMIT;
}

export async function getTodayLlmUsageCount(userId: string, now = new Date()): Promise<number> {
  const { start, end } = getTodayRange(now);

  return prisma.llmUsageEvent.count({
    where: {
      userId,
      createdAt: {
        gte: start,
        lt: end,
      },
    },
  });
}

export async function assertCanUseLlm(userId: string, now = new Date()): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  const count = await getTodayLlmUsageCount(userId, now);
  if (!canUseLlm(user.subscriptionStatus, count)) {
    throw new LlmDailyLimitExceededError();
  }
}

export async function logLlmUsage(userId: string, type: LlmUsageType): Promise<void> {
  await prisma.llmUsageEvent.create({
    data: {
      userId,
      type,
    },
  });
}
