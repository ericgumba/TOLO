import Link from "next/link";

type ReviewLaunchCardProps = {
  dueCount: number;
  reviewHref: string | null;
  scopeLabel: string;
};

export function ReviewLaunchCard({ dueCount, reviewHref, scopeLabel }: ReviewLaunchCardProps) {
  const dueLabel =
    dueCount === 0
      ? `No concepts due in this ${scopeLabel}.`
      : `${dueCount} concept${dueCount === 1 ? "" : "s"} due in this ${scopeLabel}.`;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Review</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{dueCount}</p>
      <p className="mt-1 text-xs text-slate-500">{dueLabel}</p>
      {reviewHref ? (
        <Link
          href={reviewHref}
          className="mt-3 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Start Review
        </Link>
      ) : null}
    </section>
  );
}
