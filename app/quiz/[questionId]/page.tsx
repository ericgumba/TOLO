import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { QuizBody } from "@/app/components/quiz/quiz-body";
import { QuizHeader } from "@/app/components/quiz/quiz-header";
import { StatusBanners } from "@/app/components/quiz/status-banners";
import { prisma } from "@/lib/prisma";
import { getGeneratedQuestionSuggestionsFromFields } from "@/lib/quiz/generated-questions";

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
    generated1?: string;
    generated2?: string;
    generated3?: string;
    added?: string;
    skipped?: string;
    error?: string;
  }>;
};

function parseCount(value?: string): number {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return 0;
  }

  return Math.floor(numeric);
}

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
    const [latestAttempt, reviewState] = await Promise.all([
      prisma.questionAttempt.findFirst({
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
      }),
      prisma.reviewState.findUnique({
        where: {
          userId_questionId: {
            userId: session.user.id,
            questionId: question.id,
          },
        },
        select: {
          nextReviewAt: true,
        },
      }),
    ]);

    const isStale =
      !!latestAttempt?.answeredAt &&
      latestAttempt.answeredAt.getTime() <= staleThreshold.getTime();
    const isDueForReview =
      !!reviewState?.nextReviewAt &&
      reviewState.nextReviewAt.getTime() <= now.getTime();

    if ((isStale || isDueForReview) && latestAttempt) {
      await prisma.$transaction([
        prisma.questionAttempt.deleteMany({
          where: {
            userId: session.user.id,
            questionId: question.id,
          },
        }),
        prisma.question.deleteMany({
          where: {
            userId: session.user.id,
            parentQuestionId: question.id,
            questionType: "FOLLOW_UP",
          },
        }),
      ]);
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
  const generatedQuestions = getGeneratedQuestionSuggestionsFromFields(query);
  const activeHints = [query.hint1, query.hint2, query.hint3].filter(
    (hint): hint is string => typeof hint === "string" && hint.trim().length > 0,
  );
  const addedCount = parseCount(query.added);
  const skippedCount = parseCount(query.skipped);
  const saveError =
    query.error === "attempt_model_unavailable" ||
    query.error === "attempt_save_failed" ||
    query.error === "attempt_reset_failed";
  const attemptTimedOut = query.error === "attempt_timeout";
  const attemptMissingApiKey = query.error === "attempt_missing_api_key";
  const attemptProviderHttpError = query.error === "attempt_provider_http_error";
  const gradingError =
    query.error === "attempt_grading_failed" ||
    query.error === "attempt_invalid_response" ||
    query.error === "attempt_network_error";
  const hintTimedOut = query.error === "hint_timeout";
  const hintMissingApiKey = query.error === "hint_missing_api_key";
  const hintProviderHttpError = query.error === "hint_provider_http_error";
  const hintError =
    query.error === "hint_generation_failed" ||
    query.error === "hint_invalid_response" ||
    query.error === "hint_network_error";
  const hintLimitReached = query.error === "hint_limit_reached";
  const llmLimitReached = query.error === "llm_daily_limit_reached";
  const generatedQuestionAddError = query.error === "generated_question_add_failed";
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
      <QuizBody
        questionId={question.id}
        questionBody={question.body}
        from={from}
        mode={mode}
        attempts={attempts}
        generatedQuestions={generatedQuestions}
        activeHints={activeHints}
      />
      <StatusBanners
        submitted={submitted}
        reset={reset}
        saveError={saveError}
        attemptTimedOut={attemptTimedOut}
        attemptMissingApiKey={attemptMissingApiKey}
        attemptProviderHttpError={attemptProviderHttpError}
        gradingError={gradingError}
        hintTimedOut={hintTimedOut}
        hintMissingApiKey={hintMissingApiKey}
        hintProviderHttpError={hintProviderHttpError}
        hintError={hintError}
        hintLimitReached={hintLimitReached}
        llmLimitReached={llmLimitReached}
        addedCount={addedCount}
        skippedCount={skippedCount}
        generatedQuestionAddError={generatedQuestionAddError}
      />
    </main>
  );
}
