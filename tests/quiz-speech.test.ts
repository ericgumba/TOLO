import { describe, expect, it } from "vitest";

import { appendSpeechTranscript } from "@/lib/quiz/speech";

describe("appendSpeechTranscript", () => {
  it("returns the normalized transcript when the answer is empty", () => {
    expect(appendSpeechTranscript("", "  TCP uses acknowledgments   ")).toBe("TCP uses acknowledgments");
  });

  it("appends the transcript with a separating space when needed", () => {
    expect(appendSpeechTranscript("TCP detects loss", "using duplicate ACKs")).toBe(
      "TCP detects loss using duplicate ACKs",
    );
  });

  it("does not add an extra separator when the answer already ends with whitespace", () => {
    expect(appendSpeechTranscript("TCP detects loss\n", "using timeouts")).toBe(
      "TCP detects loss\nusing timeouts",
    );
  });

  it("ignores empty transcript chunks", () => {
    expect(appendSpeechTranscript("Existing answer", "   ")).toBe("Existing answer");
  });
});
