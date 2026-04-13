import { SubjectTocSidebarClient } from "@/app/components/subject-toc-sidebar-client";
import { type TreeNode } from "@/lib/tree/service";

export type SubjectTagSummary = {
  id: string;
  name: string;
  conceptCount: number;
};

type SubjectTocSidebarProps = {
  subject: TreeNode;
  tags: SubjectTagSummary[];
  activeTag?: string;
};

export function SubjectTocSidebar({ subject, tags, activeTag }: SubjectTocSidebarProps) {
  return (
    <SubjectTocSidebarClient
      subject={subject}
      tags={tags}
      activeTag={activeTag}
    />
  );
}
