export type ExtensionMessage =
  | { type: "TRANSLATION_START" }
  | { type: "TRANSLATION_PAUSE" }
  | { type: "TRANSLATION_RESUME" }
  | { type: "TRANSLATION_CANCEL" }
  | { type: "TRANSLATION_TOGGLE" }
  | { type: "TRANSLATION_SET_VISIBILITY"; visible: boolean }
  | { type: "TRANSLATION_SET_OPACITY"; opacity: number }
  | { type: "TRANSLATION_SET_FONT_SIZE"; fontSize: number }
  | { type: "GET_STATUS" }
  | { type: "FETCH_IMAGE"; sourceUrl: string; referrer: string; proxyUrl: string };

const messageTypes = new Set<ExtensionMessage["type"]>([
  "TRANSLATION_START",
  "TRANSLATION_PAUSE",
  "TRANSLATION_RESUME",
  "TRANSLATION_CANCEL",
  "TRANSLATION_TOGGLE",
  "TRANSLATION_SET_VISIBILITY",
  "TRANSLATION_SET_OPACITY",
  "TRANSLATION_SET_FONT_SIZE",
  "GET_STATUS",
  "FETCH_IMAGE",
]);

export function parseMessage(value: unknown): ExtensionMessage {
  if (!isRecord(value) || typeof value.type !== "string" || !messageTypes.has(value.type as ExtensionMessage["type"])) {
    throw new Error("Mensagem inválida");
  }

  if (value.type === "FETCH_IMAGE") {
    if (Object.keys(value).length !== 4 || typeof value.sourceUrl !== "string" || value.sourceUrl.length > 2048 || typeof value.referrer !== "string" || value.referrer.length > 2048 || typeof value.proxyUrl !== "string" || value.proxyUrl.length > 512) {
      throw new Error("Mensagem inválida");
    }
    return { type: "FETCH_IMAGE", sourceUrl: value.sourceUrl, referrer: value.referrer, proxyUrl: value.proxyUrl };
  }

  if (value.type === "TRANSLATION_SET_VISIBILITY") {
    if (Object.keys(value).length !== 2 || typeof value.visible !== "boolean") throw new Error("Mensagem inválida");
    return { type: value.type, visible: value.visible };
  }

  if (value.type === "TRANSLATION_SET_OPACITY") {
    if (Object.keys(value).length !== 2 || typeof value.opacity !== "number" || !Number.isFinite(value.opacity) || value.opacity < 0.2 || value.opacity > 1) throw new Error("Mensagem inválida");
    return { type: value.type, opacity: value.opacity };
  }

  if (value.type === "TRANSLATION_SET_FONT_SIZE") {
    if (Object.keys(value).length !== 2 || typeof value.fontSize !== "number" || !Number.isFinite(value.fontSize) || value.fontSize < 10 || value.fontSize > 32) throw new Error("Mensagem inválida");
    return { type: value.type, fontSize: value.fontSize };
  }

  if (Object.keys(value).length !== 1) {
    throw new Error("Mensagem inválida");
  }

  return { type: value.type as ExtensionMessage["type"] } as ExtensionMessage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
