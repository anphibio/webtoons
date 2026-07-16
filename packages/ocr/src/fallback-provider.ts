import type { OcrInput, OcrProgressCallback, OcrProvider, RawOcrResult } from "./types";

export class FallbackOcrProvider implements OcrProvider {
  constructor(
    private readonly primary: OcrProvider,
    private readonly fallback: OcrProvider,
  ) {}

  async recognize(input: OcrInput, signal?: AbortSignal, onProgress?: OcrProgressCallback): Promise<RawOcrResult> {
    let primaryError: unknown;
    try {
      const result = await this.primary.recognize(input, signal, onProgress);
      if (result.regions.length > 0) return result;
    } catch (error) {
      if (signal?.aborted) throw error;
      primaryError = error;
    }
    const fallbackResult = await this.fallback.recognize(input, signal, onProgress);
    if (primaryError && fallbackResult.regions.length === 0) throw primaryError;
    return fallbackResult;
  }
}
