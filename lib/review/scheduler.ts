export const REVIEW_STATUS = {
  NEW: "NEW",
  LEARNING: "LEARNING",
  REVIEW: "REVIEW",
  MASTERED: "MASTERED",
  STRUGGLING: "STRUGGLING",
} as const;

export type ReviewStatusValue = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];
export const REVIEW_INTERVAL_SEQUENCE = [1, 2, 3, 7, 14, 30, 60, 120] as const;

export type ReviewSchedulerInput = {
  llmScore: number;
  reviewedAt: Date;
  currentIntervalDays?: number;
  currentRepetitionCount?: number;
};

export type ReviewSchedulerResult = {
  status: ReviewStatusValue;
  intervalDays: number;
  repetitionCount: number;
  lastReviewedAt: Date | null;
  nextReviewAt: Date;
};

export type ReviewAdvanceCheckInput = {
  reviewedAt: Date;
  nextReviewAt?: Date | null;
};

export function createInitialReviewState(now: Date): ReviewSchedulerResult {
  return {
    status: REVIEW_STATUS.NEW,
    intervalDays: 1,
    repetitionCount: 0,
    lastReviewedAt: null,
    nextReviewAt: now,
  };
}

function addDays(value: Date, days: number): Date {
  return new Date(value.getTime() + days * 24 * 60 * 60 * 1000);
}

function getNextIntervalDays(currentIntervalDays?: number, currentRepetitionCount = 0): number {
  if (currentRepetitionCount <= 0) {
    return REVIEW_INTERVAL_SEQUENCE[0];
  }

  const repetitionIndex = Math.min(currentRepetitionCount, REVIEW_INTERVAL_SEQUENCE.length - 1);
  const repetitionBasedInterval = REVIEW_INTERVAL_SEQUENCE[repetitionIndex];

  if (!currentIntervalDays) {
    return repetitionBasedInterval;
  }

  const currentIndex = REVIEW_INTERVAL_SEQUENCE.findIndex((value) => value === currentIntervalDays);
  if (currentIndex === -1) {
    const next = REVIEW_INTERVAL_SEQUENCE.find((value) => value > currentIntervalDays);
    return next ? Math.max(next, repetitionBasedInterval) : REVIEW_INTERVAL_SEQUENCE[REVIEW_INTERVAL_SEQUENCE.length - 1];
  }

  const nextFromInterval = REVIEW_INTERVAL_SEQUENCE[Math.min(currentIndex + 1, REVIEW_INTERVAL_SEQUENCE.length - 1)];
  return Math.max(nextFromInterval, repetitionBasedInterval);
}

function getStatusForIntervalDays(intervalDays: number): ReviewStatusValue {
  if (intervalDays >= 14) {
    return REVIEW_STATUS.MASTERED;
  }

  if (intervalDays <= 1) {
    return REVIEW_STATUS.LEARNING;
  }

  return REVIEW_STATUS.REVIEW;
}

export function shouldAdvanceReviewState(input: ReviewAdvanceCheckInput): boolean {
  if (!input.nextReviewAt) {
    return true;
  }

  return input.reviewedAt.getTime() >= input.nextReviewAt.getTime();
}

export function computeNextReviewState(input: ReviewSchedulerInput): ReviewSchedulerResult {
  const currentRepetitionCount = input.currentRepetitionCount ?? 0;
  const intervalDays = getNextIntervalDays(input.currentIntervalDays, currentRepetitionCount);
  const repetitionCount = currentRepetitionCount + 1;
  const status = getStatusForIntervalDays(intervalDays);

  return {
    status,
    intervalDays,
    repetitionCount,
    lastReviewedAt: input.reviewedAt,
    nextReviewAt: addDays(input.reviewedAt, intervalDays),
  };
}
