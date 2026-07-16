export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface PreprocessOptions {
  grayscale?: boolean;
  threshold?: number;
}

export function preprocessPixels(input: PixelBuffer, options: PreprocessOptions = {}): PixelBuffer {
  const data = new Uint8ClampedArray(input.data);
  const grayscale = options.grayscale ?? true;
  const threshold = options.threshold;

  for (let index = 0; index < data.length; index += 4) {
    const gray = grayscale ? Math.round(0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2]) : data[index];
    const value = threshold === undefined ? gray : gray >= threshold ? 255 : 0;
    data[index] = value;
    data[index + 1] = value;
    data[index + 2] = value;
  }

  return { data, width: input.width, height: input.height };
}
