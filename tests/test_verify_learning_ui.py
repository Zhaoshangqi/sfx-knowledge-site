import importlib.util
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "tools" / "verify-learning-ui.py"


def load_verifier_module():
    spec = importlib.util.spec_from_file_location("verify_learning_ui", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class LearningUiVerifierTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.verifier = load_verifier_module()

    def test_build_route_specs_covers_85_videos_and_27_effects(self):
        videos = [
            {
                "id": f"video-{index}",
                "title": f"Video {index}",
                "category": "workflow",
                "chapterCount": 2,
                "stepCount": 4,
            }
            for index in range(85)
        ]
        effects = [
            {"id": f"effect {index}", "name": f"Effect {index}"}
            for index in range(27)
        ]

        routes = self.verifier.build_route_specs(
            "http://127.0.0.1:8891/",
            videos,
            effects,
        )

        self.assertEqual(len(routes["videoIndexes"]), 1)
        self.assertEqual(len(routes["effectIndexes"]), 1)
        self.assertEqual(len(routes["videos"]), 85)
        self.assertEqual(len(routes["effects"]), 27)
        self.assertEqual(routes["videos"][0]["url"], "http://127.0.0.1:8891/#video=video-0")
        self.assertEqual(routes["effects"][0]["url"], "http://127.0.0.1:8891/#effect=effect+0")

    def test_build_route_specs_rejects_duplicate_or_blank_ids(self):
        valid_video = {
            "id": "video-a",
            "title": "Video A",
            "category": "workflow",
            "chapterCount": 1,
            "stepCount": 1,
        }

        with self.assertRaisesRegex(ValueError, "duplicate video id"):
            self.verifier.build_route_specs(
                "http://example.test",
                [valid_video, dict(valid_video)],
                [],
            )

        with self.assertRaisesRegex(ValueError, "blank effect id"):
            self.verifier.build_route_specs(
                "http://example.test",
                [valid_video],
                [{"id": "", "name": "Blank"}],
            )

    def test_select_category_representatives_returns_one_in_fixed_order(self):
        category_ids = ("workflow", "impact", "scifi", "environment", "magic", "creature")
        records = []
        for category in reversed(category_ids):
            records.append({"id": f"{category}-first", "category": category})
            records.append({"id": f"{category}-second", "category": category})

        representatives = self.verifier.select_category_representatives(records, category_ids)

        self.assertEqual(
            [record["id"] for record in representatives],
            [f"{category}-first" for category in category_ids],
        )

    def test_select_category_representatives_reports_missing_category(self):
        with self.assertRaisesRegex(ValueError, "missing category representatives: creature"):
            self.verifier.select_category_representatives(
                [{"id": "workflow-a", "category": "workflow"}],
                ("workflow", "creature"),
            )

    def test_rectangle_overlap_ignores_touching_edges_and_small_rounding(self):
        left = {"left": 0, "top": 0, "right": 100, "bottom": 100}
        touching = {"left": 100, "top": 0, "right": 160, "bottom": 100}
        rounding = {"left": 99.6, "top": 0, "right": 160, "bottom": 100}
        overlapping = {"left": 96, "top": 10, "right": 160, "bottom": 90}

        self.assertFalse(self.verifier.rectangles_overlap(left, touching))
        self.assertFalse(self.verifier.rectangles_overlap(left, rounding, tolerance=1))
        self.assertTrue(self.verifier.rectangles_overlap(left, overlapping, tolerance=1))

    def test_evaluate_dom_metrics_finds_counts_overflow_overlap_and_page_errors(self):
        metrics = {
            "document": {"scrollWidth": 402, "clientWidth": 390},
            "containers": [
                {"selector": ".good", "scrollWidth": 100, "clientWidth": 100},
                {"selector": ".bad", "scrollWidth": 211, "clientWidth": 200},
            ],
            "overlapGroups": [
                {
                    "selector": ".grid",
                    "items": [
                        {
                            "label": ".grid > :nth-child(1)",
                            "rect": {"left": 0, "top": 0, "right": 100, "bottom": 100},
                        },
                        {
                            "label": ".grid > :nth-child(2)",
                            "rect": {"left": 95, "top": 0, "right": 190, "bottom": 100},
                        },
                    ],
                }
            ],
            "pageErrors": ["ReferenceError: broken is not defined"],
            "counts": {
                "learningMaps": 1,
                "chapters": 2,
                "learningGrids": 3,
                "sourceDisclosures": 2,
            },
        }
        expected = {
            "learningMaps": 1,
            "chapters": 2,
            "learningGrids": 3,
            "sourceDisclosures": 3,
        }

        issues = self.verifier.evaluate_dom_metrics(metrics, expected)

        self.assertEqual(len(issues["overflows"]), 2)
        self.assertEqual(len(issues["overlaps"]), 1)
        self.assertEqual(issues["pageErrors"], ["ReferenceError: broken is not defined"])
        self.assertEqual(len(issues["assertionFailures"]), 1)
        self.assertIn("sourceDisclosures expected 3, got 2", issues["assertionFailures"][0])

    def test_build_report_counts_a_route_only_when_every_viewport_passes(self):
        results = [
            self._result("video", "video-a", "desktop"),
            self._result("video", "video-a", "mobile"),
            self._result("video", "video-b", "desktop"),
            self._result(
                "video",
                "video-b",
                "mobile",
                assertionFailures=["chapters expected 2, got 1"],
            ),
            self._result("effect", "effect-a", "desktop"),
            self._result("effect", "effect-a", "mobile"),
            self._result("video-index", "videos", "desktop"),
            self._result("video-index", "videos", "mobile"),
            self._result("effect-index", "effects", "desktop"),
            self._result("effect-index", "effects", "mobile"),
        ]

        report = self.verifier.build_report(
            base_url="http://example.test/",
            results=results,
            expected_video_ids=["video-a", "video-b"],
            expected_effect_ids=["effect-a"],
            screenshots=[{"name": "video-index-desktop", "path": "video-index-desktop.png"}],
        )

        self.assertEqual(report["coverage"]["videoRoutes"], {"passed": 1, "total": 2})
        self.assertEqual(report["coverage"]["effectRoutes"], {"passed": 1, "total": 1})
        self.assertEqual(report["coverage"]["indexRoutes"], {"passed": 2, "total": 2})
        self.assertEqual(report["issues"]["assertionFailures"], 1)
        self.assertFalse(report["ok"])
        self.assertEqual(self.verifier.exit_code_for_report(report), 1)
        self.assertIn("1/2 video routes", self.verifier.format_report_summary(report))

    def test_clean_report_has_zero_issue_summary_and_success_exit_code(self):
        results = [
            self._result("video", "video-a", "desktop"),
            self._result("video", "video-a", "mobile"),
            self._result("effect", "effect-a", "desktop"),
            self._result("effect", "effect-a", "mobile"),
            self._result("video-index", "videos", "desktop"),
            self._result("video-index", "videos", "mobile"),
            self._result("effect-index", "effects", "desktop"),
            self._result("effect-index", "effects", "mobile"),
        ]

        report = self.verifier.build_report(
            base_url="http://example.test/",
            results=results,
            expected_video_ids=["video-a"],
            expected_effect_ids=["effect-a"],
            screenshots=[],
        )

        self.assertTrue(report["ok"])
        self.assertEqual(report["issues"], {
            "overflows": 0,
            "overlaps": 0,
            "pageErrors": 0,
            "assertionFailures": 0,
        })
        self.assertEqual(self.verifier.exit_code_for_report(report), 0)

    @staticmethod
    def _result(kind, identifier, viewport, **issues):
        issue_groups = {
            "overflows": [],
            "overlaps": [],
            "pageErrors": [],
            "assertionFailures": [],
        }
        issue_groups.update(issues)
        return {
            "kind": kind,
            "id": identifier,
            "viewport": viewport,
            "url": f"http://example.test/#{kind}={identifier}",
            "issues": issue_groups,
        }


if __name__ == "__main__":
    unittest.main()
