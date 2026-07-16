// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { ImagePipeline, type PipelineCache } from "../packages/core/src/image-pipeline";
import { countPipelineResult } from "../packages/core/src/processing-progress";
import type { ImageCandidate } from "../packages/site-adapters/src/types";

function candidate(): ImageCandidate {
  return {
    id: "page-1",
    element: document.createElement("img"),
    sourceUrl: "https://cdn.example/page-1.jpg",
    width: 1200,
    height: 1800,
    score: 10,
    priority: "visible",
  };
}

describe("pipeline de imagem", () => {
  it("executa OCR, traduz segmentos e renderiza regiões correspondentes", async () => {
    const render = vi.fn();
    const stages: string[] = [];
    const imageCandidate = candidate();
    const pipeline = new ImagePipeline({
      load: { load: vi.fn().mockResolvedValue({ image: new Blob(["image"]), width: 1200, height: 1800 }) },
      ocr: {
        recognize: vi.fn().mockResolvedValue({
          regions: [{
            id: "ocr-0",
            text: "Hello",
            confidence: 0.91,
            bbox: { x: 10, y: 20, width: 100, height: 40 },
            rotation: 0,
          }],
        }),
      },
      translation: {
        translate: vi.fn().mockResolvedValue({
          segments: [{ id: "ocr-0", sourceText: "Hello", translatedText: "Olá" }],
        }),
      },
      overlay: { render },
      sourceLanguage: "eng",
      targetLanguage: "por",
      timeoutMs: 5_000,
      onStage: (stage) => stages.push(stage),
    });

    await expect(pipeline.process(imageCandidate)).resolves.toEqual({ status: "rendered", regionCount: 1 });
    expect(render).toHaveBeenCalledWith(imageCandidate.element, [{
      id: "ocr-0",
      text: "Olá",
      bbox: { x: 10, y: 20, width: 100, height: 40 },
    }], { width: 1200, height: 1800 });
    expect(stages).toEqual(["loading", "ocr", "translation", "overlay"]);
  });

  it("não chama tradução nem overlay quando o OCR não encontra regiões", async () => {
    const translate = vi.fn();
    const render = vi.fn();
    const pipeline = new ImagePipeline({
      load: { load: vi.fn().mockResolvedValue({ image: new Blob(["image"]), width: 100, height: 100 }) },
      ocr: { recognize: vi.fn().mockResolvedValue({ regions: [] }) },
      translation: { translate },
      overlay: { render },
      sourceLanguage: "eng",
      targetLanguage: "por",
      timeoutMs: 5_000,
    });

    await expect(pipeline.process(candidate())).resolves.toEqual({ status: "empty", regionCount: 0 });
    expect(translate).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
  });

  it("reutiliza OCR e tradução do cache ao processar a mesma imagem", async () => {
    const cache = new Map<string, unknown>();
    const cacheStore: PipelineCache = {
      async get<T>(kind: "ocr" | "translation", key: string): Promise<T | null> {
        return (cache.get(`${kind}:${key}`) as T | undefined) ?? null;
      },
      async put<T>(kind: "ocr" | "translation", key: string, value: T, ttlMs: number): Promise<void> {
        void ttlMs;
        cache.set(`${kind}:${key}`, value);
      },
    };
    const put = vi.spyOn(cacheStore, "put");
    const recognize = vi.fn().mockResolvedValue({
      regions: [{
        id: "ocr-0",
        text: "Hello",
        confidence: 0.91,
        bbox: { x: 10, y: 20, width: 100, height: 40 },
        rotation: 0,
      }],
    });
    const translate = vi.fn().mockResolvedValue({
      segments: [{ id: "ocr-0", sourceText: "Hello", translatedText: "Olá" }],
    });
    const pipeline = new ImagePipeline({
      load: { load: vi.fn().mockResolvedValue({ image: new Blob(["same-image"]), width: 1200, height: 1800 }) },
      ocr: { recognize },
      translation: { translate },
      overlay: { render: vi.fn() },
      cache: cacheStore,
      sourceLanguage: "eng",
      targetLanguage: "por",
      timeoutMs: 5_000,
    });

    await pipeline.process(candidate());
    await pipeline.process(candidate());

    expect(recognize).toHaveBeenCalledTimes(1);
    expect(translate).toHaveBeenCalledTimes(1);
    expect(put).toHaveBeenCalledTimes(2);
  });

  it("não bloqueia a fila quando o carregamento da imagem fica pendente", async () => {
    const pipeline = new ImagePipeline({
      load: { load: vi.fn(() => new Promise<never>(() => undefined)) },
      ocr: { recognize: vi.fn() },
      translation: { translate: vi.fn() },
      overlay: { render: vi.fn() },
      sourceLanguage: "eng",
      targetLanguage: "por",
      timeoutMs: 5_000,
      loadTimeoutMs: 10,
    });

    const outcome = await Promise.race([
      pipeline.process(candidate()).then(
        () => "resolved",
        (error: unknown) => error instanceof Error ? error.message : String(error),
      ),
      new Promise<string>((resolve) => setTimeout(() => resolve("ainda pendente"), 50)),
    ]);

    expect(outcome).toBe("Falha no carregamento: Carregamento excedeu o tempo limite");
  });
});

describe("resumo do processamento", () => {
  it("distingue imagens renderizadas de imagens sem texto", () => {
    const initial = { rendered: 0, empty: 0 };
    const rendered = countPipelineResult(initial, { status: "rendered", regionCount: 3 });
    const empty = countPipelineResult(rendered, { status: "empty", regionCount: 0 });

    expect(empty).toEqual({ rendered: 1, empty: 1 });
  });
});
