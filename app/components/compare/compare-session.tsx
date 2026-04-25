"use client";

import { useActionState, useCallback, useEffect, useState } from "react";

import { runCompareInteractionAction, startCompareSessionAction } from "@/app/actions/compare";
import { CompareAnswerCard } from "@/app/components/compare/compare-answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import { QuestionCard } from "@/app/components/quiz/question-card";
import {
  type PersistedCompareGeneratedInteraction,
  initialCompareInteractionState,
} from "@/lib/compare/session-state";

type CompareSessionProps = {
  sourceConceptId: string;
  sourceConceptTitle: string;
  from: string;
};

function mapStartErrorToMessage(
  errorCode: "compare_timeout" | "compare_provider_http_error" | "compare_invalid_response" | "compare_network_error" | "llm_daily_limit_reached" | "compare_save_failed",
) {
  return errorCode === "llm_daily_limit_reached"
    ? "Daily LLM limit reached."
    : errorCode === "compare_timeout"
      ? "Compare question generation timed out. Retry."
      : errorCode === "compare_provider_http_error"
        ? "The LLM provider returned an HTTP error while generating compare questions."
        : errorCode === "compare_invalid_response"
          ? "The compare question response was invalid. Retry."
          : errorCode === "compare_network_error"
            ? "A network error occurred while generating compare questions."
            : "Could not start compare mode right now.";
}

function CompareSessionInner({
  sourceConceptId,
  targetConceptId,
  relationshipId,
  promptId,
  category,
  prompt,
  label,
  from,
  onReset,
}: {
  sourceConceptId: string;
  targetConceptId: string;
  relationshipId: string;
  promptId: string;
  category: PersistedCompareGeneratedInteraction["category"];
  prompt: string;
  label: string;
  from: string;
  onReset: () => void;
}) {
  const [state, formAction] = useActionState(runCompareInteractionAction, initialCompareInteractionState);
  const [draftAnswer, setDraftAnswer] = useState("");

  return (
    <div className="flex flex-col gap-4">
      {state.feedback && state.submittedAnswer ? (
        <>
          <QuestionCard label={label} promptBody={prompt} canReset onReset={onReset} />
          <CompareAnswerCard
            sourceConceptId={sourceConceptId}
            targetConceptId={targetConceptId}
            relationshipId={relationshipId}
            promptId={promptId}
            category={category}
            from={from}
            answer={state.submittedAnswer}
            editable={false}
          />
          <FeedbackCard feedback={state.feedback} />
        </>
      ) : (
        <>
          <QuestionCard label={label} promptBody={prompt} canReset={false} />
          <CompareAnswerCard
            sourceConceptId={sourceConceptId}
            targetConceptId={targetConceptId}
            relationshipId={relationshipId}
            promptId={promptId}
            category={category}
            from={from}
            draftAnswer={draftAnswer}
            editable
            formAction={formAction}
            onDraftAnswerChange={setDraftAnswer}
          />
        </>
      )}

      {state.errorCode ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {state.errorCode === "llm_daily_limit_reached"
            ? "Daily LLM limit reached."
            : state.errorCode === "compare_timeout"
              ? "Compare grading timed out. Retry."
              : state.errorCode === "compare_provider_http_error"
                ? "The LLM provider returned an HTTP error while grading the comparison."
                : state.errorCode === "compare_invalid_response"
                  ? "The compare response was invalid. Retry."
                  : state.errorCode === "compare_network_error"
                    ? "A network error occurred while grading the comparison."
                    : "Could not grade this comparison right now."}
        </section>
      ) : null}
    </div>
  );
}

