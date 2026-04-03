export type LlmQuestionContextNode = {
  id: string;
  title: string;
  level: "SUBJECT" | "TOPIC" | "SUBTOPIC";
};

export type LlmQuizHistoryItem = {
  question: string;
  answer: string;
};

export function formatContextPath(
  context: LlmQuestionContextNode[] | undefined,
  emptyText = "No context provided",
): string {
  return context && context.length > 0
    ? context.map((node) => `${node.level}: ${node.title}`).join(" > ")
    : emptyText;
}

export function formatQuizHistory(
  quizHistory: LlmQuizHistoryItem[] | undefined,
  emptyText = "No prior Q/A in this quiz yet.",
): string {
  return quizHistory && quizHistory.length > 0
    ? quizHistory.map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`).join("\n")
    : emptyText;
}

export function formatIndexedStringList(items: string[] | undefined, emptyText = "None"): string {
  return items && items.length > 0 ? items.map((item, index) => `${index + 1}. ${item}`).join("\n") : emptyText;
}
