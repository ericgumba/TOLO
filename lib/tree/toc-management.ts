import { NodeLevel } from "@prisma/client";

type TocDeleteNode = {
  id: string;
  level: NodeLevel;
  parentId: string | null;
};

type TocDeleteContext = {
  subjectId: string;
};

export function getTocDeleteReturnTo(targetNode: TocDeleteNode, context: TocDeleteContext): string {
  void context;
  void targetNode;
  return "/dashboard";
}

export function getTocDeleteLabel(level: NodeLevel): string {
  if (level === NodeLevel.SUBJECT) {
    return "subject";
  }

  return "node";
}

export function getTocDeleteDescription(level: NodeLevel): string {
  if (level === NodeLevel.SUBJECT) {
    return "This deletes the subject and all attached concepts, generated questions, tags, and review data.";
  }

  return "This deletes the node and all attached concepts.";
}
