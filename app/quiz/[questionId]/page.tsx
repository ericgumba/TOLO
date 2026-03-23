import Link from "next/link";
import { redirect } from "next/navigation";

import { submitQuestionAttemptAction } from "@/app/actions/quiz";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type QuizPageProps = {
  params: Promise<{
    questionId: string;
  }>;
  searchParams: Promise<{
    from?: string;
    submitted?: string;
    error?: string;
  }>;
};

export default async function QuizPage({ params, searchParams }: QuizPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [{ questionId }, query] = await Promise.all([params, searchParams]);

  const question = await prisma.question.findFirst({
    where: {
      id: questionId,
      userId: session.user.id,
    },
    select: {
      id: true,
      body: true,
      node: {
        select: {
          id: true,
          title: true,
          level: true,
        },
      },
    },
  });

  if (!question) {
    redirect("/dashboard");
  }

  const from = query.from?.startsWith("/") ? query.from : `/subject/${question.node.id}`;
  const submitted = query.submitted === "1";
  const saveError = query.error === "attempt_model_unavailable" || query.error === "attempt_save_failed";
  const attemptDelegate = (
    prisma as unknown as {
      questionAttempt?: {
        findFirst: (args: unknown) => Promise<{
          userAnswer: string;
          llmScore: number;
          llmFeedback: string;
          llmCorrection: string;
          answeredAt: Date;
        } | null>;
      };
    }
  ).questionAttempt;

  let latestAttempt: {
    userAnswer: string;
    llmScore: number;
    llmFeedback: string;
    llmCorrection: string;
    answeredAt: Date;
  } | null = null;

  if (attemptDelegate) {
    try {
      latestAttempt = await attemptDelegate.findFirst({
        where: {
          userId: session.user.id,
          questionId: question.id,
        },
        orderBy: {
          answeredAt: "desc",
        },
        select: {
          userAnswer: true,
          llmScore: true,
          llmFeedback: true,
          llmCorrection: true,
          answeredAt: true,
        },
      });
    } catch {
      latestAttempt = null;
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <header className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Quiz</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">Question</h1>
          <p className="mt-1 text-sm text-slate-500">
            Node: {question.node.title} ({question.node.level.toLowerCase()})
          </p>
        </div>
        <Link href={from} className="rounded-md border border-zinc-300 px-3 py-2 text-sm hover:bg-zinc-100">
          Back
        </Link>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Current question</p>
        <p className="mt-3 text-lg font-semibold text-slate-900">{question.body}</p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={submitQuestionAttemptAction} className="flex flex-col gap-3">
          <input type="hidden" name="questionId" value={question.id} />
          <input type="hidden" name="from" value={from} />
          <label htmlFor="answer" className="text-sm font-semibold text-slate-900">
            Your answer
          </label>
          <textarea
            id="answer"
            name="answer"
            className="min-h-36 rounded-md border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Write your answer in free-form text"
            required
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
            >
              Submit
            </button>
            <Link href={from} className="rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
              Next Question
            </Link>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">LLM feedback</p>
          {latestAttempt ? (
            <p className="text-xs text-slate-500">Latest attempt at {latestAttempt.answeredAt.toLocaleString()}</p>
          ) : null}
        </div>

        {latestAttempt ? (
          <>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score</p>
                <p className="mt-1 text-xl font-semibold text-slate-900">{latestAttempt.llmScore}/5</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Summary</p>
                <p className="mt-1 text-sm text-slate-700">{latestAttempt.llmFeedback}</p>
              </div>
            </div>
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Correction</p>
              <p className="mt-1 text-sm text-slate-700">{latestAttempt.llmCorrection}</p>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            Submit an answer to generate and store LLM feedback for this question.
          </p>
        )}
      </section>

      {submitted ? (
        <section className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Attempt saved.
        </section>
      ) : null}

      {saveError ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          Could not save attempt. Run latest Prisma migration and retry.
        </section>
      ) : null}
    </main>
  );
}
