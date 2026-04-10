"use client";

import { useActionState, useState } from "react";

import { addSuggestedQuestionToNodeAction } from "@/app/actions/questions";
import { runQuizInteractionAction } from "@/app/actions/quiz";
import { QuizBody } from "@/app/components/quiz/quiz-body";
import { StatusBanners } from "@/app/components/quiz/status-banners";
import { initialQuizInteractionState } from "@/lib/quiz/session-state";

type QuizSessionProps = {
  questionId: string;
  nodeId: string;
  questionBody: string;
  from: string;
  mode?: string;
};

function QuizSessionInner({ questionId, nodeId, questionBody, from, onReset }: QuizSessionProps & { onReset: () => void }) {
  const [state, formAction] = useActionState(runQuizInteractionAction, initialQuizInteractionState);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [suggestedQuestionStatus, setSuggestedQuestionStatus] = useState<"idle" | "adding" | "added" | "duplicate" | "error">("idle");

  function handleFormAction(formData: FormData) {
    setSuggestedQuestionStatus("idle");
    return formAction(formData);
  }

  async function handleAddSuggestedQuestion() {
    if (!state.suggestedQuestion) {
      return;
    }

    setSuggestedQuestionStatus("adding");

    const result = await addSuggestedQuestionToNodeAction({
      nodeId,
      body: state.suggestedQuestion,
      returnTo: from,
    });

    if (result.status === "success") {
      setSuggestedQuestionStatus("added");
      return;
    }

    if (result.status === "duplicate") {
      setSuggestedQuestionStatus("duplicate");
      return;
    }

    setSuggestedQuestionStatus("error");
  }

  return (
    <>
      <QuizBody
        questionId={questionId}
        questionBody={questionBody}
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
        suggestedQuestion={state.suggestedQuestion}
        suggestedQuestionStatus={suggestedQuestionStatus}
        generatedQuestions={state.generatedQuestions}
        formAction={handleFormAction}
        onDraftAnswerChange={setDraftAnswer}
        onReset={onReset}
        onAddSuggestedQuestion={handleAddSuggestedQuestion}
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
