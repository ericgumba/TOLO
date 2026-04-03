import { requestOpenAiJsonObject, toLlmFailureResult } from "@/lib/llm/openai";
import { formatIndexedStringList } from "@/lib/llm/prompt-formatting";
import { type LlmCallResult } from "@/lib/llm/result";
import { postProcessGeneratedQuestions } from "@/lib/questions/generation";
import {
  GENERATED_QUESTION_COUNT,
  RAW_GENERATED_QUESTION_COUNT,
} from "@/lib/quiz/constants";

type GenerateQuestionsInput = {
  targetLabel: string;
  nodeLevel: "SUBJECT" | "TOPIC" | "SUBTOPIC";
  notes?: string;
  existingQuestions?: string[];
  desiredCount?: number;
};

export async function generateQuestionsForNode(
  input: GenerateQuestionsInput,
): Promise<LlmCallResult<string[]>> {
  const desiredCount = input.desiredCount ?? GENERATED_QUESTION_COUNT;

  try {
    const existingQuestionsText = formatIndexedStringList(input.existingQuestions);
    const notesText = input.notes?.trim().length ? input.notes.trim() : "None";

    const response = await requestOpenAiJsonObject<{ questions?: unknown }>({
      temperature: 0.4,
      messages: [
        {
          role: "system",
          content:
            "You generate concise quiz questions for a learning app.\n\n" +
            "Return strict JSON with key:\n" +
            "- questions (array of strings)\n\n" +
            "Rules:\n" +
            `- Generate ${RAW_GENERATED_QUESTION_COUNT} distinct candidates.\n` +
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
            `Existing questions in scope:\n${existingQuestionsText}\n\n` +
            `Generate ${RAW_GENERATED_QUESTION_COUNT} candidate quiz questions.`,
        },
      ],
    });

    if (!response.ok) {
      return response;
    }

    const generatedQuestions = postProcessGeneratedQuestions(response.value.questions, input.existingQuestions ?? []).slice(
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
    return toLlmFailureResult(error);
  }
}
