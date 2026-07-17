import { recognizeWithControls } from "../../ocr/src/service";
import type { OcrProvider, OcrResult } from "../../ocr/src/types";
import { translateWithControls } from "../../translation/src/service";
import type { TranslationProvider, TranslationResult } from "../../translation/src/types";
import type { ImageCandidate } from "../../site-adapters/src/types";
import { createBytesKey, createCacheKey } from "../../shared/src/cache";

export interface LoadedImage {
  image: Blob | Uint8Array | ImageData;
  width: number;
  height: number;
}

export interface ImageLoader {
  load(candidate: ImageCandidate, signal: AbortSignal): Promise<LoadedImage>;
}

export interface PipelineCache {
  get<T>(kind: "ocr" | "translation", key: string): Promise<T | null>;
  put<T>(kind: "ocr" | "translation", key: string, value: T, ttlMs: number): Promise<void>;
}

export interface ImageOverlay {
  render(
    image: HTMLImageElement,
    regions: readonly OverlayRegion[],
    dimensions?: { width: number; height: number },
  ): void;
}

export interface OverlayRegion {
  id: string;
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
}

export interface ImagePipelineOptions {
  load: ImageLoader;
  ocr: OcrProvider;
  translation: TranslationProvider;
  overlay: ImageOverlay;
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Record<string, string>;
  timeoutMs: number;
  loadTimeoutMs?: number;
  maxTranslationRetries?: number;
  cache?: PipelineCache;
  ocrCacheTtlMs?: number;
  translationCacheTtlMs?: number;
  onStage?: (stage: ImagePipelineStage) => void;
}

export type ImagePipelineStage = "loading" | "ocr" | "translation" | "overlay";

export type ImagePipelineResult =
  | { status: "empty"; regionCount: 0 }
  | { status: "rendered"; regionCount: number };

export class ImagePipeline {
  constructor(private readonly options: ImagePipelineOptions) {}

  async process(candidate: ImageCandidate, signal?: AbortSignal): Promise<ImagePipelineResult> {
    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    signal?.addEventListener("abort", forwardAbort, { once: true });

    try {
      let loaded: LoadedImage;
      try {
        this.options.onStage?.("loading");
        loaded = await withAbortTimeout(
          this.options.load.load(candidate, controller.signal),
          this.options.loadTimeoutMs ?? this.options.timeoutMs,
          controller,
          "Carregamento excedeu o tempo limite",
        );
      } catch (error) {
        throw stageError("carregamento", error);
      }

      const imageKey = this.options.cache
        ? await createImageCacheKey(candidate, loaded.image, loaded.width, loaded.height)
        : undefined;

      let ocr: OcrResult;
      try {
        this.options.onStage?.("ocr");
        const cachedOcr = await readCache<OcrResult>(this.options.cache, "ocr", imageKey);
        ocr = cachedOcr ?? await recognizeWithControls(
          this.options.ocr,
          {
            image: loaded.image,
            width: loaded.width,
            height: loaded.height,
            language: this.options.sourceLanguage,
          },
          {
            signal: controller.signal,
            timeoutMs: this.options.timeoutMs,
          },
        );
        if (!cachedOcr && imageKey && this.options.cache) {
          await writeCache(this.options.cache, "ocr", imageKey, ocr, this.options.ocrCacheTtlMs ?? 7 * 24 * 60 * 60 * 1000);
        }
      } catch (error) {
        throw stageError("OCR", error);
      }

      if (ocr.regions.length === 0) return { status: "empty", regionCount: 0 };

      let translated: TranslationResult;
      try {
        this.options.onStage?.("translation");
        const segments = ocr.regions.map((region, order) => ({
          id: region.id,
          text: region.text,
          order,
        }));
        const translationKey = createCacheKey(
          "translation-v4",
          this.options.sourceLanguage,
          this.options.targetLanguage,
          ...segments.map((segment) => `${segment.order}:${segment.text}`),
          JSON.stringify(this.options.glossary ?? {}),
        );
        const cachedTranslation = await readCache<TranslationResult>(this.options.cache, "translation", translationKey);
        translated = cachedTranslation ?? await translateWithControls(
          this.options.translation,
          segments,
          {
            context: {
              sourceLanguage: this.options.sourceLanguage,
              targetLanguage: this.options.targetLanguage,
              glossary: this.options.glossary,
            },
            signal: controller.signal,
            timeoutMs: this.options.timeoutMs,
            maxRetries: this.options.maxTranslationRetries ?? 1,
          },
        );
        if (!cachedTranslation) {
          await writeCache(this.options.cache, "translation", translationKey, translated, this.options.translationCacheTtlMs ?? 30 * 24 * 60 * 60 * 1000);
        }
      } catch (error) {
        throw stageError("tradução", error);
      }

      const byId = new Map(translated.segments.map((segment) => [segment.id, segment.translatedText]));
      const regions = ocr.regions
        .map((region) => ({
          id: region.id,
          text: byId.get(region.id) ?? "",
          bbox: region.bbox,
        }))
        .filter((region) => region.text.trim().length > 0);

      if (regions.length === 0) return { status: "empty", regionCount: 0 };
      this.options.onStage?.("overlay");
      this.options.overlay.render(candidate.element, regions, { width: ocr.width, height: ocr.height });
      return { status: "rendered", regionCount: regions.length };
    } finally {
      signal?.removeEventListener("abort", forwardAbort);
    }
  }
}

async function createImageCacheKey(
  candidate: ImageCandidate,
  image: LoadedImage["image"],
  width: number,
  height: number,
): Promise<string> {
  const bytes = await imageBytes(image);
  return createCacheKey("ocr-v14", candidate.sourceUrl, `${width}x${height}`, createBytesKey(bytes));
}

async function imageBytes(image: LoadedImage["image"]): Promise<Uint8Array> {
  if (image instanceof Uint8Array) return image;
  if (image instanceof Blob) return new Uint8Array(await image.arrayBuffer());
  return new Uint8Array(image.data.buffer, image.data.byteOffset, image.data.byteLength);
}

async function readCache<T>(cache: PipelineCache | undefined, kind: "ocr" | "translation", key: string | undefined): Promise<T | null> {
  if (!cache || !key) return null;
  try {
    return await cache.get<T>(kind, key);
  } catch {
    return null;
  }
}

async function writeCache<T>(cache: PipelineCache | undefined, kind: "ocr" | "translation", key: string, value: T, ttlMs: number): Promise<void> {
  if (!cache) return;
  try {
    await cache.put(kind, key, value, ttlMs);
  } catch {
    // Cache failures must never interrupt translation.
  }
}

async function withAbortTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  controller: AbortController,
  message: string,
): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_resolve, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(new Error(message));
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation, deadline]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function stageError(stage: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : error == null ? "falha sem detalhes" : String(error);
  return new Error(`Falha no ${stage}: ${detail}`);
}
