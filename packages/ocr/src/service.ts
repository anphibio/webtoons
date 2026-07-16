import { normalizeOcrResult } from "./normalize";
import type { OcrInput, OcrProgressCallback, OcrProvider, OcrResult } from "./types";

export interface OcrControlOptions {
  signal: AbortSignal;
  timeoutMs: number;
  onProgress?: OcrProgressCallback;
}

export async function recognizeWithControls(
  provider: OcrProvider,
  input: OcrInput,
  options: OcrControlOptions,
): Promise<OcrResult> {
  if (options.signal.aborted) throw new Error("OCR cancelado");

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("OCR excedeu o tempo limite")), options.timeoutMs);
  });

  try {
    const raw = await Promise.race([
      provider.recognize(input, options.signal, options.onProgress),
      timeoutPromise,
    ]);
    return normalizeOcrResult(raw, {
      width: positiveDimension(raw.width) ?? input.width,
      height: positiveDimension(raw.height) ?? input.height,
    });
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function positiveDimension(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
