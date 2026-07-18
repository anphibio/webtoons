import { TesseractOcrProvider } from "../../../../packages/ocr/src/tesseract-provider";
import type { OcrInput, OcrRegion, RawOcrResult } from "../../../../packages/ocr/src/types";

interface OcrRequest {
  type: "OCR_REQUEST";
  id: string;
  language: string;
  width: number;
  height: number;
  bytesBase64: string;
}

const providers = new Map<string, TesseractOcrProvider>();

window.addEventListener("message", (event: MessageEvent<OcrRequest>) => {
  if (event.source !== window.parent || event.data?.type !== "OCR_REQUEST") return;
  void process(event.data);
});

async function process(request: OcrRequest): Promise<void> {
  let provider = providers.get(request.language);
  if (!provider) {
    provider = new TesseractOcrProvider({
      language: request.language,
      workerPath: chrome.runtime.getURL("ocr/worker.min.js"),
      corePath: chrome.runtime.getURL("ocr/core/tesseract-core-lstm.wasm.js"),
      langPath: chrome.runtime.getURL("ocr/lang/"),
      workerBlobURL: false,
    });
    providers.set(request.language, provider);
  }

  try {
    const input: OcrInput = {
      image: fromBase64(request.bytesBase64),
      width: request.width,
      height: request.height,
      language: request.language,
    };
    const result = await recognizeWithDarkVariant(provider, input);
    window.parent.postMessage({ type: "OCR_RESPONSE", id: request.id, result }, "*");
  } catch (error) {
    window.parent.postMessage({
      type: "OCR_RESPONSE",
      id: request.id,
      error: error instanceof Error ? error.message : "Falha no worker interno de OCR",
    }, "*");
  }
}

async function recognizeWithDarkVariant(
  provider: TesseractOcrProvider,
  input: OcrInput,
): Promise<RawOcrResult> {
  const fullImage = await provider.recognize(input);
  const primary = await recognizeLongImage(provider, input, fullImage);
  if (!(input.image instanceof Uint8Array)) {
    return primary;
  }

  let darkArea = false;
  try {
    darkArea = await hasLargeDarkArea(input.image);
  } catch {
    return primary;
  }
  // A segunda leitura é uma recuperação para imagens em que a primeira leitura
  // encontrou pouco texto; executá-la em páginas já bem reconhecidas só aumenta
  // custo e ruído.
  if (!darkArea || primary.regions.length > 6) {
    return primary;
  }

  let inverted: OcrInput | null;
  try {
    inverted = await createInvertedInput(input);
  } catch {
    return primary;
  }
  if (!inverted) return primary;

  try {
    const secondary = await provider.recognize(inverted);
    return mergeRegions(primary.regions, secondary.regions);
  } catch {
    return primary;
  }
}

async function recognizeLongImage(
  provider: TesseractOcrProvider,
  input: OcrInput,
  primary: RawOcrResult,
): Promise<RawOcrResult> {
  // Mesmo quando o detector já encontrou algumas caixas, ainda pode ter
  // perdido um balão estilizado. A recuperação continua limitada a imagens
  // longas e a oito regiões para não reabrir o custo alto das páginas densas.
  if (!(input.image instanceof Uint8Array) || input.height <= 2_500 || primary.regions.length >= 8) {
    return primary;
  }

  let tiles: ImageTile[];
  try {
    tiles = await createVerticalTiles(input);
  } catch {
    return primary;
  }
  const recovered: OcrRegion[] = [...primary.regions];
  for (const tile of tiles) {
    try {
      const result = await provider.recognize(tile.input);
      recovered.push(...result.regions.map((region) => ({
        ...region,
        bbox: { ...region.bbox, y: region.bbox.y + tile.top },
      })));
    } catch {
      // Uma falha em um bloco não deve apagar o OCR já obtido na imagem inteira.
    }
  }
  if (recovered.length < 4) {
    try {
      const highContrast = await createHighContrastInput(input);
      if (highContrast) {
        const result = await provider.recognize(highContrast);
        recovered.push(...result.regions);
      }
    } catch {
      // A leitura original e os blocos continuam válidos mesmo sem a variante.
    }
  }
  return mergeRegions([], recovered);
}

interface ImageTile {
  input: OcrInput;
  top: number;
}

