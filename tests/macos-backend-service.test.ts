import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "..");
const installer = resolve(root, "scripts/macos-backend/install.sh");
const uninstaller = resolve(root, "scripts/macos-backend/uninstall.sh");
const guide = resolve(root, "scripts/macos-backend/README.md");

describe("serviço automático do backend no macOS", () => {
  it("mantém a instalação local e a chave fora da extensão", () => {
    const content = readFileSync(installer, "utf8");

    expect(content).toContain("127.0.0.1");
    expect(content).toContain("DEEPL_API_KEY");
    expect(content).toContain("launchctl");
    expect(content).toContain("chmod 600");
    expect(content).not.toContain("3187f144-d651-4bd8-b15a-375df4da5655");
  });

  it("fornece scripts válidos de instalação e remoção", () => {
    expect(existsSync(installer)).toBe(true);
    expect(existsSync(uninstaller)).toBe(true);
    expect(existsSync(guide)).toBe(true);

    execFileSync("bash", ["-n", installer]);
    execFileSync("bash", ["-n", uninstaller]);
  });
});
