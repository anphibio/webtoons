import { describe, expect, it } from "vitest";
import { MockTranslationProvider } from "../packages/translation/src/mock-provider";
import { translateWithControls } from "../packages/translation/src/service";
import { applyGlossary } from "../packages/translation/src/glossary";
import type { TranslationSegment } from "../packages/translation/src/types";

const segments: TranslationSegment[] = [
  { id: "r1", text: "Hello", order: 0 },
  { id: "r2", text: "Goodbye", order: 1 },
];

describe("contrato de tradução", () => {
  it("preserva termos do glossário dentro da tradução", () => {
    expect(applyGlossary("Olá, Jimin.", { Jimin: "Jimin-ssi" })).toBe("Olá, Jimin-ssi.");
  });

  it("preserva IDs e traduz segmentos pelo provedor mock", async () => {
    const provider = new MockTranslationProvider({
      translations: { Hello: "Olá", Goodbye: "Tchau" },
    });

    const result = await translateWithControls(provider, segments, {
      context: { sourceLanguage: "en", targetLanguage: "pt-BR" },
      signal: new AbortController().signal,
      timeoutMs: 100,
      maxRetries: 0,
    });

    expect(result.segments).toEqual([
      { id: "r1", sourceText: "Hello", translatedText: "Olá" },
      { id: "r2", sourceText: "Goodbye", translatedText: "Tchau" },
    ]);
  });

  it("faz retry limitado após uma falha transitória", async () => {
    const provider = new MockTranslationProvider({
      translations: { Hello: "Olá", Goodbye: "Tchau" },
      failuresBeforeSuccess: 1,
    });

    const result = await translateWithControls(provider, segments, {
      context: { sourceLanguage: "en", targetLanguage: "pt-BR" },
      signal: new AbortController().signal,
      timeoutMs: 100,
      maxRetries: 1,
    });

    expect(result.segments[0]?.translatedText).toBe("Olá");
  });

  it("rejeita resposta que não preserva os IDs de entrada", async () => {
    const provider = new MockTranslationProvider({ translations: { Hello: "Olá" }, omitMissing: true });

    await expect(
      translateWithControls(provider, [{ id: "missing", text: "Unknown", order: 0 }], {
        context: { sourceLanguage: "en", targetLanguage: "pt-BR" },
        signal: new AbortController().signal,
        timeoutMs: 100,
        maxRetries: 0,
      }),
    ).rejects.toThrow("IDs de tradução inválidos");
  });
});
