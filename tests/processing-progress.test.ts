import { describe, expect, it } from "vitest";
import { shouldRetryImage } from "../packages/core/src/processing-progress";

describe("retry de processamento de imagem", () => {
  it("permite uma segunda tentativa, mas não um loop infinito", () => {
    expect(shouldRetryImage(0)).toBe(true);
    expect(shouldRetryImage(1)).toBe(true);
    expect(shouldRetryImage(2)).toBe(false);
    expect(shouldRetryImage(1, 1)).toBe(false);
  });
});
