import { QuizFormButtons } from "@/app/components/quiz/quiz-form-buttons";

type AnswerCardProps = {
  questionId: string;
  from: string;
  answer?: string;
  draftAnswer?: string;
  editable: boolean;
  hints?: string[];
  formAction?: (formData: FormData) => void;
  onDraftAnswerChange?: (nextValue: string) => void;
};

export function AnswerCard({
  questionId,
  from,
  answer,
  draftAnswer = "",
  editable,
  hints = [],
  formAction,
  onDraftAnswerChange,
}: AnswerCardProps) {
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
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="questionId" value={questionId} />
        <input type="hidden" name="from" value={from} />
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Answer</p>
        <textarea
          id="answer"
          name="answer"
          value={draftAnswer}
          onChange={(event) => onDraftAnswerChange?.(event.target.value)}
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
