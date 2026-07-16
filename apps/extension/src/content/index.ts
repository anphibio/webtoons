import { parseMessage, type ExtensionMessage } from "../../../../packages/shared/src/messaging";
import { createLogger } from "../../../../packages/shared/src/logger";
import { transition, type TranslationState } from "../../../../packages/core/src/translation-state";
import { ImagePipeline } from "../../../../packages/core/src/image-pipeline";
import type { ImagePipelineStage } from "../../../../packages/core/src/image-pipeline";
import { countPipelineResult } from "../../../../packages/core/src/processing-progress";
import { claimRuntime } from "../../../../packages/core/src/runtime-singleton";
import { prioritizeImageCandidates } from "../../../../packages/core/src/candidate-queue";
import { RuntimeImageLoader } from "../../../../packages/core/src/image-loader";
import { BackendTranslationProvider } from "../../../../packages/translation/src/backend-provider";
import { IframeOcrProvider } from "../../../../packages/ocr/src/iframe-provider";
import { BackendOcrProvider } from "../../../../packages/ocr/src/backend-provider";
import { FallbackOcrProvider } from "../../../../packages/ocr/src/fallback-provider";
import { RetryingOcrProvider } from "../../../../packages/ocr/src/retrying-provider";
import { OverlayManager } from "../../../../packages/overlay/src/overlay-manager";
import { DEFAULT_SETTINGS, loadSettings, type SettingsStorage } from "../../../../packages/shared/src/settings";
import { IndexedDbCacheStore } from "../../../../packages/shared/src/cache";
import { GenericImageDetector } from "../../../../packages/site-adapters/src/generic-detector";
import { ToonGodAdapter } from "../../../../packages/site-adapters/src/toongod-adapter";
import {
  observeDynamicImages,
  observeImageVisibility,
  observeRouteChanges,
} from "../../../../packages/site-adapters/src/observers";
import type { ImageCandidate } from "../../../../packages/site-adapters/src/types";

const logger = createLogger("content", false);
let state: TranslationState = { status: "ready" };
let candidates = new Map<string, ImageCandidate>();
let stopDynamicObserver: (() => void) | undefined;
let stopVisibilityObserver: (() => void) | undefined;
let stopRouteObserver: (() => void) | undefined;
let stopScrollObserver: (() => void) | undefined;
let processingController: AbortController | undefined;
let ocrProvider: IframeOcrProvider | undefined;
let activePipeline: ImagePipeline | undefined;
let processingPromise: Promise<void> | undefined;
const processedCandidates = new Set<string>();
const queuedCandidates = new Map<string, ImageCandidate>();
let lastProcessingError: string | undefined;
let progress = createProgress();
const overlayManager = new OverlayManager(document);
const cacheStore = new IndexedDbCacheStore();
const ownsContentRuntime = claimRuntime(globalThis as unknown as Record<string, unknown>, "content-script");

if (ownsContentRuntime) chrome.runtime.onMessage.addListener((rawMessage, _sender, sendResponse) => {
  try {
    const message = parseMessage(rawMessage);
    handleMessage(message);
    sendResponse({ ok: true, status: state.status, error: lastProcessingError, progress });
  } catch (error) {
    logger.warn("Mensagem rejeitada", { reason: error instanceof Error ? error.message : "desconhecido" });
    sendResponse({ ok: false, error: "Mensagem inválida" });
  }

  return false;
});

function handleMessage(message: ExtensionMessage): void {
  const action = {
    TRANSLATION_START: { type: "START" },
    TRANSLATION_PAUSE: { type: "PAUSE" },
    TRANSLATION_RESUME: { type: "RESUME" },
    TRANSLATION_CANCEL: { type: "CANCEL" },
  } as const;

  if (message.type in action) {
    state = transition(state, action[message.type as keyof typeof action]);
  }

  if (message.type === "TRANSLATION_START" && state.status === "discovering") {
    discoverPage();
  }

  if (message.type === "TRANSLATION_CANCEL") {
    processingController?.abort();
    void ocrProvider?.terminate();
    overlayManager.clear();
    stopDiscovery();
  }

  if (message.type === "TRANSLATION_SET_VISIBILITY") overlayManager.setVisible(message.visible);
  if (message.type === "TRANSLATION_SET_OPACITY") overlayManager.setOpacity(message.opacity);
  if (message.type === "TRANSLATION_SET_FONT_SIZE") overlayManager.setFontSize(message.fontSize);
}

