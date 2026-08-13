# All-Video Chinese Subtitles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give all 82 video records a truthful site-owned Chinese subtitle result while loading subtitle bodies only for the active video.

**Architecture:** Keep a compact generated subtitle catalog in `src/video-subtitles.js`, store each timed track in `assets/subtitles/{YouTube ID}.json`, and load/cache that JSON when a video detail is opened. Import 75 public YouTube caption tracks as drafts; locally transcribe the seven videos without public captions, or mark a video `no-speech` only after audio inspection.

**Tech Stack:** Static HTML/CSS/JavaScript, UMD/CommonJS modules, JSON subtitle assets, Node.js test runner and build tools, Python 3.11, yt-dlp, OpenAI Whisper, imageio-ffmpeg, Torch/Torchaudio VAD, YouTube IFrame Player API.

---

### Task 1: Replace the inline track table with a validated lazy catalog

**Files:**
- Modify: `tests/video-subtitles.test.cjs`
- Modify: `src/video-subtitles.js`
- Create: `assets/subtitles/Xl5u91oQv-k.json`

- [ ] **Step 1: Write failing catalog and loader tests**

Add tests that expect `entryFor(videoId)`, `loadTrack(videoId, options)`, `clearTrackCache()`, the `no-speech` status, one shared in-flight request, frozen loaded tracks, path rejection, HTTP failure rejection, and retry after failure. The core success case must use an injected fetch function:

```js
const pending = [];
const fetch = async (url) => {
  pending.push(url);
  return { ok: true, json: async () => sampleTrackJson };
};
const first = SfxVideoSubtitles.loadTrack('Xl5u91oQv-k', { fetch });
const second = SfxVideoSubtitles.loadTrack('Xl5u91oQv-k', { fetch });
assert.strictEqual(first, second);
assert.equal((await first).videoId, 'Xl5u91oQv-k');
assert.deepEqual(pending, ['assets/subtitles/Xl5u91oQv-k.json']);
```

- [ ] **Step 2: Run the subtitle module test and verify RED**

Run: `node --test tests\video-subtitles.test.cjs`

Expected: FAIL because the current module exposes only synchronous inline `trackFor()` data and has no catalog loader.

- [ ] **Step 3: Move the existing sample track into its own asset**

Write the current validated `Xl5u91oQv-k` object to `assets/subtitles/Xl5u91oQv-k.json` with one UTF-8 trailing newline. Preserve its 23 cues, source, `draft` status, date, and corrected product names exactly.

- [ ] **Step 4: Implement the catalog API**

Replace `rawTracks` with a generated marker block named `SUBTITLE_CATALOG_START` / `SUBTITLE_CATALOG_END`. Normalize entries to this contract:

```js
{
  videoId: 'Xl5u91oQv-k',
  language: 'zh-CN',
  source: 'site-owned-from-public-captions',
  reviewStatus: 'draft',
  updatedAt: '2026-08-13',
  contentStatus: 'track',
  asset: 'assets/subtitles/Xl5u91oQv-k.json'
}
```

Implement `entryFor`, `loadTrack`, `clearTrackCache`, `cueAt`, `formatTime`, `statusFor`, and `coverageFor`. `loadTrack` must validate the fetched JSON with the existing track validator before caching it; `no-speech` and `missing` entries resolve to `null` without a fetch. Failed promises must be removed from the cache so a retry is possible.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `node --test tests\video-subtitles.test.cjs`

Expected: PASS with immutable catalog entries, one cached request, and explicit `track`, `no-speech`, and `missing` coverage counts.

- [ ] **Step 6: Commit the lazy data model**

```powershell
git add tests/video-subtitles.test.cjs src/video-subtitles.js assets/subtitles/Xl5u91oQv-k.json
git commit -m "feat: load video subtitle tracks on demand"
```

### Task 2: Let the player render and hydrate asynchronous subtitle states

**Files:**
- Modify: `tests/youtube-caption-player.test.cjs`
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `src/youtube-caption-player.js`
- Modify: `index.html`

- [ ] **Step 1: Write failing async player tests**

Add tests for a catalog entry rendering a loading state, successful track hydration, transcript button creation, caption toggle enablement, `no-speech`, catalog `missing`, fetch failure, stale promise suppression after `destroy()`, and playback activation before subtitle loading completes. Use an injected loader:

```js
let resolveTrack;
const loadTrack = () => new Promise((resolve) => { resolveTrack = resolve; });
const controller = playerApi.mount(fixture.root, {
  entry: draftEntry,
  loadTrack,
  subtitles,
  document: runtime.document
});
assert.equal(fixture.subtitleToggle.disabled, true);
resolveTrack(track);
await flushPromises();
assert.equal(fixture.subtitleToggle.disabled, false);
assert.equal(fixture.transcript.querySelectorAll('[data-cue-index]').length, track.cues.length);
controller.destroy();
```

