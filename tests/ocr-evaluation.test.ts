import { describe, expect, it } from "vitest";
import { calculateCer, calculateWer, normalizeEvaluationText } from "../packages/ocr/src/evaluation";

describe("métricas de avaliação do OCR", () => {
  it("normaliza diferenças de caixa e espaços sem alterar o conteúdo", () => {
    expect(normalizeEvaluationText("  Hello\nWORLD!  ")).toBe("hello world!");
  });

  it("calcula CER como distância de caracteres sobre a referência", () => {
    expect(calculateCer("Hello", "Hillo")).toBe(0.2);
    expect(calculateCer("", "texto")).toBe(1);
    expect(calculateCer("texto", "")).toBe(1);
  });

  it("calcula WER por palavras e aceita uma frase idêntica", () => {
    expect(calculateWer("one two three", "one four three")).toBeCloseTo(1 / 3);
    expect(calculateWer("same phrase", "same phrase")).toBe(0);
  });
});
