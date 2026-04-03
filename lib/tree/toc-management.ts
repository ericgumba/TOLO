import { NodeLevel } from "@prisma/client";

type TocDeleteNode = {
  id: string;
  level: NodeLevel;
  parentId: string | null;
};

type TocDeleteContext = {
  subjectId: string;
  activeTopicId?: string;
  activeSubtopicId?: string;
};

function getCurrentTocPath({ subjectId, activeTopicId, activeSubtopicId }: TocDeleteContext): string {
  if (!activeTopicId) {
    return `/subject/${subjectId}`;
  }

  const topicPath = `/subject/${subjectId}/topic/${activeTopicId}`;
  if (!activeSubtopicId) {
    return topicPath;
  }

  return `${topicPath}?subtopic=${activeSubtopicId}`;
}

export function getTocDeleteReturnTo(targetNode: TocDeleteNode, context: TocDeleteContext): string {
  if (targetNode.level === NodeLevel.SUBJECT) {
    return "/dashboard";
  }

  if (targetNode.level === NodeLevel.TOPIC && context.activeTopicId === targetNode.id) {
    return `/subject/${context.subjectId}`;
  }

  if (
    targetNode.level === NodeLevel.SUBTOPIC &&
    context.activeTopicId &&
    context.activeSubtopicId === targetNode.id
  ) {
    return `/subject/${context.subjectId}/topic/${context.activeTopicId}`;
  }

  return getCurrentTocPath(context);
}

export function getTocDeleteLabel(level: NodeLevel): string {
  if (level === NodeLevel.SUBJECT) {
    return "subject";
  }

  if (level === NodeLevel.TOPIC) {
    return "topic";
  }

  return "subtopic";
}

export function getTocDeleteDescription(level: NodeLevel): string {
  if (level === NodeLevel.SUBJECT) {
    return "This deletes the subject, all nested topics and subtopics, and all attached questions.";
  }

  if (level === NodeLevel.TOPIC) {
    return "This deletes the topic, all nested subtopics, and all attached questions.";
  }

  return "This deletes the subtopic and all attached questions.";
}
