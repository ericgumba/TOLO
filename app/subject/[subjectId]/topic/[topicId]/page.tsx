import { redirect } from "next/navigation";

import { auth } from "@/auth";

type TopicPageProps = {
  params: Promise<{
    subjectId: string;
    topicId: string;
  }>;
};

export default async function TopicPage({ params }: TopicPageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { subjectId } = await params;
  redirect(`/subject/${subjectId}`);
}
