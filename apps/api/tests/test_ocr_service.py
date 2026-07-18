import unittest
from types import SimpleNamespace

from app.ocr_service import OcrLine, group_ocr_lines, parse_paddle_result, run_tiled_ocr


class FakePaddleResult:
    json = {
        "res": {
            "rec_texts": ["Hello", "world"],
            "rec_scores": [0.95, 0.82],
            "rec_boxes": [[10, 20, 70, 40], [12, 44, 80, 66]],
        },
    }


class OcrServiceTests(unittest.TestCase):
    def test_maps_paddle_lines_to_regions(self) -> None:
        regions = parse_paddle_result([FakePaddleResult()])

        self.assertEqual(len(regions), 2)
        self.assertEqual(regions[0].text, "Hello")
        self.assertAlmostEqual(regions[0].confidence, 0.95)
        self.assertEqual(regions[0].x, 10)
        self.assertEqual(regions[0].y, 20)
        self.assertEqual(regions[0].width, 60)
        self.assertEqual(regions[0].height, 20)

    def test_discards_empty_or_malformed_regions(self) -> None:
        result = FakePaddleResult()
        result.json = {
            "res": {
                "rec_texts": ["", "Valid", "Broken"],
                "rec_scores": [0.99, 0.75, 0.8],
                "rec_boxes": [[0, 0, 10, 10], [2, 3, 12, 13], [5, 5, 4, 8]],
            },
        }

        regions = parse_paddle_result([result])

        self.assertEqual([region.text for region in regions], ["Valid"])

    def test_groups_lines_from_the_same_speech_region(self) -> None:
        lines = [
            OcrLine("I FEEL", 0.98, 100, 100, 120, 40),
            OcrLine("SORRY FOR", 0.96, 80, 145, 160, 40),
            OcrLine("YOUR HUSBAND", 0.99, 60, 190, 200, 40),
            OcrLine("...SORRY.", 0.95, 90, 500, 150, 50),
        ]

        regions = group_ocr_lines(lines)

        self.assertEqual(len(regions), 2)
        self.assertEqual(regions[0].text, "I FEEL SORRY FOR YOUR HUSBAND")
        self.assertEqual((regions[0].x, regions[0].y, regions[0].width, regions[0].height), (60, 100, 200, 130))
        self.assertEqual(regions[1].text, "...SORRY.")

    def test_does_not_join_neighbouring_bubbles_on_the_same_row(self) -> None:
        lines = [
            OcrLine("LEFT", 0.9, 10, 100, 80, 30),
            OcrLine("RIGHT", 0.9, 300, 102, 90, 30),
        ]

        self.assertEqual([line.text for line in group_ocr_lines(lines)], ["LEFT", "RIGHT"])

    def test_orders_words_by_x_when_boxes_share_the_same_visual_row(self) -> None:
        lines = [
            OcrLine("FEEL", 0.9, 295, 117, 231, 116),
            OcrLine("I", 0.9, 207, 130, 80, 88),
            OcrLine("SORRY FOR", 0.9, 87, 214, 563, 127),
        ]

        regions = group_ocr_lines(lines)

        self.assertEqual(len(regions), 1)
        self.assertEqual(regions[0].text, "I FEEL SORRY FOR")

    def test_does_not_expand_dialogue_with_abnormally_tall_noise_boxes(self) -> None:
        lines = [
            OcrLine("Ah", 0.84, 329, 4167, 391, 370),
            OcrLine("I CAN'T", 0.99, 368, 4950, 124, 35),
            OcrLine("BELIEVE I GET TO", 0.97, 294, 4984, 268, 30),
            OcrLine("AMM", 0.61, 0, 5014, 378, 385),
            OcrLine("FUCK THE THIGHS", 0.99, 238, 5014, 382, 31),
            OcrLine("MARRIED WOMAN", 0.98, 283, 5072, 282, 37),
        ]

        regions = group_ocr_lines(lines)
        dialogue = next(region for region in regions if "FUCK THE THIGHS" in region.text)

        self.assertNotIn("Ah", dialogue.text)
        self.assertNotIn("AMM", dialogue.text)
        self.assertLess(dialogue.height, 200)
        self.assertGreater(dialogue.x, 200)

    def test_normalizes_anomalously_tall_short_sound_effect_boxes(self) -> None:
        lines = [
            OcrLine("A KID LIKE YOU", 0.98, 220, 500, 420, 34),
            OcrLine("WHO DID IT WITHOUT", 0.98, 240, 545, 380, 34),
            OcrLine("Haah", 0.91, 700, 620, 160, 560),
        ]

        regions = group_ocr_lines(lines)

        self.assertEqual([region.text for region in regions], ["A KID LIKE YOU WHO DID IT WITHOUT", "Haah"])
        self.assertLess(regions[1].height, 560)

    def test_rejects_gibberish_with_many_fragments_and_digits(self) -> None:
        result = FakePaddleResult()
        result.json = {
            "res": {
                "rec_texts": ["W toror n° sdo n° ado a 0"],
                "rec_scores": [0.91],
                "rec_boxes": [[20, 30, 300, 80]],
            },
        }

        regions = parse_paddle_result([result])

        self.assertEqual(regions, [])

    def test_rejects_isolated_latin_hallucinations_from_stylized_glyphs(self) -> None:
        result = [SimpleNamespace(json={
            "res": {"rec_texts": ["botor", "tokor", "Krot 2 M", "OH... SOMIN."], "rec_scores": [0.9] * 4,
                    "rec_boxes": [[0, 0, 100, 40], [0, 50, 100, 90], [0, 100, 100, 140], [0, 150, 160, 190]]},
        })]

        regions = parse_paddle_result(result)

        self.assertEqual([region.text for region in regions], ["OH... SOMIN."])

    def test_rejects_known_false_positives_seen_in_shelter_chapter(self) -> None:
        result = [SimpleNamespace(json={
            "res": {
                "rec_texts": ["NUNCA SW.", "btop", "btor", "bror", "de de", "NUNCA TE DISSE PARA"],
                "rec_scores": [0.9] * 6,
                "rec_boxes": [
                    [0, 0, 160, 40], [0, 50, 120, 90], [0, 100, 120, 140],
                    [0, 150, 120, 190], [0, 200, 120, 240], [0, 250, 220, 290],
                ],
            },
        })]

        regions = parse_paddle_result(result)

        self.assertEqual([region.text for region in regions], ["NUNCA TE DISSE PARA"])

    def test_rejects_isolated_sound_effects_seen_in_beautiful_days(self) -> None:
        result = [SimpleNamespace(json={
            "res": {
                "rec_texts": ["TWITCH", "SQUELCH", "SLURP", "TOSS", "A VALID DIALOGUE"],
                "rec_scores": [0.9] * 5,
                "rec_boxes": [
                    [0, 0, 120, 40], [0, 50, 120, 90], [0, 100, 120, 140],
                    [0, 150, 120, 190], [0, 220, 300, 270],
                ],
            },
        })]

        regions = parse_paddle_result(result)

        self.assertEqual([region.text for region in regions], ["A VALID DIALOGUE"])

    def test_removes_mixed_sound_effects_without_losing_dialogue(self) -> None:
        result = [SimpleNamespace(json={
            "res": {
                "rec_texts": ["TWITCH FONDLE", "SWISH, STOP THAT... TWITCH", "SLURP HAA... I CAN'T STOP TWITCHING"],
                "rec_scores": [0.9] * 3,
                "rec_boxes": [[0, 0, 120, 40], [0, 50, 300, 100], [0, 110, 300, 160]],
            },
        })]

        regions = parse_paddle_result(result)

        self.assertEqual([region.text for region in regions], ["STOP THAT...", "I CAN'T STOP TWITCHING"])

    def test_removes_repeated_beautiful_days_noise_variants(self) -> None:
        result = [SimpleNamespace(json={
            "res": {
                "rec_texts": ["TWITCH TWITCH", "RUB TWITCH", "HAA..! STOP... SURP, STOP THAT...!!!", "SPLATER WICH", "I HEARD A TWITCH IN THE DARK."],
                "rec_scores": [0.9] * 5,
                "rec_boxes": [[0, 0, 120, 40], [0, 50, 180, 90], [0, 100, 300, 170], [0, 180, 180, 220], [0, 230, 300, 290]],
            },
        })]

        regions = parse_paddle_result(result)

        self.assertEqual([region.text for region in regions], ["STOP... STOP THAT...!!!", "I HEARD A TWITCH IN THE DARK."])

    def test_removes_short_overlapping_false_positive_from_dialogue(self) -> None:
        lines = [
            OcrLine("NUNCA TE DISSE PARA", 0.96, 100, 300, 300, 70),
            OcrLine("NUNCA SW.", 0.91, 130, 325, 150, 45),
        ]

        regions = group_ocr_lines(lines)

        self.assertEqual([region.text for region in regions], ["NUNCA TE DISSE PARA"])

    def test_keeps_valid_single_words_and_names(self) -> None:
        result = [SimpleNamespace(json={
            "res": {"rec_texts": ["MONDAYS.", "NAMWOO.", "botor"], "rec_scores": [0.9] * 3,
                    "rec_boxes": [[0, 0, 100, 40], [0, 50, 100, 90], [0, 100, 100, 140]]},
        })]

        regions = parse_paddle_result(result)

        self.assertEqual([region.text for region in regions], ["MONDAYS.", "NAMWOO."])

    def test_discards_known_watermark(self) -> None:
        result = [SimpleNamespace(json={
            "res": {"rec_texts": ["OMEGASCANS.ORG", "I DIDN'T SEE THAT COMING AT ALL."], "rec_scores": [0.9] * 2,
                    "rec_boxes": [[0, 0, 240, 40], [0, 50, 240, 120]]},
        })]

        regions = parse_paddle_result(result)

        self.assertEqual([region.text for region in regions], ["I DIDN'T SEE THAT COMING AT ALL."])

    def test_keeps_onomatopoeia_as_a_separate_region(self) -> None:
        lines = [
            OcrLine("A KID LIKE YOU", 0.98, 220, 500, 420, 34),
            OcrLine("WHO DID IT WITHOUT", 0.98, 240, 545, 380, 34),
            OcrLine("Haah...", 0.91, 500, 620, 120, 34),
        ]

        regions = group_ocr_lines(lines)

        self.assertEqual([region.text for region in regions], ["A KID LIKE YOU WHO DID IT WITHOUT", "Haah..."])

    def test_keeps_dialogue_separate_from_short_noise_below_the_bubble(self) -> None:
        lines = [
            OcrLine("So don't", 0.96, 180, 500, 160, 42),
            OcrLine("stop...", 0.95, 190, 548, 150, 42),
            OcrLine("Oo", 0.88, 230, 625, 100, 32),
        ]

        regions = group_ocr_lines(lines)

        self.assertEqual([region.text for region in regions], ["So don't stop...", "Oo"])
        self.assertEqual((regions[0].x, regions[0].y, regions[0].width, regions[0].height), (180, 500, 160, 90))

    def test_processes_long_images_in_bounded_overlapping_tiles(self) -> None:
        image = FakeImageArray(height=450, width=100)
        engine = FakeEngine()

        lines = run_tiled_ocr(image, engine, tile_height=200, overlap=40)

        self.assertEqual(engine.tile_heights, [200, 200, 130])
        self.assertEqual([line.y for line in lines], [10, 170, 330])

    def test_removes_duplicate_lines_from_tile_overlap(self) -> None:
        image = FakeImageArray(height=300, width=100)

        lines = run_tiled_ocr(image, FakeOverlapEngine(), tile_height=200, overlap=40)

        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0].text, "HOLD BACK")
        self.assertAlmostEqual(lines[0].confidence, 0.95)
        self.assertEqual(lines[0].y, 180)

    def test_removes_contained_text_detected_twice_in_the_same_position(self) -> None:
        image = FakeImageArray(height=200, width=720)

        lines = run_tiled_ocr(image, FakeContainedDuplicateEngine(), tile_height=200, overlap=40)

        self.assertEqual(len(lines), 1)
        self.assertEqual(lines[0].text, "I CAN'T")


