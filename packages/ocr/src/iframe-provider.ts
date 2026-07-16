import type { OcrInput, OcrProgressCallback, OcrProvider, RawOcrResult } from "./types";

interface OcrRequest {
  type: "OCR_REQUEST";
  id: string;
  language: string;
  width: number;
  height: number;
  bytesBase64: string;
}

interface OcrResponse {
  type: "OCR_RESPONSE";
  id: string;
  result?: RawOcrResult;
  error?: string;
}

export class IframeOcrProvider implements OcrProvider {
  private frame: HTMLIFrameElement | undefined;
  private ready: Promise<void> | undefined;
  private sequence = 0;

  constructor(private readonly frameUrl: string) {}

  async recognize(input: OcrInput, signal?: AbortSignal, onProgress?: OcrProgressCallback): Promise<RawOcrResult> {
    if (signal?.aborted) throw new Error("OCR cancelado");
    onProgress?.(0);
    await this.ensureFrame();
    const id = `ocr-${Date.now()}-${this.sequence++}`;
    const request: OcrRequest = {
      type: "OCR_REQUEST",
      id,
      language: input.language,
      width: input.width,
      height: input.height,
      bytesBase64: await toBase64(input.image),
    };

    return await new Promise<RawOcrResult>((resolve, reject) => {
      const frame = this.frame;
      if (!frame?.contentWindow) {
        reject(new Error("Documento interno de OCR indisponível"));
        return;
      }
      const cleanup = () => {
        window.removeEventListener("message", onMessage);
        signal?.removeEventListener("abort", onAbort);
      };
      const onAbort = () => {
        cleanup();
        reject(new Error("OCR cancelado"));
      };
      const onMessage = (event: MessageEvent<OcrResponse>) => {
        if (event.source !== frame.contentWindow || event.data?.type !== "OCR_RESPONSE" || event.data.id !== id) return;
        cleanup();
        if (event.data.result) {
          onProgress?.(1);
          resolve(event.data.result);
        } else reject(new Error(event.data.error || "Falha no worker interno de OCR"));
      };
      window.addEventListener("message", onMessage);
      signal?.addEventListener("abort", onAbort, { once: true });
      frame.contentWindow.postMessage(request, "*");
    });
  }

  async terminate(): Promise<void> {
    this.frame?.remove();
    this.frame = undefined;
    this.ready = undefined;
  }

  private async ensureFrame(): Promise<void> {
    if (this.ready) return this.ready;
    this.ready = new Promise<void>((resolve, reject) => {
      const frame = document.createElement("iframe");
      frame.src = this.frameUrl;
      frame.title = "OCR interno";
      frame.setAttribute("aria-hidden", "true");
      frame.style.display = "none";
      frame.onload = () => resolve();
      frame.onerror = () => reject(new Error("Não foi possível iniciar o documento interno de OCR"));
      document.documentElement.appendChild(frame);
      this.frame = frame;
    });
    try {
      await this.ready;
    } catch (error) {
      this.ready = undefined;
      this.frame?.remove();
      this.frame = undefined;
      throw error;
    }
  }
}

async function toBase64(image: OcrInput["image"]): Promise<string> {
  if (image instanceof Uint8Array) return bytesToBase64(image);
  if (image instanceof Blob) return bytesToBase64(new Uint8Array(await image.arrayBuffer()));
  throw new Error("Formato de imagem não suportado pelo OCR interno");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
