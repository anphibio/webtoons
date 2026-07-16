import { describe, expect, it } from "vitest";
import { rankBenchmarkVariants } from "../packages/ocr/src/benchmark";

describe("benchmark de variantes do OCR", () => {
  it("ordena as variantes pela menor média de CER", () => {
    const result = rankBenchmarkVariants([
      { variant: "sparse-text", averageCer: 0.4, averageWer: 0.5, samples: 3 },
      { variant: "single-block", averageCer: 0.2, averageWer: 0.4, samples: 3 },
      { variant: "auto", averageCer: 0.3, averageWer: 0.3, samples: 3 },
    ]);

    expect(result.map((item) => item.variant)).toEqual(["single-block", "auto", "sparse-text"]);
  });
});