export function CompareSession({
  sourceConceptId,
  sourceConceptTitle,
  from,
}: CompareSessionProps) {
  const [loadState, setLoadState] = useState<
    | {
        status: "loading";
      }
    | {
        status: "ready";
        relationshipId: string;
        relatedConcept: {
          id: string;
          title: string;
        };
        interactions: PersistedCompareGeneratedInteraction[];
      }
    | {
        status: "no_match";
        message: string;
      }
    | {
        status: "error";
        message: string;
      }
  >({
    status: "loading",
  });
  const [selectedCategory, setSelectedCategory] = useState<PersistedCompareGeneratedInteraction["category"] | null>(null);
  const [sessionKey, setSessionKey] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const loadSession = useCallback(async (options?: {
    forceRegenerate?: boolean;
    targetConceptId?: string;
    preserveCurrentSessionOnError?: boolean;
  }) => {
    const { forceRegenerate = false, targetConceptId, preserveCurrentSessionOnError = false } = options ?? {};

    if (forceRegenerate) {
      setIsRegenerating(true);
      setRegenerateError(null);
    } else {
      setLoadState({
        status: "loading",
      });
    }

    const result = await startCompareSessionAction({
      sourceConceptId,
      targetConceptId,
      forceRegenerate,
    });

    if (result.status === "success") {
      setLoadState({
        status: "ready",
        relationshipId: result.relationshipId,
        relatedConcept: result.relatedConcept,
        interactions: result.interactions,
      });
      setSelectedCategory((currentCategory) =>
        result.interactions.some((interaction) => interaction.category === currentCategory)
          ? currentCategory
          : result.interactions[0]?.category ?? null,
      );
      setSessionKey((current) => current + 1);
      setRegenerateError(null);
      setIsRegenerating(false);
      return;
    }

    if (result.status === "no_match") {
      if (preserveCurrentSessionOnError) {
        setRegenerateError(result.message);
        setIsRegenerating(false);
        return;
      }

      setLoadState({
        status: "no_match",
        message: result.message,
      });
      setSelectedCategory(null);
      setIsRegenerating(false);
      return;
    }

    const message = mapStartErrorToMessage(result.errorCode);

    if (preserveCurrentSessionOnError) {
      setRegenerateError(message);
      setIsRegenerating(false);
      return;
    }

    setLoadState({
      status: "error",
      message,
    });
    setSelectedCategory(null);
    setIsRegenerating(false);
  }, [sourceConceptId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (cancelled) {
        return;
      }

      await loadSession();
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [loadSession]);

  if (loadState.status === "loading") {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">Generating compare questions for {sourceConceptTitle}...</p>
      </section>
    );
  }

  if (loadState.status === "no_match" || loadState.status === "error") {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm text-slate-600">{loadState.message}</p>
      </section>
    );
  }

  const selectedInteraction =
    loadState.interactions.find((interaction) => interaction.category === selectedCategory) ?? loadState.interactions[0];

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Related concept</p>
        <p className="mt-3 text-lg font-semibold text-slate-900">{loadState.relatedConcept.title}</p>
        <p className="mt-1 text-sm text-slate-600">
          The LLM chose this concept because it has a meaningful relationship with {sourceConceptTitle}.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Interaction categories</p>
          <button
            type="button"
            onClick={() =>
              void loadSession({
                forceRegenerate: true,
                targetConceptId: loadState.relatedConcept.id,
                preserveCurrentSessionOnError: true,
              })
            }
            disabled={isRegenerating}
            className={`rounded-md border px-3 py-2 text-sm ${
              isRegenerating
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                : "border-zinc-300 bg-white text-slate-900 hover:bg-zinc-50"
            }`}
          >
            {isRegenerating ? "Regenerating..." : "Regenerate Questions"}
          </button>
        </div>
        {regenerateError ? (
          <p className="mt-3 text-sm text-red-700">{regenerateError}</p>
        ) : null}
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {loadState.interactions.map((interaction) => {
            const isActive = selectedInteraction.category === interaction.category;

            return (
              <button
                key={interaction.category}
                type="button"
                onClick={() => {
                  setSelectedCategory(interaction.category);
                  setSessionKey((current) => current + 1);
                }}
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-blue-200 bg-blue-50 text-blue-950"
                    : "border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100"
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{interaction.label}</p>
                <p className="mt-2 text-sm leading-6">{interaction.question}</p>
              </button>
            );
          })}
        </div>
      </section>

      <CompareSessionInner
        key={`${selectedInteraction.category}-${sessionKey}`}
        sourceConceptId={sourceConceptId}
        targetConceptId={loadState.relatedConcept.id}
        relationshipId={loadState.relationshipId}
        promptId={selectedInteraction.promptId}
        category={selectedInteraction.category}
        prompt={selectedInteraction.question}
        label={selectedInteraction.label}
        from={from}
        onReset={() => {
          setSessionKey((current) => current + 1);
        }}
      />
    </div>
  );
}
