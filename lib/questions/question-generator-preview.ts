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
      questionId: string;
    }
  | {
      status: "duplicate";
    }
  | {
      status: "error";
      error: string;
    };

export type RemoveGeneratedQuestionResult =
  | {
      status: "success";
    }
  | {
      status: "not_found";
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
