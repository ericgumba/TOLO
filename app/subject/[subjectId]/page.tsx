import Link from "next/link";
import { redirect } from "next/navigation";

import { createNodeAction } from "@/app/actions/nodes";
import { CreateQuestionSection } from "@/app/components/create-question-section";
import { GroupedQuestionList } from "@/app/components/grouped-question-list";
import { QuestionGeneratorPanel } from "@/app/components/question-generator-panel";
import { ReviewLaunchCard } from "@/app/components/review-launch-card";
import { SubjectTocSidebar } from "@/app/components/subject-toc-sidebar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDueReviewCount, getDueReviewQuestions } from "@/lib/review/service";
import { getSubjectTreeForUser } from "@/lib/tree/service";

type SubjectPageProps = {
  params: Promise<{
    subjectId: string;
  }>;
};

export default async function SubjectPage({ params }: SubjectPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { subjectId } = await params;
  const subject = await getSubjectTreeForUser(subjectId, session.user.id);

  if (!subject) {
    redirect("/dashboard");
  }

  const topicCount = subject.children.length;
  const subtopicCount = subject.children.reduce((total, topic) => total + topic.children.length, 0);
  const nodeIds = [subject.id, ...subject.children.flatMap((topic) => [topic.id, ...topic.children.map((sub) => sub.id)])];
  const nodePathById = new Map<string, string>();
  nodePathById.set(subject.id, subject.title);
  for (const topic of subject.children) {
    nodePathById.set(topic.id, `${subject.title} > ${topic.title}`);
    for (const subtopic of topic.children) {
      nodePathById.set(subtopic.id, `${subject.title} > ${topic.title} > ${subtopic.title}`);
    }
  }
  const returnToPath = `/subject/${subject.id}`;
  let questionCount = 0;
  let dueReviewCount = 0;
  let firstDueQuestionId: string | null = null;
  let nodeQuestions: Array<{
    id: string;
    nodeId: string;
    body: string;
    reviewStates: Array<{ lastReviewedAt: Date | null; nextReviewAt: Date }>;
  }> = [];
  const now = new Date();
  const questionDelegate = (
    prisma as unknown as {
      question?: {
        count: (args: unknown) => Promise<number>;
        findMany: (args: unknown) => Promise<
          Array<{
            id: string;
            nodeId: string;
            body: string;
            reviewStates: Array<{ lastReviewedAt: Date | null; nextReviewAt: Date }>;
          }>
        >;
      };
    }
  ).question;
  if (questionDelegate) {
    try {
      const [count, questions, dueCount, dueQuestions] = await Promise.all([
        questionDelegate.count({
          where: {
            userId: session.user.id,
            nodeId: {
              in: nodeIds,
            },
          },
        }),
        questionDelegate.findMany({
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
            body: true,
            reviewStates: {
              where: {
                userId: session.user.id,
              },
              take: 1,
              select: {
                lastReviewedAt: true,
                nextReviewAt: true,
              },
            },
          },
        }),
        getDueReviewCount(session.user.id, subject.id),
        getDueReviewQuestions(session.user.id, 1, subject.id),
      ]);
      questionCount = count;
      nodeQuestions = questions;
      dueReviewCount = dueCount;
      firstDueQuestionId = dueQuestions[0]?.questionId ?? null;
    } catch {
      questionCount = 0;
      nodeQuestions = [];
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Subject</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{subject.title}</h1>
        </div>
        <Link href="/dashboard" className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100">
          Back to Dashboard
        </Link>
      </header>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <SubjectTocSidebar subject={subject} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Topics</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{topicCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Subtopics</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{subtopicCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Questions</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{questionCount}</p>
              <p className="mt-1 text-xs text-slate-500">Questions across this subject tree.</p>
            </div>
            <ReviewLaunchCard dueCount={dueReviewCount} reviewHref={reviewHref} scopeLabel="subject tree" />
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Create Topic</h2>
            <form action={createNodeAction} className="mt-3 flex flex-col gap-2 sm:max-w-xl">
              <input type="hidden" name="parentId" value={subject.id} />
              <input type="hidden" name="returnTo" value={returnToPath} />
              <input
                required
                name="title"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Topic title"
              />
              <button
                type="submit"
                className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Add Topic
              </button>
            </form>
          </section>

          <CreateQuestionSection
            nodeId={subject.id}
            returnTo={returnToPath}
            placeholder="Write a question for this subject"
          />

          <QuestionGeneratorPanel nodeId={subject.id} targetLabel={subject.title} returnTo={returnToPath} />

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Questions at this subject</h2>
            <GroupedQuestionList
              questions={nodeQuestions}
              nodePathById={nodePathById}
              fallbackPath={subject.title}
              returnTo={returnToPath}
              now={now}
              emptyMessage="No questions created for this subject yet."
            />
          </section>

        </div>
      </div>
    </main>
  );
}
