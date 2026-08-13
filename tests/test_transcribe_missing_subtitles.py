import importlib.util
import json
import os
import struct
import subprocess
import sys
import tempfile
import types
import unittest
import wave
import warnings
from pathlib import Path
from unittest import mock

import torch


REPO_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = REPO_ROOT / "tools" / "transcribe-missing-subtitles.py"
REQUIREMENTS_PATH = REPO_ROOT / "requirements-transcription.txt"
FIXED_IDS = (
    "1uFMVg7TrGU",
    "D0qibJgxYHY",
    "dZsVzf2NWw0",
    "2L6qe8uRf0Y",
    "WdZ9DFDHaqI",
    "YVto08ZB9Lk",
    "yYUB55kMMV8",
)


def load_transcribe_module():
    if not SCRIPT_PATH.exists():
        return None
    spec = importlib.util.spec_from_file_location(
        "transcribe_missing_subtitles",
        SCRIPT_PATH,
    )
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


class ToolTestCase(unittest.TestCase):
    def setUp(self):
        self.module = load_transcribe_module()

    def require_api(self, name):
        self.assertIsNotNone(
            self.module,
            "transcribe-missing-subtitles.py must exist before this behavior can pass",
        )
        value = getattr(self.module, name, None)
        self.assertTrue(callable(value), f"tool must expose callable {name}")
        return value


class InputBoundaryTest(ToolTestCase):
    def test_accepts_only_exact_video_ids_and_builds_canonical_urls(self):
        validate_video_id = self.require_api("validate_video_id")
        canonical_url = self.require_api("canonical_url")

        for video_id in FIXED_IDS:
            with self.subTest(video_id=video_id):
                self.assertEqual(validate_video_id(video_id), video_id)
                self.assertEqual(
                    canonical_url(video_id),
                    f"https://www.youtube.com/watch?v={video_id}",
                )

        invalid = (
            "short",
            "123456789012",
            " Xl5u91oQv-k",
            "Xl5u91oQv-k ",
            "https://www.youtube.com/watch?v=1uFMVg7TrGU",
            "../1uFMVg7TrGU",
            "abcdefghij!",
            "1234567890\N{FULLWIDTH LATIN CAPITAL LETTER A}",
        )
        for value in invalid:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    validate_video_id(value)

    def test_cli_rejects_arbitrary_output_paths(self):
        parse_args = self.require_api("parse_args")

        with self.assertRaises(SystemExit):
            parse_args(["--output", "..\\escape.json", FIXED_IDS[0]])

        parsed = parse_args(
            [
                "--model",
                "large-v3",
                "--device",
                "cuda",
                "--work-dir",
                ".work/subtitles",
                "--reuse-existing",
                FIXED_IDS[0],
            ]
        )
        self.assertEqual(parsed.video_ids, [FIXED_IDS[0]])
        self.assertEqual(parsed.model, "large-v3")
        self.assertEqual(parsed.device, "cuda")
        self.assertIs(parsed.reuse_existing, True)


