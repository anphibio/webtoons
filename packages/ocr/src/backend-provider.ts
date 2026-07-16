import type { OcrInput, OcrProgressCallback, OcrProvider, OcrRegion, RawOcrResult } from "./types";

export interface BackendOcrProviderOptions {
  baseUrl: string;
  accessToken?: string;
  fetch?: typeof globalThis.fetch;
}

export class BackendOcrProvider implements OcrProvider {
  private readonly fetcher: typeof globalThis.fetch;
  private readonly url: string;
  private readonly accessToken: string | undefined;

  constructor(options: BackendOcrProviderOptions) {
    this.url = validateBaseUrl(options.baseUrl);
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.accessToken = options.accessToken;
  }

  async recognize(input: OcrInput, signal?: AbortSignal, onProgress?: OcrProgressCallback): Promise<RawOcrResult> {
    if (signal?.aborted) throw new Error("OCR cancelado");
    const bytes = await imageBytes(input.image);
    const requestBytes = new Uint8Array(bytes.byteLength);
    requestBytes.set(bytes);
    const headers: Record<string, string> = { "Content-Type": "image/jpeg" };
    if (this.accessToken) headers["X-Extension-Token"] = this.accessToken;
    onProgress?.(0);
    const response = await this.fetcher(`${this.url}/v1/ocr`, {
      method: "POST",
      credentials: "omit",
      signal,
      headers,
      body: requestBytes.buffer,
    });
    if (!response.ok) {
      const detail = await responseDetail(response);
      throw new Error(detail ?? `OCR local respondeu com HTTP ${response.status}`);
    }
    const body: unknown = await response.json();
    if (
      !isRecord(body) ||
      !isPositiveNumber(body.width) ||
      !isPositiveNumber(body.height) ||
      !Array.isArray(body.regions) ||
      !body.regions.every(isBackendRegion)
    ) {
      throw new Error("Resposta do OCR local inválida");
    }
    onProgress?.(1);
    return {
      width: body.width,
      height: body.height,
      regions: body.regions.map((region): OcrRegion => ({
        id: region.id,
        text: region.text,
        confidence: region.confidence,
        bbox: region.bbox,
        rotation: 0,
      })),
    };
  }
}

async function imageBytes(image: OcrInput["image"]): Promise<Uint8Array> {
  if (image instanceof Uint8Array) return image;
  if (image instanceof Blob) return new Uint8Array(await image.arrayBuffer());
  throw new Error("Formato de imagem não suportado pelo OCR local");
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

interface BackendRegion {
  id: string;
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
}

function isBackendRegion(value: unknown): value is BackendRegion {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.text !== "string") return false;
  if (typeof value.confidence !== "number" || !isRecord(value.bbox)) return false;
  const bbox = value.bbox;
  return ["x", "y", "width", "height"].every((key) => typeof bbox[key] === "number");
}

function isPositiveNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

async function responseDetail(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    return isRecord(body) && typeof body.detail === "string" ? body.detail : undefined;
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
