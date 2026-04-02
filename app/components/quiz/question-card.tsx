type QuestionCardProps = {
  questionBody: string;
  canReset: boolean;
  onReset?: () => void;
};

export function QuestionCard({ questionBody, canReset, onReset }: QuestionCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Question</p>
        {canReset ? (
          <button
            type="button"
            onClick={onReset}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-zinc-100"
          >
            Reset quiz
          </button>
        ) : null}
      </div>
      <p className="mt-3 text-lg font-semibold text-slate-900">{questionBody}</p>
    </section>
  );
}
