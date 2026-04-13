"use client";

import { useActionState, useState } from "react";

import { addRelatedConceptToNodeAction } from "@/app/actions/concepts";
import { runQuizInteractionAction } from "@/app/actions/quiz";
import { QuizBody } from "@/app/components/quiz/quiz-body";
import { StatusBanners } from "@/app/components/quiz/status-banners";
import { initialQuizInteractionState } from "@/lib/quiz/session-state";

type QuizSessionProps = {
  promptId: string;
  questionKind?: "main" | "generated";
  nodeId: string;
  promptBody: string;
  promptLabel?: "Concept" | "Question";
  from: string;
  mode?: string;
};

function QuizSessionInner({
  promptId,
  questionKind = "main",
  nodeId,
  promptBody,
  promptLabel = questionKind === "generated" ? "Question" : "Concept",
  from,
  onReset,
}: QuizSessionProps & { onReset: () => void }) {
  const [state, formAction] = useActionState(runQuizInteractionAction, initialQuizInteractionState);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [relatedConceptStatus, setRelatedConceptStatus] = useState<"idle" | "adding" | "added" | "duplicate" | "error">("idle");

  function handleFormAction(formData: FormData) {
    setRelatedConceptStatus("idle");
    return formAction(formData);
  }

  async function handleAddRelatedConcept() {
    if (!state.relatedConcept) {
      return;
    }

    setRelatedConceptStatus("adding");

    const result = await addRelatedConceptToNodeAction({
      nodeId,
      title: state.relatedConcept,
      returnTo: from,
    });

    if (result.status === "success") {
      setRelatedConceptStatus("added");
      return;
    }

    if (result.status === "duplicate") {
      setRelatedConceptStatus("duplicate");
      return;
    }

    setRelatedConceptStatus("error");
  }

  return (
    <>
      <QuizBody
        promptId={promptId}
        questionKind={questionKind}
        promptLabel={promptLabel}
        promptBody={promptBody}
        from={from}
        draftAnswer={draftAnswer}
        activeHints={state.activeHints}
        revealedAnswer={state.revealedAnswer}
        submission={
          state.feedback && state.submittedAnswer
            ? {
                answer: state.submittedAnswer,
                feedback: state.feedback,
              }
            : null
        }
        relatedConcept={state.relatedConcept}
        relatedConceptStatus={relatedConceptStatus}
        generatedQuestions={state.generatedQuestions}
        formAction={handleFormAction}
        onDraftAnswerChange={setDraftAnswer}
        onReset={onReset}
        onAddRelatedConcept={handleAddRelatedConcept}
      />
      <StatusBanners
        submitted={state.status === "submitted"}
        reset={false}
        saveError={state.errorCode === "attempt_save_failed"}
        attemptTimedOut={state.errorCode === "attempt_timeout"}
        attemptProviderHttpError={state.errorCode === "attempt_provider_http_error"}
        gradingError={state.errorCode === "attempt_invalid_response" || state.errorCode === "attempt_network_error"}
        hintTimedOut={state.errorCode === "hint_timeout"}
        hintProviderHttpError={state.errorCode === "hint_provider_http_error"}
        hintError={state.errorCode === "hint_generation_failed" || state.errorCode === "hint_invalid_response" || state.errorCode === "hint_network_error"}
        hintLimitReached={state.errorCode === "hint_limit_reached"}
        llmLimitReached={state.errorCode === "llm_daily_limit_reached"}
        addedCount={0}
        skippedCount={0}
        generatedQuestionMutationError={false}
      />
    </>
  );
}

export function QuizSession(props: QuizSessionProps) {
  const [sessionKey, setSessionKey] = useState(0);

  return (
    <QuizSessionInner
      key={sessionKey}
      {...props}
      onReset={() => {
        setSessionKey((current) => current + 1);
      }}
    />
  );
}
