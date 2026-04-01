import { createQuestionAction } from "@/app/actions/questions";

type CreateQuestionSectionProps = {
  nodeId: string;
  returnTo: string;
  placeholder: string;
};

export function CreateQuestionSection({ nodeId, returnTo, placeholder }: CreateQuestionSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Create Question</h2>
      <form action={createQuestionAction} className="mt-3 flex flex-col gap-2 sm:max-w-xl">
        <input type="hidden" name="nodeId" value={nodeId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <textarea
          required
          name="body"
          className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder={placeholder}
        />
        <button
          type="submit"
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add Question
        </button>
      </form>
    </section>
  );
}
