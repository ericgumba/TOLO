import { NodeLevel } from "@prisma/client";

import { deleteNodeFromTocAction } from "@/app/actions/nodes";
import { getTocDeleteDescription, getTocDeleteLabel } from "@/lib/tree/toc-management";

type TocDeleteConfirmPanelProps = {
  nodeId: string;
  nodeTitle: string;
  nodeLevel: NodeLevel;
  returnTo: string;
  onCancel: () => void;
};

export function TocDeleteConfirmPanel({
  nodeId,
  nodeTitle,
  nodeLevel,
  returnTo,
  onCancel,
}: TocDeleteConfirmPanelProps) {
  const nodeLabel = getTocDeleteLabel(nodeLevel);
  const description = getTocDeleteDescription(nodeLevel);

  return (
    <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red-700">Confirm Delete</p>
      <p className="mt-2 text-sm font-semibold text-red-950">
        Delete {nodeLabel} &quot;{nodeTitle}&quot;?
      </p>
      <p className="mt-1 text-sm text-red-900">{description}</p>
      <p className="mt-1 text-xs font-medium text-red-800">This cannot be undone.</p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-100"
          onClick={onCancel}
        >
          Cancel
        </button>

        <form action={deleteNodeFromTocAction}>
          <input type="hidden" name="nodeId" value={nodeId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <input type="hidden" name="confirmDelete" value="DELETE" />
          <button
            type="submit"
            className="rounded-md bg-red-700 px-3 py-2 text-xs font-semibold text-white hover:bg-red-800"
          >
            Delete {nodeLabel}
          </button>
        </form>
      </div>
    </div>
  );
}
