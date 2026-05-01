import { redirect } from "next/navigation";

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
      node: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!concept) {
    redirect("/dashboard");
  }

  const from = query.from?.startsWith("/") ? query.from : `/subject/${concept.node.id}`;
  redirect(from);
}
