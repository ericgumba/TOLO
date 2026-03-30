export const QUIZ_FORM_SLOW_REQUEST_MS = 8000;

export type QuizFormPendingIntent = "hint" | "submit" | null;

export type QuizFormButtonsStateInput = {
  hintCount: number;
  intent: QuizFormPendingIntent;
  isBusy: boolean;
  isSlow: boolean;
};

export type QuizFormButtonsState = {
  hintDisabled: boolean;
  hintLabel: string;
  submitDisabled: boolean;
  submitLabel: string;
  slowMessage: string | null;
};

export function getQuizFormPendingIntent(formData: FormData | null): QuizFormPendingIntent {
  const value = formData?.get("intent");

  if (value === "hint" || value === "submit") {
    return value;
  }

  return null;
}

export function getQuizFormButtonsState(input: QuizFormButtonsStateInput): QuizFormButtonsState {
  return {
    hintDisabled: input.isBusy || input.hintCount >= 3,
    hintLabel: input.isBusy && input.intent === "hint" ? "Loading hint..." : "Hint",
    submitDisabled: input.isBusy,
    submitLabel: input.isBusy && input.intent !== "hint" ? "Submitting..." : "Submit",
    slowMessage:
      input.isBusy && input.isSlow
        ? "Still waiting on the server. If grading does not finish soon, this attempt will time out and return an error."
        : null,
  };
}