function discoverPage(): void {
  stopDiscovery();
  const detector = new GenericImageDetector();
  const toongod = new ToonGodAdapter();
  const specificAdapter = toongod.matches(new URL(window.location.href)) ? toongod : undefined;
  const root = specificAdapter?.findChapterRoot(document) ?? detector.findChapterRoot(document);
  if (!root) return;
  const discoveredImages = specificAdapter?.findPageImages(root) ?? detector.findPageImages(root);

  candidates = new Map(discoveredImages.map((candidate) => [candidate.id, candidate]));
  progress = { ...createProgress(), total: candidates.size };
  stopVisibilityObserver = observeImageVisibility(
    discoveredImages.map((candidate) => candidate.element),
    ({ element, priority }) => {
      const candidate = [...candidates.values()].find((item) => item.element === element);
      if (candidate) {
        candidate.priority = priority;
        if (activePipeline && priority !== "distant") void processCandidates([candidate]);
      }
    },
  );
  stopDynamicObserver = observeDynamicImages(root, (images) => {
    const dynamicCandidates = (specificAdapter?.findPageImages(root) ?? detector.findPageImages(root))
      .filter((candidate) => images.includes(candidate.element));
    for (const candidate of dynamicCandidates) candidates.set(candidate.id, candidate);
    if (dynamicCandidates.length > 0) {
      stopVisibilityObserver?.();
      stopVisibilityObserver = observeImageVisibility(
        [...candidates.values()].map((candidate) => candidate.element),
          ({ element, priority }) => {
            const current = [...candidates.values()].find((candidate) => candidate.element === element);
          if (current) {
            current.priority = priority;
            if (activePipeline && priority !== "distant") void processCandidates([current]);
          }
        },
      );
    }
    if (activePipeline && dynamicCandidates.length > 0) void processCandidates(dynamicCandidates);
  });
  stopScrollObserver = observeScrollPosition();
  stopRouteObserver = observeRouteChanges(() => {
    processingController?.abort();
    void ocrProvider?.terminate();
    overlayManager.clear();
    stopDiscovery();
    state = { status: "ready" };
  });

  logger.info("Imagens de capítulo descobertas", { count: candidates.size });
  void processDiscoveredImages();
}

async function processDiscoveredImages(): Promise<void> {
  const settings = await loadSettings(chromeSettingsStorage());
  overlayManager.setOpacity(settings.opacity);
  overlayManager.setFontSize(settings.fontSize);
  overlayManager.setVisible(true);
  if (settings.translationProvider !== "remote" || !settings.remoteConsent) {
    logger.info("Processamento remoto não habilitado; mantendo descoberta local");
    state = { status: "ready" };
    return;
  }

  state = transition(state, { type: "DISCOVERY_COMPLETE" });
  lastProcessingError = undefined;
  processingController?.abort();
  processingController = new AbortController();
  ocrProvider = new IframeOcrProvider(chrome.runtime.getURL("ocr.html"));
  const backendOcrProvider = new BackendOcrProvider({
    baseUrl: settings.backendUrl,
    accessToken: settings.backendAccessToken || undefined,
  });
  activePipeline = new ImagePipeline({
    load: new RuntimeImageLoader(async (sourceUrl) => await chrome.runtime.sendMessage({
      type: "FETCH_IMAGE",
      sourceUrl,
      referrer: window.location.href,
      proxyUrl: settings.backendUrl,
    })),
    ocr: new FallbackOcrProvider(new RetryingOcrProvider(backendOcrProvider, 1), ocrProvider),
    translation: new BackendTranslationProvider({
      baseUrl: settings.backendUrl,
      accessToken: settings.backendAccessToken || undefined,
    }),
    cache: cacheStore,
    overlay: overlayManager,
    sourceLanguage: settings.sourceLanguage,
    targetLanguage: settings.targetLanguage,
    timeoutMs: 120_000,
    loadTimeoutMs: 20_000,
    maxTranslationRetries: 1,
    onStage: (stage) => {
      progress = { ...progress, stage };
    },
  });

  await processCandidates(prioritizeImageCandidates(candidates.values()), true);
}

