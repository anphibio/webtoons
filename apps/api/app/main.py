import os
import hmac
from typing import Annotated, Optional

import httpx
from fastapi import Body, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field

from .ocr_service import InvalidImageError, OcrUnavailableError, recognize_image_bytes

app = FastAPI(title="Webtoon Image Translator API", version="0.1.0")
MAX_OCR_IMAGE_BYTES = 25 * 1024 * 1024

_cors_origins = [origin.strip() for origin in os.getenv(
    "CORS_ALLOW_ORIGINS",
    "https://toongod.org,https://www.toongod.org",
).split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-Extension-Token"],
)


class TranslationSegment(BaseModel):
    id: str = Field(min_length=1, max_length=128)
    text: str = Field(min_length=1, max_length=10_000)
    order: int = Field(ge=0, le=10_000)


class TranslateRequest(BaseModel):
    segments: list[TranslationSegment] = Field(min_length=1, max_length=50)
    sourceLanguage: str = Field(min_length=2, max_length=16)
    targetLanguage: str = Field(min_length=2, max_length=16)


class TranslatedSegment(BaseModel):
    id: str
    sourceText: str
    translatedText: str


class TranslateResponse(BaseModel):
    segments: list[TranslatedSegment]


class ImageRequest(BaseModel):
    sourceUrl: str = Field(min_length=1, max_length=2048)
    referrer: str = Field(min_length=1, max_length=2048)


class OcrBoundingBox(BaseModel):
    x: int = Field(ge=0)
    y: int = Field(ge=0)
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class OcrRegion(BaseModel):
    id: str
    text: str
    confidence: float = Field(ge=0, le=1)
    bbox: OcrBoundingBox


class OcrResponse(BaseModel):
    width: int = Field(gt=0)
    height: int = Field(gt=0)
    regions: list[OcrRegion]


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/v1/translate", response_model=TranslateResponse)
async def translate(
    payload: TranslateRequest,
    extension_token: Annotated[Optional[str], Header(alias="X-Extension-Token")] = None,
) -> TranslateResponse:
    require_access_token(extension_token)

    api_key = os.getenv("DEEPL_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="Provedor DeepL não configurado")

    return await translate_with_deepl(payload, api_key)


@app.post("/v1/image")
async def proxy_image(payload: ImageRequest) -> Response:
    source = validate_image_source(payload.sourceUrl)
    try:
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(
                source,
                headers={"Referer": payload.referrer, "User-Agent": "Mozilla/5.0"},
            )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Falha ao buscar imagem no CDN") from error

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"CDN respondeu com HTTP {response.status_code}")
    content_type = response.headers.get("content-type", "").split(";", 1)[0].lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=502, detail="CDN não retornou imagem")
    if len(response.content) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagem excede o tamanho permitido")
    return Response(content=response.content, media_type=content_type, headers={"Cache-Control": "no-store"})


@app.post("/v1/ocr", response_model=OcrResponse)
async def ocr(
    request: Request,
    image: Annotated[bytes, Body()],
    extension_token: Annotated[Optional[str], Header(alias="X-Extension-Token")] = None,
) -> OcrResponse:
    require_access_token(extension_token)
    content_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="O OCR aceita apenas imagens")
    if len(image) > MAX_OCR_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Imagem excede o tamanho permitido")
    if not image:
        raise HTTPException(status_code=400, detail="Imagem vazia")
    try:
        return recognize_image(image)
    except InvalidImageError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except OcrUnavailableError as error:
        raise HTTPException(status_code=503, detail=str(error)) from error


def recognize_image(image: bytes) -> OcrResponse:
    width, height, lines = recognize_image_bytes(image)
    return OcrResponse(
        width=width,
        height=height,
        regions=[
            OcrRegion(
                id=f"ocr-{index}",
                text=line.text,
                confidence=line.confidence,
                bbox=OcrBoundingBox(
                    x=line.x,
                    y=line.y,
                    width=line.width,
                    height=line.height,
                ),
            )
            for index, line in enumerate(lines)
        ],
    )


def require_access_token(extension_token: Optional[str]) -> None:
    expected_token = os.getenv("API_ACCESS_TOKEN")
    if expected_token and not hmac.compare_digest(extension_token or "", expected_token):
        raise HTTPException(status_code=401, detail="Token de acesso inválido")


async def translate_with_deepl(payload: TranslateRequest, api_key: str) -> TranslateResponse:
    endpoint = os.getenv("DEEPL_API_ENDPOINT", "https://api-free.deepl.com").rstrip("/")
    body = {
        "text": [segment.text for segment in payload.segments],
        "source_lang": to_deepl_language(payload.sourceLanguage),
        "target_lang": to_deepl_language(payload.targetLanguage),
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                f"{endpoint}/v2/translate",
                headers={"Authorization": f"DeepL-Auth-Key {api_key}"},
                json=body,
            )
    except httpx.HTTPError as error:
        raise HTTPException(status_code=502, detail="Falha de comunicação com o DeepL") from error

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"DeepL respondeu com HTTP {response.status_code}")

    decoded: object = {}
    try:
        decoded = response.json()
        translations = decoded["translations"]
        if len(translations) != len(payload.segments):
            raise ValueError
        result = [
            TranslatedSegment(
                id=segment.id,
                sourceText=segment.text,
                translatedText=translation["text"],
            )
            for segment, translation in zip(payload.segments, translations)
        ]
    except (KeyError, TypeError, ValueError):
        fields = sorted(decoded.keys()) if isinstance(decoded, dict) else []
        translation_count = len(translations) if isinstance(translations, list) else "não-lista"
        translation_text_type = (
            type(translations[0].get("text")).__name__
            if isinstance(translations, list) and translations and isinstance(translations[0], dict)
            else "desconhecido"
        )
        raise HTTPException(
            status_code=502,
            detail=(
                "Resposta inválida do DeepL "
                f"(content-type={response.headers.get('content-type', 'desconhecido')}, "
                f"campos={fields}, quantidade={translation_count}, esperada={len(payload.segments)}, "
                f"tipo_texto={translation_text_type})"
            ),
        )

    return TranslateResponse(segments=result)


def to_deepl_language(language: str) -> str:
    aliases = {
        "eng": "EN",
        "en": "EN",
        "jpn": "JA",
        "ja": "JA",
        "kor": "KO",
        "ko": "KO",
        "pt-br": "PT-BR",
        "por": "PT-BR",
    }
    normalized = language.strip().lower()
    return aliases.get(normalized, language.upper())


def validate_image_source(source: str) -> str:
    from urllib.parse import urlparse

    parsed = urlparse(source)
    if parsed.scheme != "https" or parsed.hostname != "i.tngcdn.com":
        raise HTTPException(status_code=400, detail="Fonte de imagem não permitida")
    return source
