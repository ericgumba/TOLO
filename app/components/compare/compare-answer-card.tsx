"use client";

type CompareAnswerCardProps = {
  sourceConceptId: string;
  targetConceptId: string;
  relationshipId: string;
  promptId: string;
  category: "COMPARE" | "PART_WHOLE" | "DEPENDENCY" | "ANALOGY" | "TRADEOFF" | "MECHANISM_LINK";
  from: string;
  draftAnswer?: string;
  answer?: string;
  editable: boolean;
  formAction?: (formData: FormData) => void;
  onDraftAnswerChange?: (nextValue: string) => void;
};

export function CompareAnswerCard({
  sourceConceptId,
  targetConceptId,
  relationshipId,
  promptId,
  category,
  from,
  draftAnswer = "",
  answer,
  editable,
  formAction,
  onDraftAnswerChange,
}: CompareAnswerCardProps) {
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
        <input type="hidden" name="sourceConceptId" value={sourceConceptId} />
        <input type="hidden" name="targetConceptId" value={targetConceptId} />
        <input type="hidden" name="relationshipId" value={relationshipId} />
        <input type="hidden" name="promptId" value={promptId} />
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="from" value={from} />
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Answer</p>
        <textarea
          id="compare-answer"
          name="answer"
          value={draftAnswer}
          onChange={(event) => onDraftAnswerChange?.(event.target.value)}
          className="min-h-36 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Explain how these concepts are related, how they differ, and when each matters"
          required
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Submit comparison
          </button>
        </div>
      </form>
    </section>
  );
}
