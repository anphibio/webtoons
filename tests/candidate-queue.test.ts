import { describe, expect, it } from "vitest";
import { prioritizeImageCandidates } from "../packages/core/src/candidate-queue";
import type { ImageCandidate } from "../packages/site-adapters/src/types";

function candidate(id: string, priority: ImageCandidate["priority"]): ImageCandidate {
  return {
    id,
    element: {} as HTMLImageElement,
    sourceUrl: `https://cdn.example/${id}.jpg`,
    width: 720,
    height: 7000,
    score: 100,
    priority,
  };
}

describe("fila do capítulo", () => {
  it("inclui todas as páginas e processa as visíveis antes das distantes", () => {
    const result = prioritizeImageCandidates([
      candidate("page-12", "distant"),
      candidate("page-1", "visible"),
      candidate("page-6", "nearby"),
      candidate("page-11", "distant"),
    ]);

    expect(result.map((item) => item.id)).toEqual(["page-1", "page-6", "page-12", "page-11"]);
  });
});
