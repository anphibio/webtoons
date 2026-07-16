export type ExtensionMessage =
  | { type: "TRANSLATION_START" }
  | { type: "TRANSLATION_PAUSE" }
  | { type: "TRANSLATION_RESUME" }
  | { type: "TRANSLATION_CANCEL" }
  | { type: "TRANSLATION_TOGGLE" }
  | { type: "GET_STATUS" }
  | { type: "FETCH_IMAGE"; sourceUrl: string; referrer: string; proxyUrl: string };

const messageTypes = new Set<ExtensionMessage["type"]>([
  "TRANSLATION_START",
  "TRANSLATION_PAUSE",
  "TRANSLATION_RESUME",
  "TRANSLATION_CANCEL",
  "TRANSLATION_TOGGLE",
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

  if (Object.keys(value).length !== 1) {
    throw new Error("Mensagem inválida");
  }

  return { type: value.type as ExtensionMessage["type"] } as ExtensionMessage;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
