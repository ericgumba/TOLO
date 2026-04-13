import Link from "next/link";

import { AnswerCard } from "@/app/components/quiz/answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import { GeneratedQuestionSuggestions } from "@/app/components/quiz/generated-question-suggestions";
import { QuestionCard } from "@/app/components/quiz/question-card";
import { RelatedConceptCard } from "@/app/components/quiz/related-concept-card";
import { type QuizGeneratedQuestionLink, type QuizSubmissionFeedback } from "@/lib/quiz/session-state";

type QuizBodyProps = {
  promptId: string;
  questionKind?: "main" | "generated";
  promptLabel?: "Concept" | "Question";
  promptBody: string;
  from: string;
  draftAnswer: string;
  activeHints: string[];
  revealedAnswer: string | null;
  submission: {
    answer: string;
    feedback: QuizSubmissionFeedback;
  } | null;
  relatedConcept: string | null;
  relatedConceptStatus: "idle" | "adding" | "added" | "duplicate" | "error";
  generatedQuestions: QuizGeneratedQuestionLink[];
  formAction: (formData: FormData) => void;
  onDraftAnswerChange: (nextValue: string) => void;
  onReset: () => void;
  onAddRelatedConcept: () => void | Promise<void>;
};

export function QuizBody({
  promptId,
  questionKind = "main",
  promptLabel = questionKind === "generated" ? "Question" : "Concept",
  promptBody,
  from,
  draftAnswer,
  activeHints,
  revealedAnswer,
  submission,
  relatedConcept,
  relatedConceptStatus,
  generatedQuestions,
  formAction,
  onDraftAnswerChange,
  onReset,
  onAddRelatedConcept,
}: QuizBodyProps) {
  const hasSubmission = submission !== null;

  return (
    <div className="flex flex-col gap-6">
      {hasSubmission ? (
        <div className="flex flex-col gap-4">
          <QuestionCard label={promptLabel} promptBody={promptBody} canReset onReset={onReset} />
          <AnswerCard promptId={promptId} questionKind={questionKind} from={from} answer={submission.answer} editable={false} />
          <FeedbackCard feedback={submission.feedback} />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <QuestionCard label={promptLabel} promptBody={promptBody} canReset={false} />
          <AnswerCard
            promptId={promptId}
            questionKind={questionKind}
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
        <GeneratedQuestionSuggestions questions={generatedQuestions} returnTo={from} />
      ) : null}

      {hasSubmission && relatedConcept ? (
        <RelatedConceptCard
          concept={relatedConcept}
          label="Related Concept"
          helperText="This is a related concept you can add to the current node for future study."
          actionLabel="Add concept to node"
          duplicateMessage="This concept already exists on the current node."
          errorMessage="Could not add this concept right now. Please retry."
          status={relatedConceptStatus}
          onAdd={onAddRelatedConcept}
        />
      ) : null}

      <Link href={from} className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
        Next Question
      </Link>
    </div>
  );
}
