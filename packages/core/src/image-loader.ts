import type { ImageCandidate } from "../../site-adapters/src/types";
import type { ImageLoader, LoadedImage } from "./image-pipeline";

export interface FetchImageLoaderOptions {
  maxBytes?: number;
}

export interface RuntimeImageResponse {
  ok: boolean;
  bytesBase64?: string;
  error?: string;
}

export type RuntimeImageFetcher = (sourceUrl: string) => Promise<RuntimeImageResponse>;

export class RuntimeImageLoader implements ImageLoader {
  constructor(private readonly fetchImage: RuntimeImageFetcher) {}

  async load(candidate: ImageCandidate, signal: AbortSignal): Promise<LoadedImage> {
    void signal;
    const result = await this.fetchImage(candidate.sourceUrl);
    if (!result.ok || !result.bytesBase64) throw new Error(result.error ?? "Não foi possível carregar imagem");
    return { image: decodeBase64(result.bytesBase64), width: candidate.width, height: candidate.height };
  }
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export class FetchImageLoader implements ImageLoader {
  constructor(private readonly options: FetchImageLoaderOptions = {}) {}

  async load(candidate: ImageCandidate, signal: AbortSignal): Promise<LoadedImage> {
    const url = parseImageUrl(candidate.sourceUrl);
    const response = await fetch(url, { signal, credentials: "omit" });
    if (!response.ok) throw new Error(`Falha ao carregar imagem (${response.status})`);

    const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (!contentType?.startsWith("image/")) throw new Error("Resposta não é uma imagem");

    const bytes = new Uint8Array(await response.arrayBuffer());
    const maxBytes = this.options.maxBytes ?? 25 * 1024 * 1024;
    if (bytes.byteLength > maxBytes) throw new Error("Imagem excede o tamanho permitido");

    return {
      image: bytes,
      width: candidate.width,
      height: candidate.height,
    };
  }
}

function parseImageUrl(source: string): string {
  try {
    const url = new URL(source, globalThis.location?.href);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.href;
  } catch {
    throw new Error("URL de imagem inválida");
  }
}
