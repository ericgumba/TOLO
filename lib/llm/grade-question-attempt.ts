import { fetchWithLlmTimeout, LlmRequestTimeoutError } from "@/lib/llm/request";
import { sanitizeGeneratedQuestionSuggestions } from "@/lib/quiz/generated-questions";

type GradeResult = {
  score: number;
  feedback: string;
  correction: string;
  generatedQuestions: string[];
};

type QuestionContextNode = {
  id: string;
  title: string;
  level: "SUBJECT" | "TOPIC" | "SUBTOPIC";
};

type QuizHistoryItem = {
  question: string;
  answer: string;
};

function clampScore(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 1;
  }
  return Math.max(1, Math.min(100, Math.round(numeric)));
}

function fallbackGrade(question: string, existingQuestions: string[] = []): GradeResult {
  return {
    score: 1,
    feedback: "LLM grading is unavailable.",
    correction: "No correction generated because LLM grading is unavailable.",
    generatedQuestions: sanitizeGeneratedQuestionSuggestions([], question, existingQuestions),
  };
}

export async function gradeQuestionAttempt(
  question: string,
  answer: string,
  context: QuestionContextNode[] = [],
  quizHistory: QuizHistoryItem[] = [],
  existingQuestions: string[] = [],
): Promise<GradeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_GRADING_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return fallbackGrade(question, existingQuestions);
  }

  try {
    const contextText =
      context.length > 0
        ? context.map((node) => `${node.level}: ${node.title}`).join(" > ")
        : "No context provided";
    const historyText =
      quizHistory.length > 0
        ? quizHistory
            .map((item, index) => `${index + 1}. Q: ${item.question}\n   A: ${item.answer}`)
            .join("\n")
        : "No prior Q/A in this quiz yet.";
    const existingQuestionsText =
      existingQuestions.length > 0 ? existingQuestions.map((q, index) => `${index + 1}. ${q}`).join("\n") : "None";

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
              "You are grading a student's free-form answer.\n\n" +
              "Return strict JSON with keys:\n" +
              "- score (integer 1..100)\n" +
              "- feedback\n" +
              "- correction\n" +
              "- generatedQuestions (array of exactly 3 strings)\n\n" +
              "The student's answer does not need to be detailed.\n\n" +
              "Always generate exactly 3 distinct candidate MAIN questions for the same node/topic.\n" +
              "These are not follow-up prompts in a chain. They should each stand alone as future quiz questions.\n\n" +
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
              "Generate 3 candidate MAIN questions for future study that fit this same topic and do not repeat wording or meaning of existing questions.\n\n" +
              "Return JSON only.",
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallbackGrade(question, existingQuestions);
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
      return fallbackGrade(question, existingQuestions);
    }

    const parsed = JSON.parse(content) as {
      score?: unknown;
      feedback?: unknown;
      correction?: unknown;
      generatedQuestions?: unknown;
    };

    return {
      score: clampScore(parsed.score),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Feedback unavailable.",
      correction: typeof parsed.correction === "string" ? parsed.correction : "Correction unavailable.",
      generatedQuestions: sanitizeGeneratedQuestionSuggestions(parsed.generatedQuestions, question, existingQuestions),
    };
  } catch (error) {
    if (error instanceof LlmRequestTimeoutError) {
      throw error;
    }

    return fallbackGrade(question, existingQuestions);
  }
}
