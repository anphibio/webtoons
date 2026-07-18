import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWorker, PSM } from "tesseract.js";
import {
  calculateCer,
  calculateWer,
  findEvaluationRegressions,
  type EvaluationSummary,
} from "../packages/ocr/src/evaluation";

interface DatasetItem {
  id: string;
  regions: Array<{ id: string; original: string }>;
}

interface EvaluationRow {
  lot: string;
  imageId: string;
  regionId: string;
  reference: string;
  prediction: string;
  cer: number;
  wer: number;
}

const root = process.cwd();
const lotFilter = process.argv.find((argument) => argument.startsWith("--lot="))?.split("=", 2)[1];
const limitValue = process.argv.find((argument) => argument.startsWith("--limit="))?.split("=", 2)[1];
const limit = limitValue ? Number.parseInt(limitValue, 10) : Number.POSITIVE_INFINITY;
const checkRegression = process.argv.includes("--check");
const worker = await createWorker("eng");
await worker.setParameters({
  tessedit_pageseg_mode: PSM.SPARSE_TEXT,
  preserve_interword_spaces: "1",
});

const rows: EvaluationRow[] = [];
try {
  for (const lotNumber of [1, 2, 3]) {
    const lot = `webtoon_training_lote_${String(lotNumber).padStart(2, "0")}`;
    if (lotFilter && lot !== lotFilter && String(lotNumber) !== lotFilter) continue;
    const metadataPath = path.join(root, "Treinamento", lot, "metadata/annotations.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as { items: DatasetItem[] };

    for (const item of metadata.items) {
      for (const region of item.regions) {
        if (rows.length >= limit) break;
        const cropPath = path.join(root, "Treinamento", lot, "crops", `${item.id}_${region.id}.png`);
        const bytes = new Uint8Array(await readFile(cropPath));
        const recognition = await worker.recognize(bytes, {}, { blocks: true });
        const prediction = recognition.data.text?.trim() ?? "";
        rows.push({
          lot,
          imageId: item.id,
          regionId: region.id,
          reference: region.original,
          prediction,
          cer: calculateCer(region.original, prediction),
          wer: calculateWer(region.original, prediction),
        });
        console.log(`${lot}/${item.id}_${region.id}: CER ${formatScore(rows.at(-1)!.cer)} WER ${formatScore(rows.at(-1)!.wer)}`);
      }
    }
  }
} finally {
  await worker.terminate();
}

const report = {
  generatedAt: new Date().toISOString(),
  metricDefinition: {
    cer: "distância de Levenshtein por caracteres após normalização de caixa e espaços",
    wer: "distância de Levenshtein por palavras após normalização de caixa e espaços",
  },
  samples: rows.length,
  summary: summarize(rows),
  rows,
};
const outputPath = path.join(root, "artifacts/ocr-evaluation.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`\nRelatório salvo em ${path.relative(root, outputPath)}`);
console.table(report.summary);

const BASELINE: EvaluationSummary[] = [
  { lot: "webtoon_training_lote_01", samples: 22, averageCer: 0.2543580372680915, averageWer: 0.46336510711510714 },
  { lot: "webtoon_training_lote_02", samples: 20, averageCer: 0.16625767278152984, averageWer: 0.31854964479964476 },
  { lot: "webtoon_training_lote_03", samples: 24, averageCer: 0.3399792072198027, averageWer: 0.526140873015873 },
];

if (checkRegression) {
  const regressions = findEvaluationRegressions(report.summary, BASELINE, 0.02);
  if (regressions.length > 0) {
    console.error("\nRegressão detectada na avaliação OCR:");
    for (const regression of regressions) console.error(`- ${regression}`);
    process.exitCode = 1;
  } else {
    console.log("\nLinha de base OCR preservada dentro da tolerância de 2 pontos percentuais.");
  }
}

function summarize(items: EvaluationRow[]): EvaluationSummary[] {
  const grouped = new Map<string, EvaluationRow[]>();
  for (const item of items) grouped.set(item.lot, [...(grouped.get(item.lot) ?? []), item]);
  return [...grouped.entries()].map(([lot, lotRows]) => ({
    lot,
    samples: lotRows.length,
    averageCer: average(lotRows.map((item) => item.cer)),
    averageWer: average(lotRows.map((item) => item.wer)),
  }));
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}

function formatScore(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
