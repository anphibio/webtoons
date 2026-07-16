import type { OcrRegion, RawOcrResult } from "./types";

export function shouldAttemptSingleBlockFallback(result: RawOcrResult): boolean {
  return result.regions.length <= 1;
}

export function chooseOcrFallback(primary: RawOcrResult, fallback: RawOcrResult): RawOcrResult {
  return score(fallback.regions) > score(primary.regions) ? fallback : primary;
}

function score(regions: OcrRegion[]): number {
  if (regions.length === 0) return 0;
  const confidence = regions.reduce((total, region) => total + region.confidence, 0) / regions.length;
  const textLength = regions.reduce((total, region) => total + region.text.trim().length, 0);
  return regions.length * 10 + confidence * 5 + Math.min(textLength, 100) / 100;
}
