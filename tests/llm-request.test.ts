import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithLlmTimeout, LlmRequestTimeoutError } from "@/lib/llm/request";

describe("fetchWithLlmTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("returns the fetch response before the timeout", async () => {
    const response = new Response(JSON.stringify({ ok: true }), { status: 200 });
    const fetchMock = vi.fn().mockResolvedValue(response);

    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWithLlmTimeout("https://example.com", {}, 100)).resolves.toBe(response);
  });

  it("throws a timeout error when the request exceeds the timeout", async () => {
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
          },
          { once: true },
        );
      });
    });

    vi.stubGlobal("fetch", fetchMock as typeof fetch);

    const request = fetchWithLlmTimeout("https://example.com", {}, 100);
    request.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(100);

    await expect(request).rejects.toBeInstanceOf(LlmRequestTimeoutError);
  });
});
