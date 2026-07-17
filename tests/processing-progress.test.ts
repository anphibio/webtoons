import { describe, expect, it } from "vitest";
import { shouldQueueImage, shouldRetryImage } from "../packages/core/src/processing-progress";

describe("retry de processamento de imagem", () => {
  it("permite uma segunda tentativa, mas não um loop infinito", () => {
    expect(shouldRetryImage(0)).toBe(true);
    expect(shouldRetryImage(1)).toBe(true);
    expect(shouldRetryImage(2)).toBe(false);
    expect(shouldRetryImage(1, 1)).toBe(false);
  });
});

describe("fila de imagens", () => {
  it("não descarta imagens distantes quando a descoberta precisa drenar o capítulo", () => {
    expect(shouldQueueImage("distant", true)).toBe(true);
    expect(shouldQueueImage("distant", false)).toBe(false);
    expect(shouldQueueImage("nearby", false)).toBe(true);
  });
});