- [ ] **Step 2: Run player and integration tests and verify RED**

Run: `node --test tests\youtube-caption-player.test.cjs tests\dual-index-site.test.cjs`

Expected: FAIL because `render` and `mount` currently require a complete synchronous track.

- [ ] **Step 3: Render catalog states without blocking playback**

Change `render(record, entry, thumbnailUrl)` so a `track` entry emits `data-subtitle-status="loading"`, a disabled CC button, and a transcript loading line. `no-speech` must display `本视频无口述内容`; `missing` must display an explicit unavailable reason. Keep the cover, YouTube target, caption overlay, live caption line, and fullscreen button stable in every state.

- [ ] **Step 4: Hydrate the track and transcript safely**

Change `mount` to accept `entry` and `loadTrack`. Start loading immediately, then set the validated track, build transcript buttons with DOM APIs and `textContent`, attach cue listeners, enable the CC button, and synchronize if the player is already ready. On failure, set `data-subtitle-status="error"` and display `中文字幕加载失败，视频仍可正常播放。`. Ignore all late results after `destroy()`.

- [ ] **Step 5: Switch the detail page to catalog entries**

Use the model through the new interface:

```js
const subtitleEntry = SfxVideoSubtitles.entryFor(record.videoId);
const playerHtml = SfxYouTubeCaptionPlayer.render(record, subtitleEntry, thumbnail(record, 'hqdefault'));
// after detailEl.innerHTML
activeVideoPlayer = SfxYouTubeCaptionPlayer.mount(playerRoot, {
  entry: subtitleEntry,
  loadTrack: (videoId) => SfxVideoSubtitles.loadTrack(videoId),
  subtitles: SfxVideoSubtitles
});
```

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests\video-subtitles.test.cjs tests\youtube-caption-player.test.cjs tests\dual-index-site.test.cjs`

Expected: PASS, including playback with loading, `no-speech`, and failed subtitle states.

- [ ] **Step 7: Commit async player hydration**

```powershell
git add tests/youtube-caption-player.test.cjs tests/dual-index-site.test.cjs src/youtube-caption-player.js index.html
git commit -m "feat: hydrate site subtitles per video"
```

### Task 3: Add deterministic batch import and catalog generation

**Files:**
- Create: `tests/batch-site-subtitles.test.cjs`
- Create: `tools/batch-site-subtitles.cjs`
- Create: `tools/data/subtitle-status-overrides.json`
- Modify: `tools/verify-portable-kit.cjs`

- [ ] **Step 1: Write failing batch-tool tests**

Use temporary fixtures to verify: exactly one catalog entry per site record; duplicate IDs fail; orphan JSON fails; malformed track JSON fails; an override may be only `no-speech` or `missing`; existing files are not overwritten without `--force`; output order follows the 82 site records; writes are atomic; and the report includes `total`, `tracks`, `publicCaptions`, `localTranscriptions`, `noSpeech`, `missing`, and `cues`.

- [ ] **Step 2: Run the batch test and verify RED**

Run: `node --test tests\batch-site-subtitles.test.cjs`

Expected: FAIL because `tools/batch-site-subtitles.cjs` does not exist.

- [ ] **Step 3: Implement record extraction and VTT import**

Export pure functions `extractRecords(indexHtml)`, `importVtt(options)`, `buildCatalog(options)`, and `writeCatalog(options)`. Reuse `parseVtt` and `buildTrack` from `tools/build-site-subtitles.cjs`; require filenames to match the track `videoId`; reject paths outside the supplied input/output roots; and write to a temporary sibling before rename.

The CLI must support:

```powershell
node tools\batch-site-subtitles.cjs import `
  --input .work\subtitles `
  --output assets\subtitles `
  --updated-at 2026-08-13
node tools\batch-site-subtitles.cjs catalog `
  --index index.html `
  --tracks assets\subtitles `
  --overrides tools\data\subtitle-status-overrides.json `
  --module src\video-subtitles.js `
  --report .work\subtitles\coverage-report.json
node tools\batch-site-subtitles.cjs fetch-public `
  --index index.html `
  --work .work\subtitles
```

`fetch-public` must derive all 82 canonical URLs from the records, invoke yt-dlp with `--skip-download --write-auto-subs --sub-langs "zh-Hans,en-orig" --sub-format vtt --ignore-errors --no-overwrites`, and emit a machine-readable success/failure inventory.

- [ ] **Step 4: Extend portable verification**

Require every asset path in the generated catalog to exist, reject unreferenced subtitle JSON, verify the catalog covers all 82 unique site records, and reject any committed file under `.work/` or media extension under `assets/subtitles/`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests\batch-site-subtitles.test.cjs tests\build-site-subtitles.test.cjs`

