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

      console.log("ERICGUMBA WTF ", existingQuestionsText);
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
              "You are grading a student's free-form answer. Return strict JSON with keys: score, feedback, correction, followupQuestion. score must be integer 1..100. followupQuestion must be one concise question and must not duplicate prior questions.",
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
  } catch {
    return fallbackGrade();
  }
}
