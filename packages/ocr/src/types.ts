export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface OcrRegion {
  id: string;
  text: string;
  confidence: number;
  bbox: BoundingBox;
  rotation: number;
  language?: string;
  words?: OcrWord[];
}

export interface OcrInput {
  image: Uint8Array | Blob | ImageData;
  width: number;
  height: number;
  language: string;
}

export interface RawOcrResult {
  regions: OcrRegion[];
  width?: number;
  height?: number;
}

export interface OcrResult extends RawOcrResult {
  width: number;
  height: number;
}

export type OcrProgressCallback = (progress: number) => void;

export interface OcrProvider {
  recognize(input: OcrInput, signal?: AbortSignal, onProgress?: OcrProgressCallback): Promise<RawOcrResult>;
}
