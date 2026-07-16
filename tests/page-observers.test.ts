// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { observeDynamicImages, observeImageVisibility, observeRouteChanges } from "../packages/site-adapters/src/observers";

describe("observadores da página", () => {
  it("classifica imagens visíveis com prioridade máxima", () => {
    const image = document.createElement("img");
    const events: string[] = [];
    let trigger: (entries: Array<{ target: Element; isIntersecting: boolean; intersectionRatio: number }>) => void = () => undefined;

    class FakeIntersectionObserver {
      constructor(callback: typeof trigger) {
        trigger = callback;
      }
      observe() {}
      disconnect() {}
    }

    const stop = observeImageVisibility([image], (event) => events.push(event.priority), {
      observerConstructor: FakeIntersectionObserver,
    });

    trigger([{ target: image, isIntersecting: true, intersectionRatio: 1 }]);
    stop();

    expect(events).toEqual(["visible"]);
  });

  it("detecta imagens adicionadas dinamicamente", () => {
    const root = document.createElement("main");
    const discovered: Element[] = [];
    const stop = observeDynamicImages(root, (images) => discovered.push(...images));
    const image = document.createElement("img");

    root.append(image);

    return new Promise<void>((resolve) => {
      queueMicrotask(() => {
        stop();
        expect(discovered).toEqual([image]);
        resolve();
      });
    });
  });

  it("observa navegação SPA e permite desmontar o observador", () => {
    const routes: string[] = [];
    const stop = observeRouteChanges(() => routes.push(window.location.pathname));

    history.pushState({}, "", "/chapter-2");
    window.dispatchEvent(new PopStateEvent("popstate"));
    stop();
    history.pushState({}, "", "/chapter-3");

    expect(routes).toEqual(["/chapter-2", "/chapter-2"]);
  });

  it("ignora replaceState que mantém a mesma rota do capítulo", () => {
    history.replaceState({}, "", "/chapter-2");
    const routes: string[] = [];
    const stop = observeRouteChanges(() => routes.push(window.location.pathname));

    history.replaceState({ tracking: true }, "", "/chapter-2?_gl=tracking#reader");
    stop();

    expect(routes).toEqual([]);
  });
});
