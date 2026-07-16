export type ImagePriority = "visible" | "nearby" | "distant";

export interface ImageCandidate {
  id: string;
  element: HTMLImageElement;
  sourceUrl: string;
  width: number;
  height: number;
  score: number;
  priority: ImagePriority;
}

export interface ImageDetectionResult {
  root: Element;
  candidates: ImageCandidate[];
}

export interface SiteAdapter {
  readonly id: string;
  matches(url: URL): boolean;
  findChapterRoot(document: Document): Element | null;
  findPageImages(root: Element): ImageCandidate[];
}