Expected: PASS with deterministic output and failure-closed path handling.

- [ ] **Step 6: Commit the batch tool**

```powershell
git add tests/batch-site-subtitles.test.cjs tools/batch-site-subtitles.cjs tools/data/subtitle-status-overrides.json tools/verify-portable-kit.cjs
git commit -m "feat: generate the site subtitle catalog"
```

### Task 4: Import the 75 public Chinese caption tracks

**Files:**
- Create: `assets/subtitles/` JSON corpus for the 75 IDs reported with public captions
- Modify: `src/video-subtitles.js`
- Modify: `.work/subtitles/coverage-report.json` (ignored, never commit)

- [ ] **Step 1: Fetch only public caption text**

Run the deterministic fetch command; it derives all canonical URLs from `index.html` and skips video and audio media:

```powershell
node tools\batch-site-subtitles.cjs fetch-public --index index.html --work .work\subtitles
```

Expected: 75 `zh-Hans` VTT files and 75 `en-orig` VTT files; the seven confirmed captionless IDs have neither file.

- [ ] **Step 2: Import all available Chinese VTT files**

Run: `node tools\batch-site-subtitles.cjs import --input .work\subtitles --output assets\subtitles --updated-at 2026-08-13`

Expected: 75 validated JSON tracks total, including the preserved `Xl5u91oQv-k` track and 74 newly generated tracks, all marked `draft`.

- [ ] **Step 3: Audit public-track terminology and corruption**

Generate a report of replacement characters, mojibake markers, embedded URLs, cues over 48 code points, unknown Latin product tokens, and Chinese/English cue-count ratios. Correct only terms supported by the English track, video title, or existing record; retain uncertain wording as `draft`.

- [ ] **Step 4: Generate the 82-entry catalog and coverage report**

Run: `node tools\batch-site-subtitles.cjs catalog --index index.html --tracks assets\subtitles --overrides tools\data\subtitle-status-overrides.json --module src\video-subtitles.js --report .work\subtitles\coverage-report.json`

Expected interim report: `total=82`, `tracks=75`, `publicCaptions=75`, `localTranscriptions=0`, `noSpeech=0`, `missing=7`.

- [ ] **Step 5: Run content and model tests**

Run: `node --test tests\batch-site-subtitles.test.cjs tests\video-subtitles.test.cjs tests\youtube-caption-player.test.cjs`

Expected: PASS with all 75 public tracks loadable and no orphan assets.

- [ ] **Step 6: Commit the public subtitle corpus**

```powershell
git add assets/subtitles src/video-subtitles.js
git commit -m "content: add public captions for 75 videos"
```

### Task 5: Transcribe or classify the seven captionless videos

**Files:**
- Create: `tests/test_transcribe_missing_subtitles.py`
- Create: `tools/transcribe-missing-subtitles.py`
- Create: `requirements-transcription.txt`
- Create if speech exists: `assets/subtitles/1uFMVg7TrGU.json`
- Create if speech exists: `assets/subtitles/D0qibJgxYHY.json`
- Create if speech exists: `assets/subtitles/dZsVzf2NWw0.json`
- Create if speech exists: `assets/subtitles/2L6qe8uRf0Y.json`
- Create if speech exists: `assets/subtitles/WdZ9DFDHaqI.json`
- Create if speech exists: `assets/subtitles/YVto08ZB9Lk.json`
- Create if speech exists: `assets/subtitles/yYUB55kMMV8.json`
- Modify: `tools/data/subtitle-status-overrides.json`
- Modify: `src/video-subtitles.js`

- [ ] **Step 1: Write failing transcription-tool tests**

Mock subprocess, Torchaudio VAD, and Whisper. Verify the tool uses a canonical YouTube URL, writes media only under `.work/subtitles`, resolves imageio-ffmpeg without changing the global installation, runs windowed voice-activity filtering before transcription, rejects empty or low-confidence hallucinations, writes `site-owned-from-local-transcription`, and emits a review file instead of automatically declaring `no-speech`.

- [ ] **Step 2: Run the Python test and verify RED**

Run: `python -m unittest tests.test_transcribe_missing_subtitles -v`

Expected: FAIL because `tools/transcribe-missing-subtitles.py` does not exist.

- [ ] **Step 3: Implement safe local transcription**

