import Link from "next/link";

import { GENERATED_QUESTION_SUGGESTION_LABELS } from "@/lib/quiz/constants";

type AttachedGeneratedQuestionsProps = {
  questions: Array<{
    id: string;
    body: string;
  }>;
  returnTo: string;
};

const QUESTION_TYPES = [
  { label: "Explain", description: "Clarify the concept in plain language." },
  { label: "Analyze", description: "Break down mechanism, structure, or cause and effect." },
  { label: "Evaluate", description: "Judge tradeoffs, strengths, limits, or best-fit choices." },
  { label: "Apply", description: "Use the concept in a realistic scenario." },
  { label: "Teach", description: "Explain it simply enough to teach a beginner." },
] as const;

export function AttachedGeneratedQuestions({ questions, returnTo }: AttachedGeneratedQuestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  const typeSections = QUESTION_TYPES.map((type, index) => ({
    ...type,
    question: questions[index] ?? null,
  })).filter((type) => type.question !== null && GENERATED_QUESTION_SUGGESTION_LABELS.includes(type.label));

  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Study Lenses</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {typeSections.map((type) => (
          <Link
            key={type.label}
            href={`/quiz/generated/${type.question.id}?from=${encodeURIComponent(returnTo)}`}
            className="rounded-md border border-slate-200 bg-slate-50 p-3 transition hover:border-slate-300 hover:bg-slate-100"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{type.label}</p>
            <p className="mt-1 text-[11px] text-slate-500">{type.description}</p>
            <p className="mt-2 text-xs text-slate-800">{type.question.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
