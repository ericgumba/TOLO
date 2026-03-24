import Link from "next/link";
import { AnswerCard } from "@/app/components/quiz/answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import { QuestionCard } from "@/app/components/quiz/question-card";

type QuizBodyProps = {
  questionId: string;
  questionBody: string;
  from: string;
  canReset: boolean;
  attempts: Array<{
    userAnswer: string;
    llmScore: number;
    llmFeedback: string;
    llmCorrection: string;
    answeredAt: Date;
  }>;
};
export function QuizBody({ questionId, questionBody, from, canReset, attempts }: QuizBodyProps) {
  const latestAttempt = attempts.length > 0 ? attempts[attempts.length - 1] : null;

  return (
    <div className="flex flex-col gap-6">
      {attempts.map((attempt, index) => (
        <div key={`${attempt.answeredAt.toISOString()}-${index}`} className="flex flex-col gap-4">
          <QuestionCard questionId={questionId} questionBody={questionBody} from={from} canReset={false} />
          <AnswerCard questionId={questionId} from={from} answer={attempt.userAnswer} editable={false} />
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

      <div className="flex flex-col gap-4">
        <QuestionCard questionId={questionId} questionBody={questionBody} from={from} canReset={canReset} />
        <AnswerCard
          questionId={questionId}
          from={from}
          editable
          prompt={latestAttempt ? latestAttempt.llmCorrection : undefined}
        />
        <FeedbackCard feedback={null} />
      </div>

      <Link href={from} className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
        Next Question
      </Link>
    </div>
  );
}
