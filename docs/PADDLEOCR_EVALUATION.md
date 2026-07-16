# Avaliação do PaddleOCR local

Avaliação executada em 16/07/2026 nos 66 recortes revisados da pasta `Treinamento`, usando PaddleOCR 3.2.0 e o reconhecedor inglês PP-OCRv5 mobile.

## Perfil de referência — detector server

| Conjunto | CER | WER | Correspondência exata |
| --- | ---: | ---: | ---: |
| Lote 01 | 11,70% | 15,79% | 10/22 |
| Lote 02 | 1,32% | 5,81% | 14/20 |
| Lote 03 | 6,64% | 13,94% | 15/24 |
| Total ponderado | 6,52% | 11,86% | 39/66 |

O Tesseract.js havia obtido CER entre 16,63% e 34,00% e WER entre 31,85% e 52,61% nesses lotes. A comparação confirma melhora relevante de detecção e reconhecimento, inclusive em texto branco sobre fundo preto e fontes estilizadas.

Esse perfil apresentou a melhor precisão nos recortes, mas não é adequado para o fluxo de produção em CPU. Mesmo dividindo a página em blocos, o detector server atingiu 9,43 GB de memória residente e pico de footprint de 10,77 GB em uma única imagem longa.

## Perfil de produção — detector mobile

O perfil de produção usa `PP-OCRv5_mobile_det`, reconhecedor `en_PP-OCRv5_mobile_rec`, blocos de 1400 px e sobreposição de 160 px.

| Conjunto | CER | WER |
| --- | ---: | ---: |
| Lote 01 | 15,27% | 23,68% |
| Lote 02 | 7,21% | 12,90% |
| Lote 03 | 7,30% | 15,15% |
| Total ponderado | 9,80% | 17,16% |

No capítulo de teste completo, o perfil processou 24 imagens em 91,25 segundos, encontrou 173 regiões e não deixou nenhuma imagem sem detecção. O pico medido foi 1,26 GB de memória residente, contra mais de 9 GB no perfil server.

Os erros restantes concentram-se em letras cortadas, pontuação e recortes de treinamento cujo limite atravessa duas falas. No fluxo de página completa, linhas próximas são ordenadas visualmente e agrupadas em uma única região de fala antes da tradução, preservando o contexto sem unir balões afastados. Detecções repetidas nas emendas dos blocos são removidas pela posição e pelo texto normalizado.

O avaliador pode ser executado com:

```sh
cd apps/api
PYTHONPATH=. .venv-ocr/bin/python scripts/evaluate_paddleocr.py
```
