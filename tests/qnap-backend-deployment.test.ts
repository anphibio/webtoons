import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const composeFile = resolve(root, "deploy/qnap-backend/compose.yaml");
const dockerfile = resolve(root, "deploy/qnap-backend/Dockerfile");
const envExample = resolve(root, "deploy/qnap-backend/.env.example");
const dockerIgnore = resolve(root, ".dockerignore");
const gitIgnore = resolve(root, ".gitignore");

describe("implantação do backend no QNAP", () => {
  it("mantém segredos fora da imagem e executa um único worker com recuperação automática", () => {
    const compose = readFileSync(composeFile, "utf8");

    expect(compose).toContain("restart: unless-stopped");
    expect(compose).toContain("DEEPL_API_KEY: ${DEEPL_API_KEY:?configure DEEPL_API_KEY no .env}");
    expect(compose).toContain(
      "API_ACCESS_TOKEN: ${API_ACCESS_TOKEN:?configure API_ACCESS_TOKEN no .env}",
    );
    expect(compose).toContain("DEEPL_API_ENDPOINT: ${DEEPL_API_ENDPOINT:-https://api-free.deepl.com}");
    expect(compose).toContain("CORS_ALLOW_ORIGINS:");
    expect(compose).toContain("OCR_TILE_HEIGHT:");
    expect(compose).toContain("OCR_TILE_OVERLAP:");
    expect(compose).toContain("OCR_DETECTION_MODEL:");
    expect(compose).not.toContain("ALLOWED_ORIGINS:");
    expect(compose).not.toContain("ALLOWED_ORIGIN_REGEX:");
    expect(compose).not.toContain("OCR_MAX_SIDE:");
    expect(compose).not.toContain("OCR_MIN_CONFIDENCE:");
    expect(compose).not.toContain("api-free.deepl.com/v2/translate");
    expect(compose).toContain("/health");
    expect(compose).toContain("--workers");
    expect(compose).toContain('"1"');
    expect(compose).not.toMatch(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}:fx/i);
  });

  it("produz uma imagem mínima, não-root e com dependências completas do OCR", () => {
    const image = readFileSync(dockerfile, "utf8");
    const environment = readFileSync(envExample, "utf8");

    expect(image).toContain("python:3.11-slim");
    expect(image).toContain("requirements-ocr.txt");
    expect(image).toContain("USER app");
    expect(image).not.toContain("DEEPL_API_KEY=");
    expect(environment).toContain("DEEPL_API_KEY=");
    expect(environment).toContain("API_ACCESS_TOKEN=");
    expect(environment).not.toMatch(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}:fx/i);
  });

  it("não envia builds, ambientes locais nem material de teste ao daemon Docker", () => {
    const ignored = readFileSync(dockerIgnore, "utf8");

    expect(ignored).toContain("node_modules");
    expect(ignored).toContain(".venv-ocr");
    expect(ignored).toContain("SiteTeste");
    expect(ignored).toContain("Treinamento");
    expect(ignored).toContain("deploy/qnap-backend/.env");
  });

  it("impede que os segredos do QNAP sejam versionados", () => {
    const ignored = readFileSync(gitIgnore, "utf8");

    expect(ignored).toContain("deploy/qnap-backend/.env");
  });
});
