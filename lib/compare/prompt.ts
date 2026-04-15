export const COMPARE_INTERACTION_CATEGORIES = [
  "COMPARE",
  "PART_WHOLE",
  "DEPENDENCY",
  "ANALOGY",
  "TRADEOFF",
  "MECHANISM_LINK",
] as const;

export type CompareInteractionCategory = (typeof COMPARE_INTERACTION_CATEGORIES)[number];

export const COMPARE_INTERACTION_LABELS: Record<CompareInteractionCategory, string> = {
  COMPARE: "Compare",
  PART_WHOLE: "Part vs whole",
  DEPENDENCY: "Dependency / prerequisite",
  ANALOGY: "Analogy",
  TRADEOFF: "Tradeoff",
  MECHANISM_LINK: "Mechanism link",
};
