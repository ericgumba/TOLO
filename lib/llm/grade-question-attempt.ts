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
            "Return strict JSON with keys:\n" +
            "- score (integer 1..100)\n" +
            "- feedback\n" +
            "- correction\n" +
            "- generatedQuestions (array of exactly 3 strings)\n\n" +
            "The student's answer does not need to be detailed.\n\n" +
            "Always generate exactly 3 distinct candidate questions for the same node/topic.\n" +
            "These should each stand alone as future quiz questions.\n\n" +
            "Question rules:\n" +
            "- Keep each question concise and specific.\n" +
            "- Prefer understanding, explanation, example, application, or comparison questions.\n" +
            "- Avoid trivia, source-attribution questions, and generic wording.\n" +
            "- Do not repeat or lightly paraphrase any existing question.\n" +
            "- The questions should be answerable from the same topic area as the current question.",
        },
        {
          role: "user",
          content:
            `Context path: ${contextText}\n\n` +
            `Prior quiz Q/A:\n${historyText}\n\n` +
            `Already asked questions:\n${existingQuestionsText}\n\n` +
            `Question: ${question}\n\n` +
            `Student answer: ${answer}\n\n` +
            "Generate 3 candidate future study questions that fit this same topic and do not repeat wording or meaning of existing questions.\n\n" +
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
