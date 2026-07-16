/* global process */

import path from "node:path";
import { unlink } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

const output = path.resolve(`.webtoon-ocr-evaluation-${process.pid}.mjs`);
await build({
  entryPoints: [path.resolve("scripts/evaluate-ocr.ts")],
  bundle: true,
  format: "esm",
  packages: "external",
  platform: "node",
  outfile: output,
});
try {
  await import(`${pathToFileURL(output).href}?run=${Date.now()}`);
} finally {
  await unlink(output).catch(() => undefined);
}
