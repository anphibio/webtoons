import { describe, expect, it, vi } from "vitest";
import { FetchImageLoader } from "../packages/core/src/image-loader";
import type { ImageCandidate } from "../packages/site-adapters/src/types";

function candidate(sourceUrl: string): ImageCandidate {
  return {
    id: "page-1",
    element: {} as HTMLImageElement,
    sourceUrl,
    width: 800,
    height: 1200,
    score: 1,
    priority: "visible",
  };
}

describe("carregador de imagens", () => {
  it("carrega somente respostas de imagem e preserva dimensões da candidata", async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(bytes, {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    })));

    const result = await new FetchImageLoader().load(candidate("https://cdn.example/page.jpg"), new AbortController().signal);

    expect(result.width).toBe(800);
    expect(result.height).toBe(1200);
    expect([...new Uint8Array(result.image as Uint8Array)]).toEqual([1, 2, 3]);
  });

  it("rejeita URL insegura e resposta que não seja imagem", async () => {
    const loader = new FetchImageLoader();
    await expect(loader.load(candidate("javascript:alert(1)"), new AbortController().signal)).rejects.toThrow("URL de imagem inválida");

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("html", {
      status: 200,
      headers: { "content-type": "text/html" },
    })));
    await expect(loader.load(candidate("https://cdn.example/page"), new AbortController().signal)).rejects.toThrow("Resposta não é uma imagem");
  });
});
