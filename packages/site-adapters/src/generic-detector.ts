import type { ImageCandidate, ImageDetectionResult } from "./types";

const MIN_DIMENSION = 160;
const PROMOTIONAL_PATTERN = /(?:^|[\s_-])(logo|avatar|banner|promo|advert|ad|icon|button|social|header|footer)(?:$|[\s_-])/i;

export class GenericImageDetector {
  detect(document: Document): ImageDetectionResult {
    const root = this.findChapterRoot(document);
    const candidates = root ? this.findPageImages(root) : [];
    return { root: root ?? document.body, candidates };
  }

  findChapterRoot(document: Document): Element | null {
    const semanticRoots = Array.from(document.querySelectorAll("main, article, [role='main']"));
    const root = semanticRoots
      .map((element) => ({ element, count: element.querySelectorAll("img").length }))
      .filter(({ count }) => count > 0)
      .sort((left, right) => right.count - left.count)[0]?.element;

    return root ?? document.body;
  }

  findPageImages(root: Element): ImageCandidate[] {
    return Array.from(root.querySelectorAll("img"))
      .map((element, index) => createImageCandidate(element, index))
      .filter((candidate): candidate is ImageCandidate => candidate !== null)
      .sort((left, right) => left.element.getBoundingClientRect().top - right.element.getBoundingClientRect().top);
  }
}

export function createImageCandidate(
  element: HTMLImageElement,
  index: number,
  options: { allowUnknownDimensions?: boolean } = {},
): ImageCandidate | null {
  const sourceUrl = getSourceUrl(element);
  const width = getDimension(element, "width");
  const height = getDimension(element, "height");
  const descriptor = `${element.className} ${element.id} ${element.alt} ${element.title}`;
  const unknownDimensions = width === 0 || height === 0;

  if (
    !sourceUrl ||
    (!options.allowUnknownDimensions && (width < MIN_DIMENSION || height < MIN_DIMENSION)) ||
    (options.allowUnknownDimensions && unknownDimensions === false && (width < MIN_DIMENSION || height < MIN_DIMENSION)) ||
    PROMOTIONAL_PATTERN.test(descriptor) ||
    hasPromotionalAncestor(element)
  ) {
    return null;
  }

  return {
    id: createCandidateId(sourceUrl, index),
    element,
    sourceUrl,
    width,
    height,
    score: unknownDimensions ? 50 : calculateScore(width, height),
    priority: "distant",
  };
}

function hasPromotionalAncestor(element: Element): boolean {
  let current = element.parentElement;
  let depth = 0;
  while (current && depth < 4) {
    const descriptor = `${current.className} ${current.id} ${current.getAttribute("role") ?? ""} ${current.getAttribute("aria-label") ?? ""}`;
    if (PROMOTIONAL_PATTERN.test(descriptor)) return true;
    current = current.parentElement;
    depth += 1;
  }
  return false;
}

function getSourceUrl(element: HTMLImageElement): string | null {
  const directSource = [
    element.getAttribute("data-src"),
    element.getAttribute("data-lazy-src"),
    element.getAttribute("src"),
  ].find((value): value is string => Boolean(value?.trim()));

  if (directSource) return directSource.trim();

  const srcset = element.getAttribute("srcset");
  if (!srcset) return null;

  return srcset
    .split(",")
    .map((entry) => entry.trim().split(/\s+/)[0])
    .filter(Boolean)
    .at(-1) ?? null;
}

function getDimension(element: HTMLImageElement, axis: "width" | "height"): number {
  const natural = axis === "width" ? element.naturalWidth : element.naturalHeight;
  if (natural > 0) return natural;

  const attribute = Number(element.getAttribute(axis));
  if (Number.isFinite(attribute) && attribute > 0) return attribute;

  const layout = element.getBoundingClientRect()[axis];
  return Number.isFinite(layout) ? layout : 0;
}

function calculateScore(width: number, height: number): number {
  const areaScore = Math.min(40, Math.round((width * height) / 200_000));
  const portraitScore = height >= width ? 25 : 10;
  return Math.min(100, 35 + areaScore + portraitScore);
}

function createCandidateId(sourceUrl: string, index: number): string {
  let hash = 2166136261;
  for (const character of sourceUrl) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `image-${index}-${(hash >>> 0).toString(16)}`;
}
