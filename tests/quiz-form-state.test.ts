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
        intent: null,
        isBusy: false,
        isSlow: false,
      }),
    ).toEqual({
      hintDisabled: false,
      hintLabel: "Hint",
      submitDisabled: false,
      submitLabel: "Submit",
      slowMessage: null,
    });
  });

  it("disables both buttons and updates the submit label while a submission is in flight", () => {
    expect(
      getQuizFormButtonsState({
        hintCount: 1,
        intent: "submit",
        isBusy: true,
        isSlow: false,
      }),
    ).toEqual({
      hintDisabled: true,
      hintLabel: "Hint",
      submitDisabled: true,
      submitLabel: "Submitting...",
      slowMessage: null,
    });
  });

  it("keeps the hint limit enforced even when the form is idle", () => {
    expect(
      getQuizFormButtonsState({
        hintCount: 3,
        intent: null,
        isBusy: false,
        isSlow: false,
      }),
    ).toEqual({
      hintDisabled: true,
      hintLabel: "Hint",
      submitDisabled: false,
      submitLabel: "Submit",
      slowMessage: null,
    });
  });

  it("shows a slow-request message while waiting on the server", () => {
    expect(
      getQuizFormButtonsState({
        hintCount: 0,
        intent: "submit",
        isBusy: true,
        isSlow: true,
      }),
    ).toEqual({
      hintDisabled: true,
      hintLabel: "Hint",
      submitDisabled: true,
      submitLabel: "Submitting...",
      slowMessage: "Still waiting on the server. If grading does not finish soon, this attempt will time out and return an error.",
    });
  });
});
