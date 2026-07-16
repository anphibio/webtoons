# Benchmark de variantes do OCR

O benchmark compara configurações de segmentação do Tesseract.js nos recortes
mais difíceis do conjunto de treinamento. Por padrão, ele usa os recortes cuja
linha de base possui CER igual ou superior a 40%.

```bash
npm run benchmark:ocr
```

Para comparar todos os recortes:

```bash
npm run benchmark:ocr -- --all
```

O resultado fica em `artifacts/ocr-benchmark.json`. A variante recomendada é a
que tiver menor CER médio; WER é usado como critério de desempate. As variantes
atuais são `sparse-text`, `single-block` e `auto`.

## Resultado atual

Nos 17 recortes com CER da linha de base igual ou superior a 40%:

| Variante | CER médio | WER médio |
| --- | ---: | ---: |
| `single-block` | 52,0% | 87,1% |
| `auto` | 58,9% | 101,7% |
| `sparse-text` | 70,8% | 103,0% |

O resultado indica que `single-block` deve ser testado como recuperação para
regiões de texto isoladas. Ainda não é seguro torná-lo o modo global, porque a
extensão também processa páginas longas com vários balões e legendas.

O resultado ainda não foi aplicado globalmente à extensão: o benchmark usa
recortes isolados, enquanto a extensão normalmente envia a imagem inteira ou
blocos verticais. Aplicar `single-block` nesse nível pode agrupar texto e
prejudicar o posicionamento; por isso, a integração deve esperar uma etapa de
detecção de regiões independente.
