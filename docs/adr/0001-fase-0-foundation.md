# ADR 0001 — Fundação da extensão

## Status

Aceita para a Fase 0.

## Decisão

O projeto usará um monorepo TypeScript com uma extensão Chrome Manifest V3 em `apps/extension` e pacotes de domínio em `packages/`.

O service worker será o ponto de coordenação entre popup, content script e futuras integrações remotas. O content script será injetado sob demanda usando `activeTab` e `scripting`, evitando permissões de host amplas na fundação.

Mensagens internas terão união discriminada e validação de campos. A interface do popup usará React. OCR, tradução, detecção de imagens e overlays ficam fora da Fase 0.

## Consequências

- A extensão pode ser carregada no Chrome sem conceder acesso permanente a todos os sites.
- O núcleo pode ser testado sem depender do Chrome ou de um site externo.
- O service worker precisa reinjetar o content script quando a guia ainda não tiver sido preparada.
- O estado de execução deve ser reconstruível, pois service workers do Manifest V3 podem ser suspensos.