async function processCandidates(items: ImageCandidate[], includeDistant = false): Promise<void> {
  if (!activePipeline || !processingController) return;
  items.filter((candidate) => {
    const key = `${candidate.id}:${candidate.sourceUrl}`;
    return !processedCandidates.has(key) && (includeDistant || candidate.priority !== "distant" || items.length === 1);
  }).forEach((candidate) => queuedCandidates.set(`${candidate.id}:${candidate.sourceUrl}`, candidate));

  if (processingPromise) return processingPromise;
  const signal = processingController.signal;
  if (queuedCandidates.size === 0) return;

  processingPromise = (async () => {
    let failures = 0;
    while (queuedCandidates.size > 0) {
      const pending = [...queuedCandidates.values()];
      queuedCandidates.clear();
      for (const candidate of pending) {
        if (signal.aborted) return;
        const key = `${candidate.id}:${candidate.sourceUrl}`;
        processedCandidates.add(key);
        progress = {
          ...progress,
          currentPage: pageName(candidate.sourceUrl),
          stage: "loading",
        };
        try {
          const result = await activePipeline?.process(candidate, signal);
          if (result) progress = { ...progress, ...countPipelineResult(progress, result) };
        } catch (error) {
          failures += 1;
          progress = { ...progress, failed: progress.failed + 1 };
          const reason = error instanceof Error ? error.message : String(error);
          lastProcessingError ??= reason;
          logger.warn("Falha ao processar imagem", { id: candidate.id, reason });
        } finally {
          progress = { ...progress, completed: progress.completed + 1 };
        }
      }
    }
    if (progress.empty > 0) lastProcessingError ??= `${progress.empty} imagens terminaram sem texto detectado`;
    state = failures === 0 && progress.empty === 0
      ? { status: "completed" }
      : { status: "completed-with-errors" };
    progress = { ...progress, currentPage: "", stage: "done" };
  })().finally(() => {
    processingPromise = undefined;
  });
  await processingPromise;
}

interface ProcessingProgress {
  total: number;
  completed: number;
  failed: number;
  rendered: number;
  empty: number;
  currentPage: string;
  stage: ImagePipelineStage | "idle" | "done";
}

function createProgress(): ProcessingProgress {
  return { total: 0, completed: 0, failed: 0, rendered: 0, empty: 0, currentPage: "", stage: "idle" };
}

function pageName(sourceUrl: string): string {
  try {
    return new URL(sourceUrl).pathname.split("/").filter(Boolean).at(-1) ?? sourceUrl;
  } catch {
    return sourceUrl;
  }
}

function chromeSettingsStorage(): SettingsStorage {
  return {
    async get() {
      const result = await chrome.storage.local.get("settings");
      return result.settings ?? DEFAULT_SETTINGS;
    },
    async set() {},
  };
}

function stopDiscovery(): void {
  stopDynamicObserver?.();
  stopVisibilityObserver?.();
  stopRouteObserver?.();
  stopScrollObserver?.();
  stopDynamicObserver = undefined;
  stopVisibilityObserver = undefined;
  stopRouteObserver = undefined;
  stopScrollObserver = undefined;
  candidates.clear();
  activePipeline = undefined;
  processedCandidates.clear();
  queuedCandidates.clear();
}

function observeScrollPosition(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onScroll = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      overlayManager.refresh();
      const nearby = [...candidates.values()].filter((candidate) => {
        const rect = candidate.element.getBoundingClientRect();
        const margin = Math.max(window.innerHeight, 600);
        return rect.bottom >= -margin && rect.top <= window.innerHeight + margin;
      });
      nearby.forEach((candidate) => {
        candidate.priority = "nearby";
      });
      if (nearby.length > 0 && activePipeline) void processCandidates(nearby);
    }, 150);
  };
  const onResize = () => overlayManager.refresh();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });
  onScroll();
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onResize);
    if (timer) clearTimeout(timer);
  };
}
