"use client";

import { useActionState, useMemo, useState } from "react";

import { addGeneratedQuestionToNodeAction } from "@/app/actions/questions";
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

function QuizSessionInner({ questionId, nodeId, questionBody, from, mode, onReset }: QuizSessionProps & { onReset: () => void }) {
  const [state, formAction] = useActionState(runQuizInteractionAction, initialQuizInteractionState);
  const [draftAnswer, setDraftAnswer] = useState("");
  const [hiddenQuestions, setHiddenQuestions] = useState<string[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [addAllPending, setAddAllPending] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [generatedQuestionAddError, setGeneratedQuestionAddError] = useState(false);

  const visibleQuestions = useMemo(
    () => state.generatedQuestions.filter((question) => !hiddenQuestions.includes(question)),
    [hiddenQuestions, state.generatedQuestions],
  );

  function handleFormAction(formData: FormData) {
    setAddedCount(0);
    setSkippedCount(0);
    setGeneratedQuestionAddError(false);
    return formAction(formData);
  }

  async function handleAddGeneratedQuestion(question: string) {
    setGeneratedQuestionAddError(false);
    setPendingQuestion(question);

    const result = await addGeneratedQuestionToNodeAction({
      nodeId,
      body: question,
      returnTo: from,
    });

    setPendingQuestion(null);

    if (result.status === "error") {
      setGeneratedQuestionAddError(true);
      return;
    }

    setHiddenQuestions((current) => [...current, question]);

    if (result.status === "duplicate") {
      setSkippedCount((current) => current + 1);
      return;
    }

    setAddedCount((current) => current + 1);
  }

  async function handleAddAllGeneratedQuestions() {
    setGeneratedQuestionAddError(false);
    setAddAllPending(true);

    for (const question of visibleQuestions) {
      const result = await addGeneratedQuestionToNodeAction({
        nodeId,
        body: question,
        returnTo: from,
      });

      if (result.status === "error") {
        setGeneratedQuestionAddError(true);
        break;
      }

      setHiddenQuestions((current) => [...current, question]);

      if (result.status === "duplicate") {
        setSkippedCount((current) => current + 1);
        continue;
      }

      setAddedCount((current) => current + 1);
    }

    setAddAllPending(false);
  }

  return (
    <>
      <QuizBody
        questionId={questionId}
        questionBody={questionBody}
        from={from}
        mode={mode}
        draftAnswer={draftAnswer}
        activeHints={state.activeHints}
        submission={
          state.feedback && state.submittedAnswer
            ? {
                answer: state.submittedAnswer,
                feedback: state.feedback,
              }
            : null
        }
        generatedQuestions={visibleQuestions}
        formAction={handleFormAction}
        onDraftAnswerChange={setDraftAnswer}
        onReset={onReset}
        onAddGeneratedQuestion={handleAddGeneratedQuestion}
        onAddAllGeneratedQuestions={handleAddAllGeneratedQuestions}
        pendingGeneratedQuestion={pendingQuestion}
        addAllPending={addAllPending}
      />
      <StatusBanners
        submitted={state.status === "submitted"}
        reset={false}
        saveError={state.errorCode === "attempt_save_failed"}
        attemptTimedOut={state.errorCode === "attempt_timeout"}
        attemptMissingApiKey={state.errorCode === "attempt_missing_api_key"}
        attemptProviderHttpError={state.errorCode === "attempt_provider_http_error"}
        gradingError={state.errorCode === "attempt_invalid_response" || state.errorCode === "attempt_network_error"}
        hintTimedOut={state.errorCode === "hint_timeout"}
        hintMissingApiKey={state.errorCode === "hint_missing_api_key"}
        hintProviderHttpError={state.errorCode === "hint_provider_http_error"}
        hintError={state.errorCode === "hint_generation_failed" || state.errorCode === "hint_invalid_response" || state.errorCode === "hint_network_error"}
        hintLimitReached={state.errorCode === "hint_limit_reached"}
        llmLimitReached={state.errorCode === "llm_daily_limit_reached"}
        addedCount={addedCount}
        skippedCount={skippedCount}
        generatedQuestionAddError={generatedQuestionAddError}
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