class FakeImageArray:
    def __init__(self, height: int, width: int) -> None:
        self.shape = (height, width, 3)

    def __getitem__(self, key):
        vertical_slice = key[0]
        return FakeImageArray(vertical_slice.stop - vertical_slice.start, self.shape[1])


class FakeEngine:
    def __init__(self) -> None:
        self.tile_heights = []

    def predict(self, image):
        self.tile_heights.append(image.shape[0])
        return [FakeTileResult()]


class FakeTileResult:
    json = {
        "res": {
            "rec_texts": ["LINE"],
            "rec_scores": [0.9],
            "rec_boxes": [[5, 10, 50, 30]],
        },
    }


class FakeOverlapEngine:
    def __init__(self) -> None:
        self.calls = 0

    def predict(self, image):
        del image
        y = 180 if self.calls == 0 else 20
        confidence = 0.95 if self.calls == 0 else 0.8
        text = "HOLD BACK" if self.calls == 0 else "HOLDBACK"
        self.calls += 1
        return [DynamicTileResult(y, confidence, text)]


class DynamicTileResult:
    def __init__(self, y: int, confidence: float, text: str) -> None:
        self.json = {
            "res": {
                "rec_texts": [text],
                "rec_scores": [confidence],
                "rec_boxes": [[5, y, 70, y + 20]],
            },
        }


class FakeContainedDuplicateEngine:
    def predict(self, image):
        del image
        return [ContainedDuplicateResult()]


class ContainedDuplicateResult:
    json = {
        "res": {
            "rec_texts": ["I CAN'T", "CAN'T"],
            "rec_scores": [0.99, 0.91],
            "rec_boxes": [[368, 50, 492, 85], [381, 60, 480, 84]],
        },
    }


if __name__ == "__main__":
    unittest.main()
