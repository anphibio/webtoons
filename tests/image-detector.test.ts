// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createImageCandidate, GenericImageDetector } from "../packages/site-adapters/src/generic-detector";

describe("detector genérico de imagens", () => {
  it("seleciona imagens grandes em sequência vertical", () => {
    document.body.innerHTML = readFileSync(resolve(process.cwd(), "tests/fixtures/vertical-chapter.html"), "utf8");

    const result = new GenericImageDetector().detect(document);

    expect(result.candidates.map((candidate) => candidate.sourceUrl)).toEqual([
      "page-1.jpg",
      "page-2.jpg",
    ]);
    expect(result.root.id).toBe("reader");
  });

  it("ignora imagens pequenas e elementos promocionais", () => {
    document.body.innerHTML = `
      <main>
        <img src="page.jpg" width="800" height="1200" />
        <img class="logo" src="logo.png" width="500" height="500" />
        <img src="icon.png" width="64" height="64" />
      </main>
    `;

    const result = new GenericImageDetector().detect(document);

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.sourceUrl).toBe("page.jpg");
  });

  it("ignora anúncio inserido dentro do contêiner principal", () => {
    document.body.innerHTML = `
      <main>
        <img src="page.jpg" width="800" height="1200" />
        <div class="chapter-banner"><img src="promo.jpg" width="800" height="400" /></div>
      </main>
    `;

    const result = new GenericImageDetector().detect(document);

    expect(result.candidates.map((candidate) => candidate.sourceUrl)).toEqual(["page.jpg"]);
  });

  it("resolve imagens lazy-loaded e srcset", () => {
    document.body.innerHTML = `
      <main>
        <img data-src="lazy-page.jpg" width="800" height="1200" />
        <img srcset="small.jpg 480w, large-page.jpg 1200w" width="800" height="1200" />
      </main>
    `;

    const result = new GenericImageDetector().detect(document);

    expect(result.candidates.map((candidate) => candidate.sourceUrl)).toEqual([
      "lazy-page.jpg",
      "large-page.jpg",
    ]);
  });

  it("mantém a identidade da imagem quando o lazy-load revela suas dimensões", () => {
    const image = document.createElement("img");
    image.setAttribute("data-src", "lazy-page.jpg");
    const beforeLoad = createImageCandidate(image, 3, { allowUnknownDimensions: true });

    image.setAttribute("width", "720");
    image.setAttribute("height", "6900");
    const afterLoad = createImageCandidate(image, 3, { allowUnknownDimensions: true });

    expect(afterLoad?.id).toBe(beforeLoad?.id);
  });
});
