"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState } from "react";

import {
  addGeneratedQuestionToNodeAction,
  generateMainQuestionsPreviewAction,
} from "@/app/actions/questions";
import { initialGeneratedQuestionPreviewState } from "@/lib/questions/question-generator-preview";

type QuestionGeneratorPanelProps = {
  nodeId: string;
  targetLabel: string;
  returnTo: string;
};

export function QuestionGeneratorPanel({ nodeId, targetLabel, returnTo }: QuestionGeneratorPanelProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    generateMainQuestionsPreviewAction,
    initialGeneratedQuestionPreviewState,
  );
  const [hiddenQuestionIds, setHiddenQuestionIds] = useState<string[]>([]);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [pendingQuestionId, setPendingQuestionId] = useState<string | null>(null);

  const visibleQuestions = useMemo(
    () => state.generatedQuestions.filter((question) => !hiddenQuestionIds.includes(question.id)),
    [hiddenQuestionIds, state.generatedQuestions],
  );
  const resolvedTargetLabel = state.targetLabel || targetLabel;

  async function handleAdd(questionId: string, body: string) {
    setPersistError(null);
    setPendingQuestionId(questionId);

    const result = await addGeneratedQuestionToNodeAction({
      nodeId,
      body,
      returnTo,
    });

    setPendingQuestionId(null);

    if (result.status === "error") {
      setPersistError(result.error);
      return;
    }

    setHiddenQuestionIds((current) => [...current, questionId]);
    router.refresh();
  }

  function handleDiscard(questionId: string) {
    setPersistError(null);
    setHiddenQuestionIds((current) => [...current, questionId]);
  }

  function handleGenerate(formData: FormData) {
    setPersistError(null);
    setPendingQuestionId(null);
    setHiddenQuestionIds([]);
    return formAction(formData);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Generate quiz questions for {resolvedTargetLabel}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Generate five preview-only main questions for the currently selected node.
          </p>
        </div>

        <form action={handleGenerate} className="flex flex-col gap-3 sm:max-w-2xl">
          <input type="hidden" name="nodeId" value={nodeId} />
          <input type="hidden" name="returnTo" value={returnTo} />

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-900">Target node</span>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {resolvedTargetLabel}
            </div>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-slate-900">Notes (optional)</span>
            <textarea
              name="notes"
              className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-sm"
              placeholder="Book, chapter, lecture context, or any constraints for the generated questions"
            />
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isPending ? "Generating..." : "Generate Quiz Questions"}
          </button>
        </form>

        {state.error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{state.error}</div>
        ) : null}

        {state.message ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {state.message}
          </div>
        ) : null}

        {persistError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {persistError}
          </div>
        ) : null}

        {visibleQuestions.length > 0 ? (
          <div className="flex flex-col gap-3">
            {visibleQuestions.map((question, index) => {
              const isSaving = pendingQuestionId === question.id;

              return (
                <div
                  key={question.id}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Preview {index + 1}
                    </p>
                    <p className="mt-2 text-sm text-slate-900">{question.body}</p>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleAdd(question.id, question.body)}
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
                    >
                      {isSaving ? "Adding..." : "Add to node"}
                    </button>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleDiscard(question.id)}
                      className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-slate-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}
