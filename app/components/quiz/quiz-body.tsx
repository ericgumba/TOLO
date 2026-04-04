import Link from "next/link";

import { AnswerCard } from "@/app/components/quiz/answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import {
  GeneratedQuestionSuggestions,
  type GeneratedQuestionSuggestionStatus,
} from "@/app/components/quiz/generated-question-suggestions";
import { QuestionCard } from "@/app/components/quiz/question-card";
import { type QuizSubmissionFeedback } from "@/lib/quiz/session-state";

type QuizBodyProps = {
  questionId: string;
  questionBody: string;
  from: string;
  mode?: string;
  draftAnswer: string;
  activeHints: string[];
  revealedAnswer: string | null;
  submission: {
    answer: string;
    feedback: QuizSubmissionFeedback;
  } | null;
  generatedQuestions: string[];
  generatedQuestionStatuses: Record<string, GeneratedQuestionSuggestionStatus | undefined>;
  formAction: (formData: FormData) => void;
  onDraftAnswerChange: (nextValue: string) => void;
  onReset: () => void;
  onAddGeneratedQuestion: (question: string) => void | Promise<void>;
  onRemoveGeneratedQuestion: (question: string) => void | Promise<void>;
  onAddAllGeneratedQuestions: () => void | Promise<void>;
  pendingGeneratedQuestion: string | null;
  pendingGeneratedQuestionAction: "add" | "remove" | null;
  addAllPending: boolean;
};

export function QuizBody({
  questionId,
  questionBody,
  from,
  draftAnswer,
  activeHints,
  revealedAnswer,
  submission,
  generatedQuestions,
  generatedQuestionStatuses,
  formAction,
  onDraftAnswerChange,
  onReset,
  onAddGeneratedQuestion,
  onRemoveGeneratedQuestion,
  onAddAllGeneratedQuestions,
  pendingGeneratedQuestion,
  pendingGeneratedQuestionAction,
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
            revealedAnswer={revealedAnswer}
            formAction={formAction}
            onDraftAnswerChange={onDraftAnswerChange}
          />
          <FeedbackCard feedback={null} />
        </div>
      )}

      {hasSubmission && generatedQuestions.length > 0 ? (
        <GeneratedQuestionSuggestions
          questions={generatedQuestions}
          questionStatuses={generatedQuestionStatuses}
          onAdd={onAddGeneratedQuestion}
          onRemove={onRemoveGeneratedQuestion}
          onAddAll={onAddAllGeneratedQuestions}
          pendingQuestion={pendingGeneratedQuestion}
          pendingQuestionAction={pendingGeneratedQuestionAction}
          addAllPending={addAllPending}
        />
      ) : null}

      <Link href={from} className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
        Next Question
      </Link>
    </div>
  );
}
