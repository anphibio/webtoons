import type { TranslationContext, TranslationProvider, TranslationResult, TranslationSegment } from "./types";

export interface BackendTranslationProviderOptions {
  baseUrl: string;
  accessToken?: string;
  fetch?: typeof globalThis.fetch;
}

export class BackendTranslationProvider implements TranslationProvider {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly url: string;

  constructor(options: BackendTranslationProviderOptions) {
    this.url = validateBaseUrl(options.baseUrl);
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.accessToken = options.accessToken;
  }

  private readonly accessToken: string | undefined;

  async translate(segments: TranslationSegment[], context: TranslationContext, signal?: AbortSignal): Promise<TranslationResult> {
    const translated: TranslationResult["segments"] = [];
    for (const batch of batches(segments, 50)) {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (this.accessToken) headers["X-Extension-Token"] = this.accessToken;
      const response = await this.fetcher(`${this.url}/v1/translate`, {
        method: "POST",
        credentials: "omit",
        signal,
        headers,
        body: JSON.stringify({ segments: batch, sourceLanguage: context.sourceLanguage, targetLanguage: context.targetLanguage }),
      });
      if (!response.ok) throw new Error(`Backend respondeu com HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (!isRecord(body) || !Array.isArray(body.segments)) throw new Error("Resposta do backend inválida");
      translated.push(...body.segments as TranslationResult["segments"]);
    }
    return { segments: translated };
  }
}

function batches<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function validateBaseUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.href.replace(/\/$/, "");
  } catch {
    throw new Error("URL do backend inválida");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
