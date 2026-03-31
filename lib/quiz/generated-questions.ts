import {
  GENERATED_QUESTION_SUGGESTION_COUNT,
  MAX_GENERATED_QUESTION_LENGTH,
} from "@/lib/quiz/constants";

type GeneratedQuestionFields = {
  generated1?: unknown;
  generated2?: unknown;
  generated3?: unknown;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trimGeneratedQuestion(value: string): string {
  const collapsed = collapseWhitespace(value);

  if (collapsed.length <= MAX_GENERATED_QUESTION_LENGTH) {
    return collapsed;
  }

  return collapsed.slice(0, MAX_GENERATED_QUESTION_LENGTH).trimEnd();
}

function buildQuestionLead(question: string): string {
  const trimmed = collapseWhitespace(question).replace(/[?!.\s]+$/g, "").trim();

  return trimmed.length > 0 ? trimmed : "this topic";
}

export function normalizeQuestionText(value: string): string {
  return collapseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getGeneratedQuestionSuggestionsFromFields(input: GeneratedQuestionFields): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>();

  for (const value of [input.generated1, input.generated2, input.generated3]) {
    if (typeof value !== "string") {
      continue;
    }

    const cleaned = trimGeneratedQuestion(value);
    const normalized = normalizeQuestionText(cleaned);
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    suggestions.push(cleaned);
  }

  return suggestions;
}

export function buildFallbackGeneratedQuestionSuggestions(question: string): string[] {
  const lead = buildQuestionLead(question);

  return [
    `What is the core idea behind "${lead}"?`,
    `What is one concrete example that illustrates "${lead}"?`,
    `Why does "${lead}" matter in practice?`,
    `How would you explain "${lead}" to someone seeing it for the first time?`,
    `What mistake do people commonly make when thinking about "${lead}"?`,
  ].map(trimGeneratedQuestion);
}

export function sanitizeGeneratedQuestionSuggestions(
  rawGeneratedQuestions: unknown,
  question: string,
  existingQuestions: string[] = [],
): string[] {
  const suggestions: string[] = [];
  const seen = new Set<string>(
    [question, ...existingQuestions].map(normalizeQuestionText).filter((value) => value.length > 0),
  );

  if (Array.isArray(rawGeneratedQuestions)) {
    for (const value of rawGeneratedQuestions) {
      if (typeof value !== "string") {
        continue;
      }

      const cleaned = trimGeneratedQuestion(value);
      const normalized = normalizeQuestionText(cleaned);
      if (normalized.length === 0 || seen.has(normalized)) {
        continue;
      }

      seen.add(normalized);
      suggestions.push(cleaned);

      if (suggestions.length >= GENERATED_QUESTION_SUGGESTION_COUNT) {
        return suggestions;
      }
    }
  }

  for (const fallback of buildFallbackGeneratedQuestionSuggestions(question)) {
    const normalized = normalizeQuestionText(fallback);
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    suggestions.push(fallback);

    if (suggestions.length >= GENERATED_QUESTION_SUGGESTION_COUNT) {
      return suggestions;
    }
  }

  let fallbackIndex = 1;
  while (suggestions.length < GENERATED_QUESTION_SUGGESTION_COUNT) {
    const fallback = trimGeneratedQuestion(
      `What is another important question to ask about "${buildQuestionLead(question)}"? (${fallbackIndex})`,
    );
    const normalized = normalizeQuestionText(fallback);

    if (!seen.has(normalized)) {
      seen.add(normalized);
      suggestions.push(fallback);
    }

    fallbackIndex += 1;
  }

  return suggestions;
}
