import type { OcrProvider, OcrInput, OcrProgressCallback, RawOcrResult } from "./types";

export class MockOcrProvider implements OcrProvider {
  constructor(private readonly options: { delayMs?: number; result: RawOcrResult }) {}

  recognize(input: OcrInput, signal?: AbortSignal, onProgress?: OcrProgressCallback): Promise<RawOcrResult> {
    void input;
    onProgress?.(0);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (signal?.aborted) {
          reject(new Error("OCR cancelado"));
          return;
        }
        onProgress?.(1);
        resolve(this.options.result);
      }, this.options.delayMs ?? 0);

      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("OCR cancelado"));
      }, { once: true });
    });
  }
}
