import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, loadSettings, sanitizeSettings, type SettingsStorage } from "../packages/shared/src/settings";

function storage(value: unknown): SettingsStorage {
  return {
    async get() { return value; },
    async set() {},
  };
}

describe("configurações", () => {
  it("usa defaults locais e sem consentimento remoto", async () => {
    await expect(loadSettings(storage(undefined))).resolves.toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS.remoteConsent).toBe(false);
    expect(DEFAULT_SETTINGS.translationProvider).toBe("none");
  });

  it("preserva valores válidos e corrige valores inválidos", () => {
    expect(sanitizeSettings({
      sourceLanguage: "jpn",
      targetLanguage: "pt-BR",
      ocrProvider: "local-tesseract",
      translationProvider: "remote",
      remoteConsent: "yes",
      backendUrl: "https://translator.example/",
      backendAccessToken: "local-token",
      fontSize: 99,
      opacity: 0.7,
      maxConcurrent: 2,
      glossary: { Jimin: "Jimin-ssi" },
    })).toEqual({
      ...DEFAULT_SETTINGS,
      sourceLanguage: "jpn",
      translationProvider: "remote",
      backendUrl: "https://translator.example",
      backendAccessToken: "local-token",
      fontSize: 32,
      opacity: 0.7,
      maxConcurrent: 2,
      glossary: { Jimin: "Jimin-ssi" },
    });
  });

  it("permite desativar o cache para a próxima tradução", () => {
    expect(sanitizeSettings({ useCache: false }).useCache).toBe(false);
    expect(sanitizeSettings({ useCache: "false" }).useCache).toBe(true);
  });

  it("limita o glossário salvo a termos curtos e válidos", () => {
    expect(sanitizeSettings({ glossary: { Jimin: "Jimin-ssi", "": "x", ["x".repeat(200)]: "y", Broken: 42 } }).glossary).toEqual({ Jimin: "Jimin-ssi" });
  });
});
