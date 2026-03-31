import Link from "next/link";
import { AnswerCard } from "@/app/components/quiz/answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import { GeneratedQuestionSuggestions } from "@/app/components/quiz/generated-question-suggestions";
import { QuestionCard } from "@/app/components/quiz/question-card";

type QuizBodyProps = {
  questionId: string;
  questionBody: string;
  from: string;
  mode?: string;
  attempts: Array<{
    userAnswer: string;
    llmScore: number;
    llmFeedback: string;
    llmCorrection: string;
    answeredAt: Date;
  }>;
  generatedQuestions: string[];
  activeHints: string[];
};

export function QuizBody({ questionId, questionBody, from, mode, attempts, generatedQuestions, activeHints }: QuizBodyProps) {
  const hasSavedAttempt = attempts.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {attempts.map((attempt, index) => (
        <div key={`${attempt.answeredAt.toISOString()}-${index}`} className="flex flex-col gap-4">
          <QuestionCard
            questionId={questionId}
            questionBody={questionBody}
            from={from}
            mode={mode}
            canReset={index === 0}
          />
          <AnswerCard questionId={questionId} from={from} mode={mode} answer={attempt.userAnswer} editable={false} />
          <FeedbackCard
            feedback={{
              llmScore: attempt.llmScore,
              llmFeedback: attempt.llmFeedback,
              llmCorrection: attempt.llmCorrection,
              answeredAt: attempt.answeredAt,
            }}
          />
        </div>
      ))}

      {hasSavedAttempt ? null : (
        <div className="flex flex-col gap-4">
          <QuestionCard
            questionId={questionId}
            questionBody={questionBody}
            from={from}
            mode={mode}
            canReset={false}
          />
          <AnswerCard
            questionId={questionId}
            from={from}
            mode={mode}
            editable
            hints={activeHints}
          />
          <FeedbackCard feedback={null} />
        </div>
      )}

      {hasSavedAttempt && generatedQuestions.length > 0 ? (
        <GeneratedQuestionSuggestions
          questionId={questionId}
          from={from}
          mode={mode}
          questions={generatedQuestions}
        />
      ) : null}

      <Link href={from} className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
        Next Question
      </Link>
    </div>
  );
}
