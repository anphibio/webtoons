import { describe, expect, it, vi } from "vitest";
import { BackendOcrProvider } from "../packages/ocr/src/backend-provider";

describe("BackendOcrProvider", () => {
  it("envia somente os bytes da imagem ao OCR local e mapeia as regiões", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      width: 100,
      height: 50,
      regions: [{
        id: "ocr-0",
        text: "Hello",
        confidence: 0.95,
        bbox: { x: 10, y: 8, width: 60, height: 20 },
      }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    const provider = new BackendOcrProvider({ baseUrl: "http://127.0.0.1:8000", accessToken: "secret", fetch: fetcher });
    const image = new Uint8Array([1, 2, 3]);

    const result = await provider.recognize({ image, width: 100, height: 50, language: "eng" });

    expect(result.regions).toEqual([{
      id: "ocr-0",
      text: "Hello",
      confidence: 0.95,
      rotation: 0,
      bbox: { x: 10, y: 8, width: 60, height: 20 },
    }]);
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
    expect(fetcher).toHaveBeenCalledWith("http://127.0.0.1:8000/v1/ocr", expect.objectContaining({
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "image/jpeg", "X-Extension-Token": "secret" },
    }));
    const request = fetcher.mock.calls[0]?.[1] as RequestInit;
    expect(new Uint8Array(request.body as ArrayBuffer)).toEqual(image);
  });

  it("rejeita respostas inválidas sem criar regiões incorretas", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ regions: [{ text: 42 }] }), { status: 200 }));
    const provider = new BackendOcrProvider({ baseUrl: "http://127.0.0.1:8000", fetch: fetcher });

    await expect(provider.recognize({ image: new Uint8Array([1]), width: 1, height: 1, language: "eng" }))
      .rejects.toThrow("Resposta do OCR local inválida");
  });
});
