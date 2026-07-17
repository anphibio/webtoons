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

export interface OverlayPreferences {
  visible: boolean;
  opacity: number;
  fontSize: number;
}

const DEFAULT_PREFERENCES: OverlayPreferences = { visible: true, opacity: 0.82, fontSize: 16 };

export class OverlayManager {
  private readonly roots = new Set<HTMLElement>();
  private readonly images = new Map<HTMLElement, HTMLImageElement>();
  private readonly pending = new Map<HTMLImageElement, () => void>();

  private preferences: OverlayPreferences = { ...DEFAULT_PREFERENCES };

  constructor(private readonly document: Document) {}

  setVisible(visible: boolean): void {
    this.preferences.visible = visible;
    for (const root of this.roots) root.hidden = !visible;
  }

  setOpacity(opacity: number): void {
    this.preferences.opacity = clamp(opacity, 0.2, 1);
    this.applyPreferences();
  }

  setFontSize(fontSize: number): void {
    this.preferences.fontSize = clamp(fontSize, 10, 32);
    this.applyPreferences();
  }

  getPreferences(): OverlayPreferences {
    return { ...this.preferences };
  }

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
    const displayWidth = image.clientWidth || image.width || width;
    const displayHeight = image.clientHeight || image.height || height;
    for (const region of regions) {
      const element = this.document.createElement("span");
      element.dataset.wtlRegion = region.id;
      element.textContent = region.text;
      const boxWidth = (region.bbox.width / width) * displayWidth;
      const boxHeight = (region.bbox.height / height) * displayHeight;
      const layout = fitTextLayout(region.text, boxWidth, boxHeight, this.preferences.fontSize);
      const expandedHeight = Math.min(displayHeight, Math.max(boxHeight, layout.height));
      const centerY = ((region.bbox.y + region.bbox.height / 2) / height) * displayHeight;
      const top = clamp(centerY - expandedHeight / 2, 0, Math.max(0, displayHeight - expandedHeight));
      element.dataset.wtlBoxWidth = String(boxWidth);
      element.dataset.wtlBoxHeight = String(expandedHeight);
      Object.assign(element.style, {
        position: "absolute",
        left: `${(region.bbox.x / width) * 100}%`,
        top: `${(top / displayHeight) * 100}%`,
        width: `${(region.bbox.width / width) * 100}%`,
        height: `${(expandedHeight / displayHeight) * 100}%`,
        boxSizing: "border-box",
        padding: "4px",
        color: "#111",
        background: `rgba(255, 255, 255, ${this.preferences.opacity})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: `${layout.fontSize}px`,
        fontWeight: "600",
        lineHeight: "1.15",
        fontFamily: "system-ui, sans-serif",
        textAlign: "center",
        overflowWrap: "break-word",
        wordBreak: "normal",
      });
      root.append(element);
    }

    this.document.body.append(root);
    root.hidden = !this.preferences.visible;
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

  private applyPreferences(): void {
    for (const root of this.roots) {
      root.hidden = !this.preferences.visible;
      for (const region of root.querySelectorAll<HTMLElement>("[data-wtl-region]")) {
        region.style.background = `rgba(255, 255, 255, ${this.preferences.opacity})`;
        region.style.fontSize = `${fitFontSize(
          region.textContent ?? "",
          Number(region.dataset.wtlBoxWidth ?? 0),
          Number(region.dataset.wtlBoxHeight ?? 0),
          this.preferences.fontSize,
        )}px`;
      }
    }
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

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function fitTextLayout(text: string, width: number, height: number, preferred: number): { fontSize: number; height: number } {
  const safeWidth = Math.max(1, width - 8);
  const safeHeight = Math.max(1, height - 8);
  const preferredSize = clamp(preferred, 12, 32);
  for (let size = preferredSize; size >= 12; size -= 1) {
    const charactersPerLine = Math.max(1, Math.floor(safeWidth / (size * 0.56)));
    const lineCount = Math.max(1, Math.ceil(text.length / charactersPerLine));
    const neededHeight = lineCount * size * 1.15 + 8;
    if (neededHeight <= Math.max(safeHeight, size * 1.15 * 2.5)) return { fontSize: size, height: neededHeight };
  }
  const fontSize = 12;
  const charactersPerLine = Math.max(1, Math.floor(safeWidth / (fontSize * 0.56)));
  return { fontSize, height: Math.max(safeHeight, Math.ceil(text.length / charactersPerLine) * fontSize * 1.15 + 8) };
}

function fitFontSize(text: string, width: number, height: number, preferred: number): number {
  return fitTextLayout(text, width, height, preferred).fontSize;
}
