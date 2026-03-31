export type GeneratedQuestionPreviewItem = {
  id: string;
  body: string;
};

export type GeneratedQuestionPreviewState = {
  status: "idle" | "success" | "error";
  targetLabel: string;
  generatedQuestions: GeneratedQuestionPreviewItem[];
  message?: string;
  error?: string;
};

export type AddGeneratedQuestionResult =
  | {
      status: "success";
    }
  | {
      status: "error";
      error: string;
    };

export const initialGeneratedQuestionPreviewState: GeneratedQuestionPreviewState = {
  status: "idle",
  targetLabel: "",
  generatedQuestions: [],
};
