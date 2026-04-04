export const QUIZ_FORM_SLOW_REQUEST_MS = 8000;

export type QuizFormPendingIntent = "hint" | "reveal" | "submit" | null;

export type QuizFormButtonsStateInput = {
  hintCount: number;
  answerRevealed: boolean;
  intent: QuizFormPendingIntent;
  isBusy: boolean;
  isSlow: boolean;
};

export type QuizFormButtonsState = {
  hintDisabled: boolean;
  hintLabel: string;
  hintIntent: "hint" | "reveal";
  submitDisabled: boolean;
  submitLabel: string;
  slowMessage: string | null;
};

export function getQuizFormPendingIntent(formData: FormData | null): QuizFormPendingIntent {
  const value = formData?.get("intent");

  if (value === "hint" || value === "reveal" || value === "submit") {
    return value;
  }

  return null;
}

export function getQuizFormButtonsState(input: QuizFormButtonsStateInput): QuizFormButtonsState {
  if (input.answerRevealed) {
    return {
      hintDisabled: true,
      hintLabel: "Answer revealed",
      hintIntent: "reveal",
      submitDisabled: input.isBusy,
      submitLabel: input.isBusy && input.intent !== "hint" && input.intent !== "reveal" ? "Submitting..." : "Submit",
      slowMessage:
        input.isBusy && input.isSlow
          ? "Still waiting on the server. If grading does not finish soon, this attempt will time out and return an error."
          : null,
    };
  }

  const isRevealStep = input.hintCount >= 3;

  return {
    hintDisabled: input.isBusy,
    hintLabel:
      isRevealStep
        ? input.isBusy && input.intent === "reveal"
          ? "Revealing answer..."
          : "Reveal answer"
        : input.isBusy && input.intent === "hint"
          ? "Loading hint..."
          : "Hint",
    hintIntent: isRevealStep ? "reveal" : "hint",
    submitDisabled: input.isBusy,
    submitLabel: input.isBusy && input.intent !== "hint" && input.intent !== "reveal" ? "Submitting..." : "Submit",
    slowMessage:
      input.isBusy && input.isSlow
        ? "Still waiting on the server. If grading does not finish soon, this attempt will time out and return an error."
        : null,
  };
}
