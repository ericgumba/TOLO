import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gradeConceptComparison } from "@/lib/llm/grade-concept-comparison";

describe("gradeConceptComparison", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns grading feedback for a compare answer", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: 84,
                  feedback: "You identified the shared execution context, but you did not clearly separate the unit of scheduling from the unit of resource ownership.",
                  correction: "A process is the resource-owning execution environment, while a thread is a schedulable execution path inside a process. Threads share the process memory and resources, but processes are isolated from each other.",
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    vi.stubGlobal("fetch", fetchMock);

    const result = await gradeConceptComparison({
      sourceConcept: "process",
      targetConcept: "thread",
      prompt: "Compare process and thread. Explain how they are related, how they differ, and when each one matters.",
      answer: "A process owns resources and threads run inside it.",
      context: [
        {
          id: "subject-1",
          title: "Operating Systems",
          level: "SUBJECT",
        },
      ],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error("Expected success result.");
    }

    expect(result.value.score).toBe(84);
    expect(result.value.feedback).toContain("shared execution context");
    expect(result.value.correction).toContain("A process is the resource-owning execution environment");

    const requestBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      messages: Array<{ role: string; content: string }>;
    };
    const systemPrompt = requestBody.messages[0]?.content ?? "";
    expect(systemPrompt).toContain("You are grading a student's comparison of two concepts.");
    expect(systemPrompt).toContain("- score (integer 1..100)");
    expect(systemPrompt).toContain("- correction must give a concise, accurate comparison in 2 to 4 sentences.");
  });
});
