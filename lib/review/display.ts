const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function formatLastAnsweredAt(lastAnsweredAt: Date | null): string {
  return lastAnsweredAt ? lastAnsweredAt.toLocaleString() : "Never";
}

export function formatNextReview(nextReviewAt: Date | null, now: Date): string {
  if (!nextReviewAt) {
    return "Not scheduled";
  }

  const daysUntilReview = Math.ceil((nextReviewAt.getTime() - now.getTime()) / ONE_DAY_MS);

  if (daysUntilReview <= 0) {
    return "Today";
  }

  return `in ${daysUntilReview} day${daysUntilReview === 1 ? "" : "s"}`;
}
