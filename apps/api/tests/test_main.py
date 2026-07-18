import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from app import main


class ApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(main.app)

    def test_health(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_requires_provider_key(self) -> None:
        with patch.dict(os.environ, {}, clear=True):
            response = self.client.post(
                "/v1/translate",
                json={"segments": [{"id": "a", "text": "Hello", "order": 0}], "sourceLanguage": "eng", "targetLanguage": "pt-BR"},
            )
        self.assertEqual(response.status_code, 503)

    def test_translates_without_exposing_provider_key(self) -> None:
        fake_translate = AsyncMock(return_value=main.TranslateResponse(segments=[
            main.TranslatedSegment(id="a", sourceText="Hello", translatedText="Olá"),
        ]))
        with patch.dict(os.environ, {"DEEPL_API_KEY": "secret"}), patch.object(main, "translate_with_deepl", fake_translate):
            response = self.client.post(
                "/v1/translate",
                json={"segments": [{"id": "a", "text": "Hello", "order": 0}], "sourceLanguage": "eng", "targetLanguage": "pt-BR"},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["segments"][0]["translatedText"], "Olá")
        self.assertNotIn("secret", response.text)

    def test_allows_translation_from_supported_site_origin(self) -> None:
        response = self.client.options(
            "/v1/translate",
            headers={
                "Origin": "https://www.toongod.org",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "https://www.toongod.org")

    def test_rejects_image_proxy_outside_allowed_cdn(self) -> None:
        response = self.client.post("/v1/image", json={"sourceUrl": "https://example.com/a.jpg", "referrer": "https://www.toongod.org/"})
        self.assertEqual(response.status_code, 400)

    def test_recognizes_image_locally(self) -> None:
        fake_result = main.OcrResponse(
            width=100,
            height=50,
            regions=[
                main.OcrRegion(
                    id="ocr-0",
                    text="Hello",
                    confidence=0.94,
                    bbox=main.OcrBoundingBox(x=10, y=8, width=60, height=20),
                ),
            ],
        )
        with patch.object(main, "recognize_image", return_value=fake_result) as recognize:
            response = self.client.post(
                "/v1/ocr",
                content=b"fake-image-bytes",
                headers={"Content-Type": "image/jpeg"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["regions"][0]["text"], "Hello")
        recognize.assert_called_once_with(b"fake-image-bytes")

    def test_rejects_non_image_ocr_body(self) -> None:
        response = self.client.post(
            "/v1/ocr",
            content=b"not-an-image",
            headers={"Content-Type": "text/plain"},
        )
        self.assertEqual(response.status_code, 415)

    def test_rejects_oversized_ocr_body(self) -> None:
        with patch.object(main, "MAX_OCR_IMAGE_BYTES", 4):
            response = self.client.post(
                "/v1/ocr",
                content=b"12345",
                headers={"Content-Type": "image/png"},
            )
        self.assertEqual(response.status_code, 413)

    def test_protects_local_ocr_when_access_token_is_configured(self) -> None:
        with patch.dict(os.environ, {"API_ACCESS_TOKEN": "secret"}):
            response = self.client.post(
                "/v1/ocr",
                content=b"image",
                headers={"Content-Type": "image/png"},
            )
        self.assertEqual(response.status_code, 401)

    def test_rejects_wrong_access_token(self) -> None:
        with patch.dict(os.environ, {"API_ACCESS_TOKEN": "secret"}):
            response = self.client.post(
                "/v1/translate",
                headers={"X-Extension-Token": "wrong"},
                json={"segments": [{"id": "a", "text": "Hello", "order": 0}], "sourceLanguage": "eng", "targetLanguage": "pt-BR"},
            )
        self.assertEqual(response.status_code, 401)


if __name__ == "__main__":
    unittest.main()
