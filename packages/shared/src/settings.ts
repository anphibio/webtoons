export type OcrProviderId = "local-tesseract";
export type TranslationProviderId = "none" | "remote";

export interface ExtensionSettings {
  sourceLanguage: string;
  targetLanguage: "pt-BR";
  ocrProvider: OcrProviderId;
  translationProvider: TranslationProviderId;
  remoteConsent: boolean;
  backendUrl: string;
  backendAccessToken: string;
  fontSize: number;
  opacity: number;
  maxConcurrent: number;
  useCache: boolean;
  glossary: Record<string, string>;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  sourceLanguage: "eng",
  targetLanguage: "pt-BR",
  ocrProvider: "local-tesseract",
  translationProvider: "none",
  remoteConsent: false,
  backendUrl: "http://127.0.0.1:8000",
  backendAccessToken: "",
  fontSize: 16,
  opacity: 0.82,
  maxConcurrent: 1,
  useCache: true,
  glossary: {},
};

export interface SettingsStorage {
  get(): Promise<unknown>;
  set(value: ExtensionSettings): Promise<void>;
}

export async function loadSettings(storage: SettingsStorage): Promise<ExtensionSettings> {
  return sanitizeSettings(await storage.get());
}

export async function saveSettings(storage: SettingsStorage, value: unknown): Promise<ExtensionSettings> {
  const settings = sanitizeSettings(value);
  await storage.set(settings);
  return settings;
}

export function sanitizeSettings(value: unknown): ExtensionSettings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };

  const sourceLanguage = typeof value.sourceLanguage === "string" && value.sourceLanguage.trim().length > 0
    ? value.sourceLanguage.trim().slice(0, 16)
    : DEFAULT_SETTINGS.sourceLanguage;
  const translationProvider = value.translationProvider === "remote" ? "remote" : DEFAULT_SETTINGS.translationProvider;

  return {
    sourceLanguage,
    targetLanguage: "pt-BR",
    ocrProvider: "local-tesseract",
    translationProvider,
    remoteConsent: value.remoteConsent === true,
    backendUrl: sanitizeBackendUrl(value.backendUrl),
    backendAccessToken: typeof value.backendAccessToken === "string" ? value.backendAccessToken.slice(0, 256) : "",
    fontSize: clampNumber(value.fontSize, 10, 32, DEFAULT_SETTINGS.fontSize),
    opacity: clampNumber(value.opacity, 0.2, 1, DEFAULT_SETTINGS.opacity),
    maxConcurrent: Math.round(clampNumber(value.maxConcurrent, 1, 3, DEFAULT_SETTINGS.maxConcurrent)),
    useCache: typeof value.useCache === "boolean" ? value.useCache : DEFAULT_SETTINGS.useCache,
    glossary: sanitizeGlossary(value.glossary),
  };
}

function sanitizeBackendUrl(value: unknown): string {
  if (typeof value !== "string") return DEFAULT_SETTINGS.backendUrl;
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
    return url.href.replace(/\/$/, "");
  } catch {
    return DEFAULT_SETTINGS.backendUrl;
  }
}

function clampNumber(value: unknown, minimum: number, maximum: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(maximum, Math.max(minimum, value));
}

function sanitizeGlossary(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  const entries = Object.entries(value)
    .filter((entry): entry is [string, string] => {
      const [source, target] = entry;
      return source.trim().length > 0 && source.trim().length <= 80 && typeof target === "string" && target.trim().length > 0 && target.trim().length <= 80;
    })
    .slice(0, 100)
    .map(([source, target]) => [source.trim().slice(0, 80), target.trim().slice(0, 80)] as const)
    .filter(([source, target]) => source.length > 0 && target.length > 0);
  return Object.fromEntries(entries);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
