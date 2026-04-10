import { GENERATED_QUESTION_SUGGESTION_LABELS } from "@/lib/quiz/constants";

type GeneratedQuestionSuggestionsProps = {
  questions: string[];
};

const QUESTION_TYPES = [
  { label: "Explain", description: "Clarify the concept in plain language." },
  { label: "Analyze", description: "Break down mechanism, structure, or cause and effect." },
  { label: "Evaluate", description: "Judge tradeoffs, strengths, limits, or best-fit choices." },
  { label: "Apply", description: "Use the concept in a realistic scenario." },
  { label: "Teach", description: "Explain it simply enough to teach a beginner." },
] as const;

export function GeneratedQuestionSuggestions({ questions }: GeneratedQuestionSuggestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  const typeSections = QUESTION_TYPES.map((type, index) => ({
    ...type,
    question: questions[index] ?? null,
  })).filter((type) => type.question !== null && GENERATED_QUESTION_SUGGESTION_LABELS.includes(type.label));

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Generated Questions</p>
          <p className="mt-2 text-sm text-slate-700">
            These study questions are now attached to the original question and reused on future submissions.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          {typeSections.map((type) => (
            <section key={type.label} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{type.label}</p>
                <p className="mt-1 text-sm text-slate-600">{type.description}</p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-900">{type.question}</p>
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
