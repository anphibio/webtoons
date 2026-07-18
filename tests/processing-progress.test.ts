import { describe, expect, it } from "vitest";
import { completionStatus, normalizeProgress, shouldQueueImage, shouldRetryImage } from "../packages/core/src/processing-progress";

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

describe("estado final acumulado", () => {
  it("mantém erro quando uma falha ocorreu em lote anterior", () => {
    expect(completionStatus({ failed: 1, empty: 0 })).toBe("completed-with-errors");
    expect(completionStatus({ failed: 0, empty: 1 })).toBe("completed-with-errors");
    expect(completionStatus({ failed: 0, empty: 0 })).toBe("completed");
  });
});

describe("resumo exibido", () => {
  it("não exibe progresso concluído maior que o total conhecido", () => {
    expect(normalizeProgress({ total: 20, completed: 23, failed: 0, rendered: 23, empty: 0 }))
      .toMatchObject({ total: 23, completed: 23 });
  });
});
