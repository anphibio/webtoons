import type { BoundingBox, OcrRegion, OcrResult, RawOcrResult } from "./types";

export function normalizeOcrResult(
  raw: RawOcrResult,
  dimensions: { width: number; height: number } = { width: 0, height: 0 },
): OcrResult {
  const heights = raw.regions
    .map((region) => region.bbox.height)
    .filter((height) => Number.isFinite(height) && height > 0)
    .sort((left, right) => left - right);
  const typicalHeight = heights.length > 0 ? heights[Math.floor((heights.length - 1) / 2)]! : 0;
  const abnormalHeightLimit = Math.max(160, typicalHeight * 4);
  const regions = raw.regions
    .map((region) => {
      const text = region.text.trim();
      if (!text || isKnownWatermark(text) || !isLikelyText(text, region.confidence)) return null;

      const bbox = normalizeShortTallBox(region.bbox, text, typicalHeight, abnormalHeightLimit);

      return {
        ...region,
        text,
        confidence: clamp(region.confidence, 0, 1),
        bbox: clampBoundingBox(bbox, dimensions.width, dimensions.height),
        rotation: Number.isFinite(region.rotation) ? region.rotation : 0,
      };
    })
    .filter((region): region is OcrRegion => region !== null);

  return { regions, width: dimensions.width, height: dimensions.height };
}

function isAbnormallyTallShortRegion(text: string, height: number, limit: number): boolean {
  const compact = text.replace(/\s/g, "");
  return height > limit && compact.length < 40;
}

function normalizeShortTallBox(
  box: BoundingBox,
  text: string,
  typicalHeight: number,
  limit: number,
): BoundingBox {
  if (!isAbnormallyTallShortRegion(text, box.height, limit)) return box;
  const height = Math.max(24, Math.round(typicalHeight * 1.8));
  return { ...box, y: box.y + Math.round((box.height - height) / 2), height };
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
  if (isLikelyGlyphHallucination(text)) return false;
  return true;
}

const COMMON_SHORT_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "big", "but", "can", "did", "do", "for", "get", "has", "oh",
  "he", "her", "him", "his", "how", "huh", "i", "if", "in", "is", "it", "j", "let", "may", "me", "my",
  "no", "not", "now", "of", "on", "one", "or", "out", "por", "put", "que", "say", "she", "so", "the", "to", "up",
  "us", "was", "we", "why", "who", "yes", "you",
]);

const COMMON_OCR_WORDS = new Set([
  ...COMMON_SHORT_WORDS,
  "about", "after", "again", "been", "before", "believe", "clear", "come", "complete", "daily", "down", "haah", "hello",
  "feel", "first", "from", "here", "how", "just", "like", "main", "more", "move", "never", "original",
  "other", "please", "points", "quest", "really", "remaining", "reward", "save", "since", "still", "stop",
  "that", "their", "there", "they", "this", "time", "turn", "want", "when", "where", "without", "world", "sorry",
  "would",
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

function isLikelyGlyphHallucination(text: string): boolean {
  const words = text.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
  if (words.some((word) => OCR_HALLUCINATION_TOKENS.has(word))) return true;
  if (/\d/.test(text) && !words.some((word) => COMMON_OCR_WORDS.has(word))) return true;
  return false;
}

const OCR_HALLUCINATION_TOKENS = new Set(["botor", "tokor", "heugh", "krot"]);

function isKnownWatermark(text: string): boolean {
  return /\b(?:www\.)?omegascans\s*\.\s*org\b/i.test(text);
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
