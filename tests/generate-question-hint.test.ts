import { describe, expect, it } from "vitest";

import { getHintLevelInstruction } from "@/lib/llm/generate-question-hint";

describe("getHintLevelInstruction", () => {
  it("returns progressive hint guidance for level 1..3", () => {
    expect(getHintLevelInstruction(1)).toContain("subtle");
    expect(getHintLevelInstruction(2)).toContain("clearer");
    expect(getHintLevelInstruction(3)).toContain("strong");
  });
});
