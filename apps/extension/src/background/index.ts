import { parseMessage, type ExtensionMessage } from "../../../../packages/shared/src/messaging";
import { createLogger } from "../../../../packages/shared/src/logger";
import { fetchWithTimeout } from "../../../../packages/core/src/fetch-timeout";

const logger = createLogger("background", false);

chrome.runtime.onMessage.addListener((rawMessage, sender, sendResponse) => {
  let message: ExtensionMessage;
  try {
    message = parseMessage(rawMessage);
  } catch (error) {
    logger.warn("Mensagem rejeitada", { reason: error instanceof Error ? error.message : "desconhecido" });
    sendResponse({ ok: false, error: "Mensagem inválida" });
    return false;
  }

  void handleMessage(message, sender.tab?.id)
    .then(sendResponse)
    .catch((error: unknown) => {
      logger.warn("Falha ao encaminhar mensagem", {
        reason: error instanceof Error ? error.message : "desconhecido",
      });
      const reason = error instanceof Error ? error.message : "motivo desconhecido";
      sendResponse({ ok: false, error: `Não foi possível comunicar com a página: ${reason}` });
    });
  return true;
});

async function handleMessage(message: ExtensionMessage, senderTabId?: number) {
  if (message.type === "FETCH_IMAGE") return await fetchImage(message.sourceUrl, message.referrer, message.proxyUrl);
  const tabId = senderTabId ?? (await getActiveTabId());
  if (tabId === undefined) return { ok: false, error: "Nenhuma guia ativa encontrada" };

  await ensureContentScript(tabId);
  return await sendMessageWithTimeout(tabId, message);
}

async function fetchImage(sourceUrl: string, referrer: string, proxyUrl: string): Promise<{ ok: boolean; bytesBase64?: string; error?: string }> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    return { ok: false, error: "URL de imagem inválida" };
  }

  try {
    const response = await fetchWithTimeout(fetch, url, {
      credentials: "omit",
      referrer: referrer.startsWith("http") ? referrer : undefined,
      referrerPolicy: "strict-origin-when-cross-origin",
    }, 8_000);
    if (!response.ok && response.status === 403) return await fetchImageThroughProxy(sourceUrl, referrer, proxyUrl);
    if (!response.ok) return { ok: false, error: `Falha ao carregar imagem (${response.status})` };
    const contentType = response.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
    if (!contentType?.startsWith("image/")) return { ok: false, error: "Resposta não é uma imagem" };
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024) return { ok: false, error: "Imagem excede o limite de transporte" };
    if (bytes.byteLength > 25 * 1024 * 1024) return { ok: false, error: "Imagem excede o tamanho permitido" };
    return { ok: true, bytesBase64: toBase64(bytes) };
  } catch {
    return await fetchImageThroughProxy(sourceUrl, referrer, proxyUrl);
  }
}

async function fetchImageThroughProxy(sourceUrl: string, referrer: string, proxyUrl: string): Promise<{ ok: boolean; bytesBase64?: string; error?: string }> {
  try {
    const proxy = new URL(proxyUrl);
    if (proxy.protocol !== "http:" && proxy.protocol !== "https:") throw new Error();
    const response = await fetchWithTimeout(fetch, `${proxy.href.replace(/\/$/, "")}/v1/image`, {
      method: "POST",
      credentials: "omit",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl, referrer }),
    }, 20_000);
    if (!response.ok) return { ok: false, error: `Falha ao carregar imagem (${response.status})` };
    const bytes = await response.arrayBuffer();
    if (bytes.byteLength > 8 * 1024 * 1024) return { ok: false, error: "Imagem excede o limite de transporte" };
    return { ok: true, bytesBase64: toBase64(bytes) };
  } catch {
    return { ok: false, error: "Não foi possível acessar o proxy de imagens" };
  }
}

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}


async function sendMessageWithTimeout(tabId: number, message: ExtensionMessage): Promise<unknown> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("A página não respondeu em tempo hábil")), 10_000);
  });
  try {
    return (await Promise.race([chrome.tabs.sendMessage(tabId, message), timeoutPromise])) ?? { ok: true };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function ensureContentScript(tabId: number): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "GET_STATUS" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
  }
}

async function getActiveTabId(): Promise<number | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab?.id;
}
