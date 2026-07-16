import { describe, expect, it, vi } from "vitest";
import { fetchWithTimeout } from "../packages/core/src/fetch-timeout";

describe("requisição com timeout", () => {
  it("aborta uma requisição de imagem que não responde", async () => {
    let receivedSignal: AbortSignal | undefined;
    const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      receivedSignal = init?.signal ?? undefined;
      return new Promise<Response>(() => undefined);
    });

    await expect(fetchWithTimeout(fetcher, "https://cdn.example/page.jpg", {}, 10))
      .rejects.toThrow("Requisição excedeu o tempo limite");
    expect(receivedSignal?.aborted).toBe(true);
  });
});
