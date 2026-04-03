export const REVIEW_STATUS = {
  NEW: "NEW",
  LEARNING: "LEARNING",
  REVIEW: "REVIEW",
  MASTERED: "MASTERED",
  STRUGGLING: "STRUGGLING",
} as const;

export type ReviewStatusValue = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];
export const REVIEW_INTERVAL_SEQUENCE = [1, 3, 7, 14, 30, 60, 120] as const;

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

function getNextIntervalDays(currentIntervalDays?: number): number {
  if (!currentIntervalDays || currentIntervalDays <= REVIEW_INTERVAL_SEQUENCE[0]) {
    return REVIEW_INTERVAL_SEQUENCE[1];
  }

  const currentIndex = REVIEW_INTERVAL_SEQUENCE.findIndex((value) => value === currentIntervalDays);
  if (currentIndex === -1) {
    const next = REVIEW_INTERVAL_SEQUENCE.find((value) => value > currentIntervalDays);
    return next ?? REVIEW_INTERVAL_SEQUENCE[REVIEW_INTERVAL_SEQUENCE.length - 1];
  }

  return REVIEW_INTERVAL_SEQUENCE[Math.min(currentIndex + 1, REVIEW_INTERVAL_SEQUENCE.length - 1)];
}

function getStatusForIntervalDays(intervalDays: number): ReviewStatusValue {
  if (intervalDays >= 14) {
    return REVIEW_STATUS.MASTERED;
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
  const intervalDays = getNextIntervalDays(input.currentIntervalDays);
  const currentRepetitionCount = input.currentRepetitionCount ?? 0;
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
