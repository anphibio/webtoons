import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { ExtensionMessage } from "../../../../packages/shared/src/messaging";

import "./styles.css";

function Popup() {
  const [status, setStatus] = useState("ready");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<ProcessingProgress>();

  useEffect(() => {
    void send("GET_STATUS");
    const timer = window.setInterval(() => void send("GET_STATUS"), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  async function send(type: ExtensionMessage["type"]): Promise<void> {
    const isAction = type !== "GET_STATUS";
    if (isAction) setBusy(true);
    setError("");
    try {
      const response = await chrome.runtime.sendMessage({ type });
      if (response?.status) setStatus(response.status);
      if (response?.error) setError(response.error);
      if (response?.progress) setProgress(response.progress as ProcessingProgress);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível comunicar com a página");
    } finally {
      if (isAction) setBusy(false);
    }
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
      <button type="button" className="link" onClick={() => void chrome.runtime.openOptionsPage()}>
        Configurações
      </button>
    </main>
  );
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
