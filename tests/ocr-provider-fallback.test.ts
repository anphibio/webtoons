import { describe, expect, it, vi } from "vitest";
import { FallbackOcrProvider } from "../packages/ocr/src/fallback-provider";
import { RetryingOcrProvider } from "../packages/ocr/src/retrying-provider";
import type { OcrInput, OcrProvider } from "../packages/ocr/src/types";

const input: OcrInput = { image: new Uint8Array([1]), width: 1, height: 1, language: "eng" };

describe("FallbackOcrProvider", () => {
  it("usa o resultado do OCR principal quando há texto", async () => {
    const primary = providerWith(vi.fn().mockResolvedValue({ regions: [
      { id: "p1", text: "Hello" },
      { id: "p2", text: "world" },
    ] }));
    const fallbackRecognize = vi.fn();
    const fallback = providerWith(fallbackRecognize);

    const result = await new FallbackOcrProvider(primary, fallback).recognize(input);

    expect(result.regions[0]?.id).toBe("p1");
    expect(fallbackRecognize).not.toHaveBeenCalled();
  });

  it("consulta o OCR local quando o principal encontra apenas uma região", async () => {
    const primary = providerWith(vi.fn().mockResolvedValue({ regions: [{ id: "p", text: "Hello", confidence: 0.8 }] }));
    const fallback = providerWith(vi.fn().mockResolvedValue({ regions: [
      { id: "f1", text: "Hello", confidence: 0.8 },
      { id: "f2", text: "world", confidence: 0.8 },
    ] }));

    const result = await new FallbackOcrProvider(primary, fallback).recognize(input);

    expect(result.regions.map((region) => region.text)).toEqual(["Hello", "world"]);
  });

  it("usa o Tesseract quando o OCR principal falha ou não encontra texto", async () => {
    const expected = { regions: [{ id: "f", text: "Fallback" }] };
    const fallbackRecognize = vi.fn().mockResolvedValue(expected);
    const fallback = providerWith(fallbackRecognize);

    await expect(new FallbackOcrProvider(
      providerWith(vi.fn().mockRejectedValue(new Error("offline"))),
      fallback,
    ).recognize(input)).resolves.toEqual(expected);
    await expect(new FallbackOcrProvider(
      providerWith(vi.fn().mockResolvedValue({ regions: [] })),
      fallback,
    ).recognize(input)).resolves.toEqual(expected);
  });

  it("preserva a falha do OCR principal quando o fallback também volta vazio", async () => {
    const primaryError = new Error("backend indisponível");

    await expect(new FallbackOcrProvider(
      providerWith(vi.fn().mockRejectedValue(primaryError)),
      providerWith(vi.fn().mockResolvedValue({ regions: [] })),
    ).recognize(input)).rejects.toThrow("backend indisponível");
  });
});

describe("RetryingOcrProvider", () => {
  it("repete uma falha transitória do OCR principal antes de desistir", async () => {
    const expected = { regions: [{ id: "p", text: "Recovered" }] };
    const recognize = vi.fn()
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce(expected);

    await expect(new RetryingOcrProvider(providerWith(recognize), 1).recognize(input)).resolves.toEqual(expected);
    expect(recognize).toHaveBeenCalledTimes(2);
  });
});

function providerWith(recognize: OcrProvider["recognize"]): OcrProvider {
  return { recognize };
}
