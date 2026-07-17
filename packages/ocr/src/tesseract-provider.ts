import { createWorker, PSM } from "tesseract.js";
import { normalizeOcrResult } from "./normalize";
import type { OcrInput, OcrProgressCallback, OcrProvider, RawOcrResult } from "./types";

export interface TesseractPageLike {
  text?: string;
  lines?: readonly TesseractBlockLike[] | null;
  blocks?: readonly TesseractBlockLike[] | null;
}

export interface TesseractBlockLike {
  text?: string;
  confidence?: number;
  bbox?: { x0: number; y0: number; x1: number; y1: number };
  paragraphs?: readonly TesseractParagraphLike[] | null;
}

export interface TesseractParagraphLike {
  lines?: readonly TesseractBlockLike[] | null;
}

interface MappedRegion {
  id: string;
  text: string;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  rotation: number;
}

export interface TesseractProviderOptions {
  language: string;
  pageSegmentationMode?: PSM;
  workerPath: string;
  corePath: string;
  langPath: string;
  cachePath?: string;
  workerBlobURL?: boolean;
}

type TesseractWorker = Awaited<ReturnType<typeof createWorker>>;

export class TesseractOcrProvider implements OcrProvider {
  private workerPromise: Promise<TesseractWorker> | undefined;
  private activeProgress: OcrProgressCallback | undefined;
  private parametersConfigured = false;

  constructor(private readonly options: TesseractProviderOptions) {}

  async recognize(input: OcrInput, signal?: AbortSignal, onProgress?: OcrProgressCallback): Promise<RawOcrResult> {
    if (signal?.aborted) throw new Error("OCR cancelado");
    this.activeProgress = onProgress;
    onProgress?.(0);

    const worker = await this.getWorker();
    if (!this.parametersConfigured) {
      await worker.setParameters({
        tessedit_pageseg_mode: this.options.pageSegmentationMode ?? PSM.SPARSE_TEXT,
        preserve_interword_spaces: "1",
      });
      this.parametersConfigured = true;
    }
    const recognition = worker.recognize(toImageLike(input.image), {}, { blocks: true });
    let abortHandler: (() => void) | undefined;
    const abortPromise = new Promise<never>((_, reject) => {
      abortHandler = () => {
        void this.terminateWorker();
        reject(new Error("OCR cancelado"));
      };
      signal?.addEventListener("abort", abortHandler, { once: true });
    });

    try {
      const result = await Promise.race([recognition, abortPromise]);
      onProgress?.(1);
      return mapTesseractPage(result.data, { width: input.width, height: input.height });
    } finally {
      if (abortHandler) signal?.removeEventListener("abort", abortHandler);
      this.activeProgress = undefined;
    }
  }

  async terminate(): Promise<void> {
    await this.terminateWorker();
  }

  private async getWorker(): Promise<TesseractWorker> {
    if (!this.workerPromise) {
      this.workerPromise = createWorker(this.options.language, undefined, {
        workerPath: this.options.workerPath,
        corePath: this.options.corePath,
        langPath: this.options.langPath,
        cachePath: this.options.cachePath,
        workerBlobURL: this.options.workerBlobURL ?? false,
        logger: (message) => this.activeProgress?.(message.progress),
      });
    }
    return this.workerPromise;
  }

  private async terminateWorker(): Promise<void> {
    const workerPromise = this.workerPromise;
    this.workerPromise = undefined;
    if (workerPromise) await (await workerPromise).terminate();
  }
}

export function mapTesseractPage(
  page: TesseractPageLike,
  dimensions: { width: number; height: number },
): RawOcrResult {
  const nestedParagraphs = (page.blocks ?? []).flatMap((block) => block.paragraphs ?? []);
  const paragraphRegions = nestedParagraphs
    .map((paragraph) => mapParagraph(paragraph))
    .filter((region): region is NonNullable<typeof region> => region !== null);
  const detectedRegions = (paragraphRegions.length > 0 ? paragraphRegions : page.lines ?? page.blocks ?? [])
    .map((region, index) => {
      const text = repairCommonGlyphConfusions(region.text?.trim() ?? "");
      if (!text || !region.bbox) return null;
      return {
        id: `ocr-${index}`,
        text,
        confidence: (region.confidence ?? 0) / 100,
        bbox: {
          x: region.bbox.x0,
          y: region.bbox.y0,
          width: region.bbox.x1 - region.bbox.x0,
          height: region.bbox.y1 - region.bbox.y0,
        },
        rotation: 0,
      };
    })
    .filter((region): region is NonNullable<typeof region> => region !== null);

  if (detectedRegions.length > 0) {
    return normalizeOcrResult({ regions: mergeAdjacentRegions(detectedRegions) }, dimensions);
  }
  if (!page.text?.trim()) return { regions: [] };

  return normalizeOcrResult({
    regions: [{
      id: "ocr-0",
      text: page.text,
      confidence: 0.5,
      bbox: { x: 0, y: 0, width: dimensions.width, height: dimensions.height },
      rotation: 0,
    }],
  }, dimensions);
}

