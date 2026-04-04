import { requestOpenAiJsonObject, toLlmFailureResult } from "@/lib/llm/openai";
import {
  formatContextPath,
  formatIndexedStringList,
  formatQuizHistory,
  type LlmQuestionContextNode,
  type LlmQuizHistoryItem,
} from "@/lib/llm/prompt-formatting";
import { type LlmCallResult } from "@/lib/llm/result";

export type RevealQuestionAnswerInput = {
  question: string;
  context?: LlmQuestionContextNode[];
  quizHistory?: LlmQuizHistoryItem[];
  existingHints?: string[];
};

export async function revealQuestionAnswer(input: RevealQuestionAnswerInput): Promise<LlmCallResult<string>> {
  const contextText = formatContextPath(input.context);
  const historyText = formatQuizHistory(input.quizHistory);
  const existingHintsText = formatIndexedStringList(input.existingHints);

  try {
    const response = await requestOpenAiJsonObject<{ answer?: unknown }>({
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You reveal a concise study answer after the student has already used several hints.\n\n" +
            "Return strict JSON with key:\n" +
            "- answer\n\n" +
            "Rules:\n" +
            "- Answer the question directly and accurately.\n" +
            "- Keep it concise and self-contained.\n" +
            "- Use at most 4 short sentences.\n" +
            "- Do not mention the hints or that this answer was generated.",
        },
        {
          role: "user",
          content:
            `Context path: ${contextText}\n\n` +
            `Prior quiz Q/A:\n${historyText}\n\n` +
            `Existing hints:\n${existingHintsText}\n\n` +
            `Current question: ${input.question}\n\n` +
            "Return JSON only.",
        },
      ],
    });

    if (!response.ok) {
      return response;
    }

    if (typeof response.value.answer !== "string" || response.value.answer.trim().length === 0) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      value: response.value.answer.trim(),
    };
  } catch (error) {
    return toLlmFailureResult(error);
  }
}
