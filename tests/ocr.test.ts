import { describe, expect, it } from "vitest";
import { MockOcrProvider } from "../packages/ocr/src/mock-provider";
import { normalizeOcrResult } from "../packages/ocr/src/normalize";
import { recognizeWithControls } from "../packages/ocr/src/service";
import type { OcrInput } from "../packages/ocr/src/types";

const input: OcrInput = { image: new Uint8Array([1, 2, 3]), width: 100, height: 100, language: "eng" };

describe("contrato de OCR", () => {
  it("normaliza regiões, remove texto vazio e limita coordenadas", () => {
    const result = normalizeOcrResult({
      regions: [
        { id: "r1", text: " Hello ", confidence: 1.4, bbox: { x: -10, y: 20, width: 150, height: 80 }, rotation: 0 },
        { id: "r2", text: "   ", confidence: 0.3, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
      ],
    }, { width: 100, height: 100 });

    expect(result.regions).toEqual([
      { id: "r1", text: "Hello", confidence: 1, bbox: { x: 0, y: 20, width: 100, height: 80 }, rotation: 0 },
    ]);
  });

  it("remove falsos positivos com baixa confiança ou símbolos de ruído", () => {
    const result = normalizeOcrResult({
      regions: [
        { id: "noise-1", text: "h-=SY", confidence: 0.8, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
        { id: "noise-2", text: "Nº 7", confidence: 0.8, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
        { id: "noise-3", text: "FURANO", confidence: 0.2, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
        { id: "valid", text: "SORRY.", confidence: 0.8, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
      ],
    }, { width: 100, height: 100 });

    expect(result.regions.map((region) => region.text)).toEqual(["SORRY."]);
  });

  it("remove sequências sem sentido com fragmentos e números", () => {
    const result = normalizeOcrResult({
      regions: [{
        id: "gibberish",
        text: "W toror n° sdo n° ado a 0",
        confidence: 0.91,
        bbox: { x: 20, y: 30, width: 280, height: 50 },
        rotation: 0,
      }],
    }, { width: 400, height: 400 });

    expect(result.regions).toEqual([]);
  });

  it("normaliza caixas anormalmente altas sem perder texto curto válido", () => {
    const result = normalizeOcrResult({
      regions: [
        { id: "dialogue", text: "A KID LIKE YOU", confidence: 0.98, bbox: { x: 100, y: 500, width: 300, height: 34 }, rotation: 0 },
        { id: "sound-effect", text: "Haah", confidence: 0.91, bbox: { x: 600, y: 620, width: 140, height: 560 }, rotation: 0 },
      ],
    }, { width: 800, height: 1200 });

    expect(result.regions.map((region) => region.text)).toEqual(["A KID LIKE YOU", "Haah"]);
    expect(result.regions[1]?.bbox.height).toBeLessThan(560);
  });

  it("preserva o til usado como pontuação expressiva em diálogos", () => {
    const result = normalizeOcrResult({
      regions: [
        {
          id: "expressive-dialogue",
          text: "YOU~ REALLY~ NEED A LESSON.",
          confidence: 0.98,
          bbox: { x: 10, y: 20, width: 200, height: 80 },
          rotation: 0,
        },
      ],
    }, { width: 300, height: 200 });

    expect(result.regions.map((region) => region.text)).toEqual(["YOU~ REALLY~ NEED A LESSON."]);
  });

  it("preserva pontuação editorial de telas de sistema e caixas narrativas", () => {
    const texts = [
      "REMAINING POINTS: 3",
      "DAILY QUEST (8.412 KM / 10 KM)",
      "FIRST CLEAR +2 POINTS",
      "•• TURN IT DOWN A NOTCH",
      "[YU HANA]",
      "ADAPTATION & ART: MEONSONG",
    ];
    const result = normalizeOcrResult({
      regions: texts.map((text, index) => ({
        id: `editorial-${index}`,
        text,
        confidence: 0.98,
        bbox: { x: 10, y: 20 + index * 20, width: 200, height: 20 },
        rotation: 0,
      })),
    }, { width: 300, height: 200 });

    expect(result.regions.map((region) => region.text)).toEqual(texts);
  });

  it("remove regiões curtas formadas por glifos sem palavras reconhecíveis", () => {
    const result = normalizeOcrResult({
      regions: [
        { id: "noise-1", text: "A RD", confidence: 0.8, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
        { id: "noise-2", text: "TE THI", confidence: 0.8, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
        { id: "noise-3", text: "Pas", confidence: 0.8, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
        { id: "valid", text: "I CAN", confidence: 0.8, bbox: { x: 0, y: 0, width: 10, height: 10 }, rotation: 0 },
      ],
    }, { width: 100, height: 100 });

    expect(result.regions.map((region) => region.text)).toEqual(["I CAN"]);
  });

  it("preserva frases válidas compostas por várias palavras curtas", () => {
    const texts = ["HOW FAR DID SHE GO?", "I'LL PAY YOU."];
    const result = normalizeOcrResult({
      regions: texts.map((text, index) => ({
        id: `short-dialogue-${index}`,
        text,
        confidence: 0.99,
        bbox: { x: 10, y: 20 + index * 40, width: 180, height: 30 },
        rotation: 0,
      })),
    }, { width: 300, height: 200 });

    expect(result.regions.map((region) => region.text)).toEqual(texts);
  });

  it("retorna progresso e respeita cancelamento", async () => {
    const progress: number[] = [];
    const controller = new AbortController();
    const provider = new MockOcrProvider({ delayMs: 5, result: { regions: [] } });

    const result = await recognizeWithControls(provider, input, {
      signal: controller.signal,
      onProgress: (value) => progress.push(value),
      timeoutMs: 100,
    });

    expect(result.regions).toEqual([]);
    expect(progress).toEqual([0, 1]);
  });

  it("usa as dimensões reais retornadas pelo provedor para imagens lazy ainda sem tamanho", async () => {
    const provider = new MockOcrProvider({
      result: {
        width: 720,
        height: 7000,
        regions: [{
          id: "ocr-0",
          text: "They do not see us as humans",
          confidence: 0.95,
          bbox: { x: 120, y: 2400, width: 360, height: 180 },
          rotation: 0,
        }],
      },
    });

    const result = await recognizeWithControls(
      provider,
      { ...input, width: 0, height: 0 },
      { signal: new AbortController().signal, timeoutMs: 100 },
    );

    expect(result.width).toBe(720);
    expect(result.height).toBe(7000);
    expect(result.regions[0]?.bbox).toEqual({ x: 120, y: 2400, width: 360, height: 180 });
  });

  it("falha com erro de timeout", async () => {
    const provider = new MockOcrProvider({ delayMs: 50, result: { regions: [] } });

    await expect(
      recognizeWithControls(provider, input, { signal: new AbortController().signal, timeoutMs: 1 }),
    ).rejects.toThrow("OCR excedeu o tempo limite");
  });
});
