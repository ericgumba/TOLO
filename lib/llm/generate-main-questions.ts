import { getOpenAiModel } from "@/lib/llm/model";
import { fetchWithLlmTimeout, LlmRequestTimeoutError } from "@/lib/llm/request";
import { type LlmCallResult } from "@/lib/llm/result";
import {
  GENERATED_MAIN_QUESTION_COUNT,
  RAW_GENERATED_MAIN_QUESTION_COUNT,
} from "@/lib/quiz/constants";
import { postProcessGeneratedQuestions } from "@/lib/questions/generation";

type GenerateMainQuestionsInput = {
  targetLabel: string;
  nodeLevel: "SUBJECT" | "TOPIC" | "SUBTOPIC";
  notes?: string;
  existingQuestions?: string[];
  desiredCount?: number;
};

export async function generateMainQuestionsForNode(
  input: GenerateMainQuestionsInput,
): Promise<LlmCallResult<string[]>> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAiModel();
  const desiredCount = input.desiredCount ?? GENERATED_MAIN_QUESTION_COUNT;

  if (!apiKey) {
    return {
      ok: false,
      reason: "missing_api_key",
    };
  }

  try {
    const existingQuestionsText =
      (input.existingQuestions ?? []).length > 0
        ? (input.existingQuestions ?? []).map((question, index) => `${index + 1}. ${question}`).join("\n")
        : "None";
    const notesText = input.notes?.trim().length ? input.notes.trim() : "None";

    const response = await fetchWithLlmTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You generate concise MAIN quiz questions for a learning app.\n\n" +
              "Return strict JSON with key:\n" +
              "- questions (array of strings)\n\n" +
              "Rules:\n" +
              `- Generate ${RAW_GENERATED_MAIN_QUESTION_COUNT} distinct candidates.\n` +
              "- Each question must stand alone as a future quiz question.\n" +
              "- Prefer explanation, application, comparison, mechanism, or tradeoff questions.\n" +
              "- Avoid generic wording, trivia, or source-attribution prompts.\n" +
              "- Do not repeat or lightly paraphrase any existing question.\n" +
              "- Keep the questions scoped to the selected node and its descendants.\n" +
              "- Return JSON only.",
          },
          {
            role: "user",
            content:
              `Target path: ${input.targetLabel}\n` +
              `Target node level: ${input.nodeLevel}\n` +
              `Optional notes: ${notesText}\n\n` +
              `Existing MAIN questions in scope:\n${existingQuestionsText}\n\n` +
              `Generate ${RAW_GENERATED_MAIN_QUESTION_COUNT} candidate MAIN questions.`,
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

    const parsed = JSON.parse(content) as { questions?: unknown };
    const generatedQuestions = postProcessGeneratedQuestions(parsed.questions, input.existingQuestions ?? []).slice(
      0,
      desiredCount,
    );

    if (generatedQuestions.length === 0) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      value: generatedQuestions,
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
