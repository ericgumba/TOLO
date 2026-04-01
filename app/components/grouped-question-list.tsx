import { QuestionListItem } from "@/app/components/question-list-item";

export type GroupedQuestion = {
  id: string;
  nodeId: string;
  body: string;
  attempts: Array<{ answeredAt: Date }>;
  reviewStates: Array<{ nextReviewAt: Date }>;
};

type GroupedQuestionListProps = {
  questions: GroupedQuestion[];
  nodePathById: ReadonlyMap<string, string>;
  fallbackPath: string;
  returnTo: string;
  now: Date;
  emptyMessage: string;
};

export function GroupedQuestionList({
  questions,
  nodePathById,
  fallbackPath,
  returnTo,
  now,
  emptyMessage,
}: GroupedQuestionListProps) {
  if (questions.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">{emptyMessage}</p>;
  }

  const groupedQuestions = new Map<string, GroupedQuestion[]>();

  for (const question of questions) {
    const path = nodePathById.get(question.nodeId) ?? fallbackPath;
    const currentGroup = groupedQuestions.get(path) ?? [];
    currentGroup.push(question);
    groupedQuestions.set(path, currentGroup);
  }

  return (
    <div className="mt-3 flex flex-col gap-4">
      {Array.from(groupedQuestions.entries()).map(([path, questionsAtPath]) => (
        <section key={path} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <h3 className="text-sm font-semibold text-slate-800">{path}</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {questionsAtPath.map((question) => (
              <QuestionListItem
                key={question.id}
                questionId={question.id}
                questionBody={question.body}
                returnTo={returnTo}
                lastAnsweredAt={question.attempts[0]?.answeredAt ?? null}
                nextReviewAt={question.reviewStates[0]?.nextReviewAt ?? null}
                now={now}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
