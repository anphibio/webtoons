import { describe, expect, it, vi } from "vitest";
import { BackendTranslationProvider } from "../packages/translation/src/backend-provider";

describe("provedor backend", () => {
  it("envia segmentos ao backend e preserva o contrato", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      segments: [{ id: "a", sourceText: "Hello", translatedText: "Olá" }],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = new BackendTranslationProvider({ baseUrl: "http://localhost:8000", accessToken: "local-token", fetch });

    await expect(provider.translate([{ id: "a", text: "Hello", order: 0 }], {
      sourceLanguage: "eng", targetLanguage: "pt-BR",
    })).resolves.toEqual({ segments: [{ id: "a", sourceText: "Hello", translatedText: "Olá" }] });
    expect(fetch).toHaveBeenCalledWith("http://localhost:8000/v1/translate", expect.objectContaining({
      headers: expect.objectContaining({ "X-Extension-Token": "local-token" }),
    }));
  });

  it("rejeita endpoint inseguro", () => {
    expect(() => new BackendTranslationProvider({ baseUrl: "javascript:alert(1)" })).toThrow("URL do backend inválida");
  });

  it("divide lotes maiores que o limite do backend", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ segments: Array.from({ length: 50 }, (_, index) => ({ id: `id-${index}`, sourceText: `S${index}`, translatedText: `T${index}` })) }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ segments: [{ id: "id-50", sourceText: "S50", translatedText: "T50" }] }), { status: 200 }));
    const provider = new BackendTranslationProvider({ baseUrl: "http://localhost:8000", fetch });
    const segments = Array.from({ length: 51 }, (_, index) => ({ id: `id-${index}`, text: `S${index}`, order: index }));

    const result = await provider.translate(segments, { sourceLanguage: "eng", targetLanguage: "pt-BR" });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(result.segments).toHaveLength(51);
  });
});