Pin `openai-whisper==20250625` and `imageio-ffmpeg==0.6.0` in `requirements-transcription.txt`; document that Torch/Torchaudio must match the local CUDA runtime. Use `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" --no-playlist` with a fixed `.work/subtitles/{videoId}.%(ext)s` output. Add the directory containing `imageio_ffmpeg.get_ffmpeg_exe()` to the child process `PATH`, perform windowed `torchaudio.functional.vad` preflight, then call cached Whisper `large-v3` on CUDA with English language, temperature `0`, word timestamps, `condition_on_previous_text=False`, and silence thresholds. Convert accepted segments through the existing track builder and write a separate `.review.json` containing rejected segments and confidence evidence.

- [ ] **Step 4: Run transcription for the seven fixed IDs**

Run:

```powershell
python tools\transcribe-missing-subtitles.py --model large-v3 --device cuda --work-dir .work\subtitles `
  1uFMVg7TrGU D0qibJgxYHY dZsVzf2NWw0 2L6qe8uRf0Y WdZ9DFDHaqI YVto08ZB9Lk yYUB55kMMV8
```

Expected: each ID produces either a candidate track plus review evidence, or a concrete download/transcription failure. The tool must not write `no-speech` automatically.

- [ ] **Step 5: Inspect each result and assign the truthful state**

Listen to every accepted/rejected time range against the temporary audio. For speech, correct only clearly evidenced names and copy the validated track to `assets/subtitles/`. For a video with no spoken words, add a `no-speech` override with `updatedAt` and an audit note. For an unresolved failure, add a `missing` override with the concrete reason.

- [ ] **Step 6: Rebuild catalog and verify final coverage**

Run the catalog command from Task 4 and inspect `.work/subtitles/coverage-report.json`.

Expected: `total=82`; `tracks + noSpeech + missing = 82`; `missing=0` is the target, but any real media failure remains explicit rather than fabricated.

- [ ] **Step 7: Run focused tests and commit**

```powershell
python -m unittest tests.test_transcribe_missing_subtitles -v
node --test tests\batch-site-subtitles.test.cjs tests\video-subtitles.test.cjs
git add tests/test_transcribe_missing_subtitles.py tools/transcribe-missing-subtitles.py requirements-transcription.txt tools/data/subtitle-status-overrides.json assets/subtitles src/video-subtitles.js
git commit -m "content: resolve videos without public captions"
```

### Task 6: Document, verify, browser-test, and publish

**Files:**
- Modify: `README.md`
- Modify: `docs/learning-workflow.md`
- Modify if defects are found: `index.html`, `src/video-subtitles.js`, `src/youtube-caption-player.js`, `styles.css`, related tests

- [ ] **Step 1: Update the maintenance documentation**

Document the per-video JSON format, lazy catalog generation, public-caption import, local-transcription review gate, `no-speech` meaning, coverage report, and the prohibition on committing `.work`, media, Cookie, login, or token data.

- [ ] **Step 2: Run syntax and content checks**

```powershell
node --check src\video-subtitles.js
node --check src\youtube-caption-player.js
node --check tools\batch-site-subtitles.cjs
python -m py_compile tools\transcribe-missing-subtitles.py
node tools\verify-portable-kit.cjs
git diff --check
```

Expected: all commands exit 0; portable verification reports 82/82 site records and 82/82 truthful subtitle states.

- [ ] **Step 3: Run the complete automated suite**

```powershell
node --test tests
python -m unittest discover -s tests -v
```

Expected: every Node and Python test passes; report exact totals rather than only exit codes.

- [ ] **Step 4: Run desktop and mobile browser acceptance**

Serve the worktree and verify at least: a short public-caption video, a long public-caption video, a locally transcribed video, and a confirmed `no-speech` video if present. At desktop, 390px portrait, and mobile landscape fullscreen, verify the real YouTube iframe, subtitle loading, timed overlay, transcript seek, CC toggle, no overlaps, no stale captions after navigation, and no console errors.

- [ ] **Step 5: Audit repository boundaries**

Run `git status --short` and inspect the complete diff. Confirm no original YouTube video, full audio, VTT input, `.work` file, Cookie, login state, API key, model checkpoint, absolute local path, or unrelated generated output is tracked.

- [ ] **Step 6: Commit documentation and any verified fixes**

```powershell
git add README.md docs/learning-workflow.md index.html src/video-subtitles.js src/youtube-caption-player.js styles.css tests tools assets/subtitles
git commit -m "docs: document full subtitle maintenance"
```

- [ ] **Step 7: Push the existing Pull Request branch**

Run: `git push origin feature/video-knowledge-dual-index`

Expected: local and remote branch counts are `0 0`, the worktree is clean, and Pull Request 1 points at the final verified commit.
