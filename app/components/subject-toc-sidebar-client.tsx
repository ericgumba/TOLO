"use client";

import { useState } from "react";
import Link from "next/link";

import { TocDeleteConfirmPanel } from "@/app/components/toc-delete-confirm-panel";
import { type TreeNode } from "@/lib/tree/service";
import { getTocDeleteReturnTo } from "@/lib/tree/toc-management";

type SubjectTocSidebarClientProps = {
  subject: TreeNode;
  activeTopicId?: string;
  activeSubtopicId?: string;
};

function getTopicHref(subjectId: string, topicId: string, isActive: boolean, activeSubtopicId?: string): string {
  if (!isActive) {
    return `/subject/${subjectId}/topic/${topicId}`;
  }

  if (activeSubtopicId) {
    return `/subject/${subjectId}/topic/${topicId}`;
  }

  return `/subject/${subjectId}`;
}

function getSubtopicHref(subjectId: string, topicId: string, subtopicId: string, isActive: boolean): string {
  if (isActive) {
    return `/subject/${subjectId}/topic/${topicId}`;
  }

  return `/subject/${subjectId}/topic/${topicId}?subtopic=${subtopicId}#subtopic-${subtopicId}`;
}

export function SubjectTocSidebarClient({
  subject,
  activeTopicId,
  activeSubtopicId,
}: SubjectTocSidebarClientProps) {
  const [isManaging, setIsManaging] = useState(false);
  const [pendingDeleteNodeId, setPendingDeleteNodeId] = useState<string | null>(null);

  function toggleManageMode() {
    const nextIsManaging = !isManaging;
    setIsManaging(nextIsManaging);

    if (!nextIsManaging) {
      setPendingDeleteNodeId(null);
    }
  }

  function startDelete(nodeId: string) {
    setPendingDeleteNodeId(nodeId);
  }

  function cancelDelete() {
    setPendingDeleteNodeId(null);
  }

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
          onClick={toggleManageMode}
        >
          {isManaging ? "Done" : "Edit"}
        </button>
      </div>

      {isManaging ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          Manage mode is on. Delete actions cascade to nested content.
        </div>
      ) : null}

      {isManaging ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Subject</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{subject.title}</p>
            </div>
            <button
              type="button"
              aria-label={`Delete subject ${subject.title}`}
              className="flex size-9 items-center justify-center rounded-md border border-red-300 text-sm font-bold text-red-700 hover:bg-red-50"
              onClick={() =>
                pendingDeleteNodeId === subject.id ? cancelDelete() : startDelete(subject.id)
              }
            >
              X
            </button>
          </div>

          {pendingDeleteNodeId === subject.id ? (
            <TocDeleteConfirmPanel
              nodeId={subject.id}
              nodeTitle={subject.title}
              nodeLevel={subject.level}
              returnTo={getTocDeleteReturnTo(
                {
                  id: subject.id,
                  level: subject.level,
                  parentId: subject.parentId,
                },
                {
                  subjectId: subject.id,
                  activeTopicId,
                  activeSubtopicId,
                },
              )}
              onCancel={cancelDelete}
            />
          ) : null}
        </div>
      ) : null}

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Table of Contents</p>
        {subject.children.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No topics yet.</p>
        ) : (
          <nav className="mt-3 flex flex-col gap-2">
            {subject.children.map((topic) => {
              const isActiveTopic = activeTopicId === topic.id;
              const isConfirmingTopicDelete = pendingDeleteNodeId === topic.id;

              return (
                <div key={topic.id} className="rounded-xl border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      className={`text-sm font-semibold hover:text-blue-700 ${
                        isActiveTopic ? "text-blue-700" : "text-slate-900"
                      }`}
                      href={getTopicHref(subject.id, topic.id, isActiveTopic, activeSubtopicId)}
                    >
                      {topic.title}
                    </Link>

                    {isManaging ? (
                      <button
                        type="button"
                        aria-label={`Delete topic ${topic.title}`}
                        className="flex size-9 shrink-0 items-center justify-center rounded-md border border-red-300 text-sm font-bold text-red-700 hover:bg-red-50"
                        onClick={() =>
                          isConfirmingTopicDelete ? cancelDelete() : startDelete(topic.id)
                        }
                      >
                        X
                      </button>
                    ) : null}
                  </div>

                  {isManaging && isConfirmingTopicDelete ? (
                    <TocDeleteConfirmPanel
                      nodeId={topic.id}
                      nodeTitle={topic.title}
                      nodeLevel={topic.level}
                      returnTo={getTocDeleteReturnTo(
                        {
                          id: topic.id,
                          level: topic.level,
                          parentId: topic.parentId,
                        },
                        {
                          subjectId: subject.id,
                          activeTopicId,
                          activeSubtopicId,
                        },
                      )}
                      onCancel={cancelDelete}
                    />
                  ) : null}

                  {topic.children.length > 0 ? (
                    <div className="mt-2 flex flex-col gap-1 pl-2">
                      {topic.children.map((subtopic) => {
                        const isActiveSubtopic = activeSubtopicId === subtopic.id;
                        const isConfirmingSubtopicDelete = pendingDeleteNodeId === subtopic.id;

                        return (
                          <div key={subtopic.id} id={`subtopic-${subtopic.id}`}>
                            <div className="flex items-start justify-between gap-3">
                              <Link
                                className={`text-xs hover:text-blue-700 ${
                                  isActiveSubtopic ? "font-semibold text-blue-700" : "text-slate-600"
                                }`}
                                href={getSubtopicHref(subject.id, topic.id, subtopic.id, isActiveSubtopic)}
                              >
                                {subtopic.title}
                              </Link>

                              {isManaging ? (
                                <button
                                  type="button"
                                  aria-label={`Delete subtopic ${subtopic.title}`}
                                  className="flex size-8 shrink-0 items-center justify-center rounded-md border border-red-300 text-xs font-bold text-red-700 hover:bg-red-50"
                                  onClick={() =>
                                    isConfirmingSubtopicDelete ? cancelDelete() : startDelete(subtopic.id)
                                  }
                                >
                                  X
                                </button>
                              ) : null}
                            </div>

                            {isManaging && isConfirmingSubtopicDelete ? (
                              <TocDeleteConfirmPanel
                                nodeId={subtopic.id}
                                nodeTitle={subtopic.title}
                                nodeLevel={subtopic.level}
                                returnTo={getTocDeleteReturnTo(
                                  {
                                    id: subtopic.id,
                                    level: subtopic.level,
                                    parentId: subtopic.parentId,
                                  },
                                  {
                                    subjectId: subject.id,
                                    activeTopicId,
                                    activeSubtopicId,
                                  },
                                )}
                                onCancel={cancelDelete}
                              />
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </nav>
        )}
      </div>
    </aside>
  );
}
