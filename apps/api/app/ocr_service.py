from dataclasses import dataclass
from io import BytesIO
import os
import re
from statistics import median
from threading import Lock
from typing import Any, Iterable, List, Mapping, Optional, Sequence


@dataclass(frozen=True)
class OcrLine:
    text: str
    confidence: float
    x: int
    y: int
    width: int
    height: int


class OcrUnavailableError(RuntimeError):
    pass


class InvalidImageError(ValueError):
    pass


_engine: Optional[Any] = None
_engine_lock = Lock()
DEFAULT_TILE_HEIGHT = 1400
DEFAULT_TILE_OVERLAP = 160


def recognize_image_bytes(image_bytes: bytes) -> tuple[int, int, List[OcrLine]]:
    try:
        import numpy as np
        from PIL import Image
    except ImportError as error:
        raise OcrUnavailableError("Dependências de imagem do OCR local não instaladas") from error

    try:
        with Image.open(BytesIO(image_bytes)) as image:
            image.load()
            rgb_image = image.convert("RGB")
            width, height = rgb_image.size
            image_array = np.asarray(rgb_image)
    except Exception as error:
        raise InvalidImageError("Corpo da requisição não contém uma imagem válida") from error

    engine = get_engine()
    with _engine_lock:
        lines = run_tiled_ocr(
            image_array,
            engine,
            tile_height=_positive_int_env("OCR_TILE_HEIGHT", DEFAULT_TILE_HEIGHT),
            overlap=_non_negative_int_env("OCR_TILE_OVERLAP", DEFAULT_TILE_OVERLAP),
        )
    return width, height, group_ocr_lines(lines)


def get_engine() -> Any:
    global _engine
    if _engine is not None:
        return _engine

    with _engine_lock:
        if _engine is not None:
            return _engine
        try:
            from paddleocr import PaddleOCR
        except ImportError as error:
            raise OcrUnavailableError("PaddleOCR local não instalado") from error

        _engine = PaddleOCR(
            text_detection_model_name=os.getenv("OCR_DETECTION_MODEL", "PP-OCRv5_mobile_det"),
            text_recognition_model_name="en_PP-OCRv5_mobile_rec",
            use_doc_orientation_classify=False,
            use_doc_unwarping=False,
            use_textline_orientation=False,
        )
        return _engine


def run_tiled_ocr(image_array: Any, engine: Any, tile_height: int, overlap: int) -> List[OcrLine]:
    image_height = int(image_array.shape[0])
    if tile_height <= 0 or overlap < 0 or overlap >= tile_height:
        raise ValueError("Configuração de blocos OCR inválida")

    lines: List[OcrLine] = []
    start = 0
    while start < image_height:
        end = min(image_height, start + tile_height)
        tile = image_array[start:end, :, :]
        result = engine.predict(tile)
        lines.extend(_offset_lines(parse_paddle_result(result), start))
        if end == image_height:
            break
        start = end - overlap
    return _deduplicate_lines(lines)


def _offset_lines(lines: Iterable[OcrLine], y_offset: int) -> List[OcrLine]:
    return [
        OcrLine(
            text=line.text,
            confidence=line.confidence,
            x=line.x,
            y=line.y + y_offset,
            width=line.width,
            height=line.height,
        )
        for line in lines
    ]


def _deduplicate_lines(lines: Iterable[OcrLine]) -> List[OcrLine]:
    unique: List[OcrLine] = []
    for line in sorted(lines, key=lambda item: (item.y, item.x)):
        duplicate_index = next(
            (index for index, existing in enumerate(unique) if _same_line(existing, line)),
            None,
        )
        if duplicate_index is None:
            unique.append(line)
        elif _line_quality(line) > _line_quality(unique[duplicate_index]):
            unique[duplicate_index] = line
    return sorted(unique, key=lambda item: (item.y, item.x))


def _same_line(left: OcrLine, right: OcrLine) -> bool:
    left_text = _comparison_text(left.text)
    right_text = _comparison_text(right.text)
    same_or_contained = left_text == right_text or (
        min(len(left_text), len(right_text)) >= 4 and
        (left_text in right_text or right_text in left_text)
    )
    if not same_or_contained:
        return False
    horizontal_overlap = max(
        0,
        min(left.x + left.width, right.x + right.width) - max(left.x, right.x),
    )
    if horizontal_overlap / max(1, min(left.width, right.width)) < 0.5:
        return False
    left_center = left.y + left.height / 2
    right_center = right.y + right.height / 2
    return abs(left_center - right_center) <= max(left.height, right.height)


def _comparison_text(text: str) -> str:
    return "".join(character for character in text.upper() if character.isalnum())


def _looks_like_gibberish(text: str) -> bool:
    words = re.findall(r"[A-Za-z]+", text)
    if len(words) < 5 or not re.search(r"\d", text):
        return False
    return sum(1 for word in words if len(word) <= 1) >= 3


def _line_quality(line: OcrLine) -> tuple[int, float]:
    return len(_comparison_text(line.text)), line.confidence


