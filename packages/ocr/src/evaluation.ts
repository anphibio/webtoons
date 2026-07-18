export function normalizeEvaluationText(text: string): string {
  return text.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/gu, " ");
}

export function calculateCer(reference: string, prediction: string): number {
  const expected = normalizeEvaluationText(reference);
  const actual = normalizeEvaluationText(prediction);
  if (expected.length === 0) return actual.length === 0 ? 0 : 1;
  return levenshtein(Array.from(expected), Array.from(actual)) / expected.length;
}

export function calculateWer(reference: string, prediction: string): number {
  const expected = words(reference);
  const actual = words(prediction);
  if (expected.length === 0) return actual.length === 0 ? 0 : 1;
  return levenshtein(expected, actual) / expected.length;
}

export interface EvaluationSummary {
  lot: string;
  samples: number;
  averageCer: number;
  averageWer: number;
}

export function findEvaluationRegressions(
  actual: readonly EvaluationSummary[],
  baseline: readonly EvaluationSummary[],
  tolerance = 0.02,
): string[] {
  const regressions: string[] = [];
  for (const expected of baseline) {
    const current = actual.find((item) => item.lot === expected.lot);
    if (!current) {
      regressions.push(`${expected.lot} não foi avaliado`);
      continue;
    }
    if (current.averageCer > expected.averageCer + tolerance) {
      regressions.push(`${expected.lot} CER subiu de ${formatPercent(expected.averageCer)} para ${formatPercent(current.averageCer)}`);
    }
    if (current.averageWer > expected.averageWer + tolerance) {
      regressions.push(`${expected.lot} WER subiu de ${formatPercent(expected.averageWer)} para ${formatPercent(current.averageWer)}`);
    }
  }
  return regressions;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function words(text: string): string[] {
  const normalized = normalizeEvaluationText(text);
  return normalized.length === 0 ? [] : normalized.split(" ");
}

function levenshtein<T>(expected: readonly T[], actual: readonly T[]): number {
  let previous = Array.from({ length: actual.length + 1 }, (_, index) => index);
  for (let row = 1; row <= expected.length; row += 1) {
    const current = [row];
    for (let column = 1; column <= actual.length; column += 1) {
      const substitution = previous[column - 1] + (expected[row - 1] === actual[column - 1] ? 0 : 1);
      const insertion = current[column - 1] + 1;
      const deletion = previous[column] + 1;
      current.push(Math.min(substitution, insertion, deletion));
    }
    previous = current;
  }
  return previous[actual.length] ?? 0;
}
