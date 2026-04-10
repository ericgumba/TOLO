export type QuizInteractionErrorCode =
  | "attempt_save_failed"
  | "attempt_timeout"
  | "attempt_provider_http_error"
  | "attempt_invalid_response"
  | "attempt_network_error"
  | "hint_generation_failed"
  | "hint_timeout"
  | "hint_provider_http_error"
  | "hint_invalid_response"
  | "hint_network_error"
  | "hint_limit_reached"
  | "llm_daily_limit_reached";

export type QuizSubmissionFeedback = {
  llmScore: number;
  llmFeedback: string;
  llmCorrection: string;
  answeredAtIso: string;
};

export type QuizInteractionState = {
  status: "idle" | "submitted" | "error";
  draftAnswer: string;
  submittedAnswer: string | null;
  feedback: QuizSubmissionFeedback | null;
  suggestedQuestion: string | null;
  activeHints: string[];
  revealedAnswer: string | null;
  generatedQuestions: string[];
  errorCode: QuizInteractionErrorCode | null;
};

export const initialQuizInteractionState: QuizInteractionState = {
  status: "idle",
  draftAnswer: "",
  submittedAnswer: null,
  feedback: null,
  suggestedQuestion: null,
  activeHints: [],
  revealedAnswer: null,
  generatedQuestions: [],
  errorCode: null,
};
