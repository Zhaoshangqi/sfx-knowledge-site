# Site-Owned YouTube Subtitles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Embed lazy-loaded YouTube playback in every video detail and synchronize site-owned Chinese subtitle tracks without using YouTube translation at runtime.

**Architecture:** Add a tested UMD subtitle model/data module and a tested UMD YouTube player controller, then integrate them into the existing static reader. A conversion tool turns temporary VTT files into validated site cues; the first real track is `Xl5u91oQv-k`, while every other record receives an explicit coverage state.

**Tech Stack:** Static HTML/CSS/JavaScript, YouTube IFrame Player API, UMD/CommonJS modules, Node test runner, Python/yt-dlp preparation tooling, GitHub Pages.

---

### Task 1: Lock the subtitle data contract

**Files:**
- Create: `tests/video-subtitles.test.cjs`
- Create: `src/video-subtitles.js`

- [ ] **Step 1: Write the failing module tests**

Require a UMD/CommonJS API with `trackFor(videoId)`, `cueAt(track, seconds)`, `formatTime(seconds)`, `statusFor(videoId)`, and `coverageFor(records)`. Assert frozen return data, sorted non-overlapping cues, start/end boundary behavior, malformed input fail-closed behavior, and one explicit status for each record.

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests\video-subtitles.test.cjs`

Expected: FAIL because `src/video-subtitles.js` does not exist.

- [ ] **Step 3: Implement the smallest valid module**

Create a UMD factory that normalizes a private track table, rejects invalid cues, performs binary search with an end-exclusive boundary, returns immutable public values, and reports `draft`, `reviewed`, or `missing` without inventing text.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests\video-subtitles.test.cjs`

Expected: PASS.

### Task 2: Build and import the first real subtitle track

**Files:**
- Create: `tests/build-site-subtitles.test.cjs`
- Create: `tools/build-site-subtitles.cjs`
- Modify: `src/video-subtitles.js`
- Temporary input, ignored: `.work/subtitles/Xl5u91oQv-k.en-orig.vtt`
- Temporary input, ignored: `.work/subtitles/Xl5u91oQv-k.zh-Hans.vtt`

- [ ] **Step 1: Write failing VTT conversion tests**

Cover YouTube inline timestamp tags, rolling duplicate captions, blank/music cues, HTML entities, overlapping source cues, minimum readable duration, deterministic JSON output, and invalid timestamp rejection.

- [ ] **Step 2: Run the converter test and verify RED**

Run: `node --test tests\build-site-subtitles.test.cjs`

Expected: FAIL because the conversion module does not exist.

- [ ] **Step 3: Implement the VTT converter**

Expose parser functions for tests and a CLI accepting `--video-id`, `--input`, `--language`, `--source`, and `--output`. Strip WebVTT markup, collapse rolling captions to stable readable cues, preserve timestamps, and write UTF-8 JSON only after validation succeeds.

- [ ] **Step 4: Generate and review the `Xl5u91oQv-k` cue set**

Run the converter against the downloaded Chinese VTT, compare terminology with the English VTT and existing video record, then correct names including `Stepwise Morph`, `Serum`, `GRM Reson`, `Transient Shaper`, `soothe2`, and `Pro-L 2` before adding the cues to `src/video-subtitles.js`.

- [ ] **Step 5: Run subtitle tests and verify GREEN**

Run: `node --test tests\build-site-subtitles.test.cjs tests\video-subtitles.test.cjs`

Expected: PASS with a nonempty track covering the real 6:21 timeline and marked `draft`, not `reviewed`.

### Task 3: Implement the lazy YouTube caption player

**Files:**
- Create: `tests/youtube-caption-player.test.cjs`
- Create: `src/youtube-caption-player.js`

- [ ] **Step 1: Write failing player contract tests**

Assert safe HTML output, a cover-first shell with no iframe, `playsinline=1`, native captions/fullscreen disabled, one shared IFrame API loader, 200 ms caption synchronization, transcript seeking, subtitle toggle, container fullscreen, and cleanup of timers/player instances.

- [ ] **Step 2: Run the player test and verify RED**

Run: `node --test tests\youtube-caption-player.test.cjs`

Expected: FAIL because `src/youtube-caption-player.js` does not exist.

- [ ] **Step 3: Implement the player controller**

Expose `render(record, track, thumbnailUrl)` and `mount(root, options)`. `mount` loads the YouTube API only after the cover button is activated, creates one `YT.Player`, polls `getCurrentTime()`, updates the current caption and transcript row, and exposes `destroy()` for route changes.

- [ ] **Step 4: Implement accessible controls and lifecycle**

Use real buttons for playback, subtitle visibility, transcript seeking, and container fullscreen. Preserve focus, use `aria-live` for captions, mark the current transcript row with `aria-current`, and clear all listeners/timers when destroyed.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests\youtube-caption-player.test.cjs`

Expected: PASS.

### Task 4: Integrate playback and subtitles into the reader

**Files:**
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `index.html`

- [ ] **Step 1: Add failing integration assertions**

Require both new script tags before the inline application, a player section between “设计思路” and “素材与分层”, explicit missing/draft/reviewed status copy, player destruction on video changes and return-to-library, and the existing original-source link.

- [ ] **Step 2: Run the integration test and verify RED**

Run: `node --test tests\dual-index-site.test.cjs`

Expected: FAIL because the player is not integrated.

- [ ] **Step 3: Wire render and cleanup**

Load the modules, render the player shell for the active record, mount it after `detailEl.innerHTML`, destroy the prior controller before every detail/library transition, and retain `loadDetailPreviews()`.

- [ ] **Step 4: Add stable responsive CSS**

Keep a fixed 16:9 media stage and two-line caption strip, use a compact unframed transcript list, overlay captions only in `:fullscreen`, and add 980/640 px fallbacks without viewport-scaled fonts or overlapping controls.

- [ ] **Step 5: Run the integration and focused tests**

Run: `node --test tests\dual-index-site.test.cjs tests\youtube-caption-player.test.cjs tests\video-subtitles.test.cjs`

Expected: PASS.

### Task 5: Verify the real workflow and preserve repository boundaries

**Files:**
- Modify only if verification finds a defect.
- Update: `README.md`
- Update: `docs/learning-workflow.md`

- [ ] **Step 1: Document subtitle preparation and review states**

Document the subtitle-only yt-dlp command, converter command, terminology review, status promotion, and the rule that `.work` inputs and YouTube media never enter Git.

- [ ] **Step 2: Run the full automated suite**

Run: `node --test tests`

Run: `python -m pytest tests`

Run: `node tools\verify-portable-kit.cjs`

Run: `node --check src\video-subtitles.js`

Run: `node --check src\youtube-caption-player.js`

Run: `node --check tools\build-site-subtitles.cjs`

Run: `git diff --check`

- [ ] **Step 3: Run browser acceptance against the real sample**

At desktop and mobile sizes, open `#video=yt-Xl5u91oQv-k`, activate the cover, verify a real YouTube iframe appears, observe at least two caption changes while playing, seek via a transcript row, toggle captions, enter/exit site fullscreen, switch records, and confirm no stale audio/player remains.

- [ ] **Step 4: Audit the final diff**

Confirm the diff contains no original YouTube media, complete audio, Cookie, login state, API key, `.work` file, secret, absolute local path, or unrelated generated change.

- [ ] **Step 5: Commit and push after the implementation/specification/quality gates pass**

Commit only the verified site, subtitle text, tests, converter, and documentation to `feature/video-knowledge-dual-index`, then push the existing Pull Request branch.

