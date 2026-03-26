type Feedback = {
  llmScore: number;
  llmFeedback: string;
  llmCorrection: string;
  answeredAt?: Date;
};

type FeedbackCardProps = {
  feedback: Feedback | null;
};

export function FeedbackCard({ feedback }: FeedbackCardProps) {
  if (!feedback) {
    return null;
  }

  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">LLM feedback</p>
        {feedback.answeredAt ? (
          <p className="text-xs text-slate-500">Attempt at {feedback.answeredAt.toLocaleString()}</p>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{feedback.llmScore}/100</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Feedback</p>
          <p className="mt-1 text-sm text-slate-700">{feedback.llmFeedback}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correction</p>
          <p className="mt-1 text-sm text-slate-700">{feedback.llmCorrection}</p>
        </div>
      </div> 
    </section>
  );
}
