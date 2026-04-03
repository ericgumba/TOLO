"use client";

import { useActionState, useState } from "react";

import {
  addGeneratedQuestionToNodeAction,
  removeGeneratedQuestionFromNodeAction,
} from "@/app/actions/questions";
import { runQuizInteractionAction } from "@/app/actions/quiz";
import { type GeneratedQuestionSuggestionStatus } from "@/app/components/quiz/generated-question-suggestions";
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
  const [generatedQuestionStatuses, setGeneratedQuestionStatuses] = useState<
    Record<string, GeneratedQuestionSuggestionStatus | undefined>
  >({});
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [pendingQuestionAction, setPendingQuestionAction] = useState<"add" | "remove" | null>(null);
  const [addAllPending, setAddAllPending] = useState(false);
  const [addedCount, setAddedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [generatedQuestionMutationError, setGeneratedQuestionMutationError] = useState(false);

  function handleFormAction(formData: FormData) {
    setAddedCount(0);
    setSkippedCount(0);
    setGeneratedQuestionMutationError(false);
    setGeneratedQuestionStatuses({});
    setPendingQuestion(null);
    setPendingQuestionAction(null);
    return formAction(formData);
  }

  async function handleAddGeneratedQuestion(question: string) {
    setGeneratedQuestionMutationError(false);
    setPendingQuestion(question);
    setPendingQuestionAction("add");

    const result = await addGeneratedQuestionToNodeAction({
      nodeId,
      body: question,
      returnTo: from,
    });

    setPendingQuestion(null);
    setPendingQuestionAction(null);

    if (result.status === "error") {
      setGeneratedQuestionMutationError(true);
      return;
    }

    if (result.status === "duplicate") {
      setGeneratedQuestionStatuses((current) => ({
        ...current,
        [question]: {
          kind: "duplicate",
        },
      }));
      setSkippedCount((current) => current + 1);
      return;
    }

    setGeneratedQuestionStatuses((current) => ({
      ...current,
      [question]: {
        kind: "added",
        questionId: result.questionId,
      },
    }));
    setAddedCount((current) => current + 1);
  }

  async function handleRemoveGeneratedQuestion(question: string) {
    setGeneratedQuestionMutationError(false);

    const status = generatedQuestionStatuses[question];
    if (!status) {
      return;
    }

    setPendingQuestion(question);
    setPendingQuestionAction("remove");

    if (status.kind === "duplicate") {
      setGeneratedQuestionStatuses((current) => {
        const next = { ...current };
        delete next[question];
        return next;
      });
      setSkippedCount((current) => Math.max(0, current - 1));
      setPendingQuestion(null);
      setPendingQuestionAction(null);
      return;
    }

    const result = await removeGeneratedQuestionFromNodeAction({
      questionId: status.questionId,
      returnTo: from,
    });

    setPendingQuestion(null);
    setPendingQuestionAction(null);

    if (result.status === "error") {
      setGeneratedQuestionMutationError(true);
      return;
    }

    setGeneratedQuestionStatuses((current) => {
      const next = { ...current };
      delete next[question];
      return next;
    });
    setAddedCount((current) => Math.max(0, current - 1));
  }

  async function handleAddAllGeneratedQuestions() {
    setGeneratedQuestionMutationError(false);
    setAddAllPending(true);

    const questionsToAdd = state.generatedQuestions.filter((question) => !generatedQuestionStatuses[question]);

    for (const question of questionsToAdd) {
      const result = await addGeneratedQuestionToNodeAction({
        nodeId,
        body: question,
        returnTo: from,
      });

      if (result.status === "error") {
        setGeneratedQuestionMutationError(true);
        break;
      }

      if (result.status === "duplicate") {
        setGeneratedQuestionStatuses((current) => ({
          ...current,
          [question]: {
            kind: "duplicate",
          },
        }));
        setSkippedCount((current) => current + 1);
        continue;
      }

      setGeneratedQuestionStatuses((current) => ({
        ...current,
        [question]: {
          kind: "added",
          questionId: result.questionId,
        },
      }));
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
        generatedQuestions={state.generatedQuestions}
        generatedQuestionStatuses={generatedQuestionStatuses}
        formAction={handleFormAction}
        onDraftAnswerChange={setDraftAnswer}
        onReset={onReset}
        onAddGeneratedQuestion={handleAddGeneratedQuestion}
        onRemoveGeneratedQuestion={handleRemoveGeneratedQuestion}
        onAddAllGeneratedQuestions={handleAddAllGeneratedQuestions}
        pendingGeneratedQuestion={pendingQuestion}
        pendingGeneratedQuestionAction={pendingQuestionAction}
        addAllPending={addAllPending}
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
        addedCount={addedCount}
        skippedCount={skippedCount}
        generatedQuestionMutationError={generatedQuestionMutationError}
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
