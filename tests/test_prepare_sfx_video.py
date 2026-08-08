import importlib.util
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "tools" / "prepare-sfx-video.py"


def load_prepare_module():
    spec = importlib.util.spec_from_file_location("prepare_sfx_video", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class VideoFormatSelectorTest(unittest.TestCase):
    def test_prefers_avc_and_aac_before_generic_fallbacks(self):
        module = load_prepare_module()
        selector = getattr(module, "video_format_selector", None)

        self.assertIsNotNone(
            selector,
            "prepare-sfx-video.py must expose video_format_selector",
        )
        self.assertEqual(
            selector(1080),
            "bv*[vcodec^=avc1][height<=1080]+ba[acodec^=mp4a]/"
            "bv*[height<=1080]+ba[acodec^=mp4a]/"
            "bv*[height<=1080]+ba/b[height<=1080]",
        )


class YtDlpCommandTest(unittest.TestCase):
    def test_passes_absolute_ffmpeg_location_to_downloader(self):
        module = load_prepare_module()
        ffmpeg = Path("tools") / "ffmpeg.exe"

        command = module.yt_dlp_command(None, ffmpeg)

        self.assertIn("--ffmpeg-location", command)
        location_index = command.index("--ffmpeg-location")
        self.assertEqual(command[location_index + 1], str(ffmpeg.resolve()))


class VisualFileSelectionTest(unittest.TestCase):
    def test_prefers_merged_output_over_format_components(self):
        module = load_prepare_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            (data_dir / "video.f140.m4a").touch()
            (data_dir / "video.f299.mp4").touch()
            merged = data_dir / "video.mp4"
            merged.write_bytes(b"muxed-video")

            with mock.patch.object(module, "probe_video_stream", return_value=True, create=True) as probe:
                self.assertEqual(module.select_video_file(data_dir, Path("ffprobe")), merged)

            probe.assert_called_once_with(merged, Path("ffprobe"))

    def test_rejects_unmerged_format_components(self):
        module = load_prepare_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            (data_dir / "video.f140.m4a").touch()
            (data_dir / "video.f299.mp4").touch()

            with self.assertRaisesRegex(RuntimeError, "merged visual file"):
                module.select_video_file(data_dir, Path("ffprobe"))

    def test_rejects_multiple_merged_candidates_and_lists_them(self):
        module = load_prepare_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            (data_dir / "video.mp4").write_bytes(b"new")
            (data_dir / "video.webm").write_bytes(b"stale")

            with self.assertRaises(RuntimeError) as context:
                module.select_video_file(data_dir, Path("ffprobe"))

            message = str(context.exception)
            self.assertIn("video.mp4", message)
            self.assertIn("video.webm", message)
            self.assertIn("multiple", message.lower())

    def test_rejects_empty_merged_candidate(self):
        module = load_prepare_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            (data_dir / "video.mp4").touch()

            with self.assertRaisesRegex(RuntimeError, "empty"):
                module.select_video_file(data_dir, Path("ffprobe"))

    def test_rejects_audio_only_file_with_visual_extension(self):
        module = load_prepare_module()
        with tempfile.TemporaryDirectory() as temp_dir:
            data_dir = Path(temp_dir)
            candidate = data_dir / "video.mp4"
            candidate.write_bytes(b"audio-only-placeholder")

            with mock.patch.object(module, "probe_video_stream", return_value=False, create=True) as probe:
                with self.assertRaisesRegex(RuntimeError, "video stream"):
                    module.select_video_file(data_dir, Path("ffprobe"))

            probe.assert_called_once_with(candidate, Path("ffprobe"))


class MainToolPathTest(unittest.TestCase):
    def test_main_resolves_ffmpeg_and_ffprobe_for_every_child_process(self):
        module = load_prepare_module()
        relative_ffmpeg = Path("relative tools") / "ffmpeg.exe"
        relative_ffprobe = Path("relative tools") / "ffprobe.exe"
        expected_ffmpeg = str(relative_ffmpeg.resolve())
        expected_ffprobe = str(relative_ffprobe.resolve())
        commands = []

        with tempfile.TemporaryDirectory() as temp_dir:
            work_root = Path(temp_dir) / "runs"
            data_dir = work_root / "Xl5u91oQv-k" / "data"

            def fake_which(name):
                if name == "ffmpeg":
                    return str(relative_ffmpeg)
                if name == "ffprobe":
                    return str(relative_ffprobe)
                if name == "node":
                    return None
                return None

            def fake_run(command, cwd, capture=False, check=True):
                rendered = [str(part) for part in command]
                commands.append(rendered)
                if "--dump-single-json" in rendered:
                    return subprocess.CompletedProcess(
                        rendered,
                        0,
                        stdout=json.dumps(
                            {
                                "title": "Fixture",
                                "channel": "Fixture Channel",
                                "duration": 1,
                            }
                        ),
                        stderr="",
                    )
                if any(Path(part).name == "video.%(ext)s" for part in rendered):
                    output_template = Path(rendered[rendered.index("-o") + 1])
                    output_template.parent.mkdir(parents=True, exist_ok=True)
                    (output_template.parent / "video.mp4").write_bytes(b"muxed-video")
                if rendered[0] == expected_ffprobe:
                    return subprocess.CompletedProcess(
                        rendered,
                        0,
                        stdout=json.dumps({"streams": [{"index": 0, "codec_type": "video"}]}),
                        stderr="",
                    )
                return subprocess.CompletedProcess(
                    rendered,
                    0,
                    stdout="" if capture else None,
                    stderr="",
                )

            argv = [
                str(SCRIPT_PATH),
                "Xl5u91oQv-k",
                "--work-root",
                str(work_root),
            ]
            with mock.patch.object(module.shutil, "which", side_effect=fake_which):
                with mock.patch.object(module, "run", side_effect=fake_run):
                    with mock.patch.object(sys, "argv", argv):
                        self.assertEqual(module.main(), 0)

        ytdlp_commands = [command for command in commands if command[0] == sys.executable]
        self.assertTrue(ytdlp_commands)
        for command in ytdlp_commands:
            self.assertIn("--ffmpeg-location", command)
            location_index = command.index("--ffmpeg-location")
            self.assertEqual(command[location_index + 1], expected_ffmpeg)

        self.assertTrue(any(command[0] == expected_ffprobe for command in commands))
        ffmpeg_commands = [command for command in commands if command[0] == expected_ffmpeg]
        self.assertEqual(len(ffmpeg_commands), 3)


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
