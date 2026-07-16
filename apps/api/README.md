# API local de OCR e tradução

Backend FastAPI para executar o PaddleOCR na máquina do usuário e encapsular o DeepL sem expor a chave na extensão.

## Executar

```sh
cd apps/api
python3 -m venv .venv-ocr
.venv-ocr/bin/python -m pip install -r requirements-ocr.txt
export DEEPL_API_KEY="..."
.venv-ocr/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Na primeira execução do OCR, os modelos oficiais do PaddleOCR são baixados e mantidos no cache local. As execuções seguintes reutilizam esses arquivos.

O perfil padrão usa o detector `PP-OCRv5_mobile_det` e divide imagens altas em blocos verticais sobrepostos, processados sequencialmente. Isso limita o pico de memória sem perder textos nas emendas. As opções abaixo existem para diagnóstico; os padrões são os recomendados para uso no macOS:

```sh
export OCR_TILE_HEIGHT=1400
export OCR_TILE_OVERLAP=160
export OCR_DETECTION_MODEL=PP-OCRv5_mobile_det
```

O detector `PP-OCRv5_server_det` não é recomendado para capítulos longos em CPU: nos testes do projeto, ele ultrapassou 9 GB de memória residente.

Opcionalmente, defina `API_ACCESS_TOKEN` para exigir o cabeçalho `X-Extension-Token`.

Por padrão, o backend aceita requisições do Toongod (`toongod.org` e `www.toongod.org`). Para alterar essa lista, defina `CORS_ALLOW_ORIGINS` como uma lista separada por vírgulas.

Endpoints:

- `POST /v1/ocr`: recebe os bytes de uma imagem, processa-os localmente e devolve texto, confiança e posições. A imagem não é persistida nem enviada a terceiros.
- `POST /v1/translate`: envia somente os segmentos de texto ao DeepL.
- `POST /v1/image`: obtém imagens do CDN permitido sem encaminhar cookies ou tokens do navegador.

O serviço deve permanecer vinculado a `127.0.0.1`. Se `API_ACCESS_TOKEN` estiver definido, os endpoints de OCR e tradução exigem o cabeçalho `X-Extension-Token`.

## Avaliação local

```sh
cd apps/api
PYTHONPATH=. .venv-ocr/bin/python scripts/evaluate_paddleocr.py
```
