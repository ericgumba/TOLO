import Link from "next/link";
import { redirect } from "next/navigation";

import { createNodeAction } from "@/app/actions/nodes";
import { CreateConceptSection } from "@/app/components/create-concept-section";
import { GroupedConceptList } from "@/app/components/grouped-concept-list";
import { ReviewLaunchCard } from "@/app/components/review-launch-card";
import { SubjectTocSidebar } from "@/app/components/subject-toc-sidebar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDueReviewCount, getDueReviewQuestions } from "@/lib/review/service";
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
  const returnToPath = selectedSubtopic ? `${routePath}?subtopic=${selectedSubtopic.id}` : routePath;
  const nodeIds = selectedSubtopic
    ? [selectedSubtopic.id]
    : [topic.id, ...topic.children.map((subtopic) => subtopic.id)];
  const nodePathById = new Map<string, string>();
  nodePathById.set(subject.id, subject.title);
  nodePathById.set(topic.id, `${subject.title} > ${topic.title}`);
  for (const subtopic of topic.children) {
    nodePathById.set(subtopic.id, `${subject.title} > ${topic.title} > ${subtopic.title}`);
  }

  let conceptCount = 0;
  let dueReviewCount = 0;
  let firstDueQuestionId: string | null = null;
  let nodeConcepts: Array<{
    id: string;
    nodeId: string;
    title: string;
    score: number | null;
    generatedQuestions: Array<{ id: string; category: "EXPLAIN" | "ANALYZE" | "EVALUATE" | "APPLY" | "TEACH"; body: string; score: number | null }>;
    reviewStates: Array<{ lastAnsweredAt: Date | null; nextReviewAt: Date }>;
  }> = [];
  const now = new Date();
  const conceptDelegate = (
    prisma as unknown as {
      concept?: {
        count: (args: unknown) => Promise<number>;
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            nodeId: string;
            title: string;
            score: number | null;
            generatedQuestions: Array<{ id: string; category: "EXPLAIN" | "ANALYZE" | "EVALUATE" | "APPLY" | "TEACH"; body: string; score: number | null }>;
            reviewStates: Array<{ lastAnsweredAt: Date | null; nextReviewAt: Date }>;
          }>
        >;
      };
    }
  ).concept;
  if (conceptDelegate) {
    try {
      const [count, dueCount, dueQuestions] = await Promise.all([
        conceptDelegate.count({
          where: {
            userId: session.user.id,
            nodeId: {
              in: nodeIds,
            },
          },
        }),
        getDueReviewCount(session.user.id, activeNodeId),
        getDueReviewQuestions(session.user.id, 1, activeNodeId),
      ]);
      let concepts: typeof nodeConcepts;

      try {
        concepts = await conceptDelegate.findMany({
          where: {
            userId: session.user.id,
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
            title: true,
            score: true,
            generatedQuestions: {
              select: {
                id: true,
                category: true,
                body: true,
                score: true,
              },
            },
            reviewStates: {
              where: {
                userId: session.user.id,
              },
              take: 1,
              select: {
                lastAnsweredAt: true,
                nextReviewAt: true,
              },
            },
          },
        });
      } catch {
        const fallbackConcepts = (await conceptDelegate.findMany({
          where: {
            userId: session.user.id,
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
            title: true,
            generatedQuestions: {
              select: {
                category: true,
              },
            },
            reviewStates: {
              where: {
                userId: session.user.id,
              },
              take: 1,
              select: {
                lastAnsweredAt: true,
                nextReviewAt: true,
              },
            },
          },
        })) as Array<{
          id: string;
          nodeId: string;
          title: string;
          generatedQuestions: Array<{ id: string; category: "EXPLAIN" | "ANALYZE" | "EVALUATE" | "APPLY" | "TEACH"; body: string }>;
          reviewStates: Array<{ lastAnsweredAt: Date | null; nextReviewAt: Date }>;
        }>;

        concepts = fallbackConcepts.map((concept) => ({
          ...concept,
          score: null,
          generatedQuestions: concept.generatedQuestions.map((generatedQuestion) => ({
            ...generatedQuestion,
            score: null,
          })),
        }));
      }

      conceptCount = count;
      nodeConcepts = concepts;
      dueReviewCount = dueCount;
      firstDueQuestionId = dueQuestions[0]?.questionId ?? null;
    } catch {
      conceptCount = 0;
      nodeConcepts = [];
      dueReviewCount = 0;
      firstDueQuestionId = null;
    }
  }

  const reviewHref = firstDueQuestionId
    ? `/quiz/${firstDueQuestionId}?mode=review&from=${encodeURIComponent(returnToPath)}`
    : null;

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
        <SubjectTocSidebar
          subject={subject}
          activeTopicId={topic.id}
          activeSubtopicId={activeSubtopicId}
        />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {selectedSubtopic ? (
            <section className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Concepts</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{conceptCount}</p>
              </div>
              <ReviewLaunchCard dueCount={dueReviewCount} reviewHref={reviewHref} scopeLabel="subtopic" />
            </section>
          ) : (
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subtopics</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{topic.children.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Concepts</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{conceptCount}</p>
              </div>
              <ReviewLaunchCard dueCount={dueReviewCount} reviewHref={reviewHref} scopeLabel="topic tree" />
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

          <CreateConceptSection
            nodeId={activeNodeId}
            returnTo={returnToPath}
            placeholder="Concept title"
          />

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Concepts at this {selectedSubtopic ? "subtopic" : "topic"}</h2>
            <p className="mt-1 text-xs text-slate-500">Showing concepts attached to {activeNodeLabel} and its children.</p>
            <GroupedConceptList
              concepts={nodeConcepts}
              nodePathById={nodePathById}
              fallbackPath={`${subject.title} > ${topic.title}`}
              returnTo={returnToPath}
              now={now}
              emptyMessage="No concepts created for this node yet."
            />
          </section>
        </div>
      </div>
    </main>
  );
}
