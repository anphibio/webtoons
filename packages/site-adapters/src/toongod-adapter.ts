import { createImageCandidate } from "./generic-detector";
import type { ImageCandidate, SiteAdapter } from "./types";

const TOONGOD_HOSTS = new Set(["toongod.org", "www.toongod.org"]);

export class ToonGodAdapter implements SiteAdapter {
  readonly id = "toongod";

  matches(url: URL): boolean {
    return TOONGOD_HOSTS.has(url.hostname) && url.pathname.startsWith("/webtoon/");
  }

  findChapterRoot(document: Document): Element | null {
    return document.querySelector(".reading-content");
  }

  findPageImages(root: Element): ImageCandidate[] {
    return Array.from(root.querySelectorAll<HTMLImageElement>("img.wp-manga-chapter-img"))
      .map((element, index) => createImageCandidate(element, index, { allowUnknownDimensions: true }))
      .filter((candidate): candidate is ImageCandidate => candidate !== null);
  }
}
