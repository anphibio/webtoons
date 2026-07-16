import type {
  TranslationContext,
  TranslationProvider,
  TranslationResult,
  TranslationSegment,
} from "./types";

const MAX_SEGMENTS_PER_REQUEST = 50;
const MAX_REQUEST_BYTES = 120 * 1024;

export interface DeepLTranslationProviderOptions {
  apiKey: string;
  endpoint?: string;
  fetch?: typeof globalThis.fetch;
}

interface DeepLResponse {
  translations?: Array<{ text?: unknown }>;
}

export class DeepLTranslationProvider implements TranslationProvider {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly endpoint: string;

  constructor(private readonly options: DeepLTranslationProviderOptions) {
    if (!options.apiKey.trim()) throw new Error("Chave do DeepL não configurada");
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.endpoint = (options.endpoint ?? "https://api-free.deepl.com").replace(/\/$/, "");
  }

  async translate(
    segments: TranslationSegment[],
    context: TranslationContext,
    signal?: AbortSignal,
  ): Promise<TranslationResult> {
    const translated: TranslationResult["segments"] = [];
    for (const batch of createBatches(segments)) {
      const response = await this.fetcher(`${this.endpoint}/v2/translate`, {
        method: "POST",
        credentials: "omit",
        signal,
        headers: {
          "Authorization": `DeepL-Auth-Key ${this.options.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: batch.map((segment) => segment.text),
          source_lang: toDeepLLanguage(context.sourceLanguage),
          target_lang: toDeepLLanguage(context.targetLanguage),
        }),
      });

      if (!response.ok) throw new Error(`DeepL respondeu com HTTP ${response.status}`);
      const body = await readJson(response);
      const translations = body.translations;
      if (!Array.isArray(translations) || translations.length !== batch.length) {
        throw new Error("Resposta do DeepL contém quantidade inválida de traduções");
      }

      for (const [index, translation] of translations.entries()) {
        if (typeof translation?.text !== "string") throw new Error("Resposta do DeepL contém texto inválido");
        const source = batch[index];
        if (!source) throw new Error("Resposta do DeepL fora de ordem");
        translated.push({ id: source.id, sourceText: source.text, translatedText: translation.text });
      }
    }
    return { segments: translated };
  }
}

function createBatches(segments: TranslationSegment[]): TranslationSegment[][] {
  const batches: TranslationSegment[][] = [];
  let current: TranslationSegment[] = [];

  for (const segment of segments) {
    const next = [...current, segment];
    const bodySize = new TextEncoder().encode(JSON.stringify({ text: next.map((item) => item.text) })).byteLength;
    if (bodySize > MAX_REQUEST_BYTES && current.length === 0) throw new Error("Segmento excede o limite do DeepL");
    if (next.length > MAX_SEGMENTS_PER_REQUEST || bodySize > MAX_REQUEST_BYTES) {
      batches.push(current);
      current = [segment];
    } else {
      current = next;
    }
  }

  if (current.length > 0) batches.push(current);
  return batches;
}

function toDeepLLanguage(language: string): string {
  const normalized = language.trim().toLowerCase();
  const aliases: Record<string, string> = {
    eng: "EN",
    en: "EN",
    jpn: "JA",
    ja: "JA",
    kor: "KO",
    ko: "KO",
    chi_sim: "ZH",
    zh: "ZH",
    "pt-br": "PT-BR",
    por: "PT-BR",
  };
  return aliases[normalized] ?? language.toUpperCase();
}

async function readJson(response: Response): Promise<DeepLResponse> {
  try {
    const body: unknown = await response.json();
    return isRecord(body) ? body as DeepLResponse : {};
  } catch {
    throw new Error("Resposta do DeepL não é JSON válido");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
