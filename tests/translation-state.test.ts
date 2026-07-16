import { describe, expect, it } from "vitest";
import { transition } from "../packages/core/src/translation-state";

describe("estado da tradução", () => {
  it("inicia uma tradução a partir do estado pronto", () => {
    expect(transition({ status: "ready" }, { type: "START" })).toEqual({
      status: "discovering",
    });
  });

  it("permite cancelar uma tradução em andamento", () => {
    expect(transition({ status: "processing" }, { type: "CANCEL" })).toEqual({
      status: "cancelled",
    });
  });

  it("não altera o estado quando a ação não é permitida", () => {
    expect(transition({ status: "completed" }, { type: "START" })).toEqual({
      status: "completed",
    });
  });
});
