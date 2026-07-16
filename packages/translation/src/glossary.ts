import type { TranslationResult } from "./types";

export function applyGlossary(text: string, glossary: Record<string, string> | undefined): string {
  if (!glossary) return text;
  let result = text;
  const terms = Object.entries(glossary)
    .filter(([source, target]) => source.trim().length > 0 && target.trim().length > 0)
    .sort(([left], [right]) => right.length - left.length);
  for (const [source, target] of terms) {
    result = result.replace(new RegExp(escapeRegExp(source), "g"), target);
  }
  return result;
}

export function applyGlossaryToResult(result: TranslationResult, glossary: Record<string, string> | undefined): TranslationResult {
  if (!glossary) return result;
  return {
    segments: result.segments.map((segment) => ({
      ...segment,
      translatedText: applyGlossary(segment.translatedText, glossary),
    })),
  };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
