# ADR 0004 — DeepL como provedor remoto inicial

## Status

Aceito

## Decisão

O primeiro provedor remoto de tradução será o DeepL API Free/Pro, encapsulado por `DeepLTranslationProvider`.

O provedor:

- recebe somente segmentos de texto produzidos pelo OCR;
- preserva os IDs e a ordem dos segmentos;
- limita lotes a 50 textos e aproximadamente 120 KiB;
- usa `credentials: omit`;
- valida status HTTP, JSON e quantidade de traduções;
- recebe a chave por injeção e não deve ser empacotado no content script.

## Segurança

A chave deve permanecer em um backend ou processo confiável. A extensão não deve chamar o DeepL diretamente em produção. O consentimento remoto permanece desativado por padrão.

## Consequências

O DeepL oferece contexto, glossários e suporte a `PT-BR`, enquanto a interface existente continua independente do fornecedor. Um provedor local ou um modelo contextual adicional pode ser incluído depois sem alterar o pipeline.
