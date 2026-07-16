import type {
  TranslationContext,
  TranslationProvider,
  TranslationResult,
  TranslationSegment,
} from "./types";
import { applyGlossaryToResult } from "./glossary";

export interface TranslationControlOptions {
  context: TranslationContext;
  signal: AbortSignal;
  timeoutMs: number;
  maxRetries: number;
}

export async function translateWithControls(
  provider: TranslationProvider,
  segments: TranslationSegment[],
  options: TranslationControlOptions,
): Promise<TranslationResult> {
  let lastError: unknown = new Error("Tradução falhou");

  for (let attempt = 0; attempt <= options.maxRetries; attempt += 1) {
    if (options.signal.aborted) throw new Error("Tradução cancelada");
    try {
      const result = await withTimeout(
        provider.translate(segments, options.context, options.signal),
        options.timeoutMs,
      );
      validateIds(segments, result);
      return applyGlossaryToResult(result, options.context.glossary);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

function validateIds(input: TranslationSegment[], result: TranslationResult): void {
  const expected = new Set(input.map((segment) => segment.id));
  const received = new Set(result.segments.map((segment) => segment.id));
  if (expected.size !== received.size || [...expected].some((id) => !received.has(id))) {
    throw new Error("IDs de tradução inválidos");
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Tradução excedeu o tempo limite")), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