def _positive_int_env(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
        return value if value > 0 else default
    except ValueError:
        return default


def _non_negative_int_env(name: str, default: int) -> int:
    try:
        value = int(os.getenv(name, str(default)))
        return value if value >= 0 else default
    except ValueError:
        return default


def parse_paddle_result(results: Iterable[Any]) -> List[OcrLine]:
    regions: List[OcrLine] = []
    for result in results:
        result_json = getattr(result, "json", {})
        if callable(result_json):
            result_json = result_json()
        if not isinstance(result_json, Mapping):
            continue
        payload = result_json.get("res", result_json)
        if not isinstance(payload, Mapping):
            continue

        texts = _as_sequence(payload.get("rec_texts"))
        scores = _as_sequence(payload.get("rec_scores"))
        boxes = _as_sequence(payload.get("rec_boxes"))
        for text_value, score_value, box_value in zip(texts, scores, boxes):
            text = str(text_value).strip()
            box = _as_sequence(box_value)
            if not text or len(box) != 4 or _looks_like_gibberish(text):
                continue
            try:
                x_min, y_min, x_max, y_max = (int(round(float(value))) for value in box)
                confidence = max(0.0, min(1.0, float(score_value)))
            except (TypeError, ValueError):
                continue
            if x_max <= x_min or y_max <= y_min:
                continue
            regions.append(OcrLine(
                text=text,
                confidence=confidence,
                x=x_min,
                y=y_min,
                width=x_max - x_min,
                height=y_max - y_min,
            ))
    return regions


def group_ocr_lines(lines: Iterable[OcrLine]) -> List[OcrLine]:
    ordered_lines = _reading_order(lines)
    typical_height = median(line.height for line in ordered_lines) if ordered_lines else 0
    max_grouping_height = max(160, typical_height * 4)
    ordered_lines = [
        _normalize_short_tall_line(line, typical_height, max_grouping_height)
        for line in ordered_lines
    ]
    groups: List[List[OcrLine]] = []
    for line in ordered_lines:
        candidates = [
            group for group in groups
            if _can_join(group[-1], line, max_grouping_height)
        ]
        if not candidates:
            groups.append([line])
            continue
        closest = min(candidates, key=lambda group: abs(line.y - (group[-1].y + group[-1].height)))
        closest.append(line)

    return [_merge_group(group) for group in groups]


def _reading_order(lines: Iterable[OcrLine]) -> List[OcrLine]:
    rows: List[List[OcrLine]] = []
    for line in sorted(lines, key=lambda item: (item.y + item.height / 2, item.x)):
        row = next(
            (candidate for candidate in rows if any(_same_visual_row(existing, line) for existing in candidate)),
            None,
        )
        if row is None:
            rows.append([line])
        else:
            row.append(line)
    rows.sort(key=lambda row: min(line.y for line in row))
    return [line for row in rows for line in sorted(row, key=lambda item: item.x)]


def _same_visual_row(left: OcrLine, right: OcrLine) -> bool:
    overlap = max(0, min(left.y + left.height, right.y + right.height) - max(left.y, right.y))
    return overlap / max(1, min(left.height, right.height)) >= 0.5


def _can_join(previous: OcrLine, current: OcrLine, max_grouping_height: float) -> bool:
    if not _same_visual_row(previous, current) and (_is_onomatopoeia(previous.text) or _is_onomatopoeia(current.text)):
        return False
    if previous.height > max_grouping_height or current.height > max_grouping_height:
        return False
    if _same_visual_row(previous, current):
        horizontal_gap = max(
            0,
            max(previous.x, current.x) - min(previous.x + previous.width, current.x + current.width),
        )
        return horizontal_gap <= max(previous.height, current.height) * 0.5

    vertical_gap = current.y - (previous.y + previous.height)
    max_height = max(previous.height, current.height)
    if vertical_gap < -max_height * 0.6 or vertical_gap > max(12, max_height * 1.25):
        return False

    previous_right = previous.x + previous.width
    current_right = current.x + current.width
    overlap = max(0, min(previous_right, current_right) - max(previous.x, current.x))
    minimum_width = max(1, min(previous.width, current.width))
    if overlap / minimum_width >= 0.2:
        return True

    previous_center = previous.x + previous.width / 2
    current_center = current.x + current.width / 2
    return abs(previous_center - current_center) <= max(previous.width, current.width) * 0.55


def _is_onomatopoeia(text: str) -> bool:
    normalized = re.sub(r"[^a-z]", "", text.lower())
    return normalized in {"ah", "ahh", "haah", "hmm", "mmm", "oh"}


def _normalize_short_tall_line(line: OcrLine, typical_height: float, limit: float) -> OcrLine:
    if line.height <= limit or len(_comparison_text(line.text)) >= 40:
        return line
    height = max(24, round(typical_height * 1.8))
    return OcrLine(
        text=line.text,
        confidence=line.confidence,
        x=line.x,
        y=line.y + round((line.height - height) / 2),
        width=line.width,
        height=height,
    )


def _merge_group(group: Sequence[OcrLine]) -> OcrLine:
    x_min = min(line.x for line in group)
    y_min = min(line.y for line in group)
    x_max = max(line.x + line.width for line in group)
    y_max = max(line.y + line.height for line in group)
    weight = sum(max(1, len(line.text)) for line in group)
    confidence = sum(line.confidence * max(1, len(line.text)) for line in group) / weight
    return OcrLine(
        text=" ".join(line.text for line in group),
        confidence=confidence,
        x=x_min,
        y=y_min,
        width=x_max - x_min,
        height=y_max - y_min,
    )


def _as_sequence(value: Any) -> Sequence[Any]:
    if hasattr(value, "tolist"):
        value = value.tolist()
    if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
        return value
    return []
