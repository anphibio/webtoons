import { describe, expect, it } from "vitest";
import { claimRuntime } from "../packages/core/src/runtime-singleton";

describe("instância do content script", () => {
  it("permite somente uma inicialização por contexto da extensão", () => {
    const scope: Record<string, unknown> = {};

    expect(claimRuntime(scope, "content-script")).toBe(true);
    expect(claimRuntime(scope, "content-script")).toBe(false);
  });
});
