import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("recursos do worker OCR da extensão", () => {
  it("expõe os assets do Tesseract para páginas dos sites suportados", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "apps/extension/public/manifest.json"), "utf8"),
    ) as {
      web_accessible_resources?: Array<{ resources?: string[]; matches?: string[] }>;
      content_security_policy?: { extension_pages?: string };
    };

    const resourceRule = manifest.web_accessible_resources?.find((rule) =>
      rule.resources?.includes("ocr/worker.min.js"),
    );

    expect(resourceRule?.resources).toEqual(expect.arrayContaining([
      "ocr.html",
      "ocr/worker.min.js",
      "ocr/core/*",
      "ocr/lang/*",
    ]));
    expect(resourceRule?.matches).toEqual(expect.arrayContaining(["https://*.toongod.org/*"]));
    expect(manifest.content_security_policy?.extension_pages).toContain("'wasm-unsafe-eval'");
  });

  it("mantém permissões mínimas e hosts explicitamente autorizados", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(process.cwd(), "apps/extension/public/manifest.json"), "utf8"),
    ) as {
      permissions?: string[];
      host_permissions?: string[];
      content_scripts?: Array<{ matches?: string[] }>;
    };

    expect(manifest.permissions).toEqual(expect.arrayContaining(["storage", "activeTab", "scripting"]));
    expect(manifest.permissions).not.toContain("<all_urls>");
    expect(manifest.permissions).not.toContain("webRequest");
    expect(manifest.host_permissions).toEqual([
      "https://i.tngcdn.com/*",
      "http://127.0.0.1:8000/*",
      "http://localhost:8000/*",
    ]);
    expect(manifest.content_scripts?.flatMap((script) => script.matches ?? [])).toEqual([
      "https://*.toongod.org/*",
    ]);
  });
});
