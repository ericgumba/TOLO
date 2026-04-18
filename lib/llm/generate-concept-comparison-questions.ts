import { requestOpenAiJsonObject, toLlmFailureResult } from "@/lib/llm/openai";
import { formatContextPath, type LlmQuestionContextNode } from "@/lib/llm/prompt-formatting";
import { type CompareGeneratedInteraction } from "@/lib/compare/session-state";
import {
  COMPARE_INTERACTION_CATEGORIES,
  COMPARE_INTERACTION_LABELS,
  type CompareInteractionCategory,
} from "@/lib/compare/prompt";
import { type LlmCallResult } from "@/lib/llm/result";

type CompareCandidate = {
  id: string;
  title: string;
};

type GenerateConceptComparisonQuestionsResult = {
  relatedConcept: CompareCandidate;
  rationale: string | null;
  interactions: CompareGeneratedInteraction[];
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export async function generateConceptComparisonQuestions(input: {
  sourceConcept: string;
  candidates: CompareCandidate[];
  context?: LlmQuestionContextNode[];
}): Promise<LlmCallResult<GenerateConceptComparisonQuestionsResult | null>> {
  const contextText = formatContextPath(input.context);
  const candidateText =
    input.candidates.length > 0
      ? input.candidates.map((candidate, index) => `${index + 1}. ${candidate.title}`).join("\n")
      : "None";

  try {
    const response = await requestOpenAiJsonObject<{
      selectedIndex?: unknown;
      rationale?: unknown;
      interactions?: unknown;
    }>({
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are choosing a genuinely related second concept and generating comparison-study questions.\n\n" +
            "Return strict JSON with exactly these keys:\n" +
            "- selectedIndex (integer starting at 1, or null)\n" +
            "- rationale (string)\n" +
            "- interactions (array of exactly 6 objects)\n\n" +
            "Interaction object rules:\n" +
            '- category must be one of: "COMPARE", "PART_WHOLE", "DEPENDENCY", "ANALOGY", "TRADEOFF", "MECHANISM_LINK"\n' +
            "- question must be a concise, specific quiz question for that category.\n\n" +
            "Selection rules:\n" +
            "- Choose a second concept only if there is a real conceptual relationship with the source concept.\n" +
            "- Prefer relationships that are strong enough to support all 6 interaction categories.\n" +
            "- If no candidate has a strong enough relationship, selectedIndex must be null and interactions must be an empty array.\n" +
            "- Never invent a concept outside the provided candidate list.\n\n" +
            "Question rules:\n" +
            "- Questions must be fully self-contained.\n" +
            "- Questions must mention both concepts when clarity requires it.\n" +
            "- Each category must use a different style of relational reasoning.\n" +
            "- Avoid generic questions and avoid repeating the same idea across categories.\n" +
            "- Return JSON only.",
        },
        {
          role: "user",
          content:
            `Context path: ${contextText}\n\n` +
            `Source concept: ${input.sourceConcept}\n\n` +
            `Candidate related concepts:\n${candidateText}\n\n` +
            "Return JSON only.",
        },
      ],
    });

    if (!response.ok) {
      return response;
    }

    if (response.value.selectedIndex === null) {
      return {
        ok: true,
        value: null,
      };
    }

    const selectedIndex =
      typeof response.value.selectedIndex === "number" ? Math.trunc(response.value.selectedIndex) : Number(response.value.selectedIndex);

    if (!Number.isInteger(selectedIndex) || selectedIndex < 1 || selectedIndex > input.candidates.length) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    if (!Array.isArray(response.value.interactions) || response.value.interactions.length !== COMPARE_INTERACTION_CATEGORIES.length) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    const seen = new Set<CompareInteractionCategory>();
    const interactions: CompareGeneratedInteraction[] = [];

    for (const item of response.value.interactions) {
      if (!item || typeof item !== "object") {
        return {
          ok: false,
          reason: "invalid_response",
        };
      }

      const category = "category" in item ? item.category : undefined;
      const question = "question" in item ? item.question : undefined;

      if (typeof category !== "string" || !COMPARE_INTERACTION_CATEGORIES.includes(category as CompareInteractionCategory)) {
        return {
          ok: false,
          reason: "invalid_response",
        };
      }

      if (seen.has(category as CompareInteractionCategory)) {
        return {
          ok: false,
          reason: "invalid_response",
        };
      }

      if (typeof question !== "string" || collapseWhitespace(question).length === 0) {
        return {
          ok: false,
          reason: "invalid_response",
        };
      }

      seen.add(category as CompareInteractionCategory);
      interactions.push({
        category: category as CompareInteractionCategory,
        label: COMPARE_INTERACTION_LABELS[category as CompareInteractionCategory],
        question: collapseWhitespace(question),
      });
    }

    const orderedInteractions = COMPARE_INTERACTION_CATEGORIES.map((category) =>
      interactions.find((interaction) => interaction.category === category),
    );

    if (orderedInteractions.some((interaction) => !interaction)) {
      return {
        ok: false,
        reason: "invalid_response",
      };
    }

    return {
      ok: true,
      value: {
        relatedConcept: input.candidates[selectedIndex - 1]!,
        rationale:
          typeof response.value.rationale === "string" && collapseWhitespace(response.value.rationale).length > 0
            ? collapseWhitespace(response.value.rationale)
            : null,
        interactions: orderedInteractions as CompareGeneratedInteraction[],
      },
    };
  } catch (error) {
    return toLlmFailureResult(error);
  }
}
