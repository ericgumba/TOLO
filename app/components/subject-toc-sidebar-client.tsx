"use client";

import { useState } from "react";
import Link from "next/link";

import { TocDeleteConfirmPanel } from "@/app/components/toc-delete-confirm-panel";
import { type SubjectTagSummary } from "@/app/components/subject-toc-sidebar";
import { type TreeNode } from "@/lib/tree/service";

type SubjectTocSidebarClientProps = {
  subject: TreeNode;
  tags: SubjectTagSummary[];
  activeTag?: string;
};

export function SubjectTocSidebarClient({ subject, tags, activeTag }: SubjectTocSidebarClientProps) {
  const [isManaging, setIsManaging] = useState(false);

  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:w-72 lg:self-start">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subject</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">{subject.title}</h2>
        </div>

        <button
          type="button"
          className={`rounded-md border px-3 py-2 text-xs font-semibold ${
            isManaging
              ? "border-slate-900 bg-slate-900 text-white hover:bg-slate-700"
              : "border-slate-300 text-slate-700 hover:bg-slate-100"
          }`}
          onClick={() => setIsManaging((value) => !value)}
        >
          {isManaging ? "Done" : "Edit"}
        </button>
      </div>

      {isManaging ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <TocDeleteConfirmPanel
            nodeId={subject.id}
            nodeTitle={subject.title}
            nodeLevel={subject.level}
            returnTo="/dashboard"
            onCancel={() => setIsManaging(false)}
          />
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Tags</p>
        <nav className="mt-3 flex flex-col gap-2">
          <Link
            href={`/subject/${subject.id}`}
            className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm transition ${
              !activeTag
                ? "border-blue-200 bg-blue-50/60 text-blue-900"
                : "border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50/60"
            }`}
          >
            <span className="font-semibold">All Concepts</span>
          </Link>

          {tags.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500">
              No tags yet.
            </p>
          ) : (
            tags.map((tag) => {
              const isActive = activeTag === tag.name;

              return (
                <Link
                  key={tag.id}
                  href={`/subject/${subject.id}?tag=${encodeURIComponent(tag.name)}`}
                  className={`flex items-center justify-between rounded-xl border px-3 py-3 text-sm transition ${
                    isActive
                      ? "border-blue-200 bg-blue-50/60 text-blue-900"
                      : "border-slate-200 text-slate-700 hover:border-blue-200 hover:bg-blue-50/60"
                  }`}
                >
                  <span className="font-semibold">{tag.name}</span>
                  <span className="text-xs text-slate-500">{tag.conceptCount}</span>
                </Link>
              );
            })
          )}
        </nav>
      </div>
    </aside>
  );
}
