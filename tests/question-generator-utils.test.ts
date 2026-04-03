import { describe, expect, it } from "vitest";

import {
  GENERATED_QUESTION_COUNT,
  finalizeGeneratedQuestion,
  postProcessGeneratedQuestions,
} from "@/lib/questions/generation";

describe("question generation utilities", () => {
  it("finalizeGeneratedQuestion trims question text without cutting it off", () => {
    const value = finalizeGeneratedQuestion(`  ${"Why does paging matter? ".repeat(20)}  `);

    expect(value).not.toBeNull();
    expect(value?.startsWith("Why does paging matter?")).toBe(true);
    expect(value).toBe(`${"Why does paging matter? ".repeat(20)}`.trim());
  });

  it("postProcessGeneratedQuestions removes exact and normalized duplicates against existing questions", () => {
    const questions = postProcessGeneratedQuestions(
      [
        "Why does virtualization matter?",
        " Why does virtualization matter? ",
        "How does virtualization improve isolation?",
        "How does virtualization improve isolation?!",
        "What tradeoffs come with virtualization?",
      ],
      ["How does virtualization improve isolation?"],
    );

    expect(questions).toEqual([
      "Why does virtualization matter?",
      "What tradeoffs come with virtualization?",
    ]);
  });

  it("postProcessGeneratedQuestions returns at most three questions", () => {
    const questions = postProcessGeneratedQuestions([
      "Q1?",
      "Q2?",
      "Q3?",
      "Q4?",
      "Q5?",
      "Q6?",
      "Q7?",
    ]);

    expect(questions).toHaveLength(GENERATED_QUESTION_COUNT);
    expect(questions).toEqual(["Q1?", "Q2?", "Q3?"]);
  });
});