function repairCommonGlyphConfusions(text: string): string {
  const tokens = text.split(/(\s+)/);
  const wordCount = tokens.filter((token) => /[A-Za-z]/.test(token)).length;
  if (wordCount < 1) return text;

  return tokens.map((token) => {
    const match = token.match(/^([([{"'“‘]*)(1|15|50)([)\]}!?.,;:"'”’]*)$/);
    if (!match) return token;
    const replacement = match[2] === "1" ? "I" : match[2] === "15" ? "IS" : "SO";
    if (match[2] === "1" || wordCount >= 2) return `${match[1]}${replacement}${match[3]}`;
    return token;
  }).join("");
}

function mergeAdjacentRegions(regions: MappedRegion[]): MappedRegion[] {
  const heights = regions.map((region) => region.bbox.height).sort((left, right) => left - right);
  const typicalHeight = heights.length > 0 ? heights[Math.floor((heights.length - 1) / 2)]! : 0;
  const abnormalHeightLimit = Math.max(160, typicalHeight * 4);
  const filtered = regions.filter((region) => {
    const compact = region.text.replace(/\s/g, "");
    return !(region.bbox.height > abnormalHeightLimit && compact.length < 40);
  });
  const merged: MappedRegion[] = [];
  for (const region of filtered) {
    const previous = merged[merged.length - 1];
    if (!previous || !shouldJoin(previous, region)) {
      merged.push({ ...region, id: `ocr-${merged.length}` });
      continue;
    }

    const right = Math.max(previous.bbox.x + previous.bbox.width, region.bbox.x + region.bbox.width);
    const bottom = Math.max(previous.bbox.y + previous.bbox.height, region.bbox.y + region.bbox.height);
    const left = Math.min(previous.bbox.x, region.bbox.x);
    const top = Math.min(previous.bbox.y, region.bbox.y);
    previous.text = `${previous.text} ${region.text}`.replace(/\s+/g, " ").trim();
    previous.confidence = (previous.confidence + region.confidence) / 2;
    previous.bbox = { x: left, y: top, width: right - left, height: bottom - top };
  }
  return merged;
}

function shouldJoin(first: MappedRegion, second: MappedRegion): boolean {
  if (isOnomatopoeia(first.text) || isOnomatopoeia(second.text)) return false;
  const firstRight = first.bbox.x + first.bbox.width;
  const secondRight = second.bbox.x + second.bbox.width;
  const horizontalOverlap = Math.max(0, Math.min(firstRight, secondRight) - Math.max(first.bbox.x, second.bbox.x));
  const overlapRatio = horizontalOverlap / Math.max(1, Math.min(first.bbox.width, second.bbox.width));
  const verticalGap = Math.max(0, second.bbox.y - (first.bbox.y + first.bbox.height));
  const allowedGap = Math.max(first.bbox.height, second.bbox.height) * 2.2;
  return overlapRatio >= 0.35 && verticalGap <= allowedGap;
}

function isOnomatopoeia(text: string): boolean {
  const normalized = text.toLocaleLowerCase().replace(/[^a-z]/g, "");
  return ["ah", "ahh", "haah", "hmm", "mmm", "oh"].includes(normalized);
}

function mapParagraph(
  paragraph: TesseractParagraphLike,
): TesseractBlockLike | null {
  const lines = (paragraph.lines ?? []).filter((line) => line.text?.trim() && line.bbox);
  if (lines.length === 0) return null;

  const text = lines.map((line) => line.text!.trim()).join(" ");
  const left = Math.min(...lines.map((line) => line.bbox!.x0));
  const top = Math.min(...lines.map((line) => line.bbox!.y0));
  const right = Math.max(...lines.map((line) => line.bbox!.x1));
  const bottom = Math.max(...lines.map((line) => line.bbox!.y1));
  const confidence = lines.reduce((total, line) => total + (line.confidence ?? 0), 0) / lines.length;

  return {
    text,
    confidence,
    bbox: { x0: left, y0: top, x1: right, y1: bottom },
  };
}

function toImageLike(image: OcrInput["image"]): Blob | HTMLCanvasElement | OffscreenCanvas {
  if (image instanceof Blob) return image;
  if (image instanceof Uint8Array) {
    const bytes = new ArrayBuffer(image.byteLength);
    new Uint8Array(bytes).set(image);
    return new Blob([bytes], { type: "image/png" });
  }

  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível criar o contexto de imagem");
    context.putImageData(image, 0, 0);
    return canvas;
  }

  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível criar o contexto de imagem");
  context.putImageData(image, 0, 0);
  return canvas;
}
