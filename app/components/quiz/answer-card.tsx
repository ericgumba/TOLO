import { submitQuestionAttemptAction } from "@/app/actions/quiz";
import { QuizFormButtons } from "@/app/components/quiz/quiz-form-buttons";

type AnswerCardProps = {
  questionId: string;
  from: string;
  mode?: string;
  answer?: string;
  editable: boolean;
  hints?: string[];
};

export function AnswerCard({ questionId, from, mode, answer, editable, hints = [] }: AnswerCardProps) {
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
        {mode ? <input type="hidden" name="mode" value={mode} /> : null}
        {hints[0] ? <input type="hidden" name="hint1" value={hints[0]} /> : null}
        {hints[1] ? <input type="hidden" name="hint2" value={hints[1]} /> : null}
        {hints[2] ? <input type="hidden" name="hint3" value={hints[2]} /> : null}
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Answer</p>
        <textarea
          id="answer"
          name="answer"
          className="min-h-36 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Write your answer here"
          required
        />
        <QuizFormButtons hintCount={hints.length} />
        {hints.length > 0 ? (
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Hints</p>
            <ul className="mt-2 flex flex-col gap-2">
              {hints.map((hint, index) => (
                <li key={`hint-${index + 1}`} className="text-sm text-blue-900">
                  <span className="font-semibold">Hint {index + 1}:</span> {hint}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </section>
  );
}
