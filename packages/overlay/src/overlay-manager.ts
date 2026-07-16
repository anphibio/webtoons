export interface OverlayBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OverlayRegion {
  id: string;
  text: string;
  bbox: OverlayBoundingBox;
}

export class OverlayManager {
  private readonly roots = new Set<HTMLElement>();
  private readonly images = new Map<HTMLElement, HTMLImageElement>();
  private readonly pending = new Map<HTMLImageElement, () => void>();

  constructor(private readonly document: Document) {}

  render(
    image: HTMLImageElement,
    regions: OverlayRegion[],
    dimensions?: { width: number; height: number },
  ): void {
    this.cancelPending(image);
    if (!hasRenderableSize(image)) {
      const onLoad = () => {
        this.pending.delete(image);
        this.render(image, regions, dimensions);
      };
      this.pending.set(image, onLoad);
      image.addEventListener("load", onLoad, { once: true });
      return;
    }

    this.removeForImage(image);
    const root = this.document.createElement("div");
    root.dataset.wtlOverlay = "true";
    root.dataset.wtlImageSource = imageSource(image);
    this.position(root, image);

    const width = (positiveDimension(dimensions?.width) ?? image.naturalWidth) || image.width || image.clientWidth || 1;
    const height = (positiveDimension(dimensions?.height) ?? image.naturalHeight) || image.height || image.clientHeight || 1;
    for (const region of regions) {
      const element = this.document.createElement("span");
      element.dataset.wtlRegion = region.id;
      element.textContent = region.text;
      const anchorToBottom = region.bbox.y + region.bbox.height / 2 > height / 2;
      const verticalPosition = anchorToBottom
        ? { bottom: `${((height - region.bbox.y - region.bbox.height) / height) * 100}%` }
        : { top: `${(region.bbox.y / height) * 100}%` };
      Object.assign(element.style, {
        position: "absolute",
        left: `${(region.bbox.x / width) * 100}%`,
        ...verticalPosition,
        width: `${(region.bbox.width / width) * 100}%`,
        minHeight: `${(region.bbox.height / height) * 100}%`,
        boxSizing: "border-box",
        padding: "4px",
        color: "#111",
        background: "rgba(255, 255, 255, 0.82)",
        font: "600 16px/1.2 system-ui, sans-serif",
        textAlign: "center",
        overflowWrap: "anywhere",
      });
      root.append(element);
    }

    this.document.body.append(root);
    this.roots.add(root);
    this.images.set(root, image);
  }

  refresh(): void {
    for (const [image, listener] of [...this.pending]) {
      if (!hasRenderableSize(image)) continue;
      image.removeEventListener("load", listener);
      listener();
    }
    for (const root of this.roots) {
      const image = this.images.get(root);
      if (image) this.position(root, image);
    }
  }

  clear(): void {
    for (const [image, listener] of this.pending) image.removeEventListener("load", listener);
    this.pending.clear();
    for (const root of this.roots) root.remove();
    this.roots.clear();
    this.images.clear();
  }

  private removeForImage(image: HTMLImageElement): void {
    const source = imageSource(image);
    for (const root of this.document.querySelectorAll<HTMLElement>("[data-wtl-overlay='true']")) {
      if (root.dataset.wtlImageSource === source) root.remove();
    }
    for (const root of this.roots) {
      if (root.dataset.wtlImageSource === source) {
        this.roots.delete(root);
        this.images.delete(root);
      }
    }
  }

  private cancelPending(image: HTMLImageElement): void {
    const listener = this.pending.get(image);
    if (!listener) return;
    image.removeEventListener("load", listener);
    this.pending.delete(image);
  }

  private position(root: HTMLElement, image: HTMLImageElement): void {
    const rect = image.getBoundingClientRect();
    const scrollX = this.document.defaultView?.scrollX ?? 0;
    const scrollY = this.document.defaultView?.scrollY ?? 0;
    Object.assign(root.style, {
      position: "absolute",
      left: `${rect.left + scrollX}px`,
      top: `${rect.top + scrollY}px`,
      width: `${image.clientWidth || image.width}px`,
      height: `${image.clientHeight || image.height}px`,
      pointerEvents: "none",
      zIndex: "2147483646",
      overflow: "hidden",
    });
  }
}

function hasRenderableSize(image: HTMLImageElement): boolean {
  return (image.clientWidth || image.width) > 0 && (image.clientHeight || image.height) > 0;
}

function imageSource(image: HTMLImageElement): string {
  return image.currentSrc || image.getAttribute("src") || image.getAttribute("data-src") || "";
}

function positiveDimension(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}
