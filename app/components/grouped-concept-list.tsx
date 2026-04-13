import { ConceptListItem } from "@/app/components/concept-list-item";

export type GroupedConcept = {
  id: string;
  nodeId: string;
  title: string;
  score: number | null;
  generatedQuestions: Array<{
    id: string;
    category: "EXPLAIN" | "ANALYZE" | "EVALUATE" | "APPLY" | "TEACH";
    body: string;
    score: number | null;
  }>;
  reviewStates: Array<{ lastAnsweredAt: Date | null; nextReviewAt: Date }>;
};

type GroupedConceptListProps = {
  concepts: GroupedConcept[];
  nodePathById: ReadonlyMap<string, string>;
  fallbackPath: string;
  returnTo: string;
  now: Date;
  emptyMessage: string;
};

export function GroupedConceptList({
  concepts,
  nodePathById,
  fallbackPath,
  returnTo,
  now,
  emptyMessage,
}: GroupedConceptListProps) {
  if (concepts.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>;
  }

  const groupedConcepts = new Map<string, GroupedConcept[]>();

  for (const concept of concepts) {
    const path = nodePathById.get(concept.nodeId) ?? fallbackPath;
    const currentGroup = groupedConcepts.get(path) ?? [];
    currentGroup.push(concept);
    groupedConcepts.set(path, currentGroup);
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {Array.from(groupedConcepts.entries()).map(([path, conceptsAtPath]) => (
        <section key={path} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-800">{path}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {conceptsAtPath.map((concept) => (
              <ConceptListItem
                key={concept.id}
                conceptId={concept.id}
                conceptTitle={concept.title}
                conceptScore={concept.score}
                generatedQuestionScores={concept.generatedQuestions}
                returnTo={returnTo}
                lastAnsweredAt={concept.reviewStates[0]?.lastAnsweredAt ?? null}
                nextReviewAt={concept.reviewStates[0]?.nextReviewAt ?? null}
                now={now}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
