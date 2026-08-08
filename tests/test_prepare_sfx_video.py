import importlib.util
import unittest
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "tools" / "prepare-sfx-video.py"


def load_prepare_module():
    spec = importlib.util.spec_from_file_location("prepare_sfx_video", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VideoFormatSelectorTest(unittest.TestCase):
    def test_prefers_aac_140_before_generic_audio_fallback(self):
        module = load_prepare_module()
        selector = getattr(module, "video_format_selector", None)

        self.assertIsNotNone(
            selector,
            "prepare-sfx-video.py must expose video_format_selector",
        )
        self.assertEqual(
            selector(1080),
            "bv*[height<=1080]+140/bv*[height<=1080]+ba/b[height<=1080]",
        )


if __name__ == "__main__":
    unittest.main()
