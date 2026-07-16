import type {
  TranslationContext,
  TranslationProvider,
  TranslationResult,
  TranslationSegment,
} from "./types";

export class MockTranslationProvider implements TranslationProvider {
  private failuresRemaining: number;

  constructor(
    private readonly options: {
      translations: Record<string, string>;
      delayMs?: number;
      failuresBeforeSuccess?: number;
      omitMissing?: boolean;
    },
  ) {
    this.failuresRemaining = options.failuresBeforeSuccess ?? 0;
  }

  translate(
    segments: TranslationSegment[],
    context: TranslationContext,
    signal?: AbortSignal,
  ): Promise<TranslationResult> {
    void context;
    if (this.failuresRemaining > 0) {
      this.failuresRemaining -= 1;
      return Promise.reject(new Error("Falha transitória do tradutor"));
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (signal?.aborted) {
          reject(new Error("Tradução cancelada"));
          return;
        }
        resolve({
          segments: segments
            .filter((segment) => !this.options.omitMissing || segment.text in this.options.translations)
            .map((segment) => ({
              id: segment.id,
              sourceText: segment.text,
              translatedText: this.options.translations[segment.text] ?? segment.text,
            })),
        });
      }, this.options.delayMs ?? 0);

      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Error("Tradução cancelada"));
      }, { once: true });
    });
  }
}
