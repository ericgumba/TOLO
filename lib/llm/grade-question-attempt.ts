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
import { GENERATED_QUESTION_SUGGESTION_COUNT, GENERATED_QUESTION_SUGGESTION_LABELS } from "@/lib/quiz/constants";

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

function getSuggestionCategoryOrderInstruction(): string {
  return GENERATED_QUESTION_SUGGESTION_LABELS.join(", ");
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
    const suggestionCategoryOrderInstruction = getSuggestionCategoryOrderInstruction();

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
          `Order generatedQuestions as ${suggestionCategoryOrderInstruction}.\n` +
          "Do not use transitional wording like 'Building on that' or 'As a follow-up'.\n" +
          "Question type rules:\n" +
          "- Explain: Ask a why or how question that tests understanding of the concept’s purpose or mechanism..\n" +
          "- Analyze: Ask the user to compare, contrast, or reason through a \"what if\" scenario.\n" +
          "- Evaluate: ask the learner to judge tradeoffs, limits, strengths, weaknesses, or when one approach is better than another.\n" +
          "- Apply: ask the learner to use the concept in a concrete scenario or realistic example.\n" +
          "- Teach: Ask the user to explain the concept as if teaching a complete beginner. The explanation must be simple, intuitive, and include an analogy or real-world example.\n" +
          "- Every generated question must remain fully self-contained.\n\n" +
          "Question quality rules:\n" +
          "- Keep questions concise and specific.\n" +
          "- Prefer short wording over multi-clause phrasing.\n" +
          "Return JSON only.",
        },
        {
          role: "user",
          content:
            `Context path: ${contextText}\n\n` +
            `Quiz history: ${historyText}\n\n` +
            `Existing questions at this node:\n${existingQuestionsText}\n\n` +
            `Question: ${question}\n\n` +
            `Student answer: ${answer}\n\n` +
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