async function createVerticalTiles(input: OcrInput): Promise<ImageTile[]> {
  if (!(input.image instanceof Uint8Array)) return [];
  const source = await createImageBitmap(bytesToBlob(input.image));
  const tiles: ImageTile[] = [];
  const tileHeight = 1_800;
  const overlap = 120;
  try {
    for (let top = 0; top < source.height; top += tileHeight - overlap) {
      const height = Math.min(tileHeight, source.height - top);
      const canvas = document.createElement("canvas");
      canvas.width = source.width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) continue;
      context.drawImage(source, 0, top, source.width, height, 0, 0, source.width, height);
      const blob = await canvasToBlob(canvas);
      if (!blob) continue;
      tiles.push({
        top,
        input: { ...input, image: new Uint8Array(await blob.arrayBuffer()), height },
      });
      if (top + height >= source.height) break;
    }
  } finally {
    source.close();
  }
  return tiles;
}

async function createHighContrastInput(input: OcrInput): Promise<OcrInput | null> {
  if (!(input.image instanceof Uint8Array)) return null;
  const source = await createImageBitmap(bytesToBlob(input.image));
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) {
    source.close();
    return null;
  }
  context.drawImage(source, 0, 0);
  source.close();
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const luminance = 0.299 * pixels.data[index] + 0.587 * pixels.data[index + 1] + 0.114 * pixels.data[index + 2];
    const value = luminance >= 190 ? 255 : 0;
    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value;
  }
  context.putImageData(pixels, 0, 0);
  const blob = await canvasToBlob(canvas);
  if (!blob) return null;
  return { ...input, image: new Uint8Array(await blob.arrayBuffer()) };
}

async function hasLargeDarkArea(bytes: Uint8Array): Promise<boolean> {
  const source = await createImageBitmap(bytesToBlob(bytes));
  const sample = document.createElement("canvas");
  sample.width = 32;
  sample.height = Math.max(1, Math.round(32 * source.height / source.width));
  const context = sample.getContext("2d");
  if (!context) {
    source.close();
    return false;
  }
  context.drawImage(source, 0, 0, sample.width, sample.height);
  source.close();
  const imageData = context.getImageData(0, 0, sample.width, sample.height);
  const pixels = imageData.data;
  let dark = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const luminance = 0.299 * pixels[index] + 0.587 * pixels[index + 1] + 0.114 * pixels[index + 2];
    if (luminance < 70) dark += 1;
  }
  return dark / (pixels.length / 4) > 0.28;
}

async function createInvertedInput(input: OcrInput): Promise<OcrInput | null> {
  if (!(input.image instanceof Uint8Array)) return null;
  const source = await createImageBitmap(bytesToBlob(input.image));
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = source.height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.drawImage(source, 0, 0);
  source.close();

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const luminance = 0.299 * pixels.data[index] + 0.587 * pixels.data[index + 1] + 0.114 * pixels.data[index + 2];
    const value = 255 - luminance;
    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value;
  }
  context.putImageData(pixels, 0, 0);
  const blob = await canvasToBlob(canvas);
  if (!blob) return null;
  return { ...input, image: new Uint8Array(await blob.arrayBuffer()) };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

function bytesToBlob(bytes: Uint8Array): Blob {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return new Blob([buffer], { type: "image/png" });
}

function mergeRegions(primary: readonly OcrRegion[], secondary: readonly OcrRegion[]): RawOcrResult {
  const merged = [...primary];
  for (const candidate of secondary) {
    if (!merged.some((region) => intersectionOverUnion(region, candidate) >= 0.35)) merged.push(candidate);
  }
  return { regions: merged.map((region, index) => ({ ...region, id: `ocr-${index}` })) };
}

function intersectionOverUnion(first: OcrRegion, second: OcrRegion): number {
  const left = Math.max(first.bbox.x, second.bbox.x);
  const top = Math.max(first.bbox.y, second.bbox.y);
  const right = Math.min(first.bbox.x + first.bbox.width, second.bbox.x + second.bbox.width);
  const bottom = Math.min(first.bbox.y + first.bbox.height, second.bbox.y + second.bbox.height);
  const intersection = Math.max(0, right - left) * Math.max(0, bottom - top);
  const firstArea = first.bbox.width * first.bbox.height;
  const secondArea = second.bbox.width * second.bbox.height;
  return intersection / Math.max(1, firstArea + secondArea - intersection);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}
