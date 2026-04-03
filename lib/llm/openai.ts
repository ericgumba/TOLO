import { fetchWithLlmTimeout, LlmRequestTimeoutError } from "@/lib/llm/request";
import { type LlmCallResult } from "@/lib/llm/result";

type OpenAiChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenAiChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

type RequestOpenAiJsonObjectInput = {
  temperature: number;
  messages: OpenAiChatMessage[];
};

export function toLlmFailureResult<T>(error: unknown): LlmCallResult<T> {
  if (error instanceof LlmRequestTimeoutError) {
    return {
      ok: false,
      reason: "timeout",
    };
  }

  return {
    ok: false,
    reason: "network_error",
  };
}

export async function requestOpenAiJsonObject<T>(
  input: RequestOpenAiJsonObjectInput,
): Promise<LlmCallResult<T>> {
  const response = await fetchWithLlmTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL,
      temperature: input.temperature,
      response_format: { type: "json_object" },
      messages: input.messages,
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      reason: "http_error",
    };
  }

  const payload = (await response.json()) as OpenAiChatCompletionResponse;
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content !== "string" || content.trim().length === 0) {
    return {
      ok: false,
      reason: "invalid_response",
    };
  }

  try {
    return {
      ok: true,
      value: JSON.parse(content) as T,
    };
  } catch {
    return {
      ok: false,
      reason: "invalid_response",
    };
  }
}
