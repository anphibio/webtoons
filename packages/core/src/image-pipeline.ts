import { recognizeWithControls } from "../../ocr/src/service";
import type { OcrProvider, OcrResult } from "../../ocr/src/types";
import { translateWithControls } from "../../translation/src/service";
import type { TranslationProvider } from "../../translation/src/types";
import type { ImageCandidate } from "../../site-adapters/src/types";

export interface LoadedImage {
  image: Blob | Uint8Array | ImageData;
  width: number;
  height: number;
}

export interface ImageLoader {
  load(candidate: ImageCandidate, signal: AbortSignal): Promise<LoadedImage>;
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
  timeoutMs: number;
  loadTimeoutMs?: number;
  maxTranslationRetries?: number;
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

      let ocr: OcrResult;
      try {
        this.options.onStage?.("ocr");
        ocr = await recognizeWithControls(
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
      } catch (error) {
        throw stageError("OCR", error);
      }

      if (ocr.regions.length === 0) return { status: "empty", regionCount: 0 };

      let translated;
      try {
        this.options.onStage?.("translation");
        translated = await translateWithControls(
          this.options.translation,
          ocr.regions.map((region, order) => ({
            id: region.id,
            text: region.text,
            order,
          })),
          {
            context: {
              sourceLanguage: this.options.sourceLanguage,
              targetLanguage: this.options.targetLanguage,
            },
            signal: controller.signal,
            timeoutMs: this.options.timeoutMs,
            maxRetries: this.options.maxTranslationRetries ?? 1,
          },
        );
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
