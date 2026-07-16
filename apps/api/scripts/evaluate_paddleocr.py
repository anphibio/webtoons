import json
import re
from pathlib import Path
from typing import List

from app.ocr_service import recognize_image_bytes


PROJECT_ROOT = Path(__file__).resolve().parents[3]


def edit_distance(left: List[str], right: List[str]) -> int:
    previous = list(range(len(right) + 1))
    for left_index, left_value in enumerate(left, start=1):
        current = [left_index]
        for right_index, right_value in enumerate(right, start=1):
            current.append(min(
                current[-1] + 1,
                previous[right_index] + 1,
                previous[right_index - 1] + (left_value != right_value),
            ))
        previous = current
    return previous[-1]


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.upper()).strip()


def main() -> None:
    report = []
    total_character_errors = 0
    total_characters = 0
    total_word_errors = 0
    total_words = 0

    for metadata_path in sorted((PROJECT_ROOT / "Treinamento").glob("*/metadata/annotations.json")):
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        lot_character_errors = 0
        lot_characters = 0
        lot_word_errors = 0
        lot_words = 0
        failures = []
        lot_root = metadata_path.parents[1]

        for item in metadata["items"]:
            for region in item["regions"]:
                crop_path = lot_root / "crops" / f"{item['id']}_{region['id']}.png"
                _, _, lines = recognize_image_bytes(crop_path.read_bytes())
                prediction = normalize(" ".join(line.text for line in lines))
                expected = normalize(region["original"])
                character_errors = edit_distance(list(prediction), list(expected))
                word_errors = edit_distance(prediction.split(), expected.split())
                lot_character_errors += character_errors
                lot_characters += max(1, len(expected))
                lot_word_errors += word_errors
                lot_words += max(1, len(expected.split()))
                if prediction != expected:
                    failures.append({
                        "crop": str(crop_path.relative_to(PROJECT_ROOT)),
                        "expected": expected,
                        "actual": prediction,
                    })

        total_character_errors += lot_character_errors
        total_characters += lot_characters
        total_word_errors += lot_word_errors
        total_words += lot_words
        report.append({
            "dataset": metadata["dataset"],
            "cer": round(lot_character_errors / lot_characters, 4),
            "wer": round(lot_word_errors / lot_words, 4),
            "exact": sum(1 for item in metadata["items"] for _ in item["regions"]) - len(failures),
            "total": sum(len(item["regions"]) for item in metadata["items"]),
            "failures": failures,
        })

    print(json.dumps({
        "engine": "PaddleOCR 3.2.0 / PP-OCRv5",
        "cer": round(total_character_errors / total_characters, 4),
        "wer": round(total_word_errors / total_words, 4),
        "datasets": report,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
