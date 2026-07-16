import { describe, expect, it } from "vitest";
import { chooseOcrFallback, shouldAttemptSingleBlockFallback } from "../packages/ocr/src/fallback";
import type { RawOcrResult } from "../packages/ocr/src/types";

const region = (text: string, confidence: number) => ({
  id: text,
  text,
  confidence,
  bbox: { x: 0, y: 0, width: 10, height: 10 },
  rotation: 0,
});

describe("fallback single-block do OCR", () => {
  it("só tenta single-block quando a leitura esparsa encontrou no máximo uma região", () => {
    expect(shouldAttemptSingleBlockFallback({ regions: [] })).toBe(true);
    expect(shouldAttemptSingleBlockFallback({ regions: [region("Hello", 0.8)] })).toBe(true);
    expect(shouldAttemptSingleBlockFallback({ regions: [region("A", 0.8), region("B", 0.8)] })).toBe(false);
  });

  it("escolhe o fallback quando ele fornece evidência claramente melhor", () => {
    const primary: RawOcrResult = { regions: [region("noise", 0.3)] };
    const fallback: RawOcrResult = { regions: [region("Hello world", 0.8)] };

    expect(chooseOcrFallback(primary, fallback)).toBe(fallback);
  });
});
