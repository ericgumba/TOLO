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
    mode?: string;
    submitted?: string;
    reset?: string;
    hint1?: string;
    hint2?: string;
    hint3?: string;
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
      questionType: true,
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

  if (question.questionType === "MAIN") {
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const latestAttempt = await prisma.questionAttempt.findFirst({
      where: {
        userId: session.user.id,
        questionId: question.id,
      },
      orderBy: {
        answeredAt: "desc",
      },
      select: {
        answeredAt: true,
      },
    });

    const isStale =
      !!latestAttempt?.answeredAt &&
      latestAttempt.answeredAt.getTime() <= staleThreshold.getTime();

    if (isStale) {
      await prisma.question.deleteMany({
        where: {
          userId: session.user.id,
          parentQuestionId: question.id,
          questionType: "FOLLOW_UP",
        },
      });
    }

    await prisma.reviewState.upsert({
      where: {
        userId_questionId: {
          userId: session.user.id,
          questionId: question.id,
        },
      },
      create: {
        userId: session.user.id,
        questionId: question.id,
        status: "NEW",
        intervalDays: 1,
        repetitionCount: 0,
        nextReviewAt: now,
        lastQuizAccessedAt: now,
      },
      update: {
        lastQuizAccessedAt: now,
      },
    });
  }

  const from = query.from?.startsWith("/") ? query.from : `/subject/${question.node.id}`;
  const mode = typeof query.mode === "string" ? query.mode : undefined;
  const submitted = query.submitted === "1";
  const reset = query.reset === "1";
  const activeHints = [query.hint1, query.hint2, query.hint3].filter(
    (hint): hint is string => typeof hint === "string" && hint.trim().length > 0,
  );
  const saveError =
    query.error === "attempt_model_unavailable" ||
    query.error === "attempt_save_failed" ||
    query.error === "attempt_reset_failed";
  const hintError = query.error === "hint_generation_failed";
  const hintLimitReached = query.error === "hint_limit_reached";
  const llmLimitReached = query.error === "llm_daily_limit_reached";
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
  let followUpQuestions: Array<{
    id: string;
    body: string;
    createdAt: Date;
  }> = [];

  if (attemptDelegate) {
    try {
      const [attemptRows, followUpRows] = await Promise.all([
        attemptDelegate.findMany({
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
        }),
        prisma.question.findMany({
          where: {
            userId: session.user.id,
            parentQuestionId: question.id,
            questionType: "FOLLOW_UP",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            body: true,
            createdAt: true,
          },
        }),
      ]);
      attempts = attemptRows;
      followUpQuestions = followUpRows;
    } catch {
      attempts = [];
      followUpQuestions = [];
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <QuizHeader from={from} nodeTitle={question.node.title} nodeLevel={question.node.level} />
      <QuizBody
        questionId={question.id}
        questionBody={question.body}
        from={from}
        mode={mode}
        attempts={attempts}
        followUpQuestions={followUpQuestions}
        activeHints={activeHints}
      />
      <StatusBanners
        submitted={submitted}
        reset={reset}
        saveError={saveError}
        hintError={hintError}
        hintLimitReached={hintLimitReached}
        llmLimitReached={llmLimitReached}
      />
    </main>
  );
}
