import type { BoundingBox, OcrRegion, OcrResult, RawOcrResult } from "./types";

export function normalizeOcrResult(
  raw: RawOcrResult,
  dimensions: { width: number; height: number } = { width: 0, height: 0 },
): OcrResult {
  const regions = raw.regions
    .map((region) => {
      const text = region.text.trim();
      if (!text || !isLikelyText(text, region.confidence)) return null;

      return {
        ...region,
        text,
        confidence: clamp(region.confidence, 0, 1),
        bbox: clampBoundingBox(region.bbox, dimensions.width, dimensions.height),
        rotation: Number.isFinite(region.rotation) ? region.rotation : 0,
      };
    })
    .filter((region): region is OcrRegion => region !== null);

  return { regions, width: dimensions.width, height: dimensions.height };
}

function isLikelyText(text: string, confidence: number): boolean {
  if (confidence < 0.5) return false;
  const compact = text.replace(/\s/g, "");
  if (compact.length < 3) return false;
  const letters = (compact.match(/[\p{L}]/gu) ?? []).length;
  const unsupported = compact.replace(/[\p{L}\p{N}.,:;!?…'’"()\u005B\u005D\u002F+&•~-]/gu, "");
  if (letters < 3 || unsupported.length > 0) return false;
  if (/\d/.test(compact) && letters < 4) return false;
  if (isShortNoise(text)) return false;
  return true;
}

const COMMON_SHORT_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "big", "but", "can", "did", "do", "for", "get", "has",
  "he", "her", "him", "his", "how", "huh", "i", "if", "in", "is", "it", "j", "let", "may", "me", "my",
  "no", "not", "now", "of", "on", "one", "or", "out", "por", "put", "que", "say", "she", "so", "the", "to", "up",
  "us", "was", "we", "why", "who", "yes", "you",
]);

function isShortNoise(text: string): boolean {
  const words = text.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
  if (words.length === 0 || words.some((word) => word.length > 3)) return false;
  if (words.every((word) => COMMON_SHORT_WORDS.has(word))) return false;
  const totalLetters = words.reduce((total, word) => total + word.length, 0);
  const hasKnownWord = words.some((word) => COMMON_SHORT_WORDS.has(word));
  if (words.length >= 2 && totalLetters >= 6 && hasKnownWord) return false;
  return true;
}

function clampBoundingBox(box: BoundingBox, imageWidth: number, imageHeight: number): BoundingBox {
  const x = clamp(box.x, 0, imageWidth);
  const y = clamp(box.y, 0, imageHeight);
  const right = clamp(box.x + box.width, x, imageWidth);
  const bottom = clamp(box.y + box.height, y, imageHeight);
  return { x, y, width: right - x, height: bottom - y };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
}
