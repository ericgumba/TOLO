import { addAllGeneratedQuestionsAction, addGeneratedQuestionAction } from "@/app/actions/quiz";

type GeneratedQuestionSuggestionsProps = {
  questionId: string;
  from: string;
  mode?: string;
  questions: string[];
};

function GeneratedQuestionHiddenFields({
  questionId,
  from,
  mode,
  questions,
}: GeneratedQuestionSuggestionsProps) {
  return (
    <>
      <input type="hidden" name="questionId" value={questionId} />
      <input type="hidden" name="from" value={from} />
      {mode ? <input type="hidden" name="mode" value={mode} /> : null}
      {questions[0] ? <input type="hidden" name="generated1" value={questions[0]} /> : null}
      {questions[1] ? <input type="hidden" name="generated2" value={questions[1]} /> : null}
      {questions[2] ? <input type="hidden" name="generated3" value={questions[2]} /> : null}
    </>
  );
}

export function GeneratedQuestionSuggestions({
  questionId,
  from,
  mode,
  questions,
}: GeneratedQuestionSuggestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Suggested Main Questions</p>
            <p className="mt-2 text-sm text-slate-700">
              Add any of these to the same node as future review questions.
            </p>
          </div>
          <form action={addAllGeneratedQuestionsAction} className="shrink-0">
            <GeneratedQuestionHiddenFields questionId={questionId} from={from} mode={mode} questions={questions} />
            <button
              type="submit"
              className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-zinc-100"
            >
              Add all
            </button>
          </form>
        </div>

        <div className="flex flex-col gap-3">
          {questions.map((question, index) => (
            <div
              key={`${question}-${index}`}
              className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between"
            >
              <p className="text-sm text-slate-900">{question}</p>
              <form action={addGeneratedQuestionAction} className="shrink-0">
                <GeneratedQuestionHiddenFields questionId={questionId} from={from} mode={mode} questions={questions} />
                <input type="hidden" name="candidateIndex" value={index} />
                <button
                  type="submit"
                  className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Add to node
                </button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
