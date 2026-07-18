/**
 * Converts internal pipeline errors into short, actionable popup messages.
 * The original error remains available to the extension logs for diagnosis.
 */
export function formatProcessingError(error?: string): string {
  const normalized = error?.trim().toLocaleLowerCase("pt-BR") ?? "";

  if (normalized.includes("dependências de imagem do ocr local") || normalized.includes("dependencias de imagem do ocr local")) {
    return "O OCR local não está instalado neste computador.";
  }

  if (normalized.includes("ocr excedeu o tempo limite") || normalized.includes("ocr demorou demais")) {
    return "O OCR demorou demais e foi interrompido.";
  }

  if (normalized.includes("tradução excedeu o tempo limite") || normalized.includes("traducao excedeu o tempo limite")) {
    return "A tradução demorou demais e foi interrompida.";
  }

  if (normalized.includes("falha ao carregar imagem (403)") || normalized.includes("http 403")) {
    return "O site bloqueou o carregamento de uma imagem (403).";
  }

  if (normalized.includes("http 503") || normalized.includes("provedor deepl não configurado") || normalized.includes("provedor deepl nao configurado")) {
    return "O serviço de tradução está indisponível. Verifique se o backend está em execução.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("não foi possível acessar o backend") || normalized.includes("nao foi possivel acessar o backend")) {
    return "Não foi possível comunicar com o backend ou com o serviço de tradução.";
  }

  return "Não foi possível concluir uma ou mais imagens.";
}
