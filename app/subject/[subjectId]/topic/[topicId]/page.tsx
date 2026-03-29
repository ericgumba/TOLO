import Link from "next/link";
import { redirect } from "next/navigation";

import { createNodeAction } from "@/app/actions/nodes";
import { createQuestionAction } from "@/app/actions/questions";
import { SubjectTocSidebar } from "@/app/components/subject-toc-sidebar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTopicTreeForUser } from "@/lib/tree/service";

type TopicPageProps = {
  params: Promise<{
    subjectId: string;
    topicId: string;
  }>;
  searchParams: Promise<{
    subtopic?: string;
  }>;
};

export default async function TopicPage({ params, searchParams }: TopicPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [{ subjectId, topicId }, query] = await Promise.all([params, searchParams]);
  const activeSubtopicId = query.subtopic;
  const data = await getTopicTreeForUser(subjectId, topicId, session.user.id);

  if (!data) {
    redirect(`/subject/${subjectId}`);
  }

  const { subject, topic } = data;
  const selectedSubtopic = activeSubtopicId
    ? topic.children.find((subtopic) => subtopic.id === activeSubtopicId) ?? null
    : null;
  const activeNodeId = selectedSubtopic?.id ?? topic.id;
  const activeNodeLabel = selectedSubtopic ? `subtopic "${selectedSubtopic.title}"` : `topic "${topic.title}"`;
  const routePath = `/subject/${subjectId}/topic/${topicId}`;
  const nodeIds = selectedSubtopic
    ? [selectedSubtopic.id]
    : [topic.id, ...topic.children.map((subtopic) => subtopic.id)];
  const nodePathById = new Map<string, string>();
  nodePathById.set(subject.id, subject.title);
  nodePathById.set(topic.id, `${subject.title} > ${topic.title}`);
  for (const subtopic of topic.children) {
    nodePathById.set(subtopic.id, `${subject.title} > ${topic.title} > ${subtopic.title}`);
  }

  let questionCount = 0;
  let nodeQuestions: Array<{
    id: string;
    nodeId: string;
    body: string;
    attempts: Array<{ answeredAt: Date }>;
    reviewStates: Array<{ nextReviewAt: Date }>;
  }> = [];
  const now = new Date();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const questionDelegate = (
    prisma as unknown as {
      question?: {
        count: (args: unknown) => Promise<number>;
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            nodeId: string;
            body: string;
            attempts: Array<{ answeredAt: Date }>;
            reviewStates: Array<{ nextReviewAt: Date }>;
          }>
        >;
      };
    }
  ).question;
  if (questionDelegate) {
    try {
      questionCount = await questionDelegate.count({
        where: {
          userId: session.user.id,
          questionType: "MAIN",
          nodeId: {
            in: nodeIds,
          },
        },
      });
      nodeQuestions = await questionDelegate.findMany({
        where: {
          userId: session.user.id,
          questionType: "MAIN",
          nodeId: {
            in: nodeIds,
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          nodeId: true,
          body: true,
          attempts: {
            where: {
              userId: session.user.id,
            },
            orderBy: {
              answeredAt: "desc",
            },
            take: 1,
            select: {
              answeredAt: true,
            },
          },
          reviewStates: {
            where: {
              userId: session.user.id,
            },
            take: 1,
            select: {
              nextReviewAt: true,
            },
          },
        },
      });
    } catch {
      questionCount = 0;
      nodeQuestions = [];
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Topic</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{topic.title}</h1>
          <p className="mt-1 text-sm text-slate-500">In subject: {subject.title}</p>
        </div>
        <Link
          href={`/subject/${subject.id}`}
          className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100"
        >
          Back to Subject
        </Link>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <SubjectTocSidebar subject={subject} activeTopicId={topic.id} activeSubtopicId={activeSubtopicId} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {selectedSubtopic ? (
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{questionCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Review</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">0</p>
              </div>
            </section>
          ) : (
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subtopics</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{topic.children.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{questionCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Review</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">0</p>
              </div>
            </section>
          )}

          {selectedSubtopic ? (
            <section className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
              Viewing subtopic: <span className="font-semibold">{selectedSubtopic.title}</span>
            </section>
          ) : null}

          {selectedSubtopic ? null : (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Create Subtopic</h2>
              <form action={createNodeAction} className="mt-3 flex flex-col gap-2 sm:max-w-xl">
                <input type="hidden" name="parentId" value={topic.id} />
                <input type="hidden" name="returnTo" value={routePath} />
                <input
                  required
                  name="title"
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  placeholder="Subtopic title"
                />
                <button
                  type="submit"
                  className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
                >
                  Add Subtopic
                </button>
              </form>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Create Question</h2>
            <form action={createQuestionAction} className="mt-3 flex flex-col gap-2 sm:max-w-xl">
              <input type="hidden" name="nodeId" value={activeNodeId} />
              <input type="hidden" name="returnTo" value={routePath} />
              <textarea
                required
                name="body"
                className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder={selectedSubtopic ? "Write a question for this subtopic" : "Write a question for this topic"}
              />
              <button
                type="submit"
                className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Add Question
              </button>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Questions at this {selectedSubtopic ? "subtopic" : "topic"}</h2>
            <p className="mt-1 text-xs text-slate-500">Showing questions attached to {activeNodeLabel} and its children.</p>
            {nodeQuestions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No questions created for this node yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {nodeQuestions.map((question) => (
                  <li key={question.id}>
                    {(() => {
                      const lastAnsweredAt = question.attempts[0]?.answeredAt ?? null;
                      const nextReviewAt = question.reviewStates[0]?.nextReviewAt ?? null;
                      const daysUntilReview = nextReviewAt
                        ? Math.ceil((nextReviewAt.getTime() - now.getTime()) / oneDayMs)
                        : null;
                      const questionPath = nodePathById.get(question.nodeId) ?? `${subject.title} > ${topic.title}`;

                      return (
                        <Link
                          href={`/quiz/${question.id}?from=${encodeURIComponent(routePath)}`}
                          className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50 hover:text-slate-900"
                        >
                          <p>{question.body}</p>
                          <p className="mt-1 text-xs text-slate-500">Path: {questionPath}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            Last answered at: {lastAnsweredAt ? lastAnsweredAt.toLocaleString() : "Never"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Next review:{" "}
                            {daysUntilReview === null
                              ? "Not scheduled"
                              : daysUntilReview <= 0
                                ? "Today"
                                : `in ${daysUntilReview} day${daysUntilReview === 1 ? "" : "s"}`}
                          </p>
                        </Link>
                      );
                    })()}
                  </li>
                ))}
              </ul>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}
