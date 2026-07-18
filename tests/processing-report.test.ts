import { describe, expect, it } from "vitest";
import { buildProcessingReport } from "../packages/core/src/processing-report";

describe("relatório estruturado de processamento", () => {
  it("produz um formato estável para diagnóstico e futuras integrações", () => {
    expect(buildProcessingReport(
      "completed-with-errors",
      { total: 2, completed: 2, failed: 1, rendered: 1, empty: 0 },
      [{ page: "page-2.jpg", reason: "Falha no OCR: timeout" }],
    )).toEqual({
      schemaVersion: 1,
      status: "completed-with-errors",
      progress: { total: 2, completed: 2, failed: 1, rendered: 1, empty: 0 },
      failures: [{ page: "page-2.jpg", reason: "Falha no OCR: timeout" }],
    });
  });

  it("limita falhas registradas e não expõe URLs completas", () => {
    const report = buildProcessingReport(
      "completed-with-errors",
      { total: 1, completed: 1, failed: 1, rendered: 0, empty: 0 },
      Array.from({ length: 30 }, (_, index) => ({ page: `https://site.test/page-${index}.jpg`, reason: "falha" })),
    );

    expect(report.failures).toHaveLength(20);
    expect(report.failures[0]?.page).toBe("page-0.jpg");
    expect(JSON.stringify(report)).not.toContain("https://");
  });
});
