import { submitQuestionAttemptAction } from "@/app/actions/quiz";

type AnswerCardProps = {
  questionId: string;
  from: string;
  answer?: string;
  prompt?: string;
  editable: boolean;
};

export function AnswerCard({ questionId, from, answer, prompt, editable }: AnswerCardProps) {
  if (!editable) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Answer</p>
        <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{answer}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <form action={submitQuestionAttemptAction} className="flex flex-col gap-3">
        <input type="hidden" name="questionId" value={questionId} />
        <input type="hidden" name="from" value={from} />
        <label htmlFor="answer" className="text-sm font-semibold text-slate-900">
          {prompt ? "Answer follow-up question" : "Your answer"}
        </label>
        {prompt ? <p className="text-sm text-slate-600">{prompt}</p> : null}
        <textarea
          id="answer"
          name="answer"
          className="min-h-36 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder={prompt ? "Write your follow-up answer" : "Write your answer in free-form text"}
          required
        />
        <div>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Submit
          </button>
        </div>
      </form>
    </section>
  );
}
