import { describe, expect, it } from "vitest";
import { preprocessPixels } from "../packages/ocr/src/preprocess";

describe("pré-processamento de OCR", () => {
  it("converte pixels para escala de cinza", () => {
    const result = preprocessPixels({
      data: new Uint8ClampedArray([255, 0, 0, 255, 0, 0, 255, 255]),
      width: 2,
      height: 1,
    }, { grayscale: true });

    expect([...result.data]).toEqual([76, 76, 76, 255, 29, 29, 29, 255]);
  });

  it("aplica threshold preservando o canal alpha", () => {
    const result = preprocessPixels({
      data: new Uint8ClampedArray([100, 100, 100, 255, 220, 220, 220, 128]),
      width: 2,
      height: 1,
    }, { grayscale: true, threshold: 128 });

    expect([...result.data]).toEqual([0, 0, 0, 255, 255, 255, 255, 128]);
  });
});
