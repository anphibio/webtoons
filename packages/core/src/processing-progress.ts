import type { ImagePipelineResult } from "./image-pipeline";

export interface ProcessingSummary {
  rendered: number;
  empty: number;
}

export interface ProcessingFailures {
  failed: number;
  empty: number;
}

export function completionStatus(summary: ProcessingFailures): "completed" | "completed-with-errors" {
  return summary.failed === 0 && summary.empty === 0 ? "completed" : "completed-with-errors";
}

export function shouldRetryImage(attempts: number, maxAttempts = 2): boolean {
  return Number.isFinite(attempts) && attempts >= 0 && attempts < maxAttempts;
}

export function shouldQueueImage(
  priority: "visible" | "nearby" | "distant",
  includeDistant: boolean,
): boolean {
  return includeDistant || priority !== "distant";
}

export function countPipelineResult(
  summary: ProcessingSummary,
  result: ImagePipelineResult,
): ProcessingSummary {
  return result.status === "rendered"
    ? { ...summary, rendered: summary.rendered + 1 }
    : { ...summary, empty: summary.empty + 1 };
}
