import { describe, expect, it, vi } from "vitest";
import { DeepLTranslationProvider } from "../packages/translation/src/deepl-provider";

describe("provedor DeepL", () => {
  it("traduz segmentos preservando a ordem e os IDs", async () => {
    const request = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      translations: [
        { text: "Olá" },
        { text: "Mundo" },
      ],
    }), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = new DeepLTranslationProvider({ apiKey: "test-key", fetch: request });

    const result = await provider.translate([
      { id: "a", text: "Hello", order: 0 },
      { id: "b", text: "World", order: 1 },
    ], { sourceLanguage: "eng", targetLanguage: "pt-BR" });

    expect(result.segments).toEqual([
      { id: "a", sourceText: "Hello", translatedText: "Olá" },
      { id: "b", sourceText: "World", translatedText: "Mundo" },
    ]);
    expect(request).toHaveBeenCalledWith("https://api-free.deepl.com/v2/translate", expect.objectContaining({
      method: "POST",
      credentials: "omit",
    }));
  });

  it("divide mais de 50 segmentos em lotes", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ translations: Array.from({ length: 50 }, (_, index) => ({ text: `T${index}` })) }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ translations: [{ text: "T50" }] }), { status: 200 }));
    const provider = new DeepLTranslationProvider({ apiKey: "test-key", fetch: request });
    const segments = Array.from({ length: 51 }, (_, index) => ({ id: `id-${index}`, text: `S${index}`, order: index }));

    const result = await provider.translate(segments, { sourceLanguage: "eng", targetLanguage: "pt-BR" });

    expect(request).toHaveBeenCalledTimes(2);
    expect(result.segments).toHaveLength(51);
    expect(result.segments[50]?.id).toBe("id-50");
  });

  it("não expõe a chave em erros", async () => {
    const request = vi.fn().mockResolvedValue(new Response("falha interna", { status: 500 }));
    const provider = new DeepLTranslationProvider({ apiKey: "secret-key", fetch: request });

    await expect(provider.translate([{ id: "a", text: "Hello", order: 0 }], {
      sourceLanguage: "eng",
      targetLanguage: "pt-BR",
    })).rejects.toThrow("DeepL respondeu com HTTP 500");
    await expect(provider.translate([{ id: "a", text: "Hello", order: 0 }], {
      sourceLanguage: "eng",
      targetLanguage: "pt-BR",
    })).rejects.not.toThrow("secret-key");
  });
});
