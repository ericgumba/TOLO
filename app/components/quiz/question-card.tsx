import { resetQuestionAttemptAction } from "@/app/actions/quiz";

type QuestionCardProps = {
  questionId: string;
  questionBody: string;
  from: string;
  canReset: boolean;
};

export function QuestionCard({ questionId, questionBody, from, canReset }: QuestionCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Question</p>
        {canReset ? (
          <form action={resetQuestionAttemptAction}>
            <input type="hidden" name="questionId" value={questionId} />
            <input type="hidden" name="from" value={from} />
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-zinc-100"
            >
              Reset quiz
            </button>
          </form>
        ) : null}
      </div>
      <p className="mt-3 text-lg font-semibold text-slate-900">{questionBody}</p>
    </section>
  );
}
