import Link from "next/link";
import { AnswerCard } from "@/app/components/quiz/answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import { QuestionCard } from "@/app/components/quiz/question-card";
import { getQuizProgressState } from "@/lib/quiz/progression";

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
  followUpQuestions: Array<{
    id: string;
    body: string;
    createdAt: Date;
  }>;
  activeHints: string[];
};
export function QuizBody({ questionId, questionBody, from, mode, attempts, followUpQuestions, activeHints }: QuizBodyProps) {
  const segmentQuestionBodies = [questionBody, ...followUpQuestions.map((question) => question.body)];
  const progressState = getQuizProgressState({
    attemptsCount: attempts.length,
    totalQuestionCount: segmentQuestionBodies.length,
    followUpCount: followUpQuestions.length,
  });
  const activeQuestionBody = segmentQuestionBodies[progressState.activeQuestionIndex] ?? questionBody;

  return (
    <div className="flex flex-col gap-6">
      {attempts.map((attempt, index) => (
        <div key={`${attempt.answeredAt.toISOString()}-${index}`} className="flex flex-col gap-4">
          <QuestionCard
            questionId={questionId}
            questionBody={segmentQuestionBodies[index] ?? questionBody}
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

      {progressState.isComplete ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
          <p className="font-semibold">Quiz complete</p>
        </section>
      ) : (
        <div className="flex flex-col gap-4">
          <QuestionCard
            questionId={questionId}
            questionBody={activeQuestionBody}
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

      <Link href={from} className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
        Next Question
      </Link>
    </div>
  );
}
