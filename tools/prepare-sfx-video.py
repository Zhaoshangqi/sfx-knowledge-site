import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


def configure_utf8_stdio(streams=None) -> None:
    if streams is None:
        streams = (sys.stdout, sys.stderr)
    for stream in streams:
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, ValueError):
            pass


configure_utf8_stdio()


REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_WORK_ROOT = REPO_ROOT / ".work" / "runs"


def video_id_from_url(url: str) -> str:
    patterns = (
        r"youtu\.be/([A-Za-z0-9_-]{6,})",
        r"[?&]v=([A-Za-z0-9_-]{6,})",
        r"/shorts/([A-Za-z0-9_-]{6,})",
    )
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    if re.fullmatch(r"[A-Za-z0-9_-]{6,}", url):
        return url
    raise ValueError(f"Could not parse YouTube video id from: {url}")


def run(command: list[str], cwd: Path, capture: bool = False, check: bool = True) -> subprocess.CompletedProcess:
    print("+", " ".join(str(part) for part in command), flush=True)
    result = subprocess.run(
        [str(part) for part in command],
        cwd=str(cwd),
        text=True,
        encoding="utf-8",
        errors="replace",
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        check=False,
    )
    if capture and result.stderr:
        print(result.stderr, file=sys.stderr, end="")
    if check and result.returncode:
        raise subprocess.CalledProcessError(result.returncode, command, result.stdout, result.stderr)
    return result


def write_json(path: Path, value: object) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding="utf-8")


def yt_dlp_command(cookies_from_browser: str | None, ffmpeg_location: str | Path | None = None) -> list[str]:
    command = [sys.executable, "-m", "yt_dlp"]
    if shutil.which("node"):
        command.extend(["--js-runtimes", "node"])
    if ffmpeg_location:
        command.extend(["--ffmpeg-location", str(Path(ffmpeg_location).resolve())])
    if cookies_from_browser:
        command.extend(["--cookies-from-browser", cookies_from_browser])
    return command


def video_format_selector(max_height: int) -> str:
    return (
        f"bv*[vcodec^=avc1][height<={max_height}]+ba[acodec^=mp4a]/"
        f"bv*[height<={max_height}]+ba[acodec^=mp4a]/"
        f"bv*[height<={max_height}]+ba/b[height<={max_height}]"
    )


def resolved_executable(name: str) -> Path | None:
    location = shutil.which(name)
    return Path(location).resolve() if location else None


def probe_video_stream(video_file: Path, ffprobe: Path) -> bool:
    result = run(
        [
            ffprobe,
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=index,codec_type",
            "-of",
            "json",
            str(video_file),
        ],
        cwd=video_file.parent,
        capture=True,
        check=False,
    )
    if result.returncode:
        return False
    try:
        streams = json.loads(result.stdout or "{}").get("streams", [])
    except (AttributeError, json.JSONDecodeError):
        return False
    return any(stream.get("codec_type") == "video" for stream in streams)


def select_video_file(data_dir: Path, ffprobe: Path) -> Path:
    visual_suffixes = {".mp4", ".mkv", ".mov", ".webm"}
    candidates = sorted(
        path
        for path in data_dir.glob("video.*")
        if path.is_file() and path.stem == "video" and path.suffix.lower() in visual_suffixes
    )
    if not candidates:
        raise RuntimeError("Video download did not produce a merged visual file. Subtitle-only analysis is not allowed.")
    if len(candidates) > 1:
        names = ", ".join(path.name for path in candidates)
        raise RuntimeError(f"Multiple merged visual candidates found: {names}. Remove stale candidates before retrying.")
    candidate = candidates[0]
    if candidate.stat().st_size == 0:
        raise RuntimeError(f"Merged visual candidate is empty: {candidate.name}")
    if not probe_video_stream(candidate, ffprobe):
        raise RuntimeError(f"Merged visual candidate does not contain a readable video stream: {candidate.name}")
    return candidate


