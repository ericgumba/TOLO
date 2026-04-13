import Link from "next/link";
import { redirect } from "next/navigation";

import { CreateConceptSection } from "@/app/components/create-concept-section";
import { GroupedConceptList } from "@/app/components/grouped-concept-list";
import { ReviewLaunchCard } from "@/app/components/review-launch-card";
import { SubjectTocSidebar, type SubjectTagSummary } from "@/app/components/subject-toc-sidebar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDueReviewCount, getDueReviewQuestions } from "@/lib/review/service";
import { getSubjectTreeForUser } from "@/lib/tree/service";

type SubjectPageProps = {
  params: Promise<{
    subjectId: string;
  }>;
  searchParams: Promise<{
    tag?: string;
  }>;
};

export default async function SubjectPage({ params, searchParams }: SubjectPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [{ subjectId }, query] = await Promise.all([params, searchParams]);
  const activeTag = typeof query.tag === "string" && query.tag.trim().length > 0 ? query.tag.trim() : undefined;
  const subject = await getSubjectTreeForUser(subjectId, session.user.id);

  if (!subject) {
    redirect("/dashboard");
  }

  const returnToPath = activeTag ? `/subject/${subject.id}?tag=${encodeURIComponent(activeTag)}` : `/subject/${subject.id}`;
  const nodePathById = new Map<string, string>([[subject.id, subject.title]]);
  const now = new Date();

  let conceptCount = 0;
  let totalConceptCount = 0;
  let tagCount = 0;
  let dueReviewCount = 0;
  let firstDueQuestionId: string | null = null;
  let tags: SubjectTagSummary[] = [];
  let nodeConcepts: Array<{
    id: string;
    nodeId: string;
    title: string;
    score: number | null;
    generatedQuestions: Array<{ id: string; category: "EXPLAIN" | "ANALYZE" | "EVALUATE" | "APPLY" | "TEACH"; body: string; score: number | null }>;
    reviewStates: Array<{ lastAnsweredAt: Date | null; nextReviewAt: Date }>;
  }> = [];

  try {
    const [count, dueCount, dueQuestions, totalCount, tagRows, concepts] = await Promise.all([
      prisma.concept.count({
        where: {
          userId: session.user.id,
          nodeId: subject.id,
          ...(activeTag
            ? {
                conceptTags: {
                  some: {
                    tag: {
                      subjectId: subject.id,
                      name: activeTag,
                    },
                  },
                },
              }
            : {}),
        },
      }),
      getDueReviewCount(session.user.id, subject.id),
      getDueReviewQuestions(session.user.id, 1, subject.id),
      prisma.concept.count({
        where: {
          userId: session.user.id,
          nodeId: subject.id,
        },
      }),
      prisma.tag.findMany({
        where: {
          subjectId: subject.id,
        },
        orderBy: {
          name: "asc",
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              conceptTags: true,
            },
          },
        },
      }),
      prisma.concept.findMany({
        where: {
          userId: session.user.id,
          nodeId: subject.id,
          ...(activeTag
            ? {
                conceptTags: {
                  some: {
                    tag: {
                      subjectId: subject.id,
                      name: activeTag,
                    },
                  },
                },
              }
            : {}),
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
      }),
    ]);

    conceptCount = count;
    totalConceptCount = totalCount;
    tagCount = tagRows.length;
    tags = tagRows.map((tag) => ({
      id: tag.id,
      name: tag.name,
      conceptCount: tag._count.conceptTags,
    }));
    nodeConcepts = concepts;
    dueReviewCount = dueCount;
    firstDueQuestionId = dueQuestions[0]?.questionId ?? null;
  } catch {
    conceptCount = 0;
    totalConceptCount = 0;
    tagCount = 0;
    tags = [];
    nodeConcepts = [];
    dueReviewCount = 0;
    firstDueQuestionId = null;
  }

  const reviewHref = firstDueQuestionId
    ? `/quiz/${firstDueQuestionId}?mode=review&from=${encodeURIComponent(returnToPath)}`
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Subject</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{subject.title}</h1>
        </div>
        <Link href="/dashboard" className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100">
          Back to Dashboard
        </Link>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <SubjectTocSidebar subject={subject} tags={tags} activeTag={activeTag} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{tagCount}</p>
              <p className="mt-1 text-xs text-slate-500">Optional tags for organizing concepts in this subject.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Concepts</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{conceptCount}</p>
              <p className="mt-1 text-xs text-slate-500">
                {activeTag ? `Filtered by tag "${activeTag}".` : `${totalConceptCount} total concepts in this subject.`}
              </p>
            </div>
            <ReviewLaunchCard dueCount={dueReviewCount} reviewHref={reviewHref} scopeLabel="subject" />
          </section>

          {activeTag ? (
            <section className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
              Viewing tag: <span className="font-semibold">{activeTag}</span>
            </section>
          ) : null}

          <CreateConceptSection nodeId={subject.id} returnTo={returnToPath} placeholder="Concept title" />

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Concepts in this subject</h2>
            <p className="mt-1 text-xs text-slate-500">
              Concepts belong directly to the subject and can be organized with optional tags.
            </p>
            <GroupedConceptList
              concepts={nodeConcepts}
              nodePathById={nodePathById}
              fallbackPath={subject.title}
              returnTo={returnToPath}
              now={now}
              emptyMessage={activeTag ? "No concepts found for this tag yet." : "No concepts created for this subject yet."}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
