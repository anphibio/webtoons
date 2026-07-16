// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { ImagePipeline } from "../packages/core/src/image-pipeline";
import { OverlayManager } from "../packages/overlay/src/overlay-manager";

describe("fluxo integrado de tradução de imagem", () => {
  it("mantém a imagem original e cria o overlay traduzido na região reconhecida", async () => {
    const image = document.createElement("img");
    image.width = 800;
    image.height = 1200;
    image.src = "https://cdn.example/chapter-1.jpg";
    document.body.append(image);
    const overlayManager = new OverlayManager(document);
    const pipeline = new ImagePipeline({
      load: { load: async () => ({ image: new Blob(["chapter-image"], { type: "image/jpeg" }), width: 800, height: 1200 }) },
      ocr: { recognize: async () => ({ regions: [{ id: "r1", text: "Hello", confidence: 0.98, bbox: { x: 80, y: 120, width: 240, height: 90 }, rotation: 0 }] }) },
      translation: { translate: async () => ({ segments: [{ id: "r1", sourceText: "Hello", translatedText: "Olá" }] }) },
      overlay: overlayManager,
      sourceLanguage: "eng",
      targetLanguage: "pt-BR",
      timeoutMs: 5_000,
    });

    await expect(pipeline.process({
      id: "chapter-1",
      element: image,
      sourceUrl: image.src,
      width: 800,
      height: 1200,
      score: 10,
      priority: "visible",
    })).resolves.toEqual({ status: "rendered", regionCount: 1 });

    expect(document.body.contains(image)).toBe(true);
    expect(document.querySelector<HTMLElement>("[data-wtl-region]")?.textContent).toBe("Olá");
    expect(document.querySelector<HTMLElement>("[data-wtl-region]")?.style.left).toBe("10%");
  });
});
