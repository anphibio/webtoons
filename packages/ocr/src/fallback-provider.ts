import type { OcrInput, OcrProgressCallback, OcrProvider, RawOcrResult } from "./types";
import { mergeOcrResults, shouldAttemptSingleBlockFallback } from "./fallback";

export class FallbackOcrProvider implements OcrProvider {
  constructor(
    private readonly primary: OcrProvider,
    private readonly fallback: OcrProvider,
  ) {}

  async recognize(input: OcrInput, signal?: AbortSignal, onProgress?: OcrProgressCallback): Promise<RawOcrResult> {
    let primaryError: unknown;
    try {
      const result = await this.primary.recognize(input, signal, onProgress);
      if (result.regions.length > 0 && !shouldAttemptSingleBlockFallback(result)) return result;
      if (result.regions.length > 0) {
        let fallbackResult: RawOcrResult;
        try {
          fallbackResult = await this.fallback.recognize(input, signal, onProgress);
        } catch (error) {
          if (signal?.aborted) throw error;
          return result;
        }
        return fallbackResult.regions.length > 0 ? mergeOcrResults(result, fallbackResult) : result;
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      primaryError = error;
    }
    const fallbackResult = await this.fallback.recognize(input, signal, onProgress);
    if (primaryError && fallbackResult.regions.length === 0) throw primaryError;
    return fallbackResult;
  }
}
