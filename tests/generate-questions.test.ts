import { beforeEach, describe, expect, it, vi } from "vitest";

import { generateQuestionsForNode } from "@/lib/llm/generate-questions";
import { GENERATED_QUESTION_COUNT } from "@/lib/quiz/constants";

describe("generateQuestionsForNode", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests three tiered questions and normalizes the response", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questions: [
                    "  What is a process?  ",
                    "Which part of a process's state changes when the scheduler starts running it on the CPU?",
                    `Why must the OS save a process's state during a context switch? ${"x".repeat(400)}`,
                    "What is a process?",
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

    const result = await generateQuestionsForNode({
      targetLabel: "Operating Systems : Processes",
      nodeLevel: "TOPIC",
      existingQuestions: ["What is a thread?"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected success result.");
    }

    expect(result.value).toHaveLength(GENERATED_QUESTION_COUNT);
    expect(result.value).toEqual([
      "What is a process?",
      "Which part of a process's state changes when the scheduler starts running it on the CPU?",
      `Why must the OS save a process's state during a context switch? ${"x".repeat(400)}`,
    ]);

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    const systemPrompt = requestBody.messages[0]?.content ?? "";
    const userPrompt = requestBody.messages[1]?.content ?? "";

    expect(systemPrompt).toContain("exactly 3 distinct questions");
    expect(systemPrompt).toContain("Order them as easy, medium, hard");
    expect(systemPrompt).toContain("Each question must stand alone as a future quiz question");
    expect(systemPrompt).toContain("Do not use transitional wording like 'Building on that'");
    expect(systemPrompt).toContain("The medium question should deepen the same concept without depending on pronouns or prior wording");
    expect(systemPrompt).toContain("The hard question should deepen the same concept further while remaining fully self-contained");
    expect(userPrompt).toContain("Generate 3 candidate quiz questions");
    expect(userPrompt).toContain("Return them in order: easy, medium, hard");
  });
});
