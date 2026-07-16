// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ToonGodAdapter } from "../packages/site-adapters/src/toongod-adapter";

const fixtures = [
  {
    path: "SiteTeste/Read Heart-Pounding S-Matching Chapter 9 Online - ToonGod.html",
    count: 26,
    firstPage: "/001_1.jpg",
    lastPage: "/013_2.jpg",
  },
  {
    path: "SiteTeste/Read I Banged All My Classmates After Graduation Chapter 4 Online - ToonGod.html",
    count: 24,
    firstPage: "/001_1.jpg",
    lastPage: "/012_2.jpg",
  },
].map((fixture) => ({ ...fixture, path: resolve(process.cwd(), fixture.path) }));

describe("adaptador ToonGod", () => {
  it("reconhece o domínio e encontra o contêiner do capítulo", () => {
    document.body.innerHTML = readFileSync(fixtures[0].path, "utf8");
    const adapter = new ToonGodAdapter();

    expect(adapter.matches(new URL("https://www.toongod.org/webtoon/heart-pounding-s-matching/chapter-9/"))).toBe(true);
    expect(adapter.matches(new URL("https://example.com/webtoon/chapter-9/"))).toBe(false);
    expect(adapter.findChapterRoot(document)?.classList.contains("reading-content")).toBe(true);
  });

  it("seleciona as 26 páginas e usa a URL de data-src", () => {
    document.body.innerHTML = readFileSync(fixtures[0].path, "utf8");
    const adapter = new ToonGodAdapter();
    const root = adapter.findChapterRoot(document);

    expect(root).not.toBeNull();
    const candidates = adapter.findPageImages(root!);

    expect(candidates).toHaveLength(fixtures[0].count);
    expect(candidates[0]?.sourceUrl).toContain(fixtures[0].firstPage);
    expect(candidates[25]?.sourceUrl).toContain(fixtures[0].lastPage);
    expect(candidates.every((candidate) => candidate.element.matches(".wp-manga-chapter-img"))).toBe(true);
  });

  it("mantém a mesma regra em outro capítulo do ToonGod", () => {
    document.body.innerHTML = readFileSync(fixtures[1].path, "utf8");
    const adapter = new ToonGodAdapter();
    const root = adapter.findChapterRoot(document);
    const candidates = adapter.findPageImages(root!);

    expect(candidates).toHaveLength(fixtures[1].count);
    expect(candidates[0]?.sourceUrl).toContain(fixtures[1].firstPage);
    expect(candidates.at(-1)?.sourceUrl).toContain(fixtures[1].lastPage);
  });
});
