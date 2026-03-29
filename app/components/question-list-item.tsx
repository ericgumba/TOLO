import Link from "next/link";

import { deleteQuestionAction, resetQuestionReviewStateAction } from "@/app/actions/questions";

type QuestionListItemProps = {
  questionId: string;
  questionBody: string;
  questionPath: string;
  returnTo: string;
  lastAnsweredAt: Date | null;
  nextReviewAt: Date | null;
  now: Date;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function QuestionListItem({
  questionId,
  questionBody,
  questionPath,
  returnTo,
  lastAnsweredAt,
  nextReviewAt,
  now,
}: QuestionListItemProps) {
  const daysUntilReview = nextReviewAt ? Math.ceil((nextReviewAt.getTime() - now.getTime()) / ONE_DAY_MS) : null;

  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/quiz/${questionId}?from=${encodeURIComponent(returnTo)}`}
          className="min-w-0 flex-1 rounded-md transition hover:text-slate-900"
        >
          <p>{questionBody}</p>
          <p className="mt-1 text-xs text-slate-500">Path: {questionPath}</p>
          <p className="mt-1 text-xs text-slate-500">
            Last answered at: {lastAnsweredAt ? lastAnsweredAt.toLocaleString() : "Never"}
          </p>
          <p className="text-xs text-slate-500">
            Next review:{" "}
            {daysUntilReview === null
              ? "Not scheduled"
              : daysUntilReview <= 0
                ? "Today"
                : `in ${daysUntilReview} day${daysUntilReview === 1 ? "" : "s"}`}
          </p>
        </Link>

        <details className="relative shrink-0">
          <summary className="list-none cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-zinc-100">
            Settings
          </summary>
          <div className="absolute right-0 z-10 mt-2 w-52 rounded-md border border-zinc-200 bg-white p-2 shadow-lg">
            <form action={resetQuestionReviewStateAction} className="mb-1">
              <input type="hidden" name="questionId" value={questionId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <button
                type="submit"
                className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-zinc-100"
              >
                Reset Review State
              </button>
            </form>
            <details className="rounded-md">
              <summary className="cursor-pointer rounded-md px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">
                Delete Question
              </summary>
              <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-2">
                <p className="text-[11px] leading-4 text-red-700">This action cannot be undone.</p>
                <form action={deleteQuestionAction} className="mt-2">
                  <input type="hidden" name="questionId" value={questionId} />
                  <input type="hidden" name="returnTo" value={returnTo} />
                  <input type="hidden" name="confirmDelete" value="DELETE" />
                  <button
                    type="submit"
                    className="w-full rounded-md border border-red-300 bg-white px-2 py-1.5 text-left text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    Confirm Delete
                  </button>
                </form>
              </div>
            </details>
          </div>
        </details>
      </div>
    </li>
  );
}
