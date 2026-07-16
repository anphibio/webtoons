# TEXT_REGION_DETECTION.md

## Objetivo

Localizar áreas que contenham texto dentro das imagens.

## Tipos de conteúdo

- balões de fala;
- balões de pensamento;
- caixas de narração;
- textos soltos;
- placas;
- interfaces desenhadas;
- efeitos sonoros;
- notas do autor.

## Pipeline

1. normalizar escala;
2. corrigir contraste;
3. reduzir ruído;
4. detectar possíveis regiões;
5. agrupar linhas;
6. estimar orientação;
7. classificar região;
8. encaminhar para OCR.

## Estratégias

### MVP

- detecção por OCR com bounding boxes;
- agrupamento de palavras;
- análise de contraste;
- heurísticas de região.

### Evolução

- modelo dedicado de text detection;
- detecção de balões;
- segmentação semântica;
- classificação de SFX;
- orientação vertical.

## Requisitos

Cada região deve conter:

- identificador;
- bounding box;
- rotação;
- confiança;
- tipo estimado;
- ordem de leitura;
- idioma estimado;
- referência da imagem.

## Ordem de leitura

A ordem deve ser configurável por tipo de conteúdo:

- esquerda para direita;
- direita para esquerda;
- cima para baixo.

## Evitar falsos positivos

Ignorar:

- texturas;
- linhas decorativas;
- padrões repetidos;
- marcas d'água configuradas;
- elementos pequenos abaixo do limiar.
