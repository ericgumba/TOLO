import { requestOpenAiJsonObject, toLlmFailureResult } from "@/lib/llm/openai";
import {
  formatContextPath,
  formatIndexedStringList,
  formatQuizHistory,
  type LlmQuestionContextNode,
  type LlmQuizHistoryItem,
} from "@/lib/llm/prompt-formatting";
import { type LlmCallResult } from "@/lib/llm/result";
import { sanitizeGeneratedQuestionSuggestions } from "@/lib/quiz/generated-questions";
import { GENERATED_QUESTION_SUGGESTION_COUNT, GENERATED_QUESTION_SUGGESTION_TIER_SIZE } from "@/lib/quiz/constants";

type GradeResult = {
  score: number;
  feedback: string;
  correction: string;
  generatedQuestions: string[];
};

function clampScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(1, Math.min(100, Math.round(numeric)));
}

function getSuggestionTierOrderInstruction(): string {
  if (GENERATED_QUESTION_SUGGESTION_TIER_SIZE === 1) {
    return "easy, medium, and hard";
  }

  return `${GENERATED_QUESTION_SUGGESTION_TIER_SIZE} easy, ${GENERATED_QUESTION_SUGGESTION_TIER_SIZE} medium, and ${GENERATED_QUESTION_SUGGESTION_TIER_SIZE} hard`;
}

export async function gradeQuestionAttempt(
  question: string,
  answer: string,
  context: LlmQuestionContextNode[] = [],
  quizHistory: LlmQuizHistoryItem[] = [],
  existingQuestions: string[] = [],
): Promise<LlmCallResult<GradeResult>> {
  try {
    const contextText = formatContextPath(context);
    const historyText = formatQuizHistory(quizHistory);
    const existingQuestionsText = formatIndexedStringList(existingQuestions);
    const suggestionTierOrderInstruction = getSuggestionTierOrderInstruction();

    const response = await requestOpenAiJsonObject<{
      score?: unknown;
      feedback?: unknown;
      correction?: unknown;
      generatedQuestions?: unknown;
    }>({
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
          "You are grading a student's free-form answer.\n\n" +
          "Return strict JSON with exactly these keys:\n" +
          "- score (integer 1..100)\n" +
          "- diagnosis (string: the single most important missing, misunderstood, or vague concept)\n" +
          '- diagnosisType (one of: "missing", "misunderstood", "too_vague", "partially_correct", "correct")\n' +
          "- feedback (string)\n" +
          "- correction (string)\n" +
          `- generatedQuestions (array of exactly ${GENERATED_QUESTION_SUGGESTION_COUNT} strings)\n\n` +
          "Scoring rubric:\n" +
            "- 90..100: substantively correct and clear, even if concise\n" +
            "- 70..89: mostly correct, minor omission or imprecision\n" +
            "- 40..69: partially correct but with an important gap or confusion\n" +
            "- 1..39: mostly incorrect or seriously confused\n" +
            "Do not lower the score only because the answer is brief if it is substantively correct.\n\n" +
          "Field rules:\n" +
            "- diagnosis must name ONE core concept to focus on next.\n" +
            "- diagnosisType must reflect the student's main issue.\n" +
            "- feedback must briefly state what is correct and what is missing or unclear (1–3 sentences).\n" +
            "- correction must give a clean, concise, correct answer to the original question.\n" +
            "- If the answer is correct, diagnosis should point to the next related concept to reinforce.\n\n" +
          `Always generate exactly ${GENERATED_QUESTION_SUGGESTION_COUNT} distinct future study questions for the same topic.\n` +
          "Question anchoring rules:\n" +
          "- Anchor all questions to the diagnosis or an immediately related prerequisite concept.\n" +
          "- Do not repeat wording, meaning, answer target, or cognitive task of any existing question.\n" +
          "- A question counts as a duplicate even if reworded, if it tests the same concept in nearly the same way.\n\n" +
          `Order generatedQuestions as ${suggestionTierOrderInstruction}.\n` +
          "The questions must form a pedagogically coherent progression around ONE core concept.\n\n" +
          "Standalone wording rules:\n" +
          "- Do not use transitional wording like 'Building on that', 'Given that', or 'Now that'.\n" +
          "- The medium question should deepen the same concept while remaining fully self-contained.\n" +
          "- The hard question should deepen the same concept further while remaining fully self-contained.\n\n" +
          "Difficulty progression rules:\n" +
          "- Easy: Ask a definition question: e.g \"what is x?\"\n" +
          "- Medium: build directly on easy (comparison, or simple application or a why question)\n" +
          "- Hard: build directly on medium (synthesis, tradeoffs, or scenario-based reasoning)\n\n" +
          "Structured progression requirements:\n" +
          "- Each tier should feel like the natural next step from the previous one.\n" +
          "- Do not produce unrelated questions that only differ in difficulty.\n" +
          "- Each question must still stand alone as a future quiz question.\n\n" +
          "Question quality rules:\n" +
          "- Keep questions concise and specific.\n" +
          "- Prefer short wording over multi-clause phrasing.\n" +
          "Return JSON only.",
        },
        {
          role: "user",
          content:
            `Context path: ${contextText}\n\n` +
            `Prior quiz Q/A:\n${historyText}\n\n` +
            `Already asked questions:\n${existingQuestionsText}\n\n` +
            `Question: ${question}\n\n` +
            `Student answer: ${answer}\n\n` +
            `Generate ${GENERATED_QUESTION_SUGGESTION_COUNT} candidate future study questions that fit this same topic and do not repeat wording or meaning of existing questions.\n` +
            `Return them in order: ${suggestionTierOrderInstruction}.\n` +
            "Increase conceptual depth across easy, medium, and hard while keeping each question fully standalone.\n\n" +
            "Return JSON only.",
        },
      ],
    });

    if (!response.ok) {
      return response;
    }

    if (typeof response.value.feedback !== "string" || response.value.feedback.trim().length === 0) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    if (typeof response.value.correction !== "string" || response.value.correction.trim().length === 0) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      value: {
        score: clampScore(response.value.score),
        feedback: response.value.feedback.trim(),
        correction: response.value.correction.trim(),
        generatedQuestions: sanitizeGeneratedQuestionSuggestions(
          response.value.generatedQuestions,
          question,
          existingQuestions,
        ),
      },
    };
  } catch (error) {
    return toLlmFailureResult(error);
  }
}
