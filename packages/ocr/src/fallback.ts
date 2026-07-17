import type { OcrRegion, RawOcrResult } from "./types";

export function shouldAttemptSingleBlockFallback(result: RawOcrResult): boolean {
  if (result.regions.length <= 3) return true;

  // O detector pode devolver várias caixas de ruído mesmo quando não encontrou
  // nenhum balão. A quantidade bruta de regiões, sozinha, não é uma medida de
  // cobertura. Só acionamos o Tesseract nesses casos claramente fracos para
  // preservar o ganho de memória e tempo do OCR principal.
  return countUsefulRegions(result.regions) <= 3
    && result.regions.some((region) => region.text.trim().length >= 4);
}

export function chooseOcrFallback(primary: RawOcrResult, fallback: RawOcrResult): RawOcrResult {
  return score(fallback.regions) > score(primary.regions) ? fallback : primary;
}

function score(regions: OcrRegion[]): number {
  const plausible = regions.filter(isPlausibleRegion);
  if (plausible.length === 0) return 0;
  const confidence = plausible.reduce((total, region) => total + region.confidence, 0) / plausible.length;
  const textLength = plausible.reduce((total, region) => total + region.text.trim().length, 0);
  return plausible.length * 10 + confidence * 5 + Math.min(textLength, 100) / 100;
}

function countUsefulRegions(regions: OcrRegion[]): number {
  return regions.filter(isUsefulRegion).length;
}

function isUsefulRegion(region: OcrRegion): boolean {
  const text = region.text.trim();
  const words = text.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
  if (words.some((word) => OCR_HALLUCINATION_TOKENS.has(word))) return false;
  if (/\bn\s*[°º]\b/i.test(text)) return false;
  if (/(?:www\.)?omegascans\s*\.\s*org/i.test(text)) return false;
  if (words.length >= 5 && /\d/.test(text) && words.filter((word) => word.length <= 1).length >= 3) return false;
  if (text.length < 5) return false;
  return text.length > 0 && (typeof region.confidence !== "number" || region.confidence >= 0.5);
}

function isPlausibleRegion(region: OcrRegion): boolean {
  const text = region.text.trim();
  const words = text.toLocaleLowerCase().match(/[a-z]+/g) ?? [];
  if (words.some((word) => OCR_HALLUCINATION_TOKENS.has(word))) return false;
  if (/\bn\s*[°º]\b/i.test(text)) return false;
  if (/(?:www\.)?omegascans\s*\.\s*org/i.test(text)) return false;
  if (words.length >= 5 && /\d/.test(text) && words.filter((word) => word.length <= 1).length >= 3) return false;
  return text.length > 0;
}

const OCR_HALLUCINATION_TOKENS = new Set([
  "botor", "loto", "tokor", "heughi", "waju", "heugho", "heuth", "heyhl", "hmng", "krot", "leuol", "toro", "toror",
]);
