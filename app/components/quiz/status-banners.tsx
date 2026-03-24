type StatusBannersProps = {
  submitted: boolean;
  reset: boolean;
  saveError: boolean;
};

export function StatusBanners({ submitted, reset, saveError }: StatusBannersProps) {
  if (!submitted && !reset && !saveError) {
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
    </>
  );
}
