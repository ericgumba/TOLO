type AdBannerProps = {
  placement: "top" | "right";
};

export function AdBanner({ placement }: AdBannerProps) {
  if (placement === "top") {
    return (
      <section className="border-b border-slate-200 bg-gradient-to-r from-slate-100 via-white to-slate-100">
        <div className="mx-auto flex w-full max-w-[90rem] items-center justify-between gap-4 px-6 py-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Sponsored</p>
            <p className="truncate text-sm font-medium text-slate-800">
              Your brand here. Reach learners while they study, review, and quiz.
            </p>
          </div>
          <div className="shrink-0 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            970 x 90
          </div>
        </div>
      </section>
    );
  }

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Sponsored</p>
      <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-slate-100 p-5">
        <p className="text-lg font-semibold tracking-tight text-slate-900">Advertise on TOLO</p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Put a vertical campaign beside active study sessions and review queues.
        </p>
        <div className="mt-4 rounded-xl bg-slate-900 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-white">
          300 x 600
        </div>
      </div>
    </aside>
  );
}
