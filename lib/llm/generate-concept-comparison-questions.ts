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
  other: string | null;
};

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function extractRationale(value: unknown): string | null {
  return typeof value === "string" && collapseWhitespace(value).length > 0 ? collapseWhitespace(value) : null;
}

function parseInteractions(value: unknown): LlmCallResult<CompareGeneratedInteraction[]> {
  if (!Array.isArray(value) || value.length !== COMPARE_INTERACTION_CATEGORIES.length) {
    return {
      ok: false,
      reason: "invalid_response",
    };
  }

  const seen = new Set<CompareInteractionCategory>();
  const interactions: CompareGeneratedInteraction[] = [];

  for (const item of value) {
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
    value: orderedInteractions as CompareGeneratedInteraction[],
  };
}

export async function generateConceptComparisonQuestions(input: {
  sourceConcept: string;
  candidates: CompareCandidate[];
  context?: LlmQuestionContextNode[];
  fixedRelatedConcept?: CompareCandidate;
}): Promise<LlmCallResult<GenerateConceptComparisonQuestionsResult | null>> {
  const contextText = formatContextPath(input.context);
  const candidateText =
    input.candidates.length > 0
      ? input.candidates.map((candidate, index) => `${index + 1}. ${candidate.title}`).join("\n")
      : "None";

  try {
    if (input.fixedRelatedConcept) {
      const response = await requestOpenAiJsonObject<{
        rationale?: unknown;
        interactions?: unknown;
      }>({
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You are generating a fresh set of comparison-study questions for a fixed pair of related concepts.\n\n" +
              "Return strict JSON with exactly these keys:\n" +
              "- rationale (string)\n" +
              "- interactions (array of exactly 6 objects)\n\n" +

  "Interaction object rules:\n" +
  '- category must be one of: "COMPARE", "PART_WHOLE", "DEPENDENCY", "ANALOGY", "TRADEOFF", "MECHANISM_LINK"\n' +
  "- question must be a single self-contained quiz question.\n" +
  "- question must be specific enough that a strong answer can be judged correct or incorrect.\n" +
  "- question must test the relationship between the two concepts, not just one concept in isolation.\n" +
  "- question must avoid vague prompts like 'discuss', 'reflect on', or 'talk about'.\n" +
  "- question must avoid repeating the same core idea across categories.\n" +
  "- Prefer questions that reveal a likely misconception or confusion.\n\n" +

  "Category definitions:\n" +
  "- COMPARE: Ask for a precise distinction in role, behavior, scope, or abstraction level between the two concepts.\n" +
  "- PART_WHOLE: Ask whether one concept is part of, contained within, implemented by, or structurally related to the other.\n" +
  "- DEPENDENCY: Ask whether one concept depends on, presupposes, or commonly builds on the other, including direction of dependence.\n" +
  "- ANALOGY: Provide an analogy for one concept, ask what the corresponding analogy for the other concept would be.\n" +
  "- TRADEOFF: Ask for a decision, cost, benefit, or design tradeoff involving the relationship between the two concepts.\n" +
  "- MECHANISM_LINK: Ask how the two concepts interact causally or step-by-step in a real system.\n\n" +
"Question style rules:\n" +
"- Questions must be short and easy to scan.\n" +
"- Prefer 1 sentence.\n" +
"- Target roughly 8 to 20 words when possible, and rarely exceed 25 words.\n" +
"- Do not include parenthetical examples unless absolutely necessary.\n" +
"- Do not pack multiple subquestions into one question.\n" +
"- Use plain language and natural quiz wording.\n" +
"- Prefer a clean user-facing question over an exhaustive or overly precise one.\n" +
              "- return JSON only.",
          },
          {
            role: "user",
            content:
              `Context path: ${contextText}\n\n` +
              `Source concept: ${input.sourceConcept}\n` +
              `Fixed related concept: ${input.fixedRelatedConcept.title}\n\n` +
              "Generate a fresh set of 6 interaction questions for this exact concept pair.\n" +
              "Return JSON only.",
          },
        ],
      });

      if (!response.ok) {
        return response;
      }

      const parsedInteractions = parseInteractions(response.value.interactions);

      if (!parsedInteractions.ok) {
        return parsedInteractions;
      }

      return {
        ok: true,
        value: {
          relatedConcept: input.fixedRelatedConcept,
          rationale: extractRationale(response.value.rationale),
          interactions: parsedInteractions.value,
          other: null,
        },
      };
    }


    const systemPrompt =
  "You are choosing a genuinely related second concept and generating high-signal quiz questions that test understanding of the relationship between the source concept and the selected concept.\n\n" +
  "Return strict JSON with exactly these keys:\n" +
  "- selectedIndex (integer starting at 1, or null)\n" +
  "- rationale (string)\n" +
  "- interactions (array of exactly 6 objects)\n" +

  "If no candidate has a strong, direct conceptual relationship with the source concept, set selectedIndex to null, rationale to a short explanation, interactions to [], and other to \"\".\n\n" +

  "Selection rules:\n" +
  "- Choose the candidate with the strongest direct conceptual relationship to the source concept.\n" +
  "- Prefer a relationship that supports multiple kinds of reasoning: distinction, structure, dependency, mechanism, and judgment.\n" +
  "- Do not choose a concept that is only loosely associated by subject area.\n" +
  "- Never invent a concept outside the provided candidate list.\n\n" +

  "Interaction object rules:\n" +
  '- category must be one of: "COMPARE", "PART_WHOLE", "DEPENDENCY", "ANALOGY", "TRADEOFF", "MECHANISM_LINK"\n' +
  "- question must be a single self-contained quiz question.\n" +
  "- question must be specific enough that a strong answer can be judged correct or incorrect.\n" +
  "- question must test the relationship between the two concepts, not just one concept in isolation.\n" +
  "- question must avoid vague prompts like 'discuss', 'reflect on', or 'talk about'.\n" +
  "- question must avoid repeating the same core idea across categories.\n" +
  "- Prefer questions that reveal a likely misconception or confusion.\n\n" +

  "Category definitions:\n" +
  "- COMPARE: Ask for a precise distinction in role, behavior, scope, or abstraction level between the two concepts.\n" +
  "- PART_WHOLE: Ask whether one concept is part of, contained within, implemented by, or structurally related to the other.\n" +
  "- DEPENDENCY: Ask whether one concept depends on, presupposes, or commonly builds on the other, including direction of dependence.\n" +
  "- ANALOGY: Ask for a simple analogy that preserves the relationship between the two concepts without distorting it.\n" +
  "- TRADEOFF: Ask for a decision, cost, benefit, or design tradeoff involving the relationship between the two concepts.\n" +
  "- MECHANISM_LINK: Ask how the two concepts interact causally or step-by-step in a real system.\n\n" +

  "Difficulty and learning rules:\n" +
  "- Make the 6 questions collectively progress from simpler relational understanding to deeper reasoning.\n" +
  "- At least 2 questions should require causal, predictive, or decision-making reasoning rather than description only.\n" +
  "- Avoid purely definitional questions unless the distinction itself is the target.\n" +
  "- Use concrete details when helpful, but do not make the question overly long.\n\n" +
  "Return JSON only.";
    const response = await requestOpenAiJsonObject<{
      selectedIndex?: unknown;
      rationale?: unknown;
      interactions?: unknown;
      other?: unknown;
    }>({
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: systemPrompt,
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

    const parsedInteractions = parseInteractions(response.value.interactions);

    if (!parsedInteractions.ok) {
      return parsedInteractions;
    }

    return {
      ok: true,
      value: {
        relatedConcept: input.candidates[selectedIndex - 1]!,
        rationale: extractRationale(response.value.rationale),
        interactions: parsedInteractions.value,
        other:
          typeof response.value.other === "string" && collapseWhitespace(response.value.other).length > 0
            ? collapseWhitespace(response.value.other)
            : null,
      },
    };
  } catch (error) {
    return toLlmFailureResult(error);
  }
}
