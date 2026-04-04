"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  getQuizFormPendingIntent,
  getQuizFormButtonsState,
  QUIZ_FORM_SLOW_REQUEST_MS,
} from "@/lib/quiz/form-state";

type QuizFormButtonsProps = {
  hintCount: number;
  answerRevealed: boolean;
};

export function QuizFormButtons({ hintCount, answerRevealed }: QuizFormButtonsProps) {
  const { pending, data } = useFormStatus();
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(
      () => {
        setIsSlow(pending);
      },
      pending ? QUIZ_FORM_SLOW_REQUEST_MS : 0,
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [pending]);

  const intent = pending ? getQuizFormPendingIntent(data) : null;
  const state = getQuizFormButtonsState({
    hintCount,
    answerRevealed,
    intent,
    isBusy: pending,
    isSlow,
  });

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          name="intent"
          value={state.hintIntent}
          formNoValidate
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={state.hintDisabled}
        >
          {state.hintLabel}
        </button>
        <button
          type="submit"
          name="intent"
          value="submit"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:opacity-70"
          disabled={state.submitDisabled}
        >
          {state.submitLabel}
        </button>
      </div>
      {state.slowMessage ? <p className="text-sm text-amber-700">{state.slowMessage}</p> : null}
    </>
  );
}
