import importlib.util
import io
import json
import os
import subprocess
import sys
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


class Utf8StdioTest(unittest.TestCase):
    def test_reconfigures_cli_streams_before_printing_unicode_metadata(self):
        module = load_prepare_module()
        configure = getattr(module, "configure_utf8_stdio", None)
        self.assertIsNotNone(
            configure,
            "prepare-sfx-video.py must expose configure_utf8_stdio",
        )

        raw = io.BytesIO()
        stream = io.TextIOWrapper(raw, encoding="gbk", errors="strict")
        configure((stream,))
        stream.write(json.dumps({"title": "Sound Design 🎧"}, ensure_ascii=False))
        stream.flush()

        self.assertEqual(stream.encoding.lower(), "utf-8")
        self.assertIn("🎧", raw.getvalue().decode("utf-8"))

    def test_module_startup_reconfigures_gbk_stdout(self):
        code = (
            "import runpy\n"
            f"runpy.run_path({str(SCRIPT_PATH)!r}, run_name='prepare_sfx_import_test')\n"
            "print('Sound Design 🎧')\n"
        )
        env = os.environ.copy()
        env["PYTHONIOENCODING"] = "gbk"

        result = subprocess.run(
            [sys.executable, "-c", code],
            cwd=SCRIPT_PATH.parent.parent,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        self.assertEqual(
            result.returncode,
            0,
            result.stderr.decode("utf-8", errors="replace"),
        )
        self.assertIn("🎧", result.stdout.decode("utf-8"))


if __name__ == "__main__":
    unittest.main()
