import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { generateConceptComparisonQuestions } from "@/lib/llm/generate-concept-comparison-questions";

describe("generateConceptComparisonQuestions", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("selects a related concept and returns all interaction categories", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  selectedIndex: 2,
                  rationale: "Threads are a strong related concept because they exist within processes and support multiple relational question types.",
                  interactions: [
                    { category: "COMPARE", question: "Compare a process and a thread in terms of isolation, scheduling, and resource ownership." },
                    { category: "PART_WHOLE", question: "In what sense is a thread part of a process, and what still belongs to the process as a whole?" },
                    { category: "DEPENDENCY", question: "Why is understanding processes a prerequisite for understanding threads?" },
                    { category: "ANALOGY", question: "Create an analogy that explains the relationship between a process and a thread without losing the technical distinction." },
                    { category: "TRADEOFF", question: "What tradeoffs arise when choosing multiple threads inside one process instead of multiple separate processes?" },
                    { category: "MECHANISM_LINK", question: "What mechanism links thread scheduling to the process that owns the thread?" },
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

    const result = await generateConceptComparisonQuestions({
      sourceConcept: "process",
      candidates: [
        { id: "concept-1", title: "virtual memory" },
        { id: "concept-2", title: "thread" },
      ],
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

    expect(result.value?.relatedConcept).toEqual({
      id: "concept-2",
      title: "thread",
    });
    expect(result.value?.interactions.map((interaction) => interaction.category)).toEqual([
      "COMPARE",
      "PART_WHOLE",
      "DEPENDENCY",
      "ANALOGY",
      "TRADEOFF",
      "MECHANISM_LINK",
    ]);
  });

  it("returns null when the LLM decides no candidate has a strong enough relationship", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  selectedIndex: null,
                  rationale: "No candidate has a strong enough relationship.",
                  interactions: [],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ),
    ) as typeof fetch;

    vi.stubGlobal("fetch", fetchMock);

    const result = await generateConceptComparisonQuestions({
      sourceConcept: "process",
      candidates: [{ id: "concept-1", title: "checksum" }],
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

    expect(result.value).toBeNull();
  });
});
