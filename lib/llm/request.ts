export const LLM_REQUEST_TIMEOUT_MS = 15000;

export class LlmRequestTimeoutError extends Error {
  constructor(message = "The LLM request timed out.") {
    super(message);
    this.name = "LlmRequestTimeoutError";
  }
}

export async function fetchWithLlmTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = LLM_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new LlmRequestTimeoutError();
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
