import { redirect } from "next/navigation";

import { CompareSession } from "@/app/components/compare/compare-session";
import { QuizHeader } from "@/app/components/quiz/quiz-header";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type ComparePageProps = {
  params: Promise<{
    conceptId: string;
  }>;
  searchParams: Promise<{
    from?: string;
  }>;
};

export default async function ComparePage({ params, searchParams }: ComparePageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const [{ conceptId }, query] = await Promise.all([params, searchParams]);

  const concept = await prisma.concept.findFirst({
    where: {
      id: conceptId,
      userId: session.user.id,
    },
    select: {
      id: true,
      title: true,
      nodeId: true,
      node: {
        select: {
          id: true,
          title: true,
          level: true,
        },
      },
    },
  });

  if (!concept) {
    redirect("/dashboard");
  }

  const from = query.from?.startsWith("/") ? query.from : `/subject/${concept.node.id}`;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-6 py-10">
      <QuizHeader from={from} nodeTitle={concept.node.title} nodeLevel={concept.node.level} title="Compare" />
      <CompareSession
        sourceConceptId={concept.id}
        sourceConceptTitle={concept.title}
        from={from}
      />
    </main>
  );
}
