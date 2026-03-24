type GradeResult = {
  score: number;
  feedback: string;
  correction: string;
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
  };
}

export async function gradeQuestionAttempt(question: string, answer: string): Promise<GradeResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_GRADING_MODEL || "gpt-4o-mini";

  console.log("Grading attempt with model", model);

  if (!apiKey) {
    return fallbackGrade();
  }

  try {
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
              "You are grading a student's free-form answer. Return strict JSON with keys: score, feedback, correction. score must be integer 1..100.",
          },
          {
            role: "user",
            content: `Question: ${question}\n\nStudent answer: ${answer}\n\nReturn JSON only.`,
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
    };

    return {
      score: clampScore(parsed.score),
      feedback: typeof parsed.feedback === "string" ? parsed.feedback : "Feedback unavailable.",
      correction: typeof parsed.correction === "string" ? parsed.correction : "Correction unavailable.",
    };
  } catch {
    return fallbackGrade();
  }
}
