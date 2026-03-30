import { fetchWithLlmTimeout, LlmRequestTimeoutError } from "@/lib/llm/request";

type GradeResult = {
  score: number;
  feedback: string;
  correction: string;
  followupQuestion: string;
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

function fallbackGrade(): GradeResult {
  return {
    score: 1,
    feedback: "LLM grading is unavailable.",
    correction: "No correction generated because LLM grading is unavailable.",
    followupQuestion: "What key concept from this question is your answer missing?",
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

  console.log("Grading attempt with model", model);
  console.log("QuizHistory", quizHistory);

  if (!apiKey) {
    return fallbackGrade();
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
              "- followupQuestion\n\n" +
              "The student's answer does not need to be detailed.\n\n" +
              "If the answer is incomplete or incorrect:\n" +
              "- Provide constructive feedback and a correction\n" +
              "- Generate a guiding follow-up question that helps the student reach the correct understanding\n\n" +
              "If the answer is mostly correct:\n" +
              "- Generate a deeper follow-up question that expands understanding\n\n" +
              "The follow-up question must be ONE of:\n" +
              "- a \"why\" question (causal understanding)\n" +
              "- a \"how\" question (mechanism)\n" +
              "- a scenario-based question (application)\n" +
              "- a comparison/tradeoff question\n\n" +
              "Avoid generic questions. The question should require thinking, not recall.",
          },
          {
            role: "user",
            content:
              `Context path: ${contextText}\n\n` +
              `Prior quiz Q/A:\n${historyText}\n\n` +
              `Already asked questions:\n${existingQuestionsText}\n\n` +
              `Question: ${question}\n\n` +
              `Student answer: ${answer}\n\n` +
              "Generate a new follow-up question that asks about a missing concept and does not repeat wording or meaning of already asked questions.\n\n" +
              "Return JSON only.",
          },
        ],
      }),
    });

    if (!response.ok) {
      return fallbackGrade();
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
      return fallbackGrade();
    }

    const parsed = JSON.parse(content) as {
      score?: unknown;
      feedback?: unknown;
      correction?: unknown;
      followupQuestion?: unknown;
    };

    return {
      score: clampScore(parsed.score),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Feedback unavailable.",
      correction: typeof parsed.correction === "string" ? parsed.correction : "Correction unavailable.",
      followupQuestion:
        typeof parsed.followupQuestion === "string" && parsed.followupQuestion.trim().length > 0
          ? parsed.followupQuestion.trim()
          : "Can you explain the key concept your answer is still missing?",
    };
  } catch (error) {
    if (error instanceof LlmRequestTimeoutError) {
      throw error;
    }

    return fallbackGrade();
  }
}
