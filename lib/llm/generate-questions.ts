import { requestOpenAiJsonObject, toLlmFailureResult } from "@/lib/llm/openai";
import { formatIndexedStringList } from "@/lib/llm/prompt-formatting";
import { type LlmCallResult } from "@/lib/llm/result";
import { postProcessGeneratedQuestions } from "@/lib/questions/generation";
import {
  GENERATED_QUESTION_COUNT,
  GENERATED_QUESTION_TIER_LABELS,
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
            `- questions (array of exactly ${GENERATED_QUESTION_COUNT} strings)\n\n` +
            "Rules:\n" +
            `- Generate exactly ${RAW_GENERATED_QUESTION_COUNT} distinct questions.\n` +
            "- Generate candidate quiz questions that fit this same topic and do not repeat wording or meaning of existing questions.\n" +
            "- Each question must stand alone as a future quiz question.\n" +
            `- Order them as ${GENERATED_QUESTION_TIER_LABELS.map((label) => label.toLowerCase()).join(", ")}.\n` +
            "- Do not use transitional wording like 'Building on that', 'Given that', or 'Now that'.\n" +
            "- The medium question should deepen the same concept without depending on pronouns or prior wording.\n" +
            "- The hard question should deepen the same concept further while remaining fully self-contained.\n" +
            "Difficulty progression rules:\n" +
            "- Easy: Ask a definition question: e.g \"what is x?\"\n" +
            "- Medium: build directly on easy (comparison, or simple application or a why question)\n" +
            "- Hard: build directly on medium (synthesis, tradeoffs, or scenario-based reasoning)\n\n" +
            "Structured progression requirements:\n" +
            "- Each tier should feel like the natural next step from the previous one.\n" +
            "- Do not produce unrelated questions that only differ in difficulty.\n" +
            "- Each question must still stand alone as a future quiz question.\n\n" +
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
            `Generate ${RAW_GENERATED_QUESTION_COUNT} candidate quiz questions.\n` +
            `Return them in order: ${GENERATED_QUESTION_TIER_LABELS.map((label) => label.toLowerCase()).join(", ")}.\n` +
            "Have them build in difficulty and conceptual depth while keeping each question fully standalone.",
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
