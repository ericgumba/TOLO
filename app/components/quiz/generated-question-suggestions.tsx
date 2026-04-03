type GeneratedQuestionSuggestionsProps = {
  questions: string[];
  onAdd: (question: string) => void | Promise<void>;
  onAddAll: () => void | Promise<void>;
  pendingQuestion: string | null;
  addAllPending: boolean;
};

export function GeneratedQuestionSuggestions({
  questions,
  onAdd,
  onAddAll,
  pendingQuestion,
  addAllPending,
}: GeneratedQuestionSuggestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  const isBusy = addAllPending || pendingQuestion !== null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Suggested Questions</p>
            <p className="mt-2 text-sm text-slate-700">
              Add any of these to the same node as future review questions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onAddAll()}
            disabled={isBusy}
            className="shrink-0 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addAllPending ? "Adding..." : "Add all"}
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {questions.map((question) => {
            const isPending = pendingQuestion === question;

            return (
              <div
                key={question}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <p className="text-sm text-slate-900">{question}</p>
                <button
                  type="button"
                  onClick={() => void onAdd(question)}
                  disabled={isBusy}
                  className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:opacity-70"
                >
                  {isPending ? "Adding..." : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
