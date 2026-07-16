# ADR 0003 — Assets locais do Tesseract

## Status

Aceita.

## Decisão

O worker do Tesseract, os arquivos core WASM e o modelo `eng.traineddata.gz` serão copiados para `dist/ocr/` durante o build.

O provider não usará os caminhos CDN padrão. A aplicação deverá fornecer `workerPath`, `corePath` e `langPath` apontando para `chrome.runtime.getURL("ocr/...")`.

## Consequências

- O OCR inicial pode funcionar sem baixar código remoto.
- O pacote da extensão ficará maior.
- Idiomas adicionais exigirão dependências e cópia de modelos específicos.
- O build deve continuar sendo executado antes de carregar a extensão no Chrome.
