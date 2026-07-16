export type ImageVisibilityPriority = "visible" | "nearby" | "distant";

export interface ImageVisibilityEvent {
  element: Element;
  priority: ImageVisibilityPriority;
}

interface IntersectionObserverLike {
  observe(element: Element): void;
  disconnect(): void;
}

interface IntersectionEntryLike {
  target: Element;
  isIntersecting: boolean;
  intersectionRatio: number;
}

interface VisibilityOptions {
  rootMargin?: string;
  observerConstructor?: new (
    callback: (entries: Array<IntersectionEntryLike>) => void,
    options?: IntersectionObserverInit,
  ) => IntersectionObserverLike;
}

export function observeImageVisibility(
  elements: Element[],
  onVisibility: (event: ImageVisibilityEvent) => void,
  options: VisibilityOptions = {},
): () => void {
  const Observer = options.observerConstructor ?? globalThis.IntersectionObserver;
  if (!Observer) return () => undefined;

  const observer = new Observer(
    (entries) => {
      for (const entry of entries) {
        onVisibility({
          element: entry.target,
          priority: entry.isIntersecting
            ? entry.intersectionRatio > 0
              ? "visible"
              : "nearby"
            : "distant",
        });
      }
    },
    { rootMargin: options.rootMargin ?? "600px 0px" },
  );

  elements.forEach((element) => observer.observe(element));
  return () => observer.disconnect();
}

export function observeDynamicImages(
  root: Element,
  onImages: (images: HTMLImageElement[]) => void,
): () => void {
  const observer = new MutationObserver((mutations) => {
    const images = new Set<HTMLImageElement>();
    for (const mutation of mutations) {
      if (mutation.type === "attributes" && mutation.target instanceof HTMLImageElement) {
        images.add(mutation.target);
      }
      mutation.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node instanceof HTMLImageElement) images.add(node);
        node.querySelectorAll("img").forEach((image) => images.add(image));
      });
    }
    if (images.size > 0) onImages([...images]);
  });

  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src", "data-src", "data-lazy-src", "data-original"],
  });
  return () => observer.disconnect();
}

export function observeRouteChanges(onRouteChange: () => void): () => void {
  const { history } = window;
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  let currentRoute = routeKey(window.location);
  const notifyIfRouteChanged = () => {
    const nextRoute = routeKey(window.location);
    if (nextRoute === currentRoute) return;
    currentRoute = nextRoute;
    onRouteChange();
  };

  history.pushState = function pushState(...args) {
    originalPushState.apply(history, args);
    notifyIfRouteChanged();
  };
  history.replaceState = function replaceState(...args) {
    originalReplaceState.apply(history, args);
    notifyIfRouteChanged();
  };
  window.addEventListener("popstate", onRouteChange);

  return () => {
    if (history.pushState !== originalPushState) history.pushState = originalPushState;
    if (history.replaceState !== originalReplaceState) history.replaceState = originalReplaceState;
    window.removeEventListener("popstate", onRouteChange);
  };
}

function routeKey(location: Location): string {
  return `${location.origin}${location.pathname}`;
}
