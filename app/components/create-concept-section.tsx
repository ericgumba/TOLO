import { createConceptAction } from "@/app/actions/concepts";

type CreateConceptSectionProps = {
  nodeId: string;
  returnTo: string;
  placeholder: string;
};

export function CreateConceptSection({ nodeId, returnTo, placeholder }: CreateConceptSectionProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Create Concept</h2>
      <form action={createConceptAction} className="mt-3 flex flex-col gap-2 sm:max-w-xl">
        <input type="hidden" name="nodeId" value={nodeId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <input
          required
          name="title"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder={placeholder}
        />
        <input
          name="tags"
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
          placeholder="optional: tags (comma separated)"
        />
        <button
          type="submit"
          className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Add Concept
        </button>
      </form>
    </section>
  );
}
