import { describe, expect, it } from "vitest";
import { RuntimeImageLoader } from "../packages/core/src/image-loader";
import type { ImageCandidate } from "../packages/site-adapters/src/types";

describe("carregador via service worker", () => {
  it("converte bytes recebidos do runtime em entrada de OCR", async () => {
    const candidate = {
      id: "page-1", element: {} as HTMLImageElement, sourceUrl: "https://i.tngcdn.com/page.jpg",
      width: 100, height: 200, score: 1, priority: "visible",
    } satisfies ImageCandidate;
    const loader = new RuntimeImageLoader(async () => ({ ok: true, bytesBase64: "AQI=" }));

    const result = await loader.load(candidate, new AbortController().signal);

    expect([...new Uint8Array(result.image as Uint8Array)]).toEqual([1, 2]);
    expect(result.width).toBe(100);
  });
});
