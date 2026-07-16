# Avaliação do OCR

O projeto possui um avaliador local para comparar o OCR com as transcrições revisadas dos lotes em `Treinamento/`.

## Executar

```bash
npm run evaluate:ocr
```

O relatório é salvo em `artifacts/ocr-evaluation.json` e contém o resultado de cada recorte, além da média por lote.

É possível executar uma amostra ou um lote específico:

```bash
npm run evaluate:ocr -- --limit=10
npm run evaluate:ocr -- --lot=webtoon_training_lote_03
```

## Métricas

- CER: taxa de erro por caractere, após normalizar caixa e espaços.
- WER: taxa de erro por palavra, após normalizar caixa e espaços.

Quanto menor o valor, melhor. O avaliador usa o texto bruto retornado pelo Tesseract, antes dos filtros da extensão. Isso permite distinguir uma falha do motor OCR de uma região que foi descartada posteriormente pelo filtro de ruído.

As bounding boxes aproximadas dos lotes não são usadas para calcular CER/WER: cada recorte já representa a região anotada. Elas continuam disponíveis para as próximas etapas de avaliação de detecção e posicionamento.

## Linha de base atual

Executada em 16/07/2026 sobre 66 regiões anotadas, usando o texto bruto retornado pelo Tesseract.js:

| Lote | Amostras | CER médio | WER médio |
| --- | ---: | ---: | ---: |
| 01 | 22 | 25,4% | 46,3% |
| 02 | 20 | 16,6% | 31,9% |
| 03 | 24 | 34,0% | 52,6% |

O lote 3 é o principal conjunto para orientar a próxima melhoria, pois reúne textos mais estilizados e de maior dificuldade visual.
