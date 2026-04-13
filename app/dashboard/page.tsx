import { redirect } from "next/navigation";
import Link from "next/link";

import { DashboardSidebar } from "@/app/components/dashboard-sidebar";
import { createNodeAction } from "@/app/actions/nodes";
import { auth } from "@/auth";
import { getDueReviewCount, getDueReviewQuestions } from "@/lib/review/service";
import { getTreeForUser } from "@/lib/tree/service";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [params, tree, dueCount, dueQuestions] = await Promise.all([
    searchParams,
    getTreeForUser(session.user.id),
    getDueReviewCount(session.user.id),
    getDueReviewQuestions(session.user.id, 20),
  ]);
  const error = typeof params.error === "string" ? decodeURIComponent(params.error) : null;
  const firstDueQuestion = dueQuestions[0] ?? null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-10">
      <header>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-zinc-600">
            Manage your subjects and study concepts with optional tags.
          </p>
        </div>
      </header>

      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <DashboardSidebar subjects={tree} />

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="text-lg font-semibold">Review Queue</h2>
            <p className="mt-1 text-sm text-zinc-600">
              {dueCount === 0
                ? "No concepts are due right now."
                : `${dueCount} concept${dueCount === 1 ? "" : "s"} due today.`}
            </p>
            {firstDueQuestion ? (
              <Link
                href={`/quiz/${firstDueQuestion.questionId}?mode=review&from=${encodeURIComponent("/dashboard")}`}
                className="mt-3 inline-flex rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Start Review
              </Link>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Come back later or add more concepts to study.</p>
            )}
          </section>

          <section className="rounded-xl border border-zinc-200 bg-white p-4">
            <h2 className="mb-3 text-lg font-semibold">Create Subject</h2>
            <form action={createNodeAction} className="grid gap-2">
              <input
                required
                name="title"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="Subject title"
              />
              <button
                type="submit"
                className="w-fit rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
              >
                Add Subject
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
