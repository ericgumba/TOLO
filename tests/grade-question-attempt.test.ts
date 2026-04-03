import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gradeQuestionAttempt } from "@/lib/llm/grade-question-attempt";
import { GENERATED_QUESTION_SUGGESTION_COUNT } from "@/lib/quiz/constants";

describe("gradeQuestionAttempt", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes, deduplicates, and backfills generated question suggestions", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
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
                    "What inputs and outputs define photosynthesis?",
                    "In which cell structure does photosynthesis primarily occur?",
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    vi.stubGlobal("fetch", fetchMock);

    const result = await gradeQuestionAttempt("What is photosynthesis?", "It converts light into chemical energy.");

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected success result.");
    }

    expect(result.value.score).toBe(88);
    expect(result.value.generatedQuestions).toHaveLength(GENERATED_QUESTION_SUGGESTION_COUNT);
    expect(result.value.generatedQuestions[0]).toBe("Why is photosynthesis essential to ecosystems?");
    expect(result.value.generatedQuestions[1]).toBe(`How does photosynthesis affect the carbon cycle? ${"x".repeat(400)}`);
    expect(result.value.generatedQuestions[2]).toBe("What inputs and outputs define photosynthesis?");
    expect(new Set(result.value.generatedQuestions.map((question) => question.toLowerCase())).size).toBe(
      GENERATED_QUESTION_SUGGESTION_COUNT,
    );

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    const systemPrompt = requestBody.messages[0]?.content ?? "";
    expect(systemPrompt).toContain("diagnosis (string: the single most important missing, misunderstood, or vague concept)");
    expect(systemPrompt).toContain("Anchor all questions to the diagnosis or an immediately related prerequisite concept");
    expect(systemPrompt).toContain("Order generatedQuestions as easy, medium, and hard");
    expect(systemPrompt).toContain("Do not use transitional wording like 'Building on that'");
    expect(systemPrompt).toContain("The medium question should deepen the same concept while remaining fully self-contained");
  });
});