def main() -> int:
    parser = argparse.ArgumentParser(description="Prepare full visual evidence for a sound-design video without an external AI API.")
    parser.add_argument("url", help="YouTube URL or video id")
    parser.add_argument("--work-root", type=Path, default=DEFAULT_WORK_ROOT)
    parser.add_argument("--max-height", type=int, default=1080)
    parser.add_argument("--frame-interval", type=float, default=1.0)
    parser.add_argument("--sheet-interval", type=float, default=10.0)
    parser.add_argument("--cookies-from-browser", help="For example: chrome")
    args = parser.parse_args()

    if args.max_height < 720:
        parser.error("--max-height must be at least 720; use 1080 for readable plugin parameters")
    if args.frame_interval <= 0 or args.sheet_interval <= 0:
        parser.error("frame and sheet intervals must be positive")

    ffmpeg = resolved_executable("ffmpeg")
    if not ffmpeg:
        parser.error("ffmpeg was not found on PATH")
    ffprobe = resolved_executable("ffprobe")
    if not ffprobe:
        parser.error("ffprobe was not found on PATH")

    video_id = video_id_from_url(args.url)
    canonical_url = f"https://www.youtube.com/watch?v={video_id}"
    run_dir = args.work_root.resolve() / video_id
    data_dir = run_dir / "data"
    frames_dir = run_dir / "frames"
    sheets_dir = run_dir / "sheets"
    for directory in (data_dir, frames_dir, sheets_dir):
        directory.mkdir(parents=True, exist_ok=True)

    ytdlp = yt_dlp_command(args.cookies_from_browser, ffmpeg)
    metadata_result = run(
        [*ytdlp, "--dump-single-json", "--skip-download", canonical_url],
        cwd=run_dir,
        capture=True,
    )
    metadata = json.loads(metadata_result.stdout)
    write_json(run_dir / "metadata.json", metadata)

    run(
        [
            *ytdlp,
            "--write-subs",
            "--write-auto-subs",
            "--skip-download",
            "--sub-langs",
            "en,zh-Hans,zh-Hant",
            "--sub-format",
            "vtt",
            "-o",
            str(data_dir / "subtitles"),
            canonical_url,
        ],
        cwd=run_dir,
        check=False,
    )

    run(
        [
            *ytdlp,
            "--retries",
            "5",
            "--no-part",
            "--force-overwrites",
            "--merge-output-format",
            "mp4",
            "-f",
            video_format_selector(args.max_height),
            "-o",
            str(data_dir / "video.%(ext)s"),
            canonical_url,
        ],
        cwd=run_dir,
    )

    video_file = select_video_file(data_dir, ffprobe)

    audio_file = data_dir / "audio.wav"
    run([ffmpeg, "-y", "-i", str(video_file), "-vn", "-ar", "48000", "-ac", "2", str(audio_file)], cwd=run_dir)

    frame_filter = "fps=1" if args.frame_interval == 1 else f"fps=1/{args.frame_interval:g}"
    run(
        [ffmpeg, "-y", "-i", str(video_file), "-vf", frame_filter, "-compression_level", "1", str(frames_dir / "frame_%06d.png")],
        cwd=run_dir,
    )

    sheet_filter = f"fps=1/{args.sheet_interval:g},scale=480:-2,tile=4x4"
    run(
        [ffmpeg, "-y", "-i", str(video_file), "-vf", sheet_filter, "-q:v", "2", str(sheets_dir / "overview_%03d.jpg")],
        cwd=run_dir,
    )

    summary = {
        "video_id": video_id,
        "video_url": canonical_url,
        "title": metadata.get("title", ""),
        "channel": metadata.get("channel") or metadata.get("uploader"),
        "duration": metadata.get("duration"),
        "run_dir": str(run_dir),
        "video_file": str(video_file),
        "target_height": args.max_height,
        "frame_interval": args.frame_interval,
        "frame_count": len(list(frames_dir.glob("frame_*.png"))),
        "sheet_count": len(list(sheets_dir.glob("overview_*.jpg"))),
        "subtitle_files": [str(path) for path in sorted(data_dir.glob("subtitles.*.vtt"))],
        "cookies_from_browser": bool(args.cookies_from_browser),
        "subtitle_only_allowed": False,
    }
    write_json(run_dir / "local_prepare_summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
