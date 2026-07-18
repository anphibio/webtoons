// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { OverlayManager } from "../packages/overlay/src/overlay-manager";

describe("regressão visual do overlay", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("mantém cada legenda ancorada na própria imagem em uma página longa", () => {
    const image = document.createElement("img");
    image.width = 720;
    image.height = 7_000;
    image.src = "https://cdn.example/chapter/001_17.jpg";
    document.body.append(image);

    new OverlayManager(document).render(image, [
      { id: "dialogue", text: "Então, não pare.", bbox: { x: 90, y: 1_120, width: 480, height: 180 } },
      { id: "sound-effect", text: "Huff", bbox: { x: 240, y: 1_420, width: 120, height: 70 } },
    ]);

    const regions = [...document.querySelectorAll<HTMLElement>("[data-wtl-region]")];
    expect(regions).toHaveLength(2);
    expect(regions.map((region) => ({
      id: region.dataset.wtlRegion,
      left: region.style.left,
      top: region.style.top,
      width: region.style.width,
      height: region.style.height,
    }))).toMatchInlineSnapshot(`
      [
        {
          "height": "2.571428571428571%",
          "id": "dialogue",
          "left": "12.5%",
          "top": "16%",
          "width": "66.66666666666666%",
        },
        {
          "height": "1%",
          "id": "sound-effect",
          "left": "33.33333333333333%",
          "top": "20.285714285714285%",
          "width": "16.666666666666664%",
        },
      ]
    `);
    expect(regions.every((region) => Number.parseFloat(region.style.left) >= 0)).toBe(true);
    expect(regions.every((region) => Number.parseFloat(region.style.top) >= 0)).toBe(true);
  });

  it("recorta uma região recuperada sem permitir vazamento para outra imagem", () => {
    const image = document.createElement("img");
    image.width = 720;
    image.height = 1_000;
    document.body.append(image);

    new OverlayManager(document).render(image, [{
      id: "recovered",
      text: "Legenda recuperada",
      bbox: { x: -100, y: 920, width: 1_000, height: 240 },
    }]);

    const region = document.querySelector<HTMLElement>("[data-wtl-region]")!;
    expect(Number.parseFloat(region.style.left)).toBe(0);
    expect(Number.parseFloat(region.style.top)).toBeLessThanOrEqual(100);
    expect(Number.parseFloat(region.style.width)).toBe(100);
    expect(Number.parseFloat(region.style.height)).toBeLessThanOrEqual(100);
    expect(Number.parseFloat(region.dataset.wtlBoxHeight ?? "Infinity")).toBeLessThanOrEqual(80);
  });
});
