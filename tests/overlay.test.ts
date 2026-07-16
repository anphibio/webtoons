// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { OverlayManager } from "../packages/overlay/src/overlay-manager";

describe("overlay reversível", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renderiza texto como conteúdo seguro sobre a imagem", () => {
    const image = document.createElement("img");
    image.width = 800;
    image.height = 1200;
    document.body.append(image);
    const manager = new OverlayManager(document);

    manager.render(image, [{ id: "r1", text: "<script>não executar</script>", bbox: { x: 80, y: 120, width: 240, height: 90 } }]);

    const overlay = document.querySelector("[data-wtl-overlay]");
    expect(overlay).not.toBeNull();
    expect(overlay?.textContent).toBe("<script>não executar</script>");
    expect(overlay?.querySelector("script")).toBeNull();
  });

  it("remove todos os overlays sem remover a imagem original", () => {
    const image = document.createElement("img");
    document.body.append(image);
    const manager = new OverlayManager(document);
    manager.render(image, [{ id: "r1", text: "Olá", bbox: { x: 0, y: 0, width: 20, height: 20 } }]);

    manager.clear();

    expect(document.querySelector("[data-wtl-overlay]")).toBeNull();
    expect(document.body.contains(image)).toBe(true);
  });

  it("reposiciona a camada quando a imagem muda de posição ou tamanho", () => {
    const image = document.createElement("img");
    image.width = 800;
    image.height = 1200;
    document.body.append(image);
    let rect = { left: 10, top: 20, width: 800, height: 1200 };
    image.getBoundingClientRect = () => rect as DOMRect;
    const manager = new OverlayManager(document);

    manager.render(image, [{ id: "r1", text: "Olá", bbox: { x: 0, y: 0, width: 20, height: 20 } }]);
    const overlay = document.querySelector<HTMLElement>("[data-wtl-overlay]");
    expect(overlay?.style.left).toBe("10px");

    rect = { left: 40, top: 60, width: 400, height: 600 };
    manager.refresh();

    expect(overlay?.style.left).toBe("40px");
    expect(overlay?.style.top).toBe("60px");
    expect(overlay?.style.width).toBe("800px");
  });

  it("mantém traduções próximas ao rodapé dentro da imagem", () => {
    const image = document.createElement("img");
    image.width = 800;
    image.height = 1200;
    document.body.append(image);
    const manager = new OverlayManager(document);

    manager.render(image, [{
      id: "r1",
      text: "Uma tradução longa que não pode invadir a próxima imagem",
      bbox: { x: 80, y: 1140, width: 300, height: 40 },
    }]);

    const overlay = document.querySelector<HTMLElement>("[data-wtl-overlay]");
    const region = overlay?.querySelector<HTMLElement>("[data-wtl-region]");
    expect(overlay?.style.overflow).toBe("hidden");
    expect(region?.style.top).toBe("");
    expect(Number.parseFloat(region?.style.bottom ?? "NaN")).toBeCloseTo((1200 - 1180) / 1200 * 100);
  });

  it("aguarda uma imagem lazy ganhar tamanho antes de criar o overlay", () => {
    const image = document.createElement("img");
    image.setAttribute("data-src", "https://cdn.example/011_1.jpg");
    document.body.append(image);
    const manager = new OverlayManager(document);

    manager.render(image, [{
      id: "r1",
      text: "Missão principal",
      bbox: { x: 108, y: 119, width: 281, height: 99 },
    }], { width: 720, height: 7000 });

    expect(document.querySelector("[data-wtl-overlay]")).toBeNull();

    image.width = 720;
    image.height = 7000;
    image.dispatchEvent(new Event("load"));

    const overlay = document.querySelector<HTMLElement>("[data-wtl-overlay]");
    const region = overlay?.querySelector<HTMLElement>("[data-wtl-region]");
    expect(overlay?.dataset.wtlImageSource).toBe("https://cdn.example/011_1.jpg");
    expect(overlay?.style.width).toBe("720px");
    expect(Number.parseFloat(region?.style.left ?? "NaN")).toBeCloseTo(108 / 720 * 100);
  });

  it("materializa overlay pendente quando a imagem ganha tamanho sem novo evento load", () => {
    const image = document.createElement("img");
    image.setAttribute("data-src", "https://cdn.example/012_1.jpg");
    document.body.append(image);
    const manager = new OverlayManager(document);

    manager.render(image, [{
      id: "r1",
      text: "Mundo original",
      bbox: { x: 100, y: 200, width: 300, height: 100 },
    }], { width: 720, height: 7000 });
    image.width = 720;
    image.height = 7000;

    manager.refresh();

    expect(document.querySelector("[data-wtl-overlay]")?.textContent).toBe("Mundo original");
  });

  it("substitui overlay órfão deixado por uma instância anterior da extensão", () => {
    const image = document.createElement("img");
    image.src = "https://cdn.example/001_1.jpg";
    image.width = 720;
    image.height = 7000;
    document.body.append(image);
    const stale = document.createElement("div");
    stale.dataset.wtlOverlay = "true";
    stale.dataset.wtlImageSource = image.src;
    stale.textContent = "antigo";
    document.body.append(stale);

    new OverlayManager(document).render(image, [{
      id: "r1",
      text: "novo",
      bbox: { x: 100, y: 200, width: 300, height: 100 },
    }]);

    const overlays = document.querySelectorAll("[data-wtl-overlay]");
    expect(overlays).toHaveLength(1);
    expect(overlays[0]?.textContent).toBe("novo");
  });
});
