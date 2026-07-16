import { describe, expect, it } from "vitest";
import { parseMessage } from "../packages/shared/src/messaging";

describe("mensagens da extensão", () => {
  it("aceita o comando para iniciar uma tradução", () => {
    const result = parseMessage({ type: "TRANSLATION_START" });

    expect(result).toEqual({ type: "TRANSLATION_START" });
  });

  it("rejeita mensagens com campos desconhecidos", () => {
    expect(() => parseMessage({ type: "TRANSLATION_START", token: "secret" })).toThrow(
      "Mensagem inválida",
    );
  });

  it("aceita solicitação de imagem somente com URL", () => {
    expect(parseMessage({ type: "FETCH_IMAGE", sourceUrl: "https://i.tngcdn.com/page.jpg", referrer: "https://www.toongod.org/chapter", proxyUrl: "http://127.0.0.1:8000" })).toEqual({
      type: "FETCH_IMAGE",
      sourceUrl: "https://i.tngcdn.com/page.jpg",
      referrer: "https://www.toongod.org/chapter",
      proxyUrl: "http://127.0.0.1:8000",
    });
  });
});
