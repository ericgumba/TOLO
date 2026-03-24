import Link from "next/link";

import { submitQuestionAttemptAction } from "@/app/actions/quiz";

type LatestAttempt = {
  userAnswer: string;
};

type AnswerPanelProps = {
  questionId: string;
  from: string;
  latestAttempt: LatestAttempt | null;
};

export function AnswerPanel({ questionId, from, latestAttempt }: AnswerPanelProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {latestAttempt ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-slate-900">Latest answer</p>
          <div className="min-h-36 rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-slate-700">
            {latestAttempt.userAnswer}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={from} className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
              Next Question
            </Link>
          </div>
        </div>
      ) : (
        <form action={submitQuestionAttemptAction} className="flex flex-col gap-3">
          <input type="hidden" name="questionId" value={questionId} />
          <input type="hidden" name="from" value={from} />
          <label htmlFor="answer" className="text-sm font-semibold text-slate-900">
            Your answer
          </label>
          <textarea
            id="answer"
            name="answer"
            className="min-h-36 rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Write your answer in free-form text"
            required
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Submit
            </button>
            <Link href={from} className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
              Next Question
            </Link>
          </div>
        </form>
      )}
    </section>
  );
}
