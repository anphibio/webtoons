import { describe, expect, it } from "vitest";
import {
  calculateCer,
  calculateWer,
  findEvaluationRegressions,
  normalizeEvaluationText,
} from "../packages/ocr/src/evaluation";

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

  it("detecta regressão acima da tolerância da linha de base", () => {
    const baseline = [{ lot: "lote-01", samples: 22, averageCer: 0.25, averageWer: 0.46 }];

    expect(findEvaluationRegressions(
      [{ lot: "lote-01", samples: 22, averageCer: 0.26, averageWer: 0.47 }],
      baseline,
      0.02,
    )).toEqual([]);

    expect(findEvaluationRegressions(
      [{ lot: "lote-01", samples: 22, averageCer: 0.29, averageWer: 0.47 }],
      baseline,
      0.02,
    )).toEqual(["lote-01 CER subiu de 25.0% para 29.0%"]);
  });
});
