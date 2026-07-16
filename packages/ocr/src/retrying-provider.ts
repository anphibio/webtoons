import type { OcrInput, OcrProgressCallback, OcrProvider, RawOcrResult } from "./types";

export class RetryingOcrProvider implements OcrProvider {
  constructor(
    private readonly provider: OcrProvider,
    private readonly maxRetries: number,
  ) {}

  async recognize(input: OcrInput, signal?: AbortSignal, onProgress?: OcrProgressCallback): Promise<RawOcrResult> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.provider.recognize(input, signal, onProgress);
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    throw lastError;
  }
}
