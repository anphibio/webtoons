export interface TranslationSegment {
  id: string;
  text: string;
  order: number;
  regionType?: string;
}

export interface TranslationContext {
  sourceLanguage: string;
  targetLanguage: string;
  glossary?: Record<string, string>;
}

export interface TranslatedSegment {
  id: string;
  sourceText: string;
  translatedText: string;
  confidence?: number;
}

export interface TranslationResult {
  segments: TranslatedSegment[];
}

export interface TranslationProvider {
  translate(
    segments: TranslationSegment[],
    context: TranslationContext,
    signal?: AbortSignal,
  ): Promise<TranslationResult>;
}
