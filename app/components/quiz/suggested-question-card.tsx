"use client";

type SuggestedQuestionCardProps = {
  question: string;
  label?: string;
  helperText?: string;
  actionLabel?: string;
  duplicateMessage?: string;
  errorMessage?: string;
  status: "idle" | "adding" | "added" | "duplicate" | "error";
  onAdd: () => void | Promise<void>;
};

export function SuggestedQuestionCard({
  question,
  label = "Suggested Question",
  helperText = "This is a basic related question you can add to the current node as a real question.",
  actionLabel = "Add to node",
  duplicateMessage = "This question already exists on the current node.",
  errorMessage = "Could not add this question right now. Please retry.",
  status,
  onAdd,
}: SuggestedQuestionCardProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-2 text-sm text-slate-700">{helperText}</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-900">{question}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => void onAdd()}
            disabled={status === "adding" || status === "added"}
            className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:opacity-70"
          >
            {status === "adding" ? "Adding..." : status === "added" ? "Added to node" : actionLabel}
          </button>

          {status === "duplicate" ? <p className="text-sm text-amber-700">{duplicateMessage}</p> : null}

          {status === "error" ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
        </div>
      </div>
    </section>
  );
}
