# TESTING.md

## Estratégia

### Testes unitários

- detecção de imagem;
- pontuação de candidato;
- agrupamento de regiões;
- normalização de OCR;
- criação de cache key;
- ajuste de fonte;
- validação de mensagens;
- adaptadores.

### Testes de integração

- content script com fixture;
- pipeline com OCR mock;
- pipeline com tradução mock;
- cache;
- reprocessamento;
- mudança de rota;
- carregamento dinâmico.

### Testes E2E

Usar Playwright com extensão carregada.

Cenários:

1. abrir página de teste;
2. detectar capítulo;
3. iniciar tradução;
4. verificar progresso;
5. verificar overlays;
6. rolar;
7. verificar novas imagens;
8. desativar;
9. confirmar restauração.

## Fixtures

Não depender exclusivamente de sites externos.

Criar fixtures locais contendo:

- capítulo vertical;
- anúncios;
- imagens decorativas;
- lazy loading;
- SPA;
- imagens com texto;
- imagens sem texto;
- diferentes larguras.

## Mocks

- OCR;
- tradução;
- service worker;
- storage;
- permissões.

## Regressão visual

Capturar:

- original;
- overlay;
- resize;
- modo escuro da extensão;
- configurações de fonte.

## Critérios

Nenhuma feature entra sem teste correspondente quando for razoavelmente testável.
