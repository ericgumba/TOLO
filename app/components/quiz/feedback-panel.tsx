import { submitQuestionAttemptAction } from "@/app/actions/quiz";

type LatestAttempt = {
  llmScore: number;
  llmFeedback: string;
  llmCorrection: string;
  answeredAt: Date;
};

type FeedbackPanelProps = {
  questionId: string;
  from: string;
  latestAttempt: LatestAttempt | null;
};

export function FeedbackPanel({ questionId, from, latestAttempt }: FeedbackPanelProps) {
  if (!latestAttempt) {
    return null;
  }

  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">LLM feedback</p>
        <p className="text-xs text-slate-500">Latest attempt at {latestAttempt.answeredAt.toLocaleString()}</p>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</p>
          <p className="mt-1 text-xl font-semibold text-slate-900">{latestAttempt.llmScore}/5</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
          <p className="mt-1 text-sm text-slate-700">{latestAttempt.llmFeedback}</p>
        </div>
      </div>
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Follow-up question</p>
        <p className="mt-1 text-sm text-slate-700">{latestAttempt.llmCorrection}</p>
      </div>

      <form action={submitQuestionAttemptAction} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="questionId" value={questionId} />
        <input type="hidden" name="from" value={from} />
        <label htmlFor="follow-up-answer" className="text-sm font-semibold text-slate-900">
          Answer follow-up question
        </label>
        <p className="text-sm text-slate-600">{latestAttempt.llmCorrection}</p>
        <textarea
          id="follow-up-answer"
          name="answer"
          className="min-h-28 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Write your follow-up answer"
          required
        />
        <div>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Submit follow-up
          </button>
        </div>
      </form>
    </section>
  );
}
