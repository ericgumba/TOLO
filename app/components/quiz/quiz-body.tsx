import Link from "next/link";

import { AnswerCard } from "@/app/components/quiz/answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import { GeneratedQuestionSuggestions } from "@/app/components/quiz/generated-question-suggestions";
import { QuestionCard } from "@/app/components/quiz/question-card";
import { type QuizSubmissionFeedback } from "@/lib/quiz/session-state";

type QuizBodyProps = {
  questionId: string;
  questionBody: string;
  from: string;
  mode?: string;
  draftAnswer: string;
  activeHints: string[];
  submission: {
    answer: string;
    feedback: QuizSubmissionFeedback;
  } | null;
  generatedQuestions: string[];
  formAction: (formData: FormData) => void;
  onDraftAnswerChange: (nextValue: string) => void;
  onReset: () => void;
  onAddGeneratedQuestion: (question: string) => void | Promise<void>;
  onAddAllGeneratedQuestions: () => void | Promise<void>;
  pendingGeneratedQuestion: string | null;
  addAllPending: boolean;
};

export function QuizBody({
  questionId,
  questionBody,
  from,
  draftAnswer,
  activeHints,
  submission,
  generatedQuestions,
  formAction,
  onDraftAnswerChange,
  onReset,
  onAddGeneratedQuestion,
  onAddAllGeneratedQuestions,
  pendingGeneratedQuestion,
  addAllPending,
}: QuizBodyProps) {
  const hasSubmission = submission !== null;

  return (
    <div className="flex flex-col gap-6">
      {hasSubmission ? (
        <div className="flex flex-col gap-4">
          <QuestionCard questionBody={questionBody} canReset onReset={onReset} />
          <AnswerCard questionId={questionId} from={from} answer={submission.answer} editable={false} />
          <FeedbackCard feedback={submission.feedback} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <QuestionCard questionBody={questionBody} canReset={false} />
          <AnswerCard
            questionId={questionId}
            from={from}
            draftAnswer={draftAnswer}
            editable
            hints={activeHints}
            formAction={formAction}
            onDraftAnswerChange={onDraftAnswerChange}
          />
          <FeedbackCard feedback={null} />
        </div>
      )}

      {hasSubmission && generatedQuestions.length > 0 ? (
        <GeneratedQuestionSuggestions
          questions={generatedQuestions}
          onAdd={onAddGeneratedQuestion}
          onAddAll={onAddAllGeneratedQuestions}
          pendingQuestion={pendingGeneratedQuestion}
          addAllPending={addAllPending}
        />
      ) : null}

      <Link href={from} className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
        Next Question
      </Link>
    </div>
  );
}
