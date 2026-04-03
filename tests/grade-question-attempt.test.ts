import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gradeQuestionAttempt } from "@/lib/llm/grade-question-attempt";
import { GENERATED_QUESTION_SUGGESTION_COUNT, MAX_GENERATED_QUESTION_LENGTH } from "@/lib/quiz/constants";

describe("gradeQuestionAttempt", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes, deduplicates, and backfills generated question suggestions", async () => {
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

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected success result.");
    }

    expect(result.value.score).toBe(88);
    expect(result.value.generatedQuestions).toHaveLength(GENERATED_QUESTION_SUGGESTION_COUNT);
    expect(result.value.generatedQuestions[0]).toBe("Why is photosynthesis essential to ecosystems?");
    expect(new Set(result.value.generatedQuestions.map((question) => question.toLowerCase())).size).toBe(
      GENERATED_QUESTION_SUGGESTION_COUNT,
    );
    expect(result.value.generatedQuestions.every((question) => question.length <= MAX_GENERATED_QUESTION_LENGTH)).toBe(
      true,
    );
  });
});
