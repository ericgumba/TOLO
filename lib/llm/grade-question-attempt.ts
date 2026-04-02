import { getOpenAiModel } from "@/lib/llm/model";
import { fetchWithLlmTimeout, LlmRequestTimeoutError } from "@/lib/llm/request";
import { type LlmCallResult } from "@/lib/llm/result";
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

export async function gradeQuestionAttempt(
  question: string,
  answer: string,
  context: QuestionContextNode[] = [],
  quizHistory: QuizHistoryItem[] = [],
  existingQuestions: string[] = [],
): Promise<LlmCallResult<GradeResult>> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = getOpenAiModel();

  if (!apiKey) {
    return {
      ok: false,
      reason: "missing_api_key",
    };
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

    const parsed = JSON.parse(content) as {
      score?: unknown;
      feedback?: unknown;
      correction?: unknown;
      generatedQuestions?: unknown;
    };

    if (typeof parsed.feedback !== "string" || parsed.feedback.trim().length === 0) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    if (typeof parsed.correction !== "string" || parsed.correction.trim().length === 0) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      value: {
        score: clampScore(parsed.score),
        feedback: parsed.feedback.trim(),
        correction: parsed.correction.trim(),
        generatedQuestions: sanitizeGeneratedQuestionSuggestions(parsed.generatedQuestions, question, existingQuestions),
      },
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
