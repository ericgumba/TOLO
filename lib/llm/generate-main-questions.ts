import { fetchWithLlmTimeout, LlmRequestTimeoutError } from "@/lib/llm/request";
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

function buildFallbackQuestions(input: GenerateMainQuestionsInput): string[] {
  const label = input.targetLabel.trim();
  const sourceHint = input.notes?.trim() ? ` using the provided notes: ${input.notes.trim()}` : "";

  return [
    `What is the core idea behind ${label}?`,
    `Why does ${label} matter in practice?`,
    `How would you explain ${label} to someone new${sourceHint}?`,
    `What is one concrete example that clarifies ${label}?`,
    `What tradeoffs or limitations should someone know about ${label}?`,
    `How does ${label} connect to the broader system around it?`,
    `What common misunderstanding appears when people study ${label}?`,
    `How would you apply ${label} in a realistic scenario?`,
  ];
}

export async function generateMainQuestionsForNode(input: GenerateMainQuestionsInput): Promise<string[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model =
    process.env.OPENAI_QUESTION_GENERATION_MODEL ||
    process.env.OPENAI_GRADING_MODEL ||
    process.env.OPENAI_MODEL ||
    "gpt-4o-mini";
  const desiredCount = input.desiredCount ?? GENERATED_MAIN_QUESTION_COUNT;

  if (!apiKey) {
    return postProcessGeneratedQuestions(buildFallbackQuestions(input), input.existingQuestions ?? []).slice(
      0,
      desiredCount,
    );
  }

  try {
    const existingQuestionsText =
      input.existingQuestions && input.existingQuestions.length > 0
        ? input.existingQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n")
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
      return postProcessGeneratedQuestions(buildFallbackQuestions(input), input.existingQuestions ?? []).slice(
        0,
        desiredCount,
      );
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
      return postProcessGeneratedQuestions(buildFallbackQuestions(input), input.existingQuestions ?? []).slice(
        0,
        desiredCount,
      );
    }

    const parsed = JSON.parse(content) as { questions?: unknown };

    return postProcessGeneratedQuestions(parsed.questions, input.existingQuestions ?? []).slice(0, desiredCount);
  } catch (error) {
    if (error instanceof LlmRequestTimeoutError) {
      throw error;
    }

    return postProcessGeneratedQuestions(buildFallbackQuestions(input), input.existingQuestions ?? []).slice(
      0,
      desiredCount,
    );
  }
}
