import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { QuizHeader } from "@/app/components/quiz/quiz-header";
import { QuizSession } from "@/app/components/quiz/quiz-session";
import { prisma } from "@/lib/prisma";

type GeneratedQuizPageProps = {
  params: Promise<{
    generatedQuestionId: string;
  }>;
  searchParams: Promise<{
    from?: string;
    mode?: string;
  }>;
};

export default async function GeneratedQuizPage({ params, searchParams }: GeneratedQuizPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [{ generatedQuestionId }, query] = await Promise.all([params, searchParams]);

  const generatedQuestion = await prisma.generatedQuestion.findFirst({
    where: {
      id: generatedQuestionId,
      concept: {
        userId: session.user.id,
      },
    },
    select: {
      id: true,
      body: true,
      concept: {
        select: {
          node: {
            select: {
              id: true,
              title: true,
              level: true,
            },
          },
        },
      },
    },
  });

  if (!generatedQuestion) {
    redirect("/dashboard");
  }

  const from = query.from?.startsWith("/") ? query.from : `/subject/${generatedQuestion.concept.node.id}`;
  const mode = typeof query.mode === "string" ? query.mode : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <QuizHeader
        from={from}
        nodeTitle={generatedQuestion.concept.node.title}
        nodeLevel={generatedQuestion.concept.node.level}
        title="Question"
      />
      <QuizSession
        promptId={generatedQuestion.id}
        questionKind="generated"
        nodeId={generatedQuestion.concept.node.id}
        promptBody={generatedQuestion.body}
        promptLabel="Question"
        from={from}
        mode={mode}
      />
    </main>
  );
}
