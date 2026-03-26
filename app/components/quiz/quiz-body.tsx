import Link from "next/link";
import { AnswerCard } from "@/app/components/quiz/answer-card";
import { FeedbackCard } from "@/app/components/quiz/feedback-card";
import { QuestionCard } from "@/app/components/quiz/question-card";

type QuizBodyProps = {
  questionId: string;
  questionBody: string;
  from: string;
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
};
export function QuizBody({ questionId, questionBody, from, attempts, followUpQuestions }: QuizBodyProps) {
  const segmentQuestionBodies = [questionBody, ...followUpQuestions.map((question) => question.body)];
  const activeQuestionBody = segmentQuestionBodies[attempts.length] ?? questionBody;

  return (
    <div className="flex flex-col gap-6">
      {attempts.map((attempt, index) => (
        <div key={`${attempt.answeredAt.toISOString()}-${index}`} className="flex flex-col gap-4">
          <QuestionCard
            questionId={questionId}
            questionBody={segmentQuestionBodies[index] ?? questionBody}
            from={from}
            canReset={index === 0}
          />
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
        <QuestionCard questionId={questionId} questionBody={activeQuestionBody} from={from} canReset={false} />
        <AnswerCard
          questionId={questionId}
          from={from}
          editable
        />
        <FeedbackCard feedback={null} />
      </div>

      <Link href={from} className="self-start rounded-md border border-zinc-300 px-4 py-2 text-sm hover:bg-zinc-100">
        Next Question
      </Link>
    </div>
  );
}
