import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { QuizHeader } from "@/app/components/quiz/quiz-header";
import { QuizSession } from "@/app/components/quiz/quiz-session";
import { prisma } from "@/lib/prisma";

type QuizPageProps = {
  params: Promise<{
    questionId: string;
  }>;
  searchParams: Promise<{
    from?: string;
    mode?: string;
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

  const now = new Date();

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

  const from = query.from?.startsWith("/") ? query.from : `/subject/${question.node.id}`;
  const mode = typeof query.mode === "string" ? query.mode : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <QuizHeader from={from} nodeTitle={question.node.title} nodeLevel={question.node.level} />
      <QuizSession
        questionId={question.id}
        nodeId={question.node.id}
        questionBody={question.body}
        from={from}
        mode={mode}
      />
    </main>
  );
}
