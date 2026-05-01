import Link from "next/link";

import { addTagToConceptAction, deleteConceptAction, resetConceptReviewStateAction } from "@/app/actions/concepts";
import { formatLastAnsweredAt, formatNextReview } from "@/lib/review/display";

type GeneratedQuestionCategory = "EXPLAIN" | "ANALYZE" | "EVALUATE" | "APPLY" | "TEACH";

const STUDY_LENS_ROWS: Array<{
  label: string;
  category?: GeneratedQuestionCategory;
}> = [
  { label: "Define" },
  { label: "Explain", category: "EXPLAIN" },
  { label: "Analyze", category: "ANALYZE" },
  { label: "Evaluate", category: "EVALUATE" },
  { label: "Apply", category: "APPLY" },
  { label: "Teach", category: "TEACH" },
];

function formatScore(score: number | null | undefined): string {
  return typeof score === "number" ? String(score) : "—";
}

type ConceptListItemProps = {
  conceptId: string;
  conceptTitle: string;
  conceptPath?: string;
  conceptScore: number | null;
  tags?: string[];
  generatedQuestionScores?: Array<{
    id: string;
    category: GeneratedQuestionCategory;
    body: string;
    score: number | null;
  }>;
  returnTo: string;
  lastAnsweredAt: Date | null;
  nextReviewAt: Date | null;
  now: Date;
};

export function ConceptListItem({
  conceptId,
  conceptTitle,
  conceptPath,
  conceptScore,
  tags = [],
  generatedQuestionScores = [],
  returnTo,
  lastAnsweredAt,
  nextReviewAt,
  now,
}: ConceptListItemProps) {
  const generatedQuestionByCategory = new Map(
    generatedQuestionScores.map((generatedQuestion) => [generatedQuestion.category, generatedQuestion]),
  );
  const unlockedRows =
    conceptScore === null
      ? []
      : STUDY_LENS_ROWS.filter((row) => !row.category || generatedQuestionByCategory.has(row.category));

  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/quiz/${conceptId}?from=${encodeURIComponent(returnTo)}`}
          className="min-w-0 flex-1 rounded-md transition hover:text-slate-900"
        >
          <p>{conceptTitle}</p>
          {tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {conceptPath ? <p className="mt-1 text-xs text-slate-500">Path: {conceptPath}</p> : null}
          <p className="mt-1 text-xs text-slate-500">Last answered at: {formatLastAnsweredAt(lastAnsweredAt)}</p>
          <p className="text-xs text-slate-500">Next review: {formatNextReview(nextReviewAt, now)}</p>
        </Link>

        <div className="flex shrink-0 items-start gap-2">
          <details className="relative">
            <summary className="list-none cursor-pointer rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-zinc-100">
              Settings
            </summary>
            <div className="absolute right-0 z-10 mt-2 w-52 rounded-md border border-zinc-200 bg-white p-2 shadow-lg">
              <form action={resetConceptReviewStateAction} className="mb-1">
                <input type="hidden" name="questionId" value={conceptId} />
                <input type="hidden" name="returnTo" value={returnTo} />
                <button
                  type="submit"
                  className="w-full rounded-md px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-zinc-100"
                >
                  Reset Review State
                </button>
              </form>
              <details className="mb-1 rounded-md">
                <summary className="cursor-pointer rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-zinc-100">
                  Add Tag
                </summary>
                <div className="mt-1 rounded-md border border-slate-200 bg-slate-50 p-2">
                  <form action={addTagToConceptAction} className="flex flex-col gap-2">
                    <input type="hidden" name="conceptId" value={conceptId} />
                    <input type="hidden" name="returnTo" value={returnTo} />
                    <input
                      type="text"
                      name="tagName"
                      className="rounded-md border border-zinc-300 px-2 py-1.5 text-xs text-slate-900"
                      placeholder="Tag name"
                      required
                    />
                    <button
                      type="submit"
                      className="rounded-md bg-zinc-900 px-2 py-1.5 text-left text-xs font-medium text-white hover:bg-zinc-700"
                    >
                      Save Tag
                    </button>
                  </form>
                </div>
              </details>
              <details className="rounded-md">
                <summary className="cursor-pointer rounded-md px-2 py-1.5 text-xs text-red-700 hover:bg-red-50">
                  Delete Concept
                </summary>
                <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-2">
                  <p className="text-[11px] leading-4 text-red-700">This action cannot be undone.</p>
                  <form action={deleteConceptAction} className="mt-2">
                    <input type="hidden" name="questionId" value={conceptId} />
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
      </div>

      {unlockedRows.length > 0 ? (
        <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unlockedRows.map((row) => {
              const generatedQuestion = row.category ? generatedQuestionByCategory.get(row.category) : null;
              const score = row.category ? generatedQuestion?.score : conceptScore;
              const href = row.category
                ? `/quiz/generated/${generatedQuestion?.id}?from=${encodeURIComponent(returnTo)}`
                : `/quiz/${conceptId}?from=${encodeURIComponent(returnTo)}`;
              const previewText = row.category
                ? generatedQuestion?.body ?? ""
                : `Define ${conceptTitle} in your own words.`;

              return (
                <div key={row.label} className="group relative">
                  <Link
                    href={href}
                    className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 transition hover:border-slate-300 hover:bg-slate-100"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{row.label}</p>
                    <p className="text-sm font-semibold text-slate-900">{formatScore(score)}</p>
                  </Link>
                  <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 hidden w-72 rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-xs leading-5 text-white shadow-lg group-hover:block group-focus-within:block">
                    {previewText}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </li>
  );
}
