type StatusBannersProps = {
  submitted: boolean;
  reset: boolean;
  saveError: boolean;
  attemptTimedOut: boolean;
  attemptProviderHttpError: boolean;
  gradingError: boolean;
  hintTimedOut: boolean;
  hintProviderHttpError: boolean;
  hintError: boolean;
  hintLimitReached: boolean;
  llmLimitReached: boolean;
  addedCount: number;
  skippedCount: number;
  generatedQuestionMutationError: boolean;
};

export function StatusBanners({
  submitted,
  reset,
  saveError,
  attemptTimedOut,
  attemptProviderHttpError,
  gradingError,
  hintTimedOut,
  hintProviderHttpError,
  hintError,
  hintLimitReached,
  llmLimitReached,
  addedCount,
  skippedCount,
  generatedQuestionMutationError,
}: StatusBannersProps) {
  if (
    !submitted &&
    !reset &&
    !saveError &&
    !attemptTimedOut &&
    !attemptProviderHttpError &&
    !gradingError &&
    !hintTimedOut &&
    !hintProviderHttpError &&
    !hintError &&
    !hintLimitReached &&
    !llmLimitReached &&
    addedCount === 0 &&
    skippedCount === 0 &&
    !generatedQuestionMutationError
  ) {
    return null;
  }

  return (
    <>
      {submitted ? (
        <section className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          These results clear when you refresh or leave the page.
        </section>
      ) : null}

      {reset ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Quiz reset. Latest answer and feedback cleared.
        </section>
      ) : null}

      {saveError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not complete this quiz action. Please retry.
        </section>
      ) : null}

      {attemptTimedOut ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Grading took too long, so feedback could not be generated. Please retry.
        </section>
      ) : null}

      {attemptProviderHttpError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Grading failed because the LLM provider returned an HTTP error. Please retry.
        </section>
      ) : null}

      {gradingError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not grade this answer because the LLM response was invalid or unavailable. Please retry.
        </section>
      ) : null}

      {addedCount > 0 || skippedCount > 0 ? (
        <section
          className={`rounded-xl px-4 py-3 text-sm ${
            skippedCount > 0
              ? "border border-amber-200 bg-amber-50 text-amber-800"
              : "border border-green-200 bg-green-50 text-green-800"
          }`}
        >
          Added {addedCount} {addedCount === 1 ? "question" : "questions"} to this node. Skipped {skippedCount}{" "}
          {skippedCount === 1 ? "duplicate" : "duplicates"}.
        </section>
      ) : null}

      {hintLimitReached ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You have reached the maximum of 3 hints for this active question.
        </section>
      ) : null}

      {llmLimitReached ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Daily LLM limit reached for free plan (3/day across hints and grading). Upgrade to Premium for unlimited use.
        </section>
      ) : null}

      {hintTimedOut ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Hint generation timed out. Please retry.
        </section>
      ) : null}

      {hintProviderHttpError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Hint generation failed because the LLM provider returned an HTTP error. Please retry.
        </section>
      ) : null}

      {hintError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not generate hint because the LLM response was invalid or unavailable. Please retry.
        </section>
      ) : null}

      {generatedQuestionMutationError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not update the suggested question. Please retry.
        </section>
      ) : null}
    </>
  );
}
