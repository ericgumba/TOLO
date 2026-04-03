import { requestOpenAiJsonObject, toLlmFailureResult } from "@/lib/llm/openai";
import {
  formatContextPath,
  formatIndexedStringList,
  formatQuizHistory,
  type LlmQuestionContextNode,
  type LlmQuizHistoryItem,
} from "@/lib/llm/prompt-formatting";
import { type LlmCallResult } from "@/lib/llm/result";

export type GenerateQuestionHintInput = {
  question: string;
  context?: LlmQuestionContextNode[];
  quizHistory?: LlmQuizHistoryItem[];
  hintLevel: 1 | 2 | 3;
  existingHints?: string[];
};

export function getHintLevelInstruction(hintLevel: 1 | 2 | 3): string {
  if (hintLevel === 1) {
    return "Hint level 1: provide a subtle nudge only. Ask the student what concept to consider first.";
  }

  if (hintLevel === 2) {
    return "Hint level 2: provide a clearer directional hint and mention one important concept to include.";
  }

  return "Hint level 3: provide a strong scaffold (steps/checklist) but do not reveal the final answer.";
}

export async function generateQuestionHint(input: GenerateQuestionHintInput): Promise<LlmCallResult<string>> {
  const contextText = formatContextPath(input.context);
  const historyText = formatQuizHistory(input.quizHistory);
  const existingHintsText = formatIndexedStringList(input.existingHints);

  try {
    const response = await requestOpenAiJsonObject<{ hint?: unknown }>({
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You generate one concise progressive hint for a student.\n\n" +
            "Return strict JSON with key:\n" +
            "- hint\n\n" +
            "Rules:\n" +
            "- Do not provide the full final answer.\n" +
            "- Keep it to at most 2 short sentences.\n" +
            "- Avoid repeating prior hints.\n" +
            "- The hint must nudge reasoning, not just recall.\n" +
            "- Follow the provided hint-level instruction exactly.",
        },
        {
          role: "user",
          content:
            `Hint-level instruction: ${getHintLevelInstruction(input.hintLevel)}\n\n` +
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

    if (typeof response.value.hint !== "string" || response.value.hint.trim().length === 0) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      value: response.value.hint.trim(),
    };
  } catch (error) {
    return toLlmFailureResult(error);
  }
}
