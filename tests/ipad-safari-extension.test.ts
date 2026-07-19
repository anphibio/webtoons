import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const prepareScript = resolve(root, "apps/ipad-safari-extension/scripts/prepare.mjs");

describe("pacote Safari para iPad", () => {
  it("cria uma cópia configurada para o QNAP sem modificar o build do Chrome", () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), "webtoon-ipad-"));
    const source = join(temporaryRoot, "chrome-dist");
    const output = join(temporaryRoot, "ipad-dist");
    mkdirSync(source);

    const manifest = {
      manifest_version: 3,
      name: "Webtoon Image Translator",
      version: "0.1.0",
      host_permissions: [
        "https://i.tngcdn.com/*",
        "http://127.0.0.1:8000/*",
        "http://localhost:8000/*",
      ],
    };
    writeFileSync(join(source, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    writeFileSync(join(source, "options.js"), 'const backendUrl="http://127.0.0.1:8000";\n');

    execFileSync(process.execPath, [
      prepareScript,
      "--source",
      source,
      "--output",
      output,
      "--backend-origin",
      "https://webtoon-api.lan",
    ]);

    const originalManifest = JSON.parse(readFileSync(join(source, "manifest.json"), "utf8"));
    const ipadManifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8"));
    const ipadOptions = readFileSync(join(output, "options.js"), "utf8");

    expect(originalManifest).toEqual(manifest);
    expect(readFileSync(join(source, "options.js"), "utf8")).toContain("127.0.0.1:8000");
    expect(ipadManifest.name).toBe("Webtoon Image Translator para iPad");
    expect(ipadManifest.host_permissions).toEqual([
      "https://i.tngcdn.com/*",
      "https://webtoon-api.lan/*",
    ]);
    expect(ipadOptions).toContain("https://webtoon-api.lan");
    expect(ipadOptions).not.toContain("127.0.0.1:8000");
  });

  it("usa o empacotador atual da Apple em um projeto iOS separado", () => {
    const packageScript = readFileSync(
      resolve(root, "apps/ipad-safari-extension/scripts/package-xcode.sh"),
      "utf8",
    );
    const packageJson = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

    expect(packageJson.scripts["build:ipad"]).toContain("prepare.mjs");
    expect(packageScript).toContain("safari-web-extension-packager");
    expect(packageScript).toContain("--ios-only");
    expect(packageScript).toContain("IPAD_BACKEND_ORIGIN");
  });
});
