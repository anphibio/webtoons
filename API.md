# API.md

## Quando usar backend

O backend é opcional.

Usar quando:

- OCR local não for suficiente;
- tradução exigir proteção de credencial;
- modelos locais forem servidos por API;
- houver necessidade de controle de uso;
- houver processamento pesado.

## Endpoints sugeridos

### POST /v1/ocr

Recebe recorte de imagem e retorna regiões reconhecidas.

### POST /v1/translate

Recebe segmentos estruturados e retorna traduções.

O primeiro backend remoto deve encapsular o DeepL. A chave deve vir de variável de ambiente e nunca ser enviada para a extensão. O endpoint deve aceitar somente texto OCR, sem imagens, cookies ou URLs das páginas.

### POST /v1/process

Opcionalmente executa OCR e tradução em uma única operação.

### GET /health

Verifica disponibilidade.

## Requisitos

- FastAPI;
- Pydantic;
- limites de payload;
- autenticação;
- rate limiting;
- timeout;
- logs estruturados;
- sem armazenamento por padrão;
- HTTPS em produção.

## Exemplo de resposta OCR

```json
{
  "regions": [
    {
      "id": "r1",
      "text": "Example",
      "confidence": 0.94,
      "bbox": {
        "x": 120,
        "y": 80,
        "width": 240,
        "height": 90
      }
    }
  ]
}
```

## Exemplo de tradução

```json
{
  "segments": [
    {
      "id": "r1",
      "sourceText": "Example",
      "translatedText": "Exemplo"
    }
  ]
}
```
