export type LlmCallFailureReason =
  | "missing_api_key"
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
