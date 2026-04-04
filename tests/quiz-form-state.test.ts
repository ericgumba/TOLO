import { describe, expect, it } from "vitest";

import { getQuizFormButtonsState, getQuizFormPendingIntent } from "@/lib/quiz/form-state";

describe("getQuizFormPendingIntent", () => {
  it("reads the active submit intent from form data", () => {
    const submitData = new FormData();
    submitData.set("intent", "submit");
    expect(getQuizFormPendingIntent(submitData)).toBe("submit");

    const hintData = new FormData();
    hintData.set("intent", "hint");
    expect(getQuizFormPendingIntent(hintData)).toBe("hint");

    const revealData = new FormData();
    revealData.set("intent", "reveal");
    expect(getQuizFormPendingIntent(revealData)).toBe("reveal");
  });

  it("returns null when no recognized intent is present", () => {
    expect(getQuizFormPendingIntent(null)).toBeNull();

    const unknownData = new FormData();
    unknownData.set("intent", "other");
    expect(getQuizFormPendingIntent(unknownData)).toBeNull();
  });
});

describe("getQuizFormButtonsState", () => {
  it("keeps the default labels when the form is idle", () => {
    expect(
      getQuizFormButtonsState({
        hintCount: 0,
        answerRevealed: false,
        intent: null,
        isBusy: false,
        isSlow: false,
      }),
    ).toEqual({
      hintDisabled: false,
      hintLabel: "Hint",
      hintIntent: "hint",
      submitDisabled: false,
      submitLabel: "Submit",
      slowMessage: null,
    });
  });

  it("disables both buttons and updates the submit label while a submission is in flight", () => {
    expect(
      getQuizFormButtonsState({
        hintCount: 1,
        answerRevealed: false,
        intent: "submit",
        isBusy: true,
        isSlow: false,
      }),
    ).toEqual({
      hintDisabled: true,
      hintLabel: "Hint",
      hintIntent: "hint",
      submitDisabled: true,
      submitLabel: "Submitting...",
      slowMessage: null,
    });
  });

  it("switches the hint button to reveal the answer after the third hint", () => {
    expect(
      getQuizFormButtonsState({
        hintCount: 3,
        answerRevealed: false,
        intent: null,
        isBusy: false,
        isSlow: false,
      }),
    ).toEqual({
      hintDisabled: false,
      hintLabel: "Reveal answer",
      hintIntent: "reveal",
      submitDisabled: false,
      submitLabel: "Submit",
      slowMessage: null,
    });
  });

  it("disables the reveal button after the answer has already been revealed", () => {
    expect(
      getQuizFormButtonsState({
        hintCount: 3,
        answerRevealed: true,
        intent: null,
        isBusy: false,
        isSlow: false,
      }),
    ).toEqual({
      hintDisabled: true,
      hintLabel: "Answer revealed",
      hintIntent: "reveal",
      submitDisabled: false,
      submitLabel: "Submit",
      slowMessage: null,
    });
  });

  it("shows a slow-request message while waiting on the server", () => {
    expect(
      getQuizFormButtonsState({
        hintCount: 0,
        answerRevealed: false,
        intent: "submit",
        isBusy: true,
        isSlow: true,
      }),
    ).toEqual({
      hintDisabled: true,
      hintLabel: "Hint",
      hintIntent: "hint",
      submitDisabled: true,
      submitLabel: "Submitting...",
      slowMessage: "Still waiting on the server. If grading does not finish soon, this attempt will time out and return an error.",
    });
  });
});
