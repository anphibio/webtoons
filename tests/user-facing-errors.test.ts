import { describe, expect, it } from "vitest";
import { formatProcessingError } from "../packages/shared/src/user-facing-errors";

describe("formatProcessingError", () => {
  it("explica quando o OCR local não está disponível", () => {
    expect(formatProcessingError("Falha no OCR: Dependências de imagem do OCR local não instaladas"))
      .toBe("O OCR local não está instalado neste computador.");
  });

  it("explica indisponibilidade do backend ou do tradutor", () => {
    expect(formatProcessingError("Falha na tradução: Backend respondeu com HTTP 503"))
      .toBe("O serviço de tradução está indisponível. Verifique se o backend está em execução.");
    expect(formatProcessingError("Failed to fetch"))
      .toBe("Não foi possível comunicar com o backend ou com o serviço de tradução.");
  });

  it("explica imagem bloqueada e timeout", () => {
    expect(formatProcessingError("Falha no carregamento: Falha ao carregar imagem (403)"))
      .toBe("O site bloqueou o carregamento de uma imagem (403).");
    expect(formatProcessingError("Falha no OCR: OCR excedeu o tempo limite"))
      .toBe("O OCR demorou demais e foi interrompido.");
  });

  it("usa uma mensagem segura para erros desconhecidos", () => {
    expect(formatProcessingError("falha sem detalhes"))
      .toBe("Não foi possível concluir uma ou mais imagens.");
    expect(formatProcessingError())
      .toBe("Não foi possível concluir uma ou mais imagens.");
  });
});
