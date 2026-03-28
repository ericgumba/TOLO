export const REVIEW_STATUS = {
  NEW: "NEW",
  LEARNING: "LEARNING",
  REVIEW: "REVIEW",
  MASTERED: "MASTERED",
  STRUGGLING: "STRUGGLING",
} as const;

export type ReviewStatusValue = (typeof REVIEW_STATUS)[keyof typeof REVIEW_STATUS];

export const REVIEW_SCORE_THRESHOLDS = {
  low: 50,
  high: 80,
} as const;

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

export function computeNextReviewState(input: ReviewSchedulerInput): ReviewSchedulerResult {
  const normalizedScore = Number.isFinite(input.llmScore) ? Math.max(1, Math.min(100, Math.round(input.llmScore))) : 1;
  const currentIntervalDays = input.currentIntervalDays ?? 1;
  const currentRepetitionCount = input.currentRepetitionCount ?? 0;

  let intervalDays = 1;
  let status: ReviewStatusValue = REVIEW_STATUS.LEARNING;
  let repetitionCount = currentRepetitionCount;

  if (normalizedScore < REVIEW_SCORE_THRESHOLDS.low) {
    intervalDays = 1;
    repetitionCount = 0;
    status = normalizedScore < 30 ? REVIEW_STATUS.STRUGGLING : REVIEW_STATUS.LEARNING;
  } else if (normalizedScore < REVIEW_SCORE_THRESHOLDS.high) {
    intervalDays = 3;
    repetitionCount = currentRepetitionCount + 1;
    status = REVIEW_STATUS.REVIEW;
  } else {
    intervalDays = currentIntervalDays < 7 ? 7 : currentIntervalDays * 2;
    repetitionCount = currentRepetitionCount + 1;
    status = intervalDays >= 14 ? REVIEW_STATUS.MASTERED : REVIEW_STATUS.REVIEW;
  }

  return {
    status,
    intervalDays,
    repetitionCount,
    lastReviewedAt: input.reviewedAt,
    nextReviewAt: addDays(input.reviewedAt, intervalDays),
  };
}
