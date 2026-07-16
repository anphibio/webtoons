/* global process, console */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createWorker, PSM } from "tesseract.js";
import { calculateCer, calculateWer } from "../packages/ocr/src/evaluation";
import type { BenchmarkVariantResult } from "../packages/ocr/src/benchmark";
import { rankBenchmarkVariants } from "../packages/ocr/src/benchmark";

interface DatasetItem {
  id: string;
  regions: Array<{ id: string; original: string }>;
}

interface BenchmarkRow {
  variant: string;
  lot: string;
  imageId: string;
  regionId: string;
  reference: string;
  prediction: string;
  cer: number;
  wer: number;
}

interface Variant {
  name: string;
  pageSegmentationMode: PSM;
}

const variants: Variant[] = [
  { name: "sparse-text", pageSegmentationMode: PSM.SPARSE_TEXT },
  { name: "single-block", pageSegmentationMode: PSM.SINGLE_BLOCK },
  { name: "auto", pageSegmentationMode: PSM.AUTO },
];
const root = process.cwd();
const allSamples = process.argv.includes("--all");
const baselinePath = path.join(root, "artifacts/ocr-evaluation.json");
const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as {
  rows: Array<{ lot: string; imageId: string; regionId: string; cer: number }>;
};
const hardSampleIds = new Set(
  baseline.rows
    .filter((row) => allSamples || row.cer >= 0.4)
    .map((row) => `${row.lot}/${row.imageId}_${row.regionId}`),
);
const rows: BenchmarkRow[] = [];

for (const variant of variants) {
  const worker = await createWorker("eng");
  await worker.setParameters({
    tessedit_pageseg_mode: variant.pageSegmentationMode,
    preserve_interword_spaces: "1",
  });

  try {
    for (const lotNumber of [1, 2, 3]) {
      const lot = `webtoon_training_lote_${String(lotNumber).padStart(2, "0")}`;
      const metadataPath = path.join(root, "Treinamento", lot, "metadata/annotations.json");
      const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as { items: DatasetItem[] };

      for (const item of metadata.items) {
        for (const region of item.regions) {
          const sampleId = `${lot}/${item.id}_${region.id}`;
          if (!hardSampleIds.has(sampleId)) continue;
          const cropPath = path.join(root, "Treinamento", lot, "crops", `${item.id}_${region.id}.png`);
          const bytes = new Uint8Array(await readFile(cropPath));
          const recognition = await worker.recognize(bytes, {}, { blocks: true });
          const prediction = recognition.data.text?.trim() ?? "";
          rows.push({
            variant: variant.name,
            lot,
            imageId: item.id,
            regionId: region.id,
            reference: region.original,
            prediction,
            cer: calculateCer(region.original, prediction),
            wer: calculateWer(region.original, prediction),
          });
        }
      }
    }
  } finally {
    await worker.terminate();
  }
}

const summary = rankBenchmarkVariants(variants.map((variant) => {
  const variantRows = rows.filter((row) => row.variant === variant.name);
  return {
    variant: variant.name,
    samples: variantRows.length,
    averageCer: average(variantRows.map((row) => row.cer)),
    averageWer: average(variantRows.map((row) => row.wer)),
  } satisfies BenchmarkVariantResult;
}));
const report = {
  generatedAt: new Date().toISOString(),
  samplePolicy: allSamples ? "todos os recortes" : "recortes com CER da linha de base >= 40%",
  variants: variants.map((variant) => variant.name),
  summary,
  rows,
};
const outputPath = path.join(root, "artifacts/ocr-benchmark.json");
await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(`Benchmark salvo em ${path.relative(root, outputPath)}`);
console.table(summary);

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((total, value) => total + value, 0) / values.length;
}
