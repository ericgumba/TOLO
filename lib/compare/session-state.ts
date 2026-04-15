import { type CompareInteractionCategory } from "@/lib/compare/prompt";

export type CompareInteractionErrorCode =
  | "compare_save_failed"
  | "compare_timeout"
  | "compare_provider_http_error"
  | "compare_invalid_response"
  | "compare_network_error"
  | "llm_daily_limit_reached";

export type CompareSubmissionFeedback = {
  llmScore: number;
  llmFeedback: string;
  llmCorrection: string;
  answeredAtIso: string;
};

export type CompareGeneratedInteraction = {
  category: CompareInteractionCategory;
  label: string;
  question: string;
};

export type CompareInteractionState = {
  status: "idle" | "submitted" | "error";
  draftAnswer: string;
  submittedAnswer: string | null;
  feedback: CompareSubmissionFeedback | null;
  errorCode: CompareInteractionErrorCode | null;
};

export const initialCompareInteractionState: CompareInteractionState = {
  status: "idle",
  draftAnswer: "",
  submittedAnswer: null,
  feedback: null,
  errorCode: null,
};
