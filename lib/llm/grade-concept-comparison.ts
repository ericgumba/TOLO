import { requestOpenAiJsonObject, toLlmFailureResult } from "@/lib/llm/openai";
import { formatContextPath, type LlmQuestionContextNode } from "@/lib/llm/prompt-formatting";
import { type LlmCallResult } from "@/lib/llm/result";

type GradeConceptComparisonResult = {
  score: number;
  feedback: string;
  correction: string;
};

function clampScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }

  return Math.max(1, Math.min(100, Math.round(numeric)));
}

export async function gradeConceptComparison(input: {
  sourceConcept: string;
  targetConcept: string;
  answer: string;
  prompt: string;
  context?: LlmQuestionContextNode[];
}): Promise<LlmCallResult<GradeConceptComparisonResult>> {
  const contextText = formatContextPath(input.context);

  try {
    const response = await requestOpenAiJsonObject<{
      score?: unknown;
      feedback?: unknown;
      correction?: unknown;
    }>({
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are grading a student's comparison of two concepts.\n\n" +
            "Return strict JSON with exactly these keys:\n" +
            "- score (integer 1..100)\n" +
            "- feedback (string)\n" +
            "- correction (string)\n\n" +
            "Scoring rubric:\n" +
            "- 90..100: clear relationship, important differences, and when each concept matters\n" +
            "- 70..89: mostly correct, but missing one important comparison detail\n" +
            "- 40..69: partially correct, but shallow or confused on the relationship\n" +
            "- 1..39: mostly incorrect or unable to relate the concepts\n" +
            "Do not lower the score only because the answer is brief if it is substantively correct.\n\n" +
            "Field rules:\n" +
            "- feedback must briefly say what is correct and what comparison detail is missing or unclear.\n" +
            "- correction must give a concise, accurate comparison in 2 to 4 sentences.\n" +
            "- correction should explain both the relationship and the important difference.\n" +
            "Return JSON only.",
        },
        {
          role: "user",
          content:
            `Context path: ${contextText}\n\n` +
            `Concept A: ${input.sourceConcept}\n` +
            `Concept B: ${input.targetConcept}\n\n` +
            `Prompt: ${input.prompt}\n\n` +
            `Student answer: ${input.answer}\n\n` +
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
      },
    };
  } catch (error) {
    return toLlmFailureResult(error);
  }
}
