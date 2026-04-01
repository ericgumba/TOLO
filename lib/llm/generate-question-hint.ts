import { getOpenAiModel } from "@/lib/llm/model";
import { fetchWithLlmTimeout, LlmRequestTimeoutError } from "@/lib/llm/request";
import { type LlmCallResult } from "@/lib/llm/result";

type QuestionContextNode = {
  id: string;
  title: string;
  level: "SUBJECT" | "TOPIC" | "SUBTOPIC";
};

type QuizHistoryItem = {
  question: string;
  answer: string;
};

export type GenerateQuestionHintInput = {
  question: string;
  context?: QuestionContextNode[];
  quizHistory?: QuizHistoryItem[];
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
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAiModel();

  if (!apiKey) {
    return {
      ok: false,
      reason: "missing_api_key",
    };
  }

  const contextText =
    input.context && input.context.length > 0
      ? input.context.map((node) => `${node.level}: ${node.title}`).join(" > ")
      : "No context provided";
  const historyText =
    input.quizHistory && input.quizHistory.length > 0
      ? input.quizHistory
          .map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`)
          .join("\n")
      : "No prior Q/A in this quiz yet.";
  const existingHintsText =
    input.existingHints && input.existingHints.length > 0
      ? input.existingHints.map((hint, index) => `${index + 1}. ${hint}`).join("\n")
      : "None";

  try {
    const response = await fetchWithLlmTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
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
      }),
    });

    if (!response.ok) {
      return {
        ok: false,
        reason: "http_error",
      };
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    const parsed = JSON.parse(content) as { hint?: unknown };
    if (typeof parsed.hint === "string" && parsed.hint.trim().length > 0) {
      return {
        ok: true,
        value: parsed.hint.trim(),
      };
    }

    return {
      ok: false,
      reason: "invalid_response",
    };
  } catch (error) {
    if (error instanceof LlmRequestTimeoutError) {
      return {
        ok: false,
        reason: "timeout",
      };
    }

    return {
      ok: false,
      reason: "network_error",
    };
  }
}
