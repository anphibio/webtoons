import { describe, expect, it } from "vitest";
import { mapTesseractPage } from "../packages/ocr/src/tesseract-provider";

describe("mapeamento do resultado Tesseract", () => {
  it("converte blocos em regiões com bounding boxes", () => {
    const result = mapTesseractPage({
      text: "Hello",
      blocks: [{ text: " Hello ", confidence: 87.5, bbox: { x0: 10, y0: 20, x1: 110, y1: 70 } }],
    }, { width: 200, height: 100 });

    expect(result.regions).toEqual([
      {
        id: "ocr-0",
        text: "Hello",
        confidence: 0.875,
        bbox: { x: 10, y: 20, width: 100, height: 50 },
        rotation: 0,
      },
    ]);
  });

  it("agrupa linhas do mesmo parágrafo para preservar o contexto da fala", () => {
    const result = mapTesseractPage({
      text: "Hello\nworld",
      blocks: [{
        text: "Hello world",
        confidence: 85,
        bbox: { x0: 10, y0: 20, x1: 115, y1: 65 },
        paragraphs: [{
          lines: [
            { text: " Hello ", confidence: 90, bbox: { x0: 10, y0: 20, x1: 110, y1: 40 } },
            { text: " world ", confidence: 80, bbox: { x0: 15, y0: 45, x1: 115, y1: 65 } },
          ],
        }],
      }],
    }, { width: 200, height: 100 });

    expect(result.regions.map((region) => region.text)).toEqual(["Hello world"]);
    expect(result.regions[0]?.bbox).toEqual({ x: 10, y: 20, width: 105, height: 45 });
  });

  it("usa a página inteira quando o OCR retorna texto sem blocos", () => {
    const result = mapTesseractPage({ text: "Hello", blocks: null }, { width: 200, height: 100 });

    expect(result.regions[0]?.bbox).toEqual({ x: 0, y: 0, width: 200, height: 100 });
  });

  it("corrige confusões recorrentes entre letras e números em frases", () => {
    const result = mapTesseractPage({
      blocks: [{
        text: "J POR QUE 15 HE 50 BiG?!",
        confidence: 90,
        bbox: { x0: 0, y0: 0, x1: 200, y1: 40 },
      }],
    }, { width: 200, height: 100 });

    expect(result.regions[0]?.text).toBe("J POR QUE IS HE SO BiG?!");
  });

  it("junta linhas próximas mesmo quando o Tesseract as separa em blocos", () => {
    const result = mapTesseractPage({
      blocks: [
        { text: "I FEEL", confidence: 90, bbox: { x0: 40, y0: 10, x1: 140, y1: 30 } },
        { text: "SORRY FOR", confidence: 90, bbox: { x0: 35, y0: 36, x1: 145, y1: 56 } },
      ],
    }, { width: 200, height: 100 });

    expect(result.regions.map((region) => region.text)).toEqual(["I FEEL SORRY FOR"]);
  });

  it("mantém onomatopeias próximas como regiões independentes", () => {
    const result = mapTesseractPage({
      blocks: [
        { text: "A KID LIKE YOU", confidence: 90, bbox: { x0: 100, y0: 100, x1: 300, y1: 130 } },
        { text: "Haah...", confidence: 90, bbox: { x0: 260, y0: 160, x1: 360, y1: 190 } },
      ],
    }, { width: 400, height: 300 });

    expect(result.regions.map((region) => region.text)).toEqual(["A KID LIKE YOU", "Haah..."]);
  });
});
