# ADR 0002 — Adaptador do formato ToonGod/Madara

## Status

Aceita.

## Decisão

O primeiro adaptador específico reconhece páginas com host `toongod.org`, caminho `/webtoon/` e estrutura Madara.

O contêiner do capítulo é `.reading-content`. As páginas são identificadas por `img.wp-manga-chapter-img`, priorizando `data-src` e `data-lazy-src` antes de `src`, pois o site usa carregamento lazy.

A identidade de uma página depende apenas da URL de origem e da sua ordem no capítulo. Dimensões não fazem parte da identidade porque mudam durante o lazy-load e poderiam enfileirar a mesma imagem novamente.

Atualizações de `history.pushState` ou `history.replaceState` só encerram o processamento quando alteram origem ou caminho. Mudanças apenas em query string ou fragmento, inclusive as feitas por scripts de medição, não representam troca de capítulo.

O transporte tenta carregar a imagem diretamente com prazo limitado. Falhas, bloqueios ou expirações acionam o proxy local, e o pipeline possui um segundo prazo de segurança para garantir que uma imagem nunca bloqueie as demais páginas do capítulo.

Como o lazy-load pode tornar uma imagem renderizável sem emitir um novo evento `load` observável pela extensão, overlays pendentes são reconsiderados durante scroll e resize. O content script reivindica uma única instância por contexto e o gerenciador substitui overlays órfãos da mesma URL, evitando duplicação após atualização da extensão.

Elementos promocionais ficam fora do contêiner do capítulo e não entram na fila. O HTML salvo em `SiteTeste/` funciona como fixture de integração e representa 26 páginas do capítulo 9.

## Consequências

- O detector não precisa inspecionar banners e iframes do restante da página.
- Imagens ainda sem dimensões carregadas podem ser descobertas pelo seletor específico e terão suas dimensões resolvidas posteriormente.
- OCR e tradução podem terminar antes da materialização visual; o scroll ativa overlays pendentes assim que a imagem possui tamanho de layout.
- O adaptador não implementa OCR, tradução ou alteração da imagem original.
- Mudanças futuras no tema Madara devem ser cobertas por uma nova fixture ou atualização do teste existente.
