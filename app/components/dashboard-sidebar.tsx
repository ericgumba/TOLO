import Link from "next/link";

import { type TreeNode } from "@/lib/tree/service";

type DashboardSidebarProps = {
  subjects: TreeNode[];
};

export function DashboardSidebar({ subjects }: DashboardSidebarProps) {
  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:w-72 lg:self-start">
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subjects</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900">Your library</h2>
      </div>

      {subjects.length === 0 ? (
        <p className="text-sm text-slate-500">Your subjects will appear here after you create them.</p>
      ) : (
        <nav className="flex flex-col gap-2">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              className="rounded-xl border border-slate-200 px-3 py-3 transition hover:border-blue-200 hover:bg-blue-50/60"
              href={`/subject/${subject.id}`}
            >
              <div className="text-sm font-semibold text-slate-900">{subject.title}</div>
              <div className="mt-1 text-xs text-slate-500">Open subject</div>
            </Link>
          ))}
        </nav>
      )}
    </aside>
  );
}
