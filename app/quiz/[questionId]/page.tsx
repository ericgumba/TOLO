import { redirect } from "next/navigation";

import { QuizHeader } from "@/app/components/quiz/quiz-header";
import { StatusBanners } from "@/app/components/quiz/status-banners";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { QuizBody } from "@/app/components/quiz/quiz-body";

type QuizPageProps = {
  params: Promise<{
    questionId: string;
  }>;
  searchParams: Promise<{
    from?: string;
    submitted?: string;
    reset?: string;
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
  const reset = query.reset === "1";
  const saveError =
    query.error === "attempt_model_unavailable" ||
    query.error === "attempt_save_failed" ||
    query.error === "attempt_reset_failed";
  const attemptDelegate = (
    prisma as unknown as {
      questionAttempt?: {
        findMany: (args: unknown) => Promise<Array<{
          userAnswer: string;
          llmScore: number;
          llmFeedback: string;
          llmCorrection: string;
          answeredAt: Date;
        }>>;
      };
    }
  ).questionAttempt;

  let attempts: Array<{
    userAnswer: string;
    llmScore: number;
    llmFeedback: string;
    llmCorrection: string;
    answeredAt: Date;
  }> = [];

  if (attemptDelegate) {
    try {
      attempts = await attemptDelegate.findMany({
        where: {
          userId: session.user.id,
          questionId: question.id,
        },
        orderBy: {
          answeredAt: "asc",
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
      attempts = [];
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <QuizHeader from={from} nodeTitle={question.node.title} nodeLevel={question.node.level} />
      <QuizBody questionId={question.id} questionBody={question.body} from={from} attempts={attempts} />
      <StatusBanners submitted={submitted} reset={reset} saveError={saveError} />
    </main>
  );
}
