import type { ImagePipelineResult } from "./image-pipeline";

export interface ProcessingSummary {
  rendered: number;
  empty: number;
}

export function countPipelineResult(
  summary: ProcessingSummary,
  result: ImagePipelineResult,
): ProcessingSummary {
  return result.status === "rendered"
    ? { ...summary, rendered: summary.rendered + 1 }
    : { ...summary, empty: summary.empty + 1 };
}
