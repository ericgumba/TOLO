import { MAX_FOLLOW_UP_QUESTIONS } from "@/lib/quiz/constants";

type QuizProgressStateInput = {
  attemptsCount: number;
  totalQuestionCount: number;
  followUpCount: number;
};

type QuizProgressState = {
  activeQuestionIndex: number;
  isComplete: boolean;
};

export function getQuizProgressState(input: QuizProgressStateInput): QuizProgressState {
  const cappedQuestionCount = Math.max(1, input.totalQuestionCount);
  const activeQuestionIndex = Math.min(input.attemptsCount, cappedQuestionCount - 1);
  const isComplete =
    input.followUpCount >= MAX_FOLLOW_UP_QUESTIONS && input.attemptsCount >= cappedQuestionCount;

  return {
    activeQuestionIndex,
    isComplete,
  };
}
