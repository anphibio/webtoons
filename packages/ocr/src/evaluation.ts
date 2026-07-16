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