class DownloadBoundaryTest(ToolTestCase):
    def test_builds_fixed_safe_yt_dlp_command(self):
        build_command = self.require_api("build_yt_dlp_command")
        with tempfile.TemporaryDirectory() as temp_dir:
            work_root = Path(temp_dir).resolve()
            ffmpeg = work_root / "ffmpeg-bin" / "ffmpeg.exe"
            command = build_command(FIXED_IDS[0], work_root, ffmpeg, force=False)

        self.assertIn("--ignore-config", command)
        self.assertIn("--no-playlist", command)
        self.assertIn("bestaudio[ext=m4a]/bestaudio", command)
        self.assertEqual(
            command[command.index("--output") + 1],
            str(work_root / f"{FIXED_IDS[0]}.%(ext)s"),
        )
        self.assertEqual(command[-1], f"https://www.youtube.com/watch?v={FIXED_IDS[0]}")
        self.assertNotIn("--force-overwrites", command)
        rendered = " ".join(command).lower()
        for forbidden in ("cookie", "username", "password", "netrc", "oauth", "login"):
            self.assertNotIn(forbidden, rendered)

    def test_force_is_explicit_and_still_uses_fixed_output(self):
        build_command = self.require_api("build_yt_dlp_command")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            command = build_command(FIXED_IDS[0], root, root / "ffmpeg.exe", force=True)

        self.assertIn("--force-overwrites", command)
        self.assertEqual(
            command[command.index("--output") + 1],
            str(root / f"{FIXED_IDS[0]}.%(ext)s"),
        )

    def test_resolves_imageio_ffmpeg_and_adds_only_its_directory_to_path(self):
        resolve_ffmpeg = self.require_api("resolve_ffmpeg")
        build_child_env = self.require_api("build_child_env")
        with tempfile.TemporaryDirectory() as temp_dir:
            ffmpeg = Path(temp_dir) / "imageio" / "ffmpeg.exe"
            ffmpeg.parent.mkdir()
            ffmpeg.write_bytes(b"fixture")
            imageio_module = types.SimpleNamespace(
                get_ffmpeg_exe=mock.Mock(return_value=str(ffmpeg))
            )

            resolved = resolve_ffmpeg(imageio_module)
            env = build_child_env(resolved, {"PATH": os.pathsep.join(("base-a", "base-b")), "KEEP": "yes"})

        self.assertEqual(resolved, ffmpeg.resolve())
        imageio_module.get_ffmpeg_exe.assert_called_once_with()
        path_parts = env["PATH"].split(os.pathsep)
        self.assertEqual(path_parts[0], str(ffmpeg.parent.resolve()))
        self.assertEqual(path_parts[1:], ["base-a", "base-b"])
        self.assertNotIn(str(ffmpeg.resolve()), path_parts)
        self.assertEqual(env["KEEP"], "yes")

    def test_explicit_reuse_returns_existing_media_without_network(self):
        download_media = self.require_api("download_media")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            media = root / f"{FIXED_IDS[0]}.m4a"
            media.write_bytes(b"existing-media")
            run_process = mock.Mock(side_effect=AssertionError("network must not run"))

            result = download_media(
                FIXED_IDS[0],
                root,
                root / "ffmpeg.exe",
                {"PATH": "fixture"},
                reuse_existing=True,
                run_process=run_process,
            )

        self.assertEqual(result, media)
        run_process.assert_not_called()

    def test_force_rejects_external_media_symlink_before_running_downloader(self):
        download_media = self.require_api("download_media")
        with tempfile.TemporaryDirectory() as temp_dir:
            base = Path(temp_dir).resolve()
            root = base / "work"
            outside_media = base / f"{FIXED_IDS[0]}.m4a"
            root.mkdir()
            outside_media.write_bytes(b"outside-media")
            media_link = root / f"{FIXED_IDS[0]}.m4a"
            try:
                media_link.symlink_to(outside_media)
            except OSError as error:
                self.skipTest(f"platform refused symlink creation: {error}")
            run_process = mock.Mock(side_effect=AssertionError("runner must not be called"))
            try:
                with self.assertRaisesRegex(ValueError, "link|reparse"):
                    download_media(
                        FIXED_IDS[0],
                        root,
                        root / "ffmpeg.exe",
                        {"PATH": "fixture"},
                        force=True,
                        run_process=run_process,
                    )
                run_process.assert_not_called()
                self.assertEqual(outside_media.read_bytes(), b"outside-media")
            finally:
                if os.path.lexists(media_link):
                    media_link.unlink()

    @unittest.skipUnless(os.name == "nt", "requires a real Windows junction")
    def test_force_rejects_external_media_reparse_before_running_downloader(self):
        download_media = self.require_api("download_media")
        with tempfile.TemporaryDirectory() as temp_dir:
            base = Path(temp_dir).resolve()
            root = base / "work"
            outside = base / "outside-media"
            root.mkdir()
            outside.mkdir()
            marker = outside / "marker.txt"
            marker.write_text("outside", encoding="utf-8")
            media_link = root / f"{FIXED_IDS[0]}.m4a"
            result = subprocess.run(
                [
                    os.environ.get("COMSPEC", "cmd.exe"),
                    "/d",
                    "/c",
                    "mklink",
                    "/J",
                    str(media_link),
                    str(outside),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                self.skipTest(
                    "Windows refused junction creation: "
                    + (result.stderr or result.stdout).strip()
                )
            run_process = mock.Mock(
                return_value=subprocess.CompletedProcess(
                    [], 1, stdout="", stderr="runner must not be called"
                )
            )
            try:
                with self.assertRaisesRegex(ValueError, "link|reparse"):
                    download_media(
                        FIXED_IDS[0],
                        root,
                        root / "ffmpeg.exe",
                        {"PATH": "fixture"},
                        force=True,
                        run_process=run_process,
                    )
                run_process.assert_not_called()
                self.assertEqual(marker.read_text(encoding="utf-8"), "outside")
            finally:
                if os.path.lexists(media_link):
                    os.rmdir(media_link)


class PathBoundaryTest(ToolTestCase):
    def test_work_and_media_paths_reject_traversal_and_root_escape(self):
        resolve_work_root = self.require_api("resolve_work_root")
        assert_safe_path = self.require_api("assert_safe_path")
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir).resolve()
            safe_root = repo_root / ".work" / "subtitles"
            safe_root.mkdir(parents=True)
            outside = repo_root / "outside.m4a"
            outside.write_bytes(b"outside")

            self.assertEqual(
                resolve_work_root(repo_root, ".work/subtitles"),
                safe_root.resolve(),
            )
            with self.assertRaises(ValueError):
                resolve_work_root(repo_root, "../outside")
            with self.assertRaises(ValueError):
                assert_safe_path(safe_root, safe_root / ".." / "outside.m4a")
            with self.assertRaises(ValueError):
                assert_safe_path(safe_root, outside, must_exist=True)

    def test_existing_symlink_media_is_rejected_without_following_it(self):
        assert_safe_path = self.require_api("assert_safe_path")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            candidate = root / f"{FIXED_IDS[0]}.m4a"
            candidate.write_bytes(b"fixture")

            with self.assertRaises(ValueError):
                assert_safe_path(
                    root,
                    candidate,
                    must_exist=True,
                    is_symlink=lambda path: Path(path) == candidate,
                )

    @unittest.skipUnless(os.name == "nt", "requires a real Windows junction")
    def test_resolve_work_root_rejects_repository_work_junction_before_writing(self):
        resolve_work_root = self.require_api("resolve_work_root")
        with tempfile.TemporaryDirectory() as temp_dir:
            base = Path(temp_dir).resolve()
            repo_root = base / "repo"
            outside = base / "outside"
            repo_root.mkdir()
            outside.mkdir()
            marker = outside / "marker.txt"
            marker.write_text("outside", encoding="utf-8")
            work_junction = repo_root / ".work"
            result = subprocess.run(
                [
                    os.environ.get("COMSPEC", "cmd.exe"),
                    "/d",
                    "/c",
                    "mklink",
                    "/J",
                    str(work_junction),
                    str(outside),
                ],
                capture_output=True,
                text=True,
                check=False,
            )
            if result.returncode != 0:
                self.skipTest(
                    "Windows refused junction creation: "
                    + (result.stderr or result.stdout).strip()
                )
            try:
                with self.assertRaisesRegex(ValueError, "link|reparse"):
                    resolve_work_root(repo_root, ".work/subtitles")
                self.assertFalse(
                    (outside / "subtitles").exists(),
                    "resolve_work_root must reject the junction before mkdir",
                )
                self.assertEqual(marker.read_text(encoding="utf-8"), "outside")
            finally:
                if os.path.lexists(work_junction):
                    os.rmdir(work_junction)

    def test_downloader_rejects_reported_media_outside_work_root(self):
        download_media = self.require_api("download_media")
        with tempfile.TemporaryDirectory() as temp_dir:
            base = Path(temp_dir).resolve()
            root = base / "work"
            root.mkdir()
            outside = base / f"{FIXED_IDS[0]}.m4a"
            outside.write_bytes(b"media")

            def fake_run(*_args, **_kwargs):
                return subprocess.CompletedProcess([], 0, stdout=str(outside) + "\n", stderr="")

            with self.assertRaisesRegex(RuntimeError, "outside|root"):
                download_media(
                    FIXED_IDS[0],
                    root,
                    root / "ffmpeg.exe",
                    {"PATH": "fixture"},
                    run_process=fake_run,
                )


class DecodeAndVadTest(ToolTestCase):
    def test_ffmpeg_conversion_and_stdlib_wave_loading_are_mono_16k(self):
        convert_media_to_wav = self.require_api("convert_media_to_wav")
        load_mono_waveform = self.require_api("load_mono_waveform")
        commands = []

        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            media = root / f"{FIXED_IDS[0]}.m4a"
            media.write_bytes(b"media")
            ffmpeg = root / "ffmpeg.exe"
            ffmpeg.write_bytes(b"binary")

            def fake_run(command, **_kwargs):
                commands.append([str(part) for part in command])
                with wave.open(str(command[-1]), "wb") as output:
                    output.setnchannels(1)
                    output.setsampwidth(2)
                    output.setframerate(16000)
                    output.writeframes(struct.pack("<hhh", -32768, 0, 32767))
                return subprocess.CompletedProcess(command, 0, stdout="", stderr="")

            wav_path = convert_media_to_wav(
                media,
                root,
                ffmpeg,
                {"PATH": str(root)},
                run_process=fake_run,
            )
            fake_functional = types.SimpleNamespace(resample=mock.Mock())
            fake_torchaudio = types.SimpleNamespace(
                functional=fake_functional,
            )
            waveform, sample_rate = load_mono_waveform(wav_path, fake_torchaudio)

        command = commands[0]
        self.assertEqual(command[0], str(ffmpeg.resolve()))
        self.assertEqual(command[command.index("-ac") + 1], "1")
        self.assertEqual(command[command.index("-ar") + 1], "16000")
        self.assertEqual(sample_rate, 16000)
        self.assertEqual(tuple(waveform.shape), (1, 3))
        self.assertEqual(waveform.dtype, torch.float32)
        self.assertAlmostEqual(float(waveform[0, 0]), -1.0)
        self.assertAlmostEqual(float(waveform[0, 1]), 0.0)
        self.assertAlmostEqual(float(waveform[0, 2]), 32767 / 32768)
        fake_functional.resample.assert_not_called()

    def test_stdlib_wave_decoder_rejects_wrong_sample_width(self):
        load_mono_waveform = self.require_api("load_mono_waveform")
        with tempfile.TemporaryDirectory() as temp_dir:
            wav_path = Path(temp_dir) / "eight-bit.wav"
            with wave.open(str(wav_path), "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(1)
                output.setframerate(16000)
                output.writeframes(b"\x00\x80\xff")

            with self.assertRaisesRegex(RuntimeError, "16-bit"):
                load_mono_waveform(
                    wav_path,
                    types.SimpleNamespace(functional=types.SimpleNamespace()),
                )

    def test_stdlib_wave_decoder_rejects_compressed_wave(self):
        load_mono_waveform = self.require_api("load_mono_waveform")
        with tempfile.TemporaryDirectory() as temp_dir:
            wav_path = Path(temp_dir) / "compressed.wav"
            payload = b"\x00\x00\x00\x00"
            fmt = struct.pack("<HHIIHH", 6, 1, 8000, 8000, 1, 8)
            body = b"WAVE" + b"fmt " + struct.pack("<I", len(fmt)) + fmt
            body += b"data" + struct.pack("<I", len(payload)) + payload
            wav_path.write_bytes(b"RIFF" + struct.pack("<I", len(body)) + body)

            with self.assertRaisesRegex(RuntimeError, "uncompressed PCM"):
                load_mono_waveform(
                    wav_path,
                    types.SimpleNamespace(functional=types.SimpleNamespace()),
                )

    def test_explicit_reuse_returns_existing_decoded_wav_without_ffmpeg(self):
        convert_media_to_wav = self.require_api("convert_media_to_wav")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            media = root / f"{FIXED_IDS[0]}.m4a"
            media.write_bytes(b"media")
            wav_path = root / f"{FIXED_IDS[0]}.mono-16k.wav"
            with wave.open(str(wav_path), "wb") as output:
                output.setnchannels(1)
                output.setsampwidth(2)
                output.setframerate(16000)
                output.writeframes(struct.pack("<h", 0))
            run_process = mock.Mock(side_effect=AssertionError("ffmpeg must not run"))

            result = convert_media_to_wav(
                media,
                root,
                root / "ffmpeg.exe",
                {"PATH": "fixture"},
                reuse_existing=True,
                run_process=run_process,
            )

        self.assertEqual(result, wav_path)
        run_process.assert_not_called()

    def test_vad_runs_per_window_and_preserves_window_evidence(self):
        analyze_vad_windows = self.require_api("analyze_vad_windows")
        sample_rate = 16000
        waveform = torch.ones((1, sample_rate * 35), dtype=torch.float32)
        call_count = 0

        def fake_vad(window, **_kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 2:
                return window[..., :0]
            return window[..., : min(window.shape[-1], sample_rate)]

        fake_torchaudio = types.SimpleNamespace(
            functional=types.SimpleNamespace(vad=mock.Mock(side_effect=fake_vad))
        )
        evidence = analyze_vad_windows(
            waveform,
            sample_rate,
            fake_torchaudio,
            window_seconds=15,
        )

        self.assertEqual(len(evidence), 3)
        self.assertEqual(fake_torchaudio.functional.vad.call_count, 3)
        self.assertEqual(
            [(item["start"], item["end"]) for item in evidence],
            [(0.0, 15.0), (15.0, 30.0), (30.0, 35.0)],
        )
        self.assertEqual([item["triggered"] for item in evidence], [True, False, True])
        for item in evidence:
            self.assertIn("rms", item)
            self.assertIn("peak", item)
            self.assertIn("trimmedSamples", item)

    def test_windowed_vad_completes_before_whisper_transcription(self):
        transcribe_with_preflight = self.require_api("transcribe_with_preflight")
        events = []
        sample_rate = 16000
        waveform = torch.ones((1, sample_rate * 20), dtype=torch.float32)

        def fake_vad(window, **_kwargs):
            events.append("vad")
            return window[..., :1]

        class FakeModel:
            def transcribe(self, audio_input, **options):
                events.append("whisper")
                self.audio_input = audio_input
                self.options = options
                return {"segments": []}

        model = FakeModel()
        fake_torchaudio = types.SimpleNamespace(
            functional=types.SimpleNamespace(vad=fake_vad)
        )
        result, windows = transcribe_with_preflight(
            Path("fixture.wav"),
            waveform,
            sample_rate,
            fake_torchaudio,
            model,
            {"language": "en", "temperature": 0.0},
            window_seconds=10,
        )

        self.assertEqual(events, ["vad", "vad", "whisper"])
        self.assertEqual(result, {"segments": []})
        self.assertEqual(len(windows), 2)
        self.assertEqual(model.options["language"], "en")
        self.assertIsInstance(model.audio_input, torch.Tensor)
        self.assertTrue(torch.equal(model.audio_input, waveform.squeeze(0)))
        self.assertEqual(model.audio_input.ndim, 1)


class WhisperAndClassificationTest(ToolTestCase):
    def test_loads_cached_large_v3_on_cuda_with_conservative_options(self):
        load_whisper_model = self.require_api("load_whisper_model")
        whisper_options = self.require_api("whisper_options")
        fake_whisper = types.SimpleNamespace(load_model=mock.Mock(return_value="model"))
        with tempfile.TemporaryDirectory() as temp_dir:
            cache_root = Path(temp_dir).resolve()
            model = load_whisper_model(fake_whisper, "large-v3", "cuda", cache_root)

        self.assertEqual(model, "model")
        fake_whisper.load_model.assert_called_once_with(
            "large-v3",
            device="cuda",
            download_root=str(cache_root),
        )
        options = whisper_options("cuda")
        self.assertEqual(options["language"], "en")
        self.assertEqual(options["temperature"], 0.0)
        self.assertIs(options["word_timestamps"], True)
        self.assertIs(options["condition_on_previous_text"], False)
        self.assertEqual(options["no_speech_threshold"], 0.6)
        self.assertEqual(options["logprob_threshold"], -1.0)
        self.assertEqual(options["compression_ratio_threshold"], 2.4)
        self.assertEqual(options["hallucination_silence_threshold"], 2.0)
        self.assertIs(options["fp16"], True)

    def test_rejects_empty_low_confidence_and_repetitive_hallucinations(self):
        classify_segments = self.require_api("classify_segments")
        segments = [
            {
                "id": 0,
                "start": 0.0,
                "end": 2.0,
                "text": "We layer the impact with metal.",
                "avg_logprob": -0.2,
                "compression_ratio": 1.1,
                "no_speech_prob": 0.1,
                "words": [{"start": 0.0, "end": 0.4, "word": " We"}],
            },
            {
                "id": 1,
                "start": 2.0,
                "end": 3.0,
                "text": "   ",
                "avg_logprob": -0.1,
                "compression_ratio": 1.0,
                "no_speech_prob": 0.1,
            },
            {
                "id": 2,
                "start": 3.0,
                "end": 4.0,
                "text": "Maybe words",
                "avg_logprob": -1.4,
                "compression_ratio": 1.0,
                "no_speech_prob": 0.2,
            },
            {
                "id": 3,
                "start": 4.0,
                "end": 6.0,
                "text": "Thank you " * 20,
                "avg_logprob": -0.2,
                "compression_ratio": 3.1,
                "no_speech_prob": 0.1,
            },
        ]
        accepted, rejected = classify_segments(segments, [], duration=10.0)

        self.assertEqual(len(accepted), 1)
        self.assertEqual(accepted[0]["text"], "We layer the impact with metal.")
        self.assertEqual(len(rejected), 3)
        reasons = {reason for item in rejected for reason in item["reasons"]}
        self.assertIn("empty-text", reasons)
        self.assertIn("low-average-log-probability", reasons)
        self.assertTrue(
            {"high-compression-ratio", "repetitive-text"}.intersection(reasons)
        )

    def test_candidate_stays_english_until_translation_review(self):
        build_candidate = self.require_api("build_candidate")
        accepted = [
            {
                "start": 1.0,
                "end": 2.0,
                "text": "This is the transient layer.",
                "metrics": {"avgLogprob": -0.2, "noSpeechProbability": 0.1},
                "words": [],
            }
        ]
        candidate = build_candidate(
            FIXED_IDS[0],
            accepted,
            "large-v3",
            {"language": "en"},
        )

        self.assertEqual(candidate["language"], "en")
        self.assertEqual(candidate["source"], "site-owned-from-local-transcription")
        self.assertEqual(candidate["reviewStatus"], "needs-translation-review")
        self.assertNotEqual(candidate["language"], "zh-CN")
        self.assertEqual(candidate["segments"], accepted)


class EvidenceAndBatchTest(ToolTestCase):
    def test_review_contains_auditable_relative_media_evidence(self):
        source_media_evidence = self.require_api("source_media_evidence")
        build_review = self.require_api("build_review")
        with tempfile.TemporaryDirectory() as temp_dir:
            media = Path(temp_dir) / f"{FIXED_IDS[0]}.m4a"
            media.write_bytes(b"real-media-bytes")
            source = source_media_evidence(media)
            review = build_review(
                video_id=FIXED_IDS[0],
                accepted=[],
                rejected=[{"text": "", "reasons": ["empty-text"]}],
                vad_windows=[{"start": 0.0, "end": 10.0, "triggered": False}],
                source_media=source,
                model_name="large-v3",
                options={"language": "en"},
                outcome="needs-review",
            )

        self.assertEqual(source["basename"], f"{FIXED_IDS[0]}.m4a")
        self.assertRegex(source["sha256"], r"^[0-9a-f]{64}$")
        self.assertNotIn("path", source)
        rendered = json.dumps(review)
        self.assertNotIn(temp_dir, rendered)
        self.assertEqual(review["outcome"], "needs-review")
        self.assertIn("confidenceMetrics", review)
        self.assertEqual(review["acceptedSegments"], [])
        self.assertEqual(len(review["rejectedSegments"]), 1)
        self.assertEqual(review["vadWindows"][0]["start"], 0.0)

    def test_evidence_writes_are_atomic_and_never_implicitly_overwrite(self):
        atomic_write_json = self.require_api("atomic_write_json")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            target = root / f"{FIXED_IDS[0]}.review.json"
            atomic_write_json(root, target, {"value": 1})
            with self.assertRaises(FileExistsError):
                atomic_write_json(root, target, {"value": 2})
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"value": 1})
            atomic_write_json(root, target, {"value": 3}, force=True)

            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"value": 3})
            self.assertEqual(list(root.glob("*.tmp")), [])

    def test_existing_review_conflict_does_not_leave_an_orphan_candidate(self):
        write_evidence = self.require_api("write_evidence")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            candidate_path = root / f"{FIXED_IDS[0]}.candidate.json"
            review_path = root / f"{FIXED_IDS[0]}.review.json"
            review_path.write_text('{"version": "old"}\n', encoding="utf-8")

            with self.assertRaises(FileExistsError):
                write_evidence(
                    root,
                    FIXED_IDS[0],
                    candidate={"version": "new"},
                    review={"version": "new"},
                )

            self.assertFalse(candidate_path.exists())
            self.assertEqual(
                json.loads(review_path.read_text(encoding="utf-8")),
                {"version": "old"},
            )

    def test_force_publish_failure_restores_the_old_evidence_set(self):
        write_evidence = self.require_api("write_evidence")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            candidate_path = root / f"{FIXED_IDS[0]}.candidate.json"
            review_path = root / f"{FIXED_IDS[0]}.review.json"
            candidate_path.write_text('{"version": "old-candidate"}\n', encoding="utf-8")
            review_path.write_text('{"version": "old-review"}\n', encoding="utf-8")
            failed = False

            def fail_first_review_publish(source, target):
                nonlocal failed
                if Path(target) == review_path and not failed:
                    failed = True
                    raise OSError("injected review publish failure")
                os.replace(source, target)

            with self.assertRaisesRegex(OSError, "injected review publish failure"):
                write_evidence(
                    root,
                    FIXED_IDS[0],
                    candidate={"version": "new-candidate"},
                    review={"version": "new-review"},
                    force=True,
                    replace_file=fail_first_review_publish,
                )

            self.assertEqual(
                json.loads(candidate_path.read_text(encoding="utf-8")),
                {"version": "old-candidate"},
            )
            self.assertEqual(
                json.loads(review_path.read_text(encoding="utf-8")),
                {"version": "old-review"},
            )
            self.assertEqual(
                sorted(path.name for path in root.iterdir()),
                sorted((candidate_path.name, review_path.name)),
            )

    def test_force_rollback_keeps_candidate_backup_when_cleanup_fails(self):
        write_evidence = self.require_api("write_evidence")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            candidate_path = root / f"{FIXED_IDS[0]}.candidate.json"
            review_path = root / f"{FIXED_IDS[0]}.review.json"
            candidate_path.write_text('{"version": "old-candidate"}\n', encoding="utf-8")
            review_path.write_text('{"version": "old-review"}\n', encoding="utf-8")

            def fail_review_publish(source, target):
                if Path(target) == review_path and Path(source).suffix != ".bak":
                    raise OSError("injected review publish failure")
                os.replace(source, target)

            def reject_candidate_cleanup(path):
                if Path(path) == candidate_path:
                    raise OSError("injected candidate cleanup failure")
                os.unlink(path)

            with self.assertRaisesRegex(OSError, "injected review publish failure") as captured:
                write_evidence(
                    root,
                    FIXED_IDS[0],
                    candidate={"version": "new-candidate"},
                    review={"version": "new-review"},
                    force=True,
                    replace_file=fail_review_publish,
                    remove_file=reject_candidate_cleanup,
                )

            self.assertIsInstance(captured.exception.__cause__, ExceptionGroup)
            rollback_error = captured.exception.__cause__.exceptions[0]
            self.assertIn(str(candidate_path), str(rollback_error))
            self.assertIn("injected candidate cleanup failure", str(rollback_error))
            self.assertEqual(
                json.loads(candidate_path.read_text(encoding="utf-8")),
                {"version": "new-candidate"},
            )
            self.assertEqual(
                json.loads(review_path.read_text(encoding="utf-8")),
                {"version": "old-review"},
            )
            candidate_backups = list(root.glob(f".{candidate_path.name}.*.bak"))
            self.assertEqual(len(candidate_backups), 1)
            self.assertEqual(
                json.loads(candidate_backups[0].read_text(encoding="utf-8")),
                {"version": "old-candidate"},
            )
            self.assertEqual(list(root.glob("*.tmp")), [])
            self.assertEqual(list(root.glob(f".{review_path.name}.*.bak")), [])

    def test_committed_backup_cleanup_failure_warns_without_batch_failure(self):
        write_evidence = self.require_api("write_evidence")
        run_batch = self.require_api("run_batch")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            candidate_path = root / f"{FIXED_IDS[0]}.candidate.json"
            review_path = root / f"{FIXED_IDS[0]}.review.json"
            candidate_path.write_text('{"version": "old-candidate"}\n', encoding="utf-8")
            review_path.write_text('{"version": "old-review"}\n', encoding="utf-8")
            failures = []

            def reject_backup_cleanup(path):
                if Path(path).suffix == ".bak":
                    raise OSError(f"injected locked backup: {path}")
                os.unlink(path)

            with warnings.catch_warnings(record=True) as captured:
                warnings.simplefilter("always")
                results = run_batch(
                    [FIXED_IDS[0]],
                    lambda _video_id: write_evidence(
                        root,
                        FIXED_IDS[0],
                        candidate={"version": "new-candidate"},
                        review={"version": "new-review"},
                        force=True,
                        remove_file=reject_backup_cleanup,
                    ),
                    lambda video_id, error: failures.append((video_id, error)),
                )

            self.assertEqual(failures, [])
            self.assertEqual(results, [{"candidate": candidate_path, "review": review_path}])
            self.assertEqual(
                json.loads(candidate_path.read_text(encoding="utf-8")),
                {"version": "new-candidate"},
            )
            self.assertEqual(
                json.loads(review_path.read_text(encoding="utf-8")),
                {"version": "new-review"},
            )
            backups = sorted(root.glob("*.bak"))
            self.assertEqual(len(backups), 2)
            self.assertEqual(len(captured), 2)
            for warning, backup in zip(captured, backups):
                message = str(warning.message)
                self.assertIs(warning.category, RuntimeWarning)
                self.assertIn(backup.name, message)
                self.assertNotIn(str(root), message)
                self.assertNotIn(str(Path.home()), message)

    def test_force_review_only_publish_removes_a_stale_candidate(self):
        write_evidence = self.require_api("write_evidence")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir).resolve()
            candidate_path = root / f"{FIXED_IDS[0]}.candidate.json"
            review_path = root / f"{FIXED_IDS[0]}.review.json"
            candidate_path.write_text('{"version": "stale"}\n', encoding="utf-8")
            review_path.write_text('{"version": "old-review"}\n', encoding="utf-8")

            outputs = write_evidence(
                root,
                FIXED_IDS[0],
                candidate=None,
                review={"outcome": "failure"},
                force=True,
            )

            self.assertEqual(outputs, {"review": review_path})
            self.assertFalse(candidate_path.exists())
            self.assertEqual(
                json.loads(review_path.read_text(encoding="utf-8")),
                {"outcome": "failure"},
            )

    def test_no_accepted_speech_writes_review_only_and_never_an_override(self):
        write_evidence = self.require_api("write_evidence")
        with tempfile.TemporaryDirectory() as temp_dir:
            repo_root = Path(temp_dir).resolve()
            work_root = repo_root / ".work" / "subtitles"
            work_root.mkdir(parents=True)
            review = {
                "videoId": FIXED_IDS[0],
                "outcome": "needs-review",
                "acceptedSegments": [],
                "rejectedSegments": [],
            }
            outputs = write_evidence(
                work_root,
                FIXED_IDS[0],
                candidate=None,
                review=review,
            )

            self.assertEqual(outputs, {"review": work_root / f"{FIXED_IDS[0]}.review.json"})
            self.assertEqual(
                sorted(path.name for path in work_root.iterdir()),
                [f"{FIXED_IDS[0]}.review.json"],
            )
            self.assertFalse((repo_root / "tools" / "data" / "subtitle-status-overrides.json").exists())
            self.assertFalse((repo_root / "assets" / "subtitles" / f"{FIXED_IDS[0]}.json").exists())

    def test_one_video_failure_does_not_stop_or_destroy_other_results(self):
        run_batch = self.require_api("run_batch")
        calls = []

        def process_one(video_id):
            calls.append(video_id)
            if video_id == FIXED_IDS[0]:
                raise RuntimeError("download failed")
            return {"videoId": video_id, "outcome": "candidate"}

        failures = []

        def on_failure(video_id, error):
            failures.append((video_id, str(error)))
            return {"videoId": video_id, "outcome": "failure", "error": str(error)}

        results = run_batch(FIXED_IDS[:2], process_one, on_failure)

        self.assertEqual(calls, list(FIXED_IDS[:2]))
        self.assertEqual(failures, [(FIXED_IDS[0], "download failed")])
        self.assertEqual([item["outcome"] for item in results], ["failure", "candidate"])


class RequirementsTest(unittest.TestCase):
    def test_transcription_dependencies_are_pinned_without_forcing_torch_builds(self):
        text = REQUIREMENTS_PATH.read_text(encoding="utf-8") if REQUIREMENTS_PATH.exists() else ""

        self.assertIn("openai-whisper==20250625", text)
        self.assertIn("imageio-ffmpeg==0.6.0", text)
        self.assertRegex(text.lower(), r"torch.*torchaudio.*cuda")
        requirement_lines = [
            line.strip()
            for line in text.splitlines()
            if line.strip() and not line.lstrip().startswith("#")
        ]
        self.assertNotIn("torch", requirement_lines)
        self.assertNotIn("torchaudio", requirement_lines)


if __name__ == "__main__":
    unittest.main()
