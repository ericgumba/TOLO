import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gradeQuestionAttempt } from "@/lib/llm/grade-question-attempt";
import { GENERATED_QUESTION_SUGGESTION_COUNT, MAX_GENERATED_QUESTION_LENGTH } from "@/lib/quiz/constants";

describe("gradeQuestionAttempt", () => {
  const originalApiKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }

    vi.unstubAllGlobals();
  });

  it("returns deterministic fallback suggestions when grading is unavailable", async () => {
    delete process.env.OPENAI_API_KEY;

    const result = await gradeQuestionAttempt("What is photosynthesis?", "It makes energy.");

    expect(result.score).toBe(1);
    expect(result.generatedQuestions).toHaveLength(GENERATED_QUESTION_SUGGESTION_COUNT);
    expect(new Set(result.generatedQuestions).size).toBe(GENERATED_QUESTION_SUGGESTION_COUNT);
    expect(result.generatedQuestions.every((question) => question.length > 0)).toBe(true);
  });

  it("normalizes, deduplicates, and backfills generated MAIN-question suggestions", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    score: 88,
                    feedback: "Solid answer.",
                    correction: "Tighten the mechanism.",
                    generatedQuestions: [
                      "  Why is photosynthesis essential to ecosystems?  ",
                      "Why is photosynthesis essential to ecosystems?",
                      "",
                      `How does photosynthesis affect the carbon cycle? ${"x".repeat(400)}`,
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ) as typeof fetch,
    );

    const result = await gradeQuestionAttempt("What is photosynthesis?", "It converts light into chemical energy.");

    expect(result.score).toBe(88);
    expect(result.generatedQuestions).toHaveLength(GENERATED_QUESTION_SUGGESTION_COUNT);
    expect(result.generatedQuestions[0]).toBe("Why is photosynthesis essential to ecosystems?");
    expect(new Set(result.generatedQuestions.map((question) => question.toLowerCase())).size).toBe(
      GENERATED_QUESTION_SUGGESTION_COUNT,
    );
    expect(result.generatedQuestions.every((question) => question.length <= MAX_GENERATED_QUESTION_LENGTH)).toBe(true);
  });
});
