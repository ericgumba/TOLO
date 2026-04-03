export type LlmCallFailureReason =
  | "timeout"
  | "http_error"
  | "invalid_response"
  | "network_error";

export type LlmCallResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      reason: LlmCallFailureReason;
    };
