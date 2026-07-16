export interface BenchmarkVariantResult {
  variant: string;
  averageCer: number;
  averageWer: number;
  samples: number;
}

export function rankBenchmarkVariants(results: BenchmarkVariantResult[]): BenchmarkVariantResult[] {
  return [...results].sort((left, right) => left.averageCer - right.averageCer || left.averageWer - right.averageWer);
}
