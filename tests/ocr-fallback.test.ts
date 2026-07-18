import { describe, expect, it } from "vitest";
import { chooseOcrFallback, mergeOcrResults, shouldAttemptSingleBlockFallback } from "../packages/ocr/src/fallback";
import type { RawOcrResult } from "../packages/ocr/src/types";

const region = (text: string, confidence: number) => ({
  id: text,
  text,
  confidence,
  bbox: { x: 0, y: 0, width: 10, height: 10 },
  rotation: 0,
});

describe("fallback single-block do OCR", () => {
  it("tenta recuperação local quando a leitura esparsa tem baixa cobertura", () => {
    expect(shouldAttemptSingleBlockFallback({ regions: [] })).toBe(true);
    expect(shouldAttemptSingleBlockFallback({ regions: [region("Hello", 0.8)] })).toBe(true);
    expect(shouldAttemptSingleBlockFallback({ regions: [region("A", 0.8), region("B", 0.8), region("C", 0.8)] })).toBe(true);
    expect(shouldAttemptSingleBlockFallback({ regions: [region("Hello there", 0.8), region("I am here", 0.8), region("Please wait", 0.8), region("Come quickly", 0.8)] })).toBe(false);
  });

  it("escolhe o fallback quando ele fornece evidência claramente melhor", () => {
    const primary: RawOcrResult = { regions: [region("noise", 0.3)] };
    const fallback: RawOcrResult = { regions: [region("Hello world", 0.8)] };

    expect(chooseOcrFallback(primary, fallback)).toBe(fallback);
  });

  it("não escolhe o fallback quando as regiões extras são ruído", () => {
    const primary: RawOcrResult = { regions: [region("OVERTIME...", 0.9)] };
    const fallback: RawOcrResult = { regions: [region("Hmng", 0.95), region("Heugho Leuol", 0.95)] };

    expect(chooseOcrFallback(primary, fallback)).toBe(primary);
  });

  it("aciona o fallback quando o detector devolve várias caixas, mas pouca evidência útil", () => {
    const noisy: RawOcrResult = {
      regions: [
        region("BMAA", 0.42),
        region("UGHN...I UGHH..I", 0.88),
        region("Fr", 0.3),
        region("o", 0.35),
        region("o H", 0.51),
        region("(", 0.44),
        region("M", 0.3),
      ],
    };

    expect(shouldAttemptSingleBlockFallback(noisy)).toBe(true);
  });

  it("não aciona recuperação em uma imagem já bem reconhecida", () => {
    const covered: RawOcrResult = {
      regions: [
        region("Hello there", 0.9),
        region("I am here", 0.9),
        region("Please wait", 0.9),
        region("Come quickly", 0.9),
      ],
    };

    expect(shouldAttemptSingleBlockFallback(covered)).toBe(false);
  });

  it("aciona recuperação quando uma das poucas detecções é fraca", () => {
    const partial = [
      region("One", 0.9),
      region("Two", 0.9),
      region("Three", 0.9),
      region("Four", 0.9),
      region("Maybe", 0.55),
    ];
    expect(shouldAttemptSingleBlockFallback({ regions: partial })).toBe(true);
  });

  it("mescla regiões do fallback sem descartar regiões válidas do OCR principal", () => {
    const primary = { regions: [{ ...region("Primary", 0.9), bbox: { x: 0, y: 0, width: 20, height: 20 } }] };
    const fallback = { regions: [
      { ...region("Primary", 0.8), bbox: { x: 1, y: 1, width: 20, height: 20 } },
      { ...region("Recovered", 0.8), bbox: { x: 60, y: 60, width: 20, height: 20 } },
    ] };

    expect(mergeOcrResults(primary, fallback).regions.map((item) => item.text)).toEqual(["Primary", "Recovered"]);
  });
});
