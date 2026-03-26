import Link from "next/link";
import { redirect } from "next/navigation";

import { createNodeAction } from "@/app/actions/nodes";
import { createQuestionAction } from "@/app/actions/questions";
import { SubjectTocSidebar } from "@/app/components/subject-toc-sidebar";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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
  let questionCount = 0;
  let nodeQuestions: Array<{ id: string; body: string }> = [];
  const questionDelegate = (
    prisma as unknown as {
      question?: {
        count: (args: unknown) => Promise<number>;
        findMany: (args: unknown) => Promise<Array<{ id: string; body: string }>>;
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
          nodeId: subject.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          body: true,
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
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Needs Review</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">0</p>
              <p className="mt-1 text-xs text-slate-500">Review queue coming soon.</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Create Topic</h2>
            <form action={createNodeAction} className="mt-3 flex flex-col gap-2 sm:max-w-xl">
              <input type="hidden" name="parentId" value={subject.id} />
              <input type="hidden" name="returnTo" value={`/subject/${subject.id}`} />
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

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">Create Question</h2>
            <form action={createQuestionAction} className="mt-3 flex flex-col gap-2 sm:max-w-xl">
              <input type="hidden" name="nodeId" value={subject.id} />
              <input type="hidden" name="returnTo" value={`/subject/${subject.id}`} />
              <textarea
                required
                name="body"
                className="min-h-24 rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Write a question for this subject"
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
            <h2 className="text-lg font-semibold text-slate-900">Questions at this subject</h2>
            {nodeQuestions.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No questions created for this subject yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {nodeQuestions.map((question) => (
                  <li key={question.id}>
                    <Link
                      href={`/quiz/${question.id}?from=${encodeURIComponent(`/subject/${subject.id}`)}`}
                      className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:border-blue-200 hover:bg-blue-50/50 hover:text-slate-900"
                    >
                      {question.body}
                    </Link>
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
