import { GENERATED_QUESTION_SUGGESTION_TIER_SIZE } from "@/lib/quiz/constants";

export type GeneratedQuestionSuggestionStatus =
  | {
      kind: "added";
      questionId: string;
    }
  | {
      kind: "duplicate";
    };

type GeneratedQuestionSuggestionsProps = {
  questions: string[];
  questionStatuses: Record<string, GeneratedQuestionSuggestionStatus | undefined>;
  onAdd: (question: string) => void | Promise<void>;
  onRemove: (question: string) => void | Promise<void>;
  onAddAll: () => void | Promise<void>;
  pendingQuestion: string | null;
  pendingQuestionAction: "add" | "remove" | null;
  addAllPending: boolean;
};

const QUESTION_TIERS = [
  { label: "Easy", description: "Basic questions focused on the missed or nearby concept." },
  { label: "Medium", description: "Application questions that build on the easy tier." },
  { label: "Hard", description: "Synthesis questions that build on the earlier tiers." },
] as const;

export function GeneratedQuestionSuggestions({
  questions,
  questionStatuses,
  onAdd,
  onRemove,
  onAddAll,
  pendingQuestion,
  pendingQuestionAction,
  addAllPending,
}: GeneratedQuestionSuggestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  const isBusy = addAllPending || pendingQuestion !== null;
  const tierSections = QUESTION_TIERS.map((tier, index) => ({
    ...tier,
    questions: questions.slice(
      index * GENERATED_QUESTION_SUGGESTION_TIER_SIZE,
      (index + 1) * GENERATED_QUESTION_SUGGESTION_TIER_SIZE,
    ),
  })).filter((tier) => tier.questions.length > 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Suggested Questions</p>
            <p className="mt-2 text-sm text-slate-700">
              Add any of these to the same node as future review questions. The tiers move from foundational to
              advanced.
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

        <div className="flex flex-col gap-4">
          {tierSections.map((tier) => (
            <section key={tier.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{tier.label}</p>
                <p className="mt-1 text-sm text-slate-600">{tier.description}</p>
              </div>

              <div className="flex flex-col gap-3">
                {tier.questions.map((question) => {
                  const status = questionStatuses[question];
                  const isPending = pendingQuestion === question;
                  const isAdding = isPending && pendingQuestionAction === "add";
                  const isRemoving = isPending && pendingQuestionAction === "remove";
                  const isAdded = status !== undefined;

                  return (
                    <div
                      key={question}
                      className={`flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between ${
                        isAdded ? "border-slate-200 bg-slate-100 opacity-60" : "border-slate-200 bg-white"
                      }`}
                    >
                      <p className="text-sm text-slate-900">{question}</p>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => void onAdd(question)}
                          disabled={isBusy || isAdded}
                          className="shrink-0 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:opacity-70"
                        >
                          {isAdding ? "Adding..." : isAdded ? "Added" : "Add"}
                        </button>
                        {isAdded ? (
                          <button
                            type="button"
                            onClick={() => void onRemove(question)}
                            disabled={isBusy}
                            className="shrink-0 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-slate-400"
                          >
                            {isRemoving ? "Removing..." : "Remove"}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
