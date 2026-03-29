type StatusBannersProps = {
  submitted: boolean;
  reset: boolean;
  saveError: boolean;
  hintError: boolean;
  hintLimitReached: boolean;
  llmLimitReached: boolean;
};

export function StatusBanners({
  submitted,
  reset,
  saveError,
  hintError,
  hintLimitReached,
  llmLimitReached,
}: StatusBannersProps) {
  if (!submitted && !reset && !saveError && !hintError && !hintLimitReached && !llmLimitReached) {
    return null;
  }

  return (
    <>
      {submitted ? (
        <section className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Attempt saved.
        </section>
      ) : null}

      {reset ? (
        <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Quiz reset. Latest answer and feedback cleared.
        </section>
      ) : null}

      {saveError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not save/reset attempt. Run latest Prisma migration and retry.
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

      {hintError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not generate hint. Please retry.
        </section>
      ) : null}
    </>
  );
}
