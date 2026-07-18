import type { OcrRegion, RawOcrResult } from "./types";

export function shouldAttemptSingleBlockFallback(result: RawOcrResult): boolean {
  // Até seis caixas ainda é uma recuperação limitada por imagem. Isso cobre
  // balões estilizados que o detector principal reconhece parcialmente sem
  // executar o Tesseract em páginas já densamente reconhecidas.
  if (result.regions.length <= 3) return true;

  // O detector pode devolver várias caixas de ruído mesmo quando não encontrou
  // nenhum balão. A quantidade bruta de regiões, sozinha, não é uma medida de
  // cobertura. Só acionamos o Tesseract nesses casos claramente fracos para
  // preservar o ganho de memória e tempo do OCR principal.
  const usefulRegions = countUsefulRegions(result.regions);
  const hasWeakDetection = result.regions.some((region) => region.confidence < 0.7);
  return usefulRegions <= 3
    || (result.regions.length <= 6 && hasWeakDetection);
}

export function mergeOcrResults(primary: RawOcrResult, fallback: RawOcrResult): RawOcrResult {
  const regions = [...primary.regions];
  for (const candidate of fallback.regions) {
    const duplicateIndex = regions.findIndex((region) => intersectionOverUnion(region, candidate) >= 0.35);
    if (duplicateIndex < 0) {
      regions.push(candidate);
      continue;
    }
    const current = regions[duplicateIndex]!;
    if (candidate.confidence > current.confidence) regions[duplicateIndex] = candidate;
  }
  return {
    ...primary,
    ...fallback,
    regions: regions.map((region, index) => ({ ...region, id: `ocr-${index}` })),
  };
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
  if (/\bn\s*[°º]\.?\b/i.test(text)) return false;
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
  "botor", "loto", "tokor", "steips", "wighs", "heughi", "waju", "heugho", "heuth", "heyhl", "hmng", "hnng", "hng", "krot", "leuol", "pounds", "toro", "toror",
]);

function intersectionOverUnion(first: OcrRegion, second: OcrRegion): number {
  const left = Math.max(first.bbox.x, second.bbox.x);
  const top = Math.max(first.bbox.y, second.bbox.y);
  const right = Math.min(first.bbox.x + first.bbox.width, second.bbox.x + second.bbox.width);
  const bottom = Math.min(first.bbox.y + first.bbox.height, second.bbox.y + second.bbox.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const union = first.bbox.width * first.bbox.height + second.bbox.width * second.bbox.height - intersection;
  return union > 0 ? intersection / union : 0;
}
