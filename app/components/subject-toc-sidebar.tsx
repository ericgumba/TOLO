import Link from "next/link";

import { type TreeNode } from "@/lib/tree/service";

type SubjectTocSidebarProps = {
  subject: TreeNode;
  activeTopicId?: string;
  activeSubtopicId?: string;
};

export function SubjectTocSidebar({ subject, activeTopicId, activeSubtopicId }: SubjectTocSidebarProps) {
  return (
    <aside className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:w-72 lg:self-start">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Subject</p>
      <h2 className="mt-1 text-xl font-semibold text-slate-900">{subject.title}</h2>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Table of Contents</p>
        {subject.children.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No topics yet.</p>
        ) : (
          <nav className="mt-3 flex flex-col gap-2">
            {subject.children.map((topic) => (
              <div key={topic.id} className="rounded-xl border border-slate-200 p-3">
                {/*
                  Active items behave like toggles:
                  - active topic click => back to subject page
                  - active subtopic click => back to topic page (clear subtopic)
                */}
                <Link
                  className={`text-sm font-semibold hover:text-blue-700 ${
                    activeTopicId === topic.id ? "text-blue-700" : "text-slate-900"
                  }`}
                  href={activeTopicId === topic.id ? `/subject/${subject.id}` : `/subject/${subject.id}/topic/${topic.id}`}
                >
                  {topic.title}
                </Link>

                {topic.children.length > 0 ? (
                  <div className="mt-2 flex flex-col gap-1 pl-2">
                    {topic.children.map((subtopic) => (
                      <Link
                        key={subtopic.id}
                        className={`text-xs hover:text-blue-700 ${
                          activeSubtopicId === subtopic.id ? "font-semibold text-blue-700" : "text-slate-600"
                        }`}
                        href={
                          activeSubtopicId === subtopic.id
                            ? `/subject/${subject.id}/topic/${topic.id}`
                            : `/subject/${subject.id}/topic/${topic.id}?subtopic=${subtopic.id}#subtopic-${subtopic.id}`
                        }
                      >
                        {subtopic.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </nav>
        )}
      </div>
    </aside>
  );
}
