import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type ExtensionSettings,
  type SettingsStorage,
} from "../../../../packages/shared/src/settings";

import "./styles.css";

function Options() {
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadSettings(chromeStorage()).then(setSettings);
  }, []);

  async function save(): Promise<void> {
    setError("");
    if (settings.translationProvider === "remote" && !settings.remoteConsent) {
      setError("Confirme o consentimento antes de habilitar tradução remota.");
      return;
    }
    await saveSettings(chromeStorage(), settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <main className="options">
      <h1>Configurações</h1>
      <p>O OCR local é o padrão. Imagens não são enviadas a serviços externos sem consentimento.</p>
      <label>
        Idioma de origem
        <input value={settings.sourceLanguage} onChange={(event) => setSettings({ ...settings, sourceLanguage: event.target.value })} />
      </label>
      <label>
        Idioma de destino
        <select value={settings.targetLanguage} disabled aria-label="Idioma de destino">
          <option value="pt-BR">Português brasileiro</option>
        </select>
      </label>
      <label>
        Provedor de tradução
        <select value={settings.translationProvider} onChange={(event) => setSettings({ ...settings, translationProvider: event.target.value as ExtensionSettings["translationProvider"] })}>
          <option value="none">Não configurado</option>
          <option value="remote">Serviço remoto</option>
        </select>
      </label>
      <label>
        URL do backend
        <input value={settings.backendUrl} onChange={(event) => setSettings({ ...settings, backendUrl: event.target.value })} />
      </label>
      <label>
        Token do backend (opcional)
        <input type="password" autoComplete="off" value={settings.backendAccessToken} onChange={(event) => setSettings({ ...settings, backendAccessToken: event.target.value })} />
      </label>
      <label className="checkbox">
        <input type="checkbox" checked={settings.remoteConsent} onChange={(event) => setSettings({ ...settings, remoteConsent: event.target.checked })} />
        Autorizo o envio de texto/imagem ao provedor remoto selecionado.
      </label>
      <label>
        Tamanho da fonte: {settings.fontSize}px
        <input type="range" min="10" max="32" value={settings.fontSize} onChange={(event) => setSettings({ ...settings, fontSize: Number(event.target.value) })} />
      </label>
      <label>
        Opacidade: {Math.round(settings.opacity * 100)}%
        <input type="range" min="20" max="100" value={settings.opacity * 100} onChange={(event) => setSettings({ ...settings, opacity: Number(event.target.value) / 100 })} />
      </label>
      <button type="button" onClick={() => void save()}>Salvar</button>
      {saved && <p role="status">Configurações salvas.</p>}
      {error && <p role="alert">{error}</p>}
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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
