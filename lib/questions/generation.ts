import {
  GENERATED_MAIN_QUESTION_COUNT,
  MAX_GENERATED_QUESTION_LENGTH,
} from "@/lib/quiz/constants";
import { normalizeQuestionText } from "@/lib/quiz/generated-questions";

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function finalizeGeneratedQuestion(value: string): string | null {
  const collapsed = collapseWhitespace(value);

  if (collapsed.length === 0) {
    return null;
  }

  if (collapsed.length <= MAX_GENERATED_QUESTION_LENGTH) {
    return collapsed;
  }

  return collapsed.slice(0, MAX_GENERATED_QUESTION_LENGTH).trimEnd();
}

export function postProcessGeneratedQuestions(
  rawGeneratedQuestions: unknown,
  existingQuestions: string[] = [],
): string[] {
  if (!Array.isArray(rawGeneratedQuestions)) {
    return [];
  }

  const questions: string[] = [];
  const seen = new Set(
    existingQuestions.map((question) => normalizeQuestionText(question)).filter((question) => question.length > 0),
  );

  for (const value of rawGeneratedQuestions) {
    if (typeof value !== "string") {
      continue;
    }

    const finalized = finalizeGeneratedQuestion(value);
    if (!finalized) {
      continue;
    }

    const normalized = normalizeQuestionText(finalized);
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    questions.push(finalized);

    if (questions.length >= GENERATED_MAIN_QUESTION_COUNT) {
      break;
    }
  }

  return questions;
}

export { GENERATED_MAIN_QUESTION_COUNT };
