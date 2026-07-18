import type { TranslationStatus } from "./translation-state";

export type ProcessingReportStatus = TranslationStatus;

export interface ProcessingReportProgress {
  total: number;
  completed: number;
  failed: number;
  rendered: number;
  empty: number;
}

export interface ProcessingFailure {
  page: string;
  reason: string;
}

export interface ProcessingReport {
  schemaVersion: 1;
  status: ProcessingReportStatus;
  progress: ProcessingReportProgress;
  failures: ProcessingFailure[];
}

export function buildProcessingReport(
  status: ProcessingReportStatus,
  progress: ProcessingReportProgress,
  failures: readonly ProcessingFailure[],
): ProcessingReport {
  return {
    schemaVersion: 1,
    status,
    progress: { ...progress },
    failures: failures.slice(0, 20).map((failure) => ({
      page: safePageName(failure.page),
      reason: failure.reason.slice(0, 300),
    })),
  };
}

function safePageName(value: string): string {
  try {
    const pathname = new URL(value).pathname;
    return pathname.split("/").filter(Boolean).at(-1) ?? "imagem";
  } catch {
    return value.split("/").filter(Boolean).at(-1) ?? "imagem";
  }
}
