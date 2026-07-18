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
      if (!hasPositiveArea(region.bbox)) return null;
      const text = sanitizeOcrText(region.text.trim());
      if (!text || isKnownWatermark(text) || !isLikelyText(text, region.confidence, region.bbox)) return null;

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

  return { regions: deduplicateRegions(regions), width: dimensions.width, height: dimensions.height };
}

function deduplicateRegions(regions: OcrRegion[]): OcrRegion[] {
  const result: OcrRegion[] = [];
  for (const region of regions) {
    const duplicateIndex = result.findIndex((candidate) =>
      candidate.text.toLocaleLowerCase() === region.text.toLocaleLowerCase()
      && overlapRatio(candidate.bbox, region.bbox) >= 0.65,
    );
    if (duplicateIndex < 0) {
      result.push(region);
      continue;
    }
    const current = result[duplicateIndex]!;
    if (region.confidence > current.confidence) result[duplicateIndex] = region;
  }
  return result;
}

function overlapRatio(left: BoundingBox, right: BoundingBox): number {
  const x = Math.max(0, Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x));
  const y = Math.max(0, Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y));
  const intersection = x * y;
  const smallerArea = Math.min(left.width * left.height, right.width * right.height);
  return smallerArea > 0 ? intersection / smallerArea : 0;
}

function isAbnormallyTallShortRegion(text: string, height: number, limit: number): boolean {
  const compact = text.replace(/\s/g, "");
  return height > limit && compact.length < 40;
}

function isAbnormallyTallRegion(text: string, box: BoundingBox, limit: number): boolean {
  return box.height > limit && (isAbnormallyTallShortRegion(text, box.height, limit) || box.height > box.width * 1.15);
}

function hasPositiveArea(box: BoundingBox): boolean {
  return Number.isFinite(box.x)
    && Number.isFinite(box.y)
    && Number.isFinite(box.width)
    && Number.isFinite(box.height)
    && box.width > 0
    && box.height > 0;
}

function normalizeShortTallBox(
  box: BoundingBox,
  text: string,
  typicalHeight: number,
  limit: number,
): BoundingBox {
  if (!isAbnormallyTallRegion(text, box, limit)) return box;
  const safeTypicalHeight = Math.max(24, typicalHeight);
  const charactersPerLine = Math.max(8, Math.floor(box.width / (safeTypicalHeight * 0.56)));
  const estimatedLines = Math.max(1, Math.ceil(text.replace(/\s+/g, " ").trim().length / charactersPerLine));
  const height = Math.min(
    box.height,
    Math.max(24, Math.round(estimatedLines * safeTypicalHeight * 1.25 + 8)),
  );
  return { ...box, y: box.y + Math.round((box.height - height) / 2), height };
}

function isLikelyText(
  text: string,
  confidence: number,
  bbox: BoundingBox,
): boolean {
  if (confidence < 0.5) return false;
  const compact = text.replace(/\s/g, "");
  if (compact.length < 3) return false;
  const letters = (compact.match(/[\p{L}]/gu) ?? []).length;
  const unsupported = compact.replace(/[\p{L}\p{N}.,:;!?…'’"()\u005B\u005D\u002F+&•~\-–—]/gu, "");
  if (letters < 3 || unsupported.length > 0) return false;
  if (/\d/.test(compact) && letters < 4) return false;
  if (isShortNoise(text)) return false;
  if (isLikelyGlyphHallucination(text, bbox)) return false;
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
  const words: string[] = text.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
  if (words.length === 0 || words.some((word) => word.length > 3)) return false;
  if (words.every((word) => COMMON_SHORT_WORDS.has(word))) return false;
  const totalLetters = words.reduce((total, word) => total + word.length, 0);
  const hasKnownWord = words.some((word) => COMMON_SHORT_WORDS.has(word));
  if (words.length >= 2 && totalLetters >= 6 && hasKnownWord) return false;
  return true;
}

function isLikelyGlyphHallucination(text: string, bbox: BoundingBox): boolean {
  const words: string[] = text.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
  const compact = words.join("");
  if (ISOLATED_SOUND_EFFECT_TOKENS.has(compact)) return true;
  if (OCR_SOUND_EFFECT_TOKENS.has(compact) || (words.includes("huff") && words.every((word) => word.length <= 4))) return true;
  if (/\bn\s*[º°o0]?\.?\s*(?:sdo|ado)\b/i.test(text)) return true;
  if (/\b(?:stars?|staurs?)\s+club\b/i.test(text)) return true;
  if (text.trim().toLocaleLowerCase() === "hey guys" && bbox.width >= 300 && bbox.width / Math.max(1, bbox.height) >= 5) return true;
  if (words.some((word) => OCR_HALLUCINATION_TOKENS.has(word))) return true;
  if (/\bn\s*[°º]\b/i.test(text)) return true;
  if (/\d/.test(text) && !words.some((word) => COMMON_OCR_WORDS.has(word))) return true;
  return false;
}

const OCR_HALLUCINATION_TOKENS = new Set([
  "botor", "btok", "loto", "otof", "tokor", "steips", "wighs", "heugho", "heughh", "heugh", "heuth", "heyhl", "hmng", "hnng", "hng", "krot", "kroh", "leuol", "pounds", "ssin", "toro", "toror",
]);

const OCR_SOUND_EFFECT_TOKENS = new Set<string>(["huff", "haah", "euggh", "eugghh", "ughh", "brop", "btok", "otof"]);

const ISOLATED_SOUND_EFFECT_TOKENS = new Set<string>([
  "fondle", "plump", "slurp", "splat", "squelch", "swish", "toss", "twitch", "twich",
]);

const OCR_HALLUCINATION_FRAGMENTS = new Set(["heughi", "waju", "heugho", "leuol", "heuth", "heyhl", "hmng", "hnng", "hng"]);

function sanitizeOcrText(text: string): string {
  const withoutFragments = text
    .split(/(\s+)/)
    .filter((part) => !OCR_HALLUCINATION_FRAGMENTS.has(part.toLocaleLowerCase().replace(/[^a-z]/g, "")))
    .join("")
    .replace(/\s+/g, " ")
    .trim();
  return removeMixedSoundEffects(withoutFragments);
}

const MIXED_SOUND_EFFECT_MARKERS = new Set([
  "fondle", "plump", "slurp", "slurpr", "splat", "splater", "splatri", "squelch", "sqvelch",
  "swish", "toss", "squirt", "isquirt", "lsquirt", "lick", "rub", "surp", "haa", "treble", "tremble", "tremer", "trembue",
]);

function removeMixedSoundEffects(text: string): string {
  const words = text.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
  const twitchCount = words.filter((word) => word === "twitch" || word === "twich").length;
  const hasTwitchNoise = twitchCount > 0
    && !/\b(?:i|we|they)\s+(?:heard|saw|felt)\s+(?:a\s+)?twitch\b/i.test(text)
    && (twitchCount > 1 || words.length <= 3);
  if (!words.some((word) => MIXED_SOUND_EFFECT_MARKERS.has(word)) && !hasTwitchNoise) return text;

  return text
    .replace(/\b(?:fondle|plump|slurpr?|splat(?:er|ter|ri)?|squelch|sqvelch|swish|toss|twitch|twich|(?:i|l)squirt|lick|rub|surp|wich|treble|tremble|tremer|trembue|haa+|hn+gh+|nngh?)\b/gi, " ")
    .replace(/\s+([,.!?…])/g, "$1")
    .replace(/([.!?…])\s*,\s*/g, "$1 ")
    .replace(/^[,;:.!?…\s]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

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
