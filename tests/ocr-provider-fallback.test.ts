import { describe, expect, it, vi } from "vitest";
import { FallbackOcrProvider } from "../packages/ocr/src/fallback-provider";
import { RetryingOcrProvider } from "../packages/ocr/src/retrying-provider";
import type { OcrInput, OcrProvider } from "../packages/ocr/src/types";

const input: OcrInput = { image: new Uint8Array([1]), width: 1, height: 1, language: "eng" };

describe("FallbackOcrProvider", () => {
  it("usa o resultado do OCR principal quando há texto", async () => {
    const primary = providerWith(vi.fn().mockResolvedValue({ regions: [
      { id: "p1", text: "Hello", bbox: { x: 0, y: 0, width: 10, height: 10 } },
      { id: "p2", text: "world", bbox: { x: 20, y: 0, width: 10, height: 10 } },
      { id: "p3", text: "again", bbox: { x: 40, y: 0, width: 10, height: 10 } },
      { id: "p4", text: "today", bbox: { x: 60, y: 0, width: 10, height: 10 } },
    ] }));
    const fallbackRecognize = vi.fn().mockResolvedValue({ regions: [] });
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

  it("consulta o OCR local quando o resultado principal tem baixa cobertura", async () => {
    const primary = providerWith(vi.fn().mockResolvedValue({ regions: [
      { id: "p1", text: "One", confidence: 0.8 },
      { id: "p2", text: "Two", confidence: 0.8 },
      { id: "p3", text: "Three", confidence: 0.8 },
    ] }));
    const fallback = providerWith(vi.fn().mockResolvedValue({ regions: [
      { id: "f1", text: "One", confidence: 0.8 },
      { id: "f2", text: "Two", confidence: 0.8 },
      { id: "f3", text: "Three", confidence: 0.8 },
      { id: "f4", text: "Four", confidence: 0.8 },
      { id: "f5", text: "Five", confidence: 0.8 },
    ] }));

    const result = await new FallbackOcrProvider(primary, fallback).recognize(input);

    expect(result.regions.map((region) => region.text)).toEqual(["One", "Two", "Three", "Four", "Five"]);
  });

  it("preserva o texto principal ao recuperar regiões adicionais", async () => {
    const primary = providerWith(vi.fn().mockResolvedValue({ regions: [
      { id: "p1", text: "One", confidence: 0.8, bbox: { x: 0, y: 0, width: 10, height: 10 } },
      { id: "p2", text: "Two", confidence: 0.8, bbox: { x: 20, y: 0, width: 10, height: 10 } },
      { id: "p3", text: "Three", confidence: 0.8, bbox: { x: 40, y: 0, width: 10, height: 10 } },
      { id: "p4", text: "Four", confidence: 0.8, bbox: { x: 60, y: 0, width: 10, height: 10 } },
      { id: "p5", text: "Five", confidence: 0.8, bbox: { x: 80, y: 0, width: 10, height: 10 } },
    ] }));
    const fallback = providerWith(vi.fn().mockResolvedValue({ regions: [
      { id: "f1", text: "Recovered", confidence: 0.8, bbox: { x: 50, y: 50, width: 10, height: 10 } },
    ] }));

    const result = await new FallbackOcrProvider(primary, fallback).recognize(input);

    expect(result.regions.map((region) => region.text)).toContain("Recovered");
    expect(result.regions.map((region) => region.text)).toContain("One");
  });

  it("preserva o resultado principal quando o fallback local falha", async () => {
    const primaryResult = { regions: [{ id: "p", text: "Texto válido", confidence: 0.8 }] };
    const fallback = providerWith(vi.fn().mockRejectedValue(new Error("falha no Tesseract WASM")));

    await expect(new FallbackOcrProvider(
      providerWith(vi.fn().mockResolvedValue(primaryResult)),
      fallback,
    ).recognize(input)).resolves.toEqual(primaryResult);
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
