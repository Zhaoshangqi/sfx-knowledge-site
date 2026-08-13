#!/usr/bin/env python3
"""Create local English transcription evidence for videos missing public captions.

This tool deliberately writes only ignored review artifacts under .work. It never
creates site subtitle assets or status overrides; those require separate human
translation and full-duration review.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import re
import stat
import subprocess
import sys
import uuid
import wave
from pathlib import Path
from typing import Any, Callable, Iterable, Mapping, Sequence


VIDEO_ID_PATTERN = re.compile(r"^[A-Za-z0-9_-]{11}$", re.ASCII)
TARGET_SAMPLE_RATE = 16000
DEFAULT_WINDOW_SECONDS = 15
NO_SPEECH_THRESHOLD = 0.6
LOGPROB_THRESHOLD = -1.0
COMPRESSION_RATIO_THRESHOLD = 2.4
MEDIA_EXTENSIONS = {".aac", ".flac", ".m4a", ".mp3", ".mp4", ".ogg", ".opus", ".wav", ".webm"}
NON_MEDIA_SUFFIXES = (
    ".candidate.json",
    ".review.json",
    ".mono-16k.wav",
    ".part",
    ".vtt",
)


def configure_utf8_stdio(streams: Iterable[Any] = (sys.stdout, sys.stderr)) -> None:
    for stream in streams:
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            reconfigure(encoding="utf-8", errors="replace")


configure_utf8_stdio()


def validate_video_id(value: str) -> str:
    if not isinstance(value, str) or VIDEO_ID_PATTERN.fullmatch(value) is None:
        raise ValueError(f"invalid YouTube video ID: {value!r}")
    return value


def canonical_url(video_id: str) -> str:
    return f"https://www.youtube.com/watch?v={validate_video_id(video_id)}"


def _absolute_lexical(path: Path | str) -> Path:
    return Path(os.path.abspath(os.fspath(path)))


def _is_within(root: Path, candidate: Path) -> bool:
    normalized_root = os.path.normcase(str(root))
    normalized_candidate = os.path.normcase(str(candidate))
    try:
        return os.path.commonpath((normalized_root, normalized_candidate)) == normalized_root
    except ValueError:
        return False


def is_link_or_reparse(path: Path | str) -> bool:
    """Return whether a path entry is a symlink or a Windows reparse point."""

    try:
        path_stat = Path(path).lstat()
    except FileNotFoundError:
        return False
    if stat.S_ISLNK(path_stat.st_mode):
        return True
    return os.name == "nt" and bool(
        getattr(path_stat, "st_file_attributes", 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT
    )


def assert_safe_path(
    root: Path | str,
    candidate: Path | str,
    *,
    must_exist: bool = False,
    is_symlink: Callable[[Path], bool] | None = None,
) -> Path:
    """Reject lexical, resolved, and symlink escapes from an existing root."""

    link_check = is_symlink or is_link_or_reparse
    root_lexical = _absolute_lexical(root)
    if link_check(root_lexical):
        raise ValueError(f"work root may not be a link or reparse point: {root_lexical}")
    if not root_lexical.is_dir():
        raise ValueError(f"work root is not a directory: {root_lexical}")

    candidate_lexical = _absolute_lexical(candidate)
    if not _is_within(root_lexical, candidate_lexical):
        raise ValueError(f"path is outside work root: {candidate_lexical}")

    cursor = root_lexical
    relative_parts = candidate_lexical.relative_to(root_lexical).parts
    for part in relative_parts:
        cursor = cursor / part
        if link_check(cursor):
            raise ValueError(f"link or reparse paths are not allowed in work root: {cursor}")

    if must_exist and not candidate_lexical.exists():
        raise ValueError(f"required work file does not exist: {candidate_lexical}")

    real_root = root_lexical.resolve(strict=True)
    try:
        real_candidate = candidate_lexical.resolve(strict=must_exist)
    except FileNotFoundError as error:
        raise ValueError(f"required work file does not exist: {candidate_lexical}") from error
    if not _is_within(real_root, real_candidate):
        raise ValueError(f"resolved path is outside work root: {candidate_lexical}")
    return candidate_lexical


def resolve_work_root(repo_root: Path | str, value: Path | str) -> Path:
    repo = _absolute_lexical(repo_root)
    if is_link_or_reparse(repo):
        raise ValueError(f"repository root may not be a link or reparse point: {repo}")
    if not repo.is_dir():
        raise ValueError(f"repository root is not a directory: {repo}")
    allowed_root = repo / ".work"
    if is_link_or_reparse(allowed_root):
        raise ValueError("repository .work path may not be a link or reparse point")
    allowed_root.mkdir(parents=True, exist_ok=True)

    requested = Path(value)
    if not requested.is_absolute():
        requested = repo / requested
    requested = _absolute_lexical(requested)
    if not _is_within(allowed_root, requested):
        raise ValueError("--work-dir must stay inside the repository .work directory")

    assert_safe_path(allowed_root, requested.parent if requested != allowed_root else requested)
    requested.mkdir(parents=True, exist_ok=True)
    return assert_safe_path(allowed_root, requested, must_exist=True)


def parse_args(args: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download audio and create local Whisper review evidence only."
    )
    parser.add_argument("--model", choices=("large-v3",), default="large-v3")
    parser.add_argument("--device", choices=("cuda", "cpu"), default="cuda")
    parser.add_argument("--work-dir", default=".work/subtitles")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace only this tool's fixed per-video outputs inside --work-dir.",
    )
    parser.add_argument(
        "--reuse-existing",
        action="store_true",
        help="Reuse existing fixed media and decoded WAV files inside --work-dir.",
    )
    parser.add_argument("video_ids", nargs="+", type=validate_video_id)
    return parser.parse_args(args)


def resolve_ffmpeg(imageio_ffmpeg_module: Any) -> Path:
    ffmpeg = Path(imageio_ffmpeg_module.get_ffmpeg_exe()).expanduser().resolve(strict=True)
    if not ffmpeg.is_file():
        raise RuntimeError(f"imageio-ffmpeg did not resolve an executable file: {ffmpeg}")
    return ffmpeg


def build_child_env(
    ffmpeg_exe: Path | str,
    base_env: Mapping[str, str] | None = None,
) -> dict[str, str]:
    env = dict(os.environ if base_env is None else base_env)
    ffmpeg_dir = str(Path(ffmpeg_exe).resolve().parent)
    existing = env.get("PATH", "").split(os.pathsep) if env.get("PATH") else []
    normalized_ffmpeg_dir = os.path.normcase(ffmpeg_dir)
    preserved = [
        item
        for item in existing
        if item and os.path.normcase(os.path.abspath(item)) != normalized_ffmpeg_dir
    ]
    env["PATH"] = os.pathsep.join((ffmpeg_dir, *preserved))
    return env


def build_yt_dlp_command(
    video_id: str,
    work_root: Path | str,
    ffmpeg_exe: Path | str,
    *,
    force: bool = False,
) -> list[str]:
    video_id = validate_video_id(video_id)
    root = Path(work_root).resolve()
    output_template = root / f"{video_id}.%(ext)s"
    command = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--ignore-config",
        "--no-playlist",
        "--no-progress",
        "--format",
        "bestaudio[ext=m4a]/bestaudio",
        "--output",
        str(output_template),
        "--print",
        "after_move:filepath",
    ]
    command.append("--force-overwrites" if force else "--no-overwrites")
    command.append(canonical_url(video_id))
    return command


def _default_run_process(command: Sequence[str], **kwargs: Any) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, **kwargs)


def _is_media_name(video_id: str, path: Path) -> bool:
    name = path.name
    if any(name.endswith(suffix) for suffix in NON_MEDIA_SUFFIXES):
        return False
    return path.stem == video_id and path.suffix.lower() in MEDIA_EXTENSIONS


def discover_downloaded_media(work_root: Path | str, video_id: str) -> Path:
    video_id = validate_video_id(video_id)
    root = _absolute_lexical(work_root)
    assert_safe_path(root, root, must_exist=True)
    candidates = []
    for path in root.iterdir():
        if _is_media_name(video_id, path):
            safe = assert_safe_path(root, path, must_exist=True)
            if not safe.is_file() or safe.stat().st_size <= 0:
                raise RuntimeError(f"downloaded media is empty or not a file: {safe.name}")
            candidates.append(safe)
    if not candidates:
        raise RuntimeError(f"yt-dlp produced no media for {video_id}")
    if len(candidates) != 1:
        names = ", ".join(sorted(path.name for path in candidates))
        raise RuntimeError(f"multiple media files found for {video_id}: {names}")
    return candidates[0]


def download_media(
    video_id: str,
    work_root: Path | str,
    ffmpeg_exe: Path | str,
    child_env: Mapping[str, str],
    *,
    force: bool = False,
    reuse_existing: bool = False,
    run_process: Callable[..., subprocess.CompletedProcess[str]] = _default_run_process,
) -> Path:
    video_id = validate_video_id(video_id)
    root = _absolute_lexical(work_root)
    assert_safe_path(root, root, must_exist=True)
    existing = [path for path in root.iterdir() if _is_media_name(video_id, path)]
    for path in existing:
        assert_safe_path(root, path)
    if existing:
        if reuse_existing:
            return discover_downloaded_media(root, video_id)
        if not force:
            raise FileExistsError(
                f"media already exists for {video_id}; pass --reuse-existing or --force"
            )

    command = build_yt_dlp_command(video_id, root, ffmpeg_exe, force=force)
    result = run_process(
        command,
        cwd=root,
        env=dict(child_env),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if result.returncode != 0:
        detail = (result.stderr or result.stdout or "unknown yt-dlp failure").strip()
        raise RuntimeError(f"yt-dlp failed for {video_id}: {detail}")

    reported_lines = [line.strip().strip('"') for line in (result.stdout or "").splitlines() if line.strip()]
    if reported_lines:
        reported = Path(reported_lines[-1])
        if not reported.is_absolute():
            reported = root / reported
        try:
            safe_reported = assert_safe_path(root, reported, must_exist=True)
        except ValueError as error:
            raise RuntimeError(f"yt-dlp reported media outside the work root: {reported}") from error
        if not _is_media_name(video_id, safe_reported):
            raise RuntimeError(f"yt-dlp reported an unexpected output name: {safe_reported.name}")

    return discover_downloaded_media(root, video_id)


def _publish_temp_file(root: Path, temporary: Path, target: Path, force: bool) -> None:
    assert_safe_path(root, temporary, must_exist=True)
    assert_safe_path(root, target)
    if force:
        os.replace(temporary, target)
        return
    try:
        os.link(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink()


def convert_media_to_wav(
    media_path: Path | str,
    work_root: Path | str,
    ffmpeg_exe: Path | str,
    child_env: Mapping[str, str],
    *,
    force: bool = False,
    reuse_existing: bool = False,
    run_process: Callable[..., subprocess.CompletedProcess[str]] = _default_run_process,
) -> Path:
    root = _absolute_lexical(work_root)
    media = assert_safe_path(root, media_path, must_exist=True)
    video_id = validate_video_id(media.stem)
    target = assert_safe_path(root, root / f"{video_id}.mono-16k.wav")
    if target.exists():
        if reuse_existing:
            safe_target = assert_safe_path(root, target, must_exist=True)
            if not safe_target.is_file() or safe_target.stat().st_size <= 0:
                raise RuntimeError(f"existing decoded WAV is empty or not a file: {target.name}")
            return safe_target
        if not force:
            raise FileExistsError(
                f"decoded WAV already exists; pass --reuse-existing or --force: {target.name}"
            )

    temporary = root / f".{target.name}.{uuid.uuid4().hex}.tmp.wav"
    command = [
        str(Path(ffmpeg_exe).resolve()),
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-n",
        "-i",
        str(media),
        "-vn",
        "-ac",
        "1",
        "-ar",
        str(TARGET_SAMPLE_RATE),
        "-c:a",
        "pcm_s16le",
        "-f",
        "wav",
        str(temporary),
    ]
    try:
        result = run_process(
            command,
            cwd=root,
            env=dict(child_env),
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
        if result.returncode != 0:
            detail = (result.stderr or result.stdout or "unknown ffmpeg failure").strip()
            raise RuntimeError(f"ffmpeg decode failed for {video_id}: {detail}")
        if not temporary.is_file() or temporary.stat().st_size <= 0:
            raise RuntimeError(f"ffmpeg produced no decoded audio for {video_id}")
        _publish_temp_file(root, temporary, target, force)
    finally:
        if temporary.exists():
            temporary.unlink()
    return target


def load_mono_waveform(
    wav_path: Path | str,
    torchaudio_module: Any,
    *,
    target_sample_rate: int = TARGET_SAMPLE_RATE,
    wave_open: Callable[..., Any] = wave.open,
    torch_module: Any | None = None,
) -> tuple[Any, int]:
    if torch_module is None:
        import torch as torch_module

    try:
        with wave_open(str(wav_path), "rb") as source:
            channels = source.getnchannels()
            sample_width = source.getsampwidth()
            sample_rate = source.getframerate()
            frame_count = source.getnframes()
            compression = source.getcomptype()
            if channels != 1:
                raise RuntimeError(f"decoded WAV must be mono, found {channels} channels")
            if sample_width != 2:
                raise RuntimeError(
                    f"decoded WAV must use 16-bit PCM samples, found {sample_width * 8}-bit"
                )
            if compression != "NONE":
                raise RuntimeError(
                    f"decoded WAV must use uncompressed PCM, found {compression}"
                )
            if sample_rate <= 0:
                raise RuntimeError("decoded WAV has an invalid sample rate")
            if frame_count <= 0:
                raise RuntimeError("decoded WAV has no audio frames")
            frames = source.readframes(frame_count)
    except wave.Error as error:
        raise RuntimeError(f"decoded WAV must use valid uncompressed PCM: {error}") from error

    expected_bytes = frame_count * channels * sample_width
    if len(frames) != expected_bytes:
        raise RuntimeError(
            f"decoded WAV frame data is truncated: expected {expected_bytes}, got {len(frames)}"
        )
    samples = torch_module.frombuffer(bytearray(frames), dtype=torch_module.int16).clone()
    if samples.numel() != frame_count:
        raise RuntimeError("decoded WAV sample count does not match its frame count")
    waveform = samples.to(dtype=torch_module.float32).div_(32768.0).unsqueeze(0)
    if sample_rate != target_sample_rate:
        waveform = torchaudio_module.functional.resample(
            waveform,
            sample_rate,
            target_sample_rate,
        )
        sample_rate = target_sample_rate
    return waveform.contiguous(), sample_rate


def _finite_float(value: Any, fallback: float) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return fallback
    return number if math.isfinite(number) else fallback


def analyze_vad_windows(
    waveform: Any,
    sample_rate: int,
    torchaudio_module: Any,
    *,
    window_seconds: int = DEFAULT_WINDOW_SECONDS,
) -> list[dict[str, Any]]:
    if sample_rate <= 0 or window_seconds <= 0:
        raise ValueError("sample rate and VAD window size must be positive")
    total_samples = int(waveform.shape[-1])
    window_samples = sample_rate * window_seconds
    evidence = []

    for index, start_sample in enumerate(range(0, total_samples, window_samples)):
        end_sample = min(total_samples, start_sample + window_samples)
        window = waveform[..., start_sample:end_sample]
        peak = float(window.abs().max().item()) if window.numel() else 0.0
        rms = float(window.square().mean().sqrt().item()) if window.numel() else 0.0
        vad_error = None
        try:
            trimmed = torchaudio_module.functional.vad(
                window,
                sample_rate=sample_rate,
                trigger_level=7.0,
                trigger_time=0.25,
                search_time=1.0,
                allowed_gap=0.25,
                pre_trigger_time=0.1,
            )
            trimmed_samples = int(trimmed.shape[-1])
        except Exception as error:  # Evidence survives VAD implementation edge cases.
            trimmed_samples = 0
            vad_error = f"{type(error).__name__}: {error}"
        window_length = end_sample - start_sample
        item = {
            "index": index,
            "start": round(start_sample / sample_rate, 3),
            "end": round(end_sample / sample_rate, 3),
            "samples": window_length,
            "trimmedSamples": trimmed_samples,
            "trimmedRatio": round(trimmed_samples / window_length, 6) if window_length else 0.0,
            "triggered": trimmed_samples > 0,
            "rms": round(rms, 8),
            "peak": round(peak, 8),
        }
        if vad_error is not None:
            item["error"] = vad_error
        evidence.append(item)
    return evidence


def transcribe_with_preflight(
    wav_path: Path | str,
    waveform: Any,
    sample_rate: int,
    torchaudio_module: Any,
    model: Any,
    options: Mapping[str, Any],
    *,
    window_seconds: int = DEFAULT_WINDOW_SECONDS,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    vad_windows = analyze_vad_windows(
        waveform,
        sample_rate,
        torchaudio_module,
        window_seconds=window_seconds,
    )
    del wav_path
    result = model.transcribe(waveform.squeeze(0), **dict(options))
    if not isinstance(result, dict):
        raise RuntimeError("Whisper returned a non-object transcription result")
    return result, vad_windows


def whisper_options(device: str) -> dict[str, Any]:
    if device not in {"cuda", "cpu"}:
        raise ValueError(f"unsupported Whisper device: {device}")
    return {
        "language": "en",
        "temperature": 0.0,
        "word_timestamps": True,
        "condition_on_previous_text": False,
        "no_speech_threshold": NO_SPEECH_THRESHOLD,
        "logprob_threshold": LOGPROB_THRESHOLD,
        "compression_ratio_threshold": COMPRESSION_RATIO_THRESHOLD,
        "hallucination_silence_threshold": 2.0,
        "fp16": device == "cuda",
        "verbose": False,
    }


def load_whisper_model(
    whisper_module: Any,
    model_name: str,
    device: str,
    cache_root: Path | str,
) -> Any:
    if model_name != "large-v3":
        raise ValueError("this review pipeline is fixed to the cached large-v3 model")
    cache = Path(cache_root).expanduser().resolve()
    return whisper_module.load_model(
        model_name,
        device=device,
        download_root=str(cache),
    )


def _normalize_text(value: Any) -> str:
    return re.sub(r"\s+", " ", value if isinstance(value, str) else "").strip()


def _repetitive_text(text: str) -> bool:
    tokens = re.findall(r"[a-z0-9']+", text.lower(), flags=re.ASCII)
    if len(tokens) < 6:
        return False
    unique_ratio = len(set(tokens)) / len(tokens)
    if unique_ratio <= 0.34:
        return True
    for unit_size in range(1, min(6, len(tokens) // 3) + 1):
        unit = tokens[:unit_size]
        repeats = 0
        cursor = 0
        while tokens[cursor:cursor + unit_size] == unit:
            repeats += 1
            cursor += unit_size
            if cursor >= len(tokens):
                break
        if repeats >= 3 and cursor >= len(tokens) * 0.75:
            return True
    return False


def _clean_words(words: Any) -> list[dict[str, Any]]:
    cleaned = []
    if not isinstance(words, list):
        return cleaned
    for word in words:
        if not isinstance(word, dict):
            continue
        text = word.get("word") if isinstance(word.get("word"), str) else ""
        start = _finite_float(word.get("start"), -1.0)
        end = _finite_float(word.get("end"), -1.0)
        if not text or start < 0 or end <= start:
            continue
        item = {"start": round(start, 3), "end": round(end, 3), "word": text}
        probability = _finite_float(word.get("probability"), -1.0)
        if probability >= 0:
            item["probability"] = round(probability, 6)
        cleaned.append(item)
    return cleaned


def _vad_support(start: float, end: float, windows: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    indexes = [
        int(window.get("index", index))
        for index, window in enumerate(windows)
        if bool(window.get("triggered"))
        and _finite_float(window.get("end"), 0.0) > start
        and _finite_float(window.get("start"), 0.0) < end
    ]
    return {"triggered": bool(indexes), "windowIndexes": indexes}


def classify_segments(
    segments: Any,
    vad_windows: Sequence[Mapping[str, Any]],
    *,
    duration: float,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not isinstance(segments, list):
        raise RuntimeError("Whisper result is missing a segments list")
    accepted = []
    rejected = []
    seen_text: dict[str, int] = {}
    previous_accepted_end = -1.0

    for source_index, segment in enumerate(segments):
        segment = segment if isinstance(segment, dict) else {}
        text = _normalize_text(segment.get("text"))
        start = _finite_float(segment.get("start"), -1.0)
        end = _finite_float(segment.get("end"), -1.0)
        avg_logprob = _finite_float(segment.get("avg_logprob"), float("-inf"))
        compression_ratio = _finite_float(segment.get("compression_ratio"), float("inf"))
        no_speech_prob = _finite_float(segment.get("no_speech_prob"), 1.0)
        reasons = []

        if not text:
            reasons.append("empty-text")
        if start < 0 or end <= start or end > duration + 0.5:
            reasons.append("invalid-timing")
        if start < previous_accepted_end:
            reasons.append("overlapping-timing")
        if avg_logprob < LOGPROB_THRESHOLD:
            reasons.append("low-average-log-probability")
        if no_speech_prob >= NO_SPEECH_THRESHOLD:
            reasons.append("high-no-speech-probability")
        if compression_ratio > COMPRESSION_RATIO_THRESHOLD:
            reasons.append("high-compression-ratio")
        if _repetitive_text(text):
            reasons.append("repetitive-text")
        normalized_key = re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()
        if normalized_key:
            seen_text[normalized_key] = seen_text.get(normalized_key, 0) + 1
            if seen_text[normalized_key] >= 3:
                reasons.append("repeated-segment-text")
        if re.fullmatch(r"[\[(]?(?:music|applause|silence|sound effects?)[\])]?[.!]?", text, re.I):
            reasons.append("non-speech-marker")

        record = {
            "segmentId": segment.get("id", source_index),
            "start": round(max(start, 0.0), 3),
            "end": round(max(end, 0.0), 3),
            "text": text,
            "metrics": {
                "avgLogprob": round(avg_logprob, 6) if math.isfinite(avg_logprob) else None,
                "compressionRatio": round(compression_ratio, 6) if math.isfinite(compression_ratio) else None,
                "noSpeechProbability": round(no_speech_prob, 6),
            },
            "vadSupport": _vad_support(max(start, 0.0), max(end, 0.0), vad_windows),
            "words": _clean_words(segment.get("words")),
        }
        if reasons:
            record["reasons"] = list(dict.fromkeys(reasons))
            rejected.append(record)
        else:
            accepted.append(record)
            previous_accepted_end = end
    return accepted, rejected


def build_candidate(
    video_id: str,
    accepted: Sequence[Mapping[str, Any]],
    model_name: str,
    options: Mapping[str, Any],
) -> dict[str, Any]:
    validate_video_id(video_id)
    if not accepted:
        raise ValueError("an English candidate requires at least one accepted segment")
    return {
        "videoId": video_id,
        "language": "en",
        "source": "site-owned-from-local-transcription",
        "reviewStatus": "needs-translation-review",
        "model": {"name": model_name, "options": dict(options)},
        "segments": list(accepted),
    }


def source_media_evidence(media_path: Path | str) -> dict[str, Any]:
    media = Path(media_path)
    if is_link_or_reparse(media) or not media.is_file():
        raise ValueError("source media evidence requires a regular non-link file")
    digest = hashlib.sha256()
    with media.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return {
        "basename": media.name,
        "sha256": digest.hexdigest(),
        "sizeBytes": media.stat().st_size,
    }


def _confidence_metrics(
    accepted: Sequence[Mapping[str, Any]],
    rejected: Sequence[Mapping[str, Any]],
    vad_windows: Sequence[Mapping[str, Any]],
) -> dict[str, Any]:
    accepted_logprobs = [
        item.get("metrics", {}).get("avgLogprob")
        for item in accepted
        if isinstance(item.get("metrics"), Mapping)
        and isinstance(item.get("metrics", {}).get("avgLogprob"), (int, float))
    ]
    accepted_no_speech = [
        item.get("metrics", {}).get("noSpeechProbability")
        for item in accepted
        if isinstance(item.get("metrics"), Mapping)
        and isinstance(item.get("metrics", {}).get("noSpeechProbability"), (int, float))
    ]
    return {
        "acceptedCount": len(accepted),
        "rejectedCount": len(rejected),
        "meanAcceptedAvgLogprob": (
            round(sum(accepted_logprobs) / len(accepted_logprobs), 6)
            if accepted_logprobs
            else None
        ),
        "maxAcceptedNoSpeechProbability": (
            round(max(accepted_no_speech), 6) if accepted_no_speech else None
        ),
        "triggeredVadWindows": sum(bool(window.get("triggered")) for window in vad_windows),
        "totalVadWindows": len(vad_windows),
    }


def build_review(
    *,
    video_id: str,
    accepted: Sequence[Mapping[str, Any]],
    rejected: Sequence[Mapping[str, Any]],
    vad_windows: Sequence[Mapping[str, Any]],
    source_media: Mapping[str, Any] | None,
    model_name: str,
    options: Mapping[str, Any],
    outcome: str,
    error: str | None = None,
) -> dict[str, Any]:
    validate_video_id(video_id)
    if outcome not in {"candidate", "needs-review", "failure"}:
        raise ValueError(f"invalid review outcome: {outcome}")
    review = {
        "videoId": video_id,
        "outcome": outcome,
        "sourceMedia": dict(source_media) if source_media is not None else {
            "basename": None,
            "sha256": None,
            "sizeBytes": None,
        },
        "model": {"name": model_name, "options": dict(options)},
        "confidenceMetrics": _confidence_metrics(accepted, rejected, vad_windows),
        "vadWindows": list(vad_windows),
        "acceptedSegments": list(accepted),
        "rejectedSegments": list(rejected),
        "reviewCaution": (
            "Windowed energy VAD can react to music and sound effects. "
            "This evidence never establishes no-speech without full-duration human review."
        ),
    }
    if error is not None:
        review["error"] = error
    return review


def atomic_write_json(
    root: Path | str,
    target: Path | str,
    value: Any,
    *,
    force: bool = False,
) -> Path:
    safe_root = _absolute_lexical(root)
    assert_safe_path(safe_root, safe_root, must_exist=True)
    safe_target = assert_safe_path(safe_root, target)
    if safe_target.exists() and not force:
        raise FileExistsError(f"evidence already exists: {safe_target.name}")
    temporary = _stage_json(safe_root, safe_target, value)
    try:
        _publish_temp_file(safe_root, temporary, safe_target, force)
    finally:
        if temporary.exists():
            temporary.unlink()
    return safe_target


def _stage_json(root: Path, target: Path, value: Any) -> Path:
    temporary = root / f".{target.name}.{uuid.uuid4().hex}.tmp"
    content = json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n"
    with temporary.open("x", encoding="utf-8", newline="\n") as stream:
        stream.write(content)
        stream.flush()
        os.fsync(stream.fileno())
    return temporary


def write_evidence(
    work_root: Path | str,
    video_id: str,
    *,
    candidate: Mapping[str, Any] | None,
    review: Mapping[str, Any],
    force: bool = False,
    replace_file: Callable[[Path, Path], Any] = os.replace,
) -> dict[str, Path]:
    root = _absolute_lexical(work_root)
    video_id = validate_video_id(video_id)
    assert_safe_path(root, root, must_exist=True)
    candidate_target = assert_safe_path(root, root / f"{video_id}.candidate.json")
    review_target = assert_safe_path(root, root / f"{video_id}.review.json")
    updates: list[tuple[str, Path, Mapping[str, Any] | None]] = []
    if candidate is not None or (force and candidate_target.exists()):
        updates.append(("candidate", candidate_target, candidate))
    updates.append(("review", review_target, review))

    if not force:
        conflicts = [target for _, target, value in updates if value is not None and target.exists()]
        if conflicts:
            raise FileExistsError(f"evidence already exists: {conflicts[0].name}")

    staged: dict[Path, Path] = {}
    backups: dict[Path, Path] = {}
    published: set[Path] = set()
    try:
        for _, target, value in updates:
            if value is not None:
                staged[target] = _stage_json(root, target, value)

        for _, target, _ in updates:
            if target.exists():
                backup = root / f".{target.name}.{uuid.uuid4().hex}.bak"
                os.replace(target, backup)
                backups[target] = backup

        for _, target, value in updates:
            if value is not None:
                replace_file(staged[target], target)
                published.add(target)
    except Exception:
        for target in published:
            if target.exists():
                target.unlink()
        for target, backup in backups.items():
            if backup.exists():
                os.replace(backup, target)
        raise
    finally:
        for temporary in staged.values():
            if temporary.exists():
                temporary.unlink()
        for backup in backups.values():
            if backup.exists():
                backup.unlink()

    outputs = {name: target for name, target, value in updates if value is not None}
    return outputs


def run_batch(
    video_ids: Sequence[str],
    process_one: Callable[[str], Mapping[str, Any]],
    on_failure: Callable[[str, Exception], Mapping[str, Any]],
) -> list[Mapping[str, Any]]:
    results = []
    for video_id in video_ids:
        validate_video_id(video_id)
        try:
            results.append(process_one(video_id))
        except Exception as error:
            try:
                results.append(on_failure(video_id, error))
            except Exception as evidence_error:
                results.append(
                    {
                        "videoId": video_id,
                        "outcome": "failure",
                        "error": str(error),
                        "evidenceWriteError": str(evidence_error),
                    }
                )
    return results


def _sanitize_error(error: Exception, work_root: Path) -> str:
    message = f"{type(error).__name__}: {error}".replace(str(work_root), "<work-root>")
    return message.replace(str(Path.home()), "<home>")


def _process_video(
    video_id: str,
    *,
    work_root: Path,
    ffmpeg: Path,
    child_env: Mapping[str, str],
    torchaudio_module: Any,
    get_model: Callable[[], Any],
    model_name: str,
    options: Mapping[str, Any],
    force: bool,
    reuse_existing: bool,
) -> dict[str, Any]:
    media = download_media(
        video_id,
        work_root,
        ffmpeg,
        child_env,
        force=force,
        reuse_existing=reuse_existing,
    )
    media_evidence = source_media_evidence(media)
    wav = convert_media_to_wav(
        media,
        work_root,
        ffmpeg,
        child_env,
        force=force,
        reuse_existing=reuse_existing,
    )
    waveform, sample_rate = load_mono_waveform(wav, torchaudio_module)
    duration = waveform.shape[-1] / sample_rate
    model = get_model()
    transcription, vad_windows = transcribe_with_preflight(
        wav,
        waveform,
        sample_rate,
        torchaudio_module,
        model,
        options,
    )
    accepted, rejected = classify_segments(
        transcription.get("segments"),
        vad_windows,
        duration=duration,
    )
    outcome = "candidate" if accepted else "needs-review"
    candidate = (
        build_candidate(video_id, accepted, model_name, options)
        if accepted
        else None
    )
    review = build_review(
        video_id=video_id,
        accepted=accepted,
        rejected=rejected,
        vad_windows=vad_windows,
        source_media=media_evidence,
        model_name=model_name,
        options=options,
        outcome=outcome,
    )
    write_evidence(
        work_root,
        video_id,
        candidate=candidate,
        review=review,
        force=force,
    )
    return {
        "videoId": video_id,
        "outcome": outcome,
        "duration": round(duration, 3),
        "accepted": len(accepted),
        "rejected": len(rejected),
        "vadTriggered": sum(window["triggered"] for window in vad_windows),
        "vadWindows": len(vad_windows),
    }


def main(args: Sequence[str] | None = None) -> int:
    parsed = parse_args(args)
    repo_root = Path(__file__).resolve().parents[1]
    work_root = resolve_work_root(repo_root, parsed.work_dir)

    try:
        import imageio_ffmpeg
        import torch
        import torchaudio
        import whisper
    except ImportError as error:
        print(f"Missing transcription dependency: {error}", file=sys.stderr)
        return 2

    if parsed.device == "cuda" and not torch.cuda.is_available():
        print("CUDA was requested but torch.cuda.is_available() is false", file=sys.stderr)
        return 2

    ffmpeg = resolve_ffmpeg(imageio_ffmpeg)
    child_env = build_child_env(ffmpeg)
    options = whisper_options(parsed.device)
    cache_root = Path.home() / ".cache" / "whisper"
    model_holder: dict[str, Any] = {}

    def get_model() -> Any:
        if "model" not in model_holder:
            cached_model = cache_root / f"{parsed.model}.pt"
            if not cached_model.is_file():
                raise RuntimeError(
                    f"cached Whisper model is missing: {cached_model}; refusing an implicit download"
                )
            model_holder["model"] = load_whisper_model(
                whisper,
                parsed.model,
                parsed.device,
                cache_root,
            )
        return model_holder["model"]

    def process_one(video_id: str) -> Mapping[str, Any]:
        print(f"[{video_id}] download/decode/VAD/transcription review", flush=True)
        return _process_video(
            video_id,
            work_root=work_root,
            ffmpeg=ffmpeg,
            child_env=child_env,
            torchaudio_module=torchaudio,
            get_model=get_model,
            model_name=parsed.model,
            options=options,
            force=parsed.force,
            reuse_existing=parsed.reuse_existing,
        )

    def on_failure(video_id: str, error: Exception) -> Mapping[str, Any]:
        source = None
        try:
            source = source_media_evidence(discover_downloaded_media(work_root, video_id))
        except Exception:
            pass
        error_text = _sanitize_error(error, work_root)
        review = build_review(
            video_id=video_id,
            accepted=[],
            rejected=[],
            vad_windows=[],
            source_media=source,
            model_name=parsed.model,
            options=options,
            outcome="failure",
            error=error_text,
        )
        write_evidence(
            work_root,
            video_id,
            candidate=None,
            review=review,
            force=parsed.force,
        )
        return {"videoId": video_id, "outcome": "failure", "error": error_text}

    results = run_batch(parsed.video_ids, process_one, on_failure)
    for result in results:
        print(json.dumps(result, ensure_ascii=False, allow_nan=False), flush=True)
    return 1 if any(result.get("outcome") == "failure" for result in results) else 0


if __name__ == "__main__":
    raise SystemExit(main())
