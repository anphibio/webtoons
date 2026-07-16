import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ExtensionMessage } from "../../../../packages/shared/src/messaging";
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type ExtensionSettings, type SettingsStorage } from "../../../../packages/shared/src/settings";

import "./styles.css";

function Popup() {
  const [status, setStatus] = useState("ready");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ProcessingProgress>();
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [translationVisible, setTranslationVisible] = useState(true);

  useEffect(() => {
    void loadSettings(chromeStorage()).then(setSettings);
    void send("GET_STATUS");
    const timer = window.setInterval(() => void send("GET_STATUS"), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  async function send(message: ExtensionMessage["type"] | ExtensionMessage): Promise<void> {
    const type = typeof message === "string" ? message : message.type;
    const isAction = type === "TRANSLATION_START" || type === "TRANSLATION_CANCEL";
    if (isAction) setBusy(true);
    setError("");
    try {
      const response = await chrome.runtime.sendMessage(typeof message === "string" ? { type: message } : message);
      if (response?.status) setStatus(response.status);
      if (response?.error) setError(response.error);
      if (response?.progress) setProgress(response.progress as ProcessingProgress);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível comunicar com a página");
    } finally {
      if (isAction) setBusy(false);
    }
  }

  async function setVisibility(visible: boolean): Promise<void> {
    setTranslationVisible(visible);
    await send({ type: "TRANSLATION_SET_VISIBILITY", visible });
  }

  async function setOverlaySetting(key: "opacity" | "fontSize", value: number): Promise<void> {
    const next = { ...settings, [key]: value };
    setSettings(next);
    await saveSettings(chromeStorage(), next);
    await send(key === "opacity" ? { type: "TRANSLATION_SET_OPACITY", opacity: value } : { type: "TRANSLATION_SET_FONT_SIZE", fontSize: value });
  }

  return (
    <main className="panel">
      <h1>Tradutor de imagens</h1>
      <p className="status" aria-live="polite">Estado: {status}</p>
      {progress && progress.total > 0 && (
        <p className="status" aria-live="polite">
          Progresso: {progress.completed}/{progress.total}
          {progress.currentPage && ` — ${progress.currentPage} (${stageLabel(progress.stage)})`}
          {progress.rendered > 0 && ` — com texto: ${progress.rendered}`}
          {progress.empty > 0 && ` — sem texto: ${progress.empty}`}
          {progress.failed > 0 && ` — falhas: ${progress.failed}`}
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <button type="button" onClick={() => void send("TRANSLATION_START")} disabled={busy}>
        Traduzir capítulo
      </button>
      <button type="button" className="secondary" onClick={() => void send("TRANSLATION_CANCEL")} disabled={busy}>
        Cancelar
      </button>
      <section className="controls" aria-label="Controles da tradução">
        <button type="button" className="secondary" onClick={() => void setVisibility(!translationVisible)}>
          {translationVisible ? "Comparar com original" : "Mostrar tradução"}
        </button>
        <label>
          Opacidade: {Math.round(settings.opacity * 100)}%
          <input type="range" min="20" max="100" value={settings.opacity * 100} onChange={(event) => void setOverlaySetting("opacity", Number(event.target.value) / 100)} />
        </label>
        <label>
          Fonte: {settings.fontSize}px
          <input type="range" min="10" max="32" value={settings.fontSize} onChange={(event) => void setOverlaySetting("fontSize", Number(event.target.value))} />
        </label>
      </section>
      <button type="button" className="link" onClick={() => void chrome.runtime.openOptionsPage()}>
        Configurações
      </button>
    </main>
  );
}

function chromeStorage(): SettingsStorage {
  return {
    async get() {
      const result = await chrome.storage.local.get("settings");
      return result.settings;
    },
    async set(value) {
      await chrome.storage.local.set({ settings: value });
    },
  };
}

interface ProcessingProgress {
  total: number;
  completed: number;
  failed: number;
  rendered: number;
  empty: number;
  currentPage: string;
  stage: "idle" | "loading" | "ocr" | "translation" | "overlay" | "done";
}

function stageLabel(stage: ProcessingProgress["stage"]): string {
  return {
    idle: "aguardando",
    loading: "carregando",
    ocr: "OCR",
    translation: "traduzindo",
    overlay: "posicionando",
    done: "concluído",
  }[stage];
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
