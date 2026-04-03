import { SubjectTocSidebarClient } from "@/app/components/subject-toc-sidebar-client";
import { type TreeNode } from "@/lib/tree/service";

type SubjectTocSidebarProps = {
  subject: TreeNode;
  activeTopicId?: string;
  activeSubtopicId?: string;
};

export function SubjectTocSidebar({ subject, activeTopicId, activeSubtopicId }: SubjectTocSidebarProps) {
  return (
    <SubjectTocSidebarClient
      subject={subject}
      activeTopicId={activeTopicId}
      activeSubtopicId={activeSubtopicId}
    />
  );
}
