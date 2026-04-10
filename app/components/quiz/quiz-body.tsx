import Link from "next/link";

import { AnswerCard } from "@/app/components/quiz/answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import { GeneratedQuestionSuggestions } from "@/app/components/quiz/generated-question-suggestions";
import { QuestionCard } from "@/app/components/quiz/question-card";
import { SuggestedQuestionCard } from "@/app/components/quiz/suggested-question-card";
import { type QuizSubmissionFeedback } from "@/lib/quiz/session-state";

type QuizBodyProps = {
  questionId: string;
  questionBody: string;
  from: string;
  draftAnswer: string;
  activeHints: string[];
  revealedAnswer: string | null;
  submission: {
    answer: string;
    feedback: QuizSubmissionFeedback;
  } | null;
  suggestedQuestion: string | null;
  suggestedQuestionStatus: "idle" | "adding" | "added" | "duplicate" | "error";
  generatedQuestions: string[];
  formAction: (formData: FormData) => void;
  onDraftAnswerChange: (nextValue: string) => void;
  onReset: () => void;
  onAddSuggestedQuestion: () => void | Promise<void>;
};

export function QuizBody({
  questionId,
  questionBody,
  from,
  draftAnswer,
  activeHints,
  revealedAnswer,
  submission,
  suggestedQuestion,
  suggestedQuestionStatus,
  generatedQuestions,
  formAction,
  onDraftAnswerChange,
  onReset,
  onAddSuggestedQuestion,
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
        <GeneratedQuestionSuggestions questions={generatedQuestions} />
      ) : null}

      {hasSubmission && suggestedQuestion ? (
        <SuggestedQuestionCard
          question={suggestedQuestion}
          status={suggestedQuestionStatus}
          onAdd={onAddSuggestedQuestion}
        />
      ) : null}

      <Link href={from} className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
        Next Question
      </Link>
    </div>
  );
}
