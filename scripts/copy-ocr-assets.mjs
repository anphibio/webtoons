import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "dist/ocr");
const coreOutput = resolve(output, "core");
const langOutput = resolve(output, "lang");
const tesseractPackage = resolve(root, "node_modules/tesseract.js");
const corePackage = resolve(root, "node_modules/tesseract.js-core");
const languagePackage = resolve(root, "node_modules/@tesseract.js-data/eng/4.0.0");

mkdirSync(coreOutput, { recursive: true });
mkdirSync(langOutput, { recursive: true });

cpSync(resolve(tesseractPackage, "dist/worker.min.js"), resolve(output, "worker.min.js"));
for (const file of readdirSync(corePackage)) {
  if (file.endsWith(".js") || file.endsWith(".wasm")) {
    cpSync(resolve(corePackage, file), resolve(coreOutput, file));
  }
}
cpSync(resolve(languagePackage, "eng.traineddata.gz"), resolve(langOutput, "eng.traineddata.gz"));
