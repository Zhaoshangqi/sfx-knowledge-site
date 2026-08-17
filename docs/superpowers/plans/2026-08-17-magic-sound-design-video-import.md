# Magic Sound Design Video Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish two complete, evidence-led learning records for `lLTbxhK_QLU` and `Oo3SRd_94VE`, with site-owned Chinese subtitles, exact screenshots, searchable Skill memory, and verified embedded playback.

**Architecture:** Prepare both source videos only inside ignored `.work/runs/`, review each timeline independently, and produce disjoint screenshot/subtitle assets keyed by video ID. Integrate the two reviewed records into the existing inline JSON data, regenerate the subtitle catalog and Skill memory, then update only the repository's explicit coverage gates before full browser and public deployment verification.

**Tech Stack:** Static HTML, vanilla JavaScript, Node.js `node:test`, Python `unittest`, yt-dlp, FFmpeg/FFprobe, WebVTT, JSON, YouTube IFrame API, GitHub Pages.

---

## File Structure

- Create `tests/magic-video-import.test.cjs`: batch acceptance contract for record identity, complete timelines, screenshots, subtitles, and Skill references.
- Modify `index.html`: add the two independent records and their screenshot manifest entries.
- Create `assets/subtitles/lLTbxhK_QLU.json`: site-owned Chinese draft track for the water-spell video.
- Create `assets/subtitles/Oo3SRd_94VE.json`: site-owned Chinese draft track for the holy-magic video.
- Create `assets/shots/full/lLTbxhK_QLU-*.png`: nine full-resolution water-spell evidence captures.
- Create `assets/shots/preview/lLTbxhK_QLU-*.webp`: nine lightweight water-spell previews.
- Create `assets/shots/full/Oo3SRd_94VE-*.png`: fourteen full-resolution holy-magic evidence captures.
- Create `assets/shots/preview/Oo3SRd_94VE-*.webp`: fourteen lightweight holy-magic previews.
- Modify `src/video-subtitles.js`: generated 84-video subtitle catalog.
- Modify `tests/site-data.test.cjs`: update the real-site record count from 82 to 84.
- Modify `tests/dual-index-site.test.cjs`: update real-site count assertions and labels from 82 to 84.
- Modify `tools/verify-portable-kit.cjs`: update final record, step, and screenshot expectations after the exact new record shapes are frozen.
- Modify `skills/sfx-knowledge/references/video-learnings.md`: add complete evidence-led notes for both videos.
- Modify `skills/sfx-knowledge/references/site-video-memory.md`: regenerate searchable site memory from all 84 records.
- Create `docs/superpowers/specs/2026-08-17-magic-sound-design-video-import-design.md`: approved design specification.
- Create `docs/superpowers/plans/2026-08-17-magic-sound-design-video-import.md`: this execution plan.

Files under `.work/runs/`, `.work/subtitles/`, and `.work/timeline-review/` are temporary evidence only and must never be staged.

## Task 1: Add The Failing Batch Acceptance Contract

**Files:**
- Create: `tests/magic-video-import.test.cjs`

- [ ] **Step 1: Write the failing real-site contract**

Create `tests/magic-video-import.test.cjs` with this contract:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const siteData = require('../tools/site-data.cjs');
const subtitles = require('../src/video-subtitles.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { records, imageManifest } = siteData.parse(html);
const specs = [{
  videoId: 'lLTbxhK_QLU',
  id: 'yt-lLTbxhK_QLU',
  title: '《守望先锋》风格水系法术音效拆解',
  url: 'https://www.youtube.com/watch?v=lLTbxhK_QLU',
  durationSeconds: 986,
  starts: [0, 45, 120, 255, 332, 461, 582, 686, 726]
}, {
  videoId: 'Oo3SRd_94VE',
  id: 'yt-Oo3SRd_94VE',
  title: '零素材库制作圣光魔法音效：录音、合成与画面对位',
  url: 'https://www.youtube.com/watch?v=Oo3SRd_94VE',
  durationSeconds: 1517,
  starts: [0, 46, 167, 304, 562, 656, 779, 930, 982, 1134, 1242, 1273, 1385, 1462]
}];

test('publishes both magic videos as unique complete records', () => {
  assert.equal(records.length, 84);
  assert.equal(new Set(records.map((record) => record.videoId)).size, 84);

  for (const spec of specs) {
    const matches = records.filter((record) => record.videoId === spec.videoId);
    assert.equal(matches.length, 1, spec.videoId);
    const record = matches[0];
    assert.equal(record.id, spec.id);
    assert.equal(record.title, spec.title);
    assert.equal(record.url, spec.url);
    assert.deepEqual(record.timeline, {
      durationSeconds: spec.durationSeconds,
      reviewedAt: '2026-08-17',
      source: 'youtube-player'
    });
    assert.deepEqual(record.steps.map((step) => step.startSeconds), spec.starts);
    assert.equal(record.steps.length, spec.starts.length);
    assert.ok(record.summary.length >= 40, `${spec.videoId}: summary`);
    assert.ok(record.coreIdeas.length >= 3, `${spec.videoId}: coreIdeas`);
    assert.ok(record.materials.length >= 4, `${spec.videoId}: materials`);
    assert.doesNotMatch(JSON.stringify(record), /practiceChecklist|练习|作业|打卡/);

    const imageKeys = new Set(record.steps.map((step) => step.imageKey));
    assert.equal(imageKeys.size, record.steps.length, `${spec.videoId}: unique screenshots`);
    for (const step of record.steps) {
      assert.ok(step.name && step.detail, `${spec.videoId}: complete step`);
      assert.ok(Array.isArray(step.params), `${spec.videoId}: evidence notes`);
      const asset = imageManifest[step.imageKey];
      assert.ok(asset, `${spec.videoId}: manifest ${step.imageKey}`);
      assert.ok(fs.existsSync(path.join(root, asset.preview)), asset.preview);
      assert.ok(fs.existsSync(path.join(root, asset.full)), asset.full);
    }

    for (const use of record.effectUses || []) {
      assert.equal(use.screenshotReviewed, true, use.id);
      assert.ok(imageKeys.has(use.screenshotKey), `${use.id}: exact screenshot owner`);
      assert.ok(Number.isInteger(use.stepIndex), `${use.id}: stepIndex`);
      assert.ok(use.name && use.purpose, `${use.id}: identified effect and purpose`);
    }
  }
});

test('publishes lazy Chinese caption tracks and complete Skill references', () => {
  const learning = fs.readFileSync(
    path.join(root, 'skills', 'sfx-knowledge', 'references', 'video-learnings.md'),
    'utf8'
  );

  for (const spec of specs) {
    const assetPath = path.join(root, 'assets', 'subtitles', `${spec.videoId}.json`);
    assert.ok(fs.existsSync(assetPath), assetPath);
    const track = JSON.parse(fs.readFileSync(assetPath, 'utf8'));
    assert.equal(track.videoId, spec.videoId);
    assert.equal(track.language, 'zh-CN');
    assert.equal(track.source, 'site-owned-from-public-captions');
    assert.equal(track.reviewStatus, 'draft');
    assert.equal(track.updatedAt, '2026-08-17');
    assert.ok(track.cues.length > 20, `${spec.videoId}: cues`);
    assert.equal(subtitles.entryFor(spec.videoId).asset, `assets/subtitles/${spec.videoId}.json`);
    assert.match(learning, new RegExp(`https://www\\.youtube\\.com/watch\\?v=${spec.videoId}`));
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests\magic-video-import.test.cjs`

Expected: FAIL because the site still has 82 records and neither new `videoId` exists.

- [ ] **Step 3: Commit only the approved spec, plan, and failing test**

```powershell
git add docs\superpowers\specs\2026-08-17-magic-sound-design-video-import-design.md docs\superpowers\plans\2026-08-17-magic-sound-design-video-import.md tests\magic-video-import.test.cjs
git commit -m "test: define magic video import contract"
```

## Task 2: Prepare Both Full Visual Evidence Runs

**Files:**
- Create locally only: `.work/runs/lLTbxhK_QLU/**`
- Create locally only: `.work/runs/Oo3SRd_94VE/**`

- [ ] **Step 1: Verify the preparation tool and environment**

```powershell
.\.venv\Scripts\python.exe -m unittest discover -s tests -p "test_prepare_sfx_video.py" -v
ffmpeg -version
ffprobe -version
```

Expected: the Python tests pass and both FFmpeg commands exit 0.

- [ ] **Step 2: Prepare the 1080p water-spell evidence run**

Run:

```powershell
.\.venv\Scripts\python.exe .\tools\prepare-sfx-video.py "https://www.youtube.com/watch?v=lLTbxhK_QLU" --max-height 1080 --frame-interval 1 --sheet-interval 10
```

Expected: `.work/runs/lLTbxhK_QLU/local_prepare_summary.json` reports `video_id` `lLTbxhK_QLU`, `target_height` 1080, a merged visual file, nonzero frame count, and nonzero sheet count.

- [ ] **Step 3: Prepare the 1080p holy-magic evidence run**

Run:

```powershell
.\.venv\Scripts\python.exe .\tools\prepare-sfx-video.py "https://www.youtube.com/watch?v=Oo3SRd_94VE" --max-height 1080 --frame-interval 1 --sheet-interval 10
```

Expected: `.work/runs/Oo3SRd_94VE/local_prepare_summary.json` reports `video_id` `Oo3SRd_94VE`, `target_height` 1080, a merged visual file, nonzero frame count, and nonzero sheet count.

- [ ] **Step 4: Verify ignored-media boundaries**

Run: `git status --short`

Expected: no media, VTT, audio, metadata, frame, or contact-sheet path under `.work` appears.

## Task 3: Review And Capture The Water-Spell Record

**Files:**
- Create: nine `assets/shots/full/lLTbxhK_QLU-*.png` files.
- Create: nine `assets/shots/preview/lLTbxhK_QLU-*.webp` files.
- Create locally only: `.work/runs/lLTbxhK_QLU/review.md`

- [ ] **Step 1: Review the entire `00:00-16:26` timeline**

Inspect every contact sheet and the surrounding 1-second frames for starts `0, 45, 120, 255, 332, 461, 582, 686, 726`, then continue the full review through the `15:52-16:26` outro without creating a filler learning step. In `.work/runs/lLTbxhK_QLU/review.md`, record for each section: source identity, layer role, edit/processing order, visible processor identity, visible automation/routing, creator statement, and any unresolved boundary. Do not mark an audible result as locally heard unless it is independently auditioned; creator narration must remain labelled as narration.

- [ ] **Step 2: Freeze nine evidence keys**

Use these exact keys in step order:

```text
lLTbxhK_QLU-final-result
lLTbxhK_QLU-source-examples
lLTbxhK_QLU-source-1
lLTbxhK_QLU-source-2
lLTbxhK_QLU-source-3
lLTbxhK_QLU-source-4
lLTbxhK_QLU-source-5
lLTbxhK_QLU-source-6
lLTbxhK_QLU-final-breakdown
```

Select a frame near each chapter start only after confirming that the frame visibly supports the eventual Chinese step title. If a chapter-start frame is a title card or talking head, move within that chapter and preserve the original chapter start in `startSeconds`.

- [ ] **Step 3: Produce full and preview assets**

Start with these chapter-local capture candidates, then move a capture only when the full visual review proves that a nearby frame is more legible while representing the same step:

```powershell
$shots = @(
  @{ Key = 'lLTbxhK_QLU-final-result'; Seconds = 6 },
  @{ Key = 'lLTbxhK_QLU-source-examples'; Seconds = 50 },
  @{ Key = 'lLTbxhK_QLU-source-1'; Seconds = 125 },
  @{ Key = 'lLTbxhK_QLU-source-2'; Seconds = 260 },
  @{ Key = 'lLTbxhK_QLU-source-3'; Seconds = 337 },
  @{ Key = 'lLTbxhK_QLU-source-4'; Seconds = 466 },
  @{ Key = 'lLTbxhK_QLU-source-5'; Seconds = 587 },
  @{ Key = 'lLTbxhK_QLU-source-6'; Seconds = 691 },
  @{ Key = 'lLTbxhK_QLU-final-breakdown'; Seconds = 735 }
)
$shots | ForEach-Object {
  $full = "assets\shots\full\$($_.Key).png"
  $preview = "assets\shots\preview\$($_.Key).webp"
  ffmpeg -y -ss $_.Seconds -i .work\runs\lLTbxhK_QLU\data\video.mp4 -frames:v 1 -vf "scale=1920:-2" $full
  ffmpeg -y -i $full -vf "scale=720:-2" -c:v libwebp -quality 82 $preview
}
```

Expected: all twenty files are nonempty; full captures remain readable and previews fit the detail-page layout.

- [ ] **Step 4: Draft the complete record data**

Prepare one record with ID `yt-lLTbxhK_QLU`, category `magic`, secondary categories `["workflow", "scifi"]`, the nine fixed starts, and the complete schema listed in `docs/learning-workflow.md`. Use a separate step for every source chapter. Add `effectUses` only when one processor is uniquely identifiable and the narration or visible before/after establishes its concrete input, action, and result.

## Task 4: Review And Capture The Holy-Magic Record

**Files:**
- Create: fourteen `assets/shots/full/Oo3SRd_94VE-*.png` files.
- Create: fourteen `assets/shots/preview/Oo3SRd_94VE-*.webp` files.
- Create locally only: `.work/runs/Oo3SRd_94VE/review.md`

- [ ] **Step 1: Review the entire `00:00-25:17` timeline**

Inspect every contact sheet and surrounding frames for starts `0, 46, 167, 304, 562, 656, 779, 930, 982, 1134, 1242, 1273, 1385, 1462`. Keep raw recordings, processed building blocks, and four picture-design passes as separate evidence groups. Record the creator's source-video attribution without implying that the redesign is an official game asset.

- [ ] **Step 2: Freeze fourteen evidence keys**

```text
Oo3SRd_94VE-source-recordings
Oo3SRd_94VE-final-design
Oo3SRd_94VE-synths
Oo3SRd_94VE-building-blocks
Oo3SRd_94VE-singing-bowl
Oo3SRd_94VE-jingle-bells
Oo3SRd_94VE-bubble-wrap
Oo3SRd_94VE-balloon-deflating
Oo3SRd_94VE-plastic-wrap-textures
Oo3SRd_94VE-picture-pass-1
Oo3SRd_94VE-picture-pass-2
Oo3SRd_94VE-picture-pass-3
Oo3SRd_94VE-picture-pass-4
Oo3SRd_94VE-variation-generator
```

- [ ] **Step 3: Produce full and preview assets**

Start with these chapter-local capture candidates and apply the same evidence review rule as Task 3:

```powershell
$shots = @(
  @{ Key = 'Oo3SRd_94VE-source-recordings'; Seconds = 5 },
  @{ Key = 'Oo3SRd_94VE-final-design'; Seconds = 50 },
  @{ Key = 'Oo3SRd_94VE-synths'; Seconds = 172 },
  @{ Key = 'Oo3SRd_94VE-building-blocks'; Seconds = 310 },
  @{ Key = 'Oo3SRd_94VE-singing-bowl'; Seconds = 570 },
  @{ Key = 'Oo3SRd_94VE-jingle-bells'; Seconds = 665 },
  @{ Key = 'Oo3SRd_94VE-bubble-wrap'; Seconds = 790 },
  @{ Key = 'Oo3SRd_94VE-balloon-deflating'; Seconds = 940 },
  @{ Key = 'Oo3SRd_94VE-plastic-wrap-textures'; Seconds = 990 },
  @{ Key = 'Oo3SRd_94VE-picture-pass-1'; Seconds = 1140 },
  @{ Key = 'Oo3SRd_94VE-picture-pass-2'; Seconds = 1248 },
  @{ Key = 'Oo3SRd_94VE-picture-pass-3'; Seconds = 1280 },
  @{ Key = 'Oo3SRd_94VE-picture-pass-4'; Seconds = 1392 },
  @{ Key = 'Oo3SRd_94VE-variation-generator'; Seconds = 1468 }
)
$shots | ForEach-Object {
  $full = "assets\shots\full\$($_.Key).png"
  $preview = "assets\shots\preview\$($_.Key).webp"
  ffmpeg -y -ss $_.Seconds -i .work\runs\Oo3SRd_94VE\data\video.mp4 -frames:v 1 -vf "scale=1920:-2" $full
  ffmpeg -y -i $full -vf "scale=720:-2" -c:v libwebp -quality 82 $preview
}
```

Expected: all twenty-eight files are nonempty and each frame visibly matches its named material or picture pass.

- [ ] **Step 4: Draft the complete record data**

Prepare one record with ID `yt-Oo3SRd_94VE`, category `magic`, secondary categories `["workflow"]`, the fourteen fixed starts, and separate material roles for synths, singing bowl, jingle bells, bubble wrap, deflating balloon, and plastic-wrap textures. Keep the four picture passes distinct. Apply the same fail-closed `effectUses` rule as Task 3.

## Task 5: Build Chinese Tracks And Integrate Both Records

**Files:**
- Create: `assets/subtitles/lLTbxhK_QLU.json`
- Create: `assets/subtitles/Oo3SRd_94VE.json`
- Modify: `index.html`
- Modify: `src/video-subtitles.js`

- [ ] **Step 1: Build both draft Chinese tracks from public VTT**

Use the actual `zh-Hans` VTT filenames reported by each preparation summary:

```powershell
node tools\build-site-subtitles.cjs --video-id lLTbxhK_QLU --input .work\runs\lLTbxhK_QLU\data\subtitles.zh-Hans.vtt --language zh-CN --source site-owned-from-public-captions --review-status draft --updated-at 2026-08-17 --output assets\subtitles\lLTbxhK_QLU.json
node tools\build-site-subtitles.cjs --video-id Oo3SRd_94VE --input .work\runs\Oo3SRd_94VE\data\subtitles.zh-Hans.vtt --language zh-CN --source site-owned-from-public-captions --review-status draft --updated-at 2026-08-17 --output assets\subtitles\Oo3SRd_94VE.json
```

If the downloader emits a language-qualified filename with an additional suffix, pass that exact reported path; do not rename raw VTT into the repository.

- [ ] **Step 2: Review terminology against the English original tracks**

Correct product names, REAPER terms, synthesis vocabulary, material names, and sentence boundaries in the two JSON files while preserving cue start/end values. Keep `reviewStatus: "draft"` because the source is machine captioning and translation.

- [ ] **Step 3: Insert the two records and 23 image-manifest entries**

Add both record objects to the `records` array in `index.html`, immediately after the current final record. Add one manifest object per fixed key using this shape:

```json
"lLTbxhK_QLU-final-result": {
  "preview": "assets/shots/preview/lLTbxhK_QLU-final-result.webp",
  "full": "assets/shots/full/lLTbxhK_QLU-final-result.png"
}
```

Repeat with the matching paths for all 23 keys. Preserve the existing JSON boundary and CRLF style.

- [ ] **Step 4: Generate the 84-entry subtitle catalog**

```powershell
node tools\batch-site-subtitles.cjs catalog --index index.html --tracks assets\subtitles --overrides tools\data\subtitle-status-overrides.json --module src\video-subtitles.js --report .work\subtitle-coverage-report.json
```

Expected report: `total: 84`, `tracks: 77`, `missing: 7`, `noSpeech: 0`; cue total equals the previous 21,252 plus both new track cue counts.

- [ ] **Step 5: Run the focused test and verify GREEN except explicit old-count gates**

Run:

```powershell
node --test tests\magic-video-import.test.cjs tests\video-subtitles.test.cjs
```

Expected: the new batch contract and subtitle tests pass. Any remaining failures in other tests must be limited to hardcoded 82/924/847 coverage expectations.

## Task 6: Update Exact Coverage Gates And Skill Knowledge

**Files:**
- Modify: `tests/site-data.test.cjs`
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `tools/verify-portable-kit.cjs`
- Modify: `skills/sfx-knowledge/references/video-learnings.md`
- Modify: `skills/sfx-knowledge/references/site-video-memory.md`

- [ ] **Step 1: Update explicit record and timeline totals**

Change real-site record assertions from 82 to 84. Because the two frozen records add 23 timed, screenshot-backed steps, change `expectedSteps` from 924 to 947 and `expectedScreenshotSteps` from 847 to 870. Keep `expectedPublicCases` at 97 unless a new effect use is intentionally added to `tools/data/public-effect-use-ids.json`; ordinary record-local `effectUses` do not automatically become public effect profiles.

- [ ] **Step 2: Add both full learning blocks**

In `skills/sfx-knowledge/references/video-learnings.md`, add one independently searchable block per canonical URL. Each block must preserve all reviewed source roles, processing decisions, chain order, evidence boundaries, screenshots, and exact time starts. Do not include exercises or parameter recipes.

- [ ] **Step 3: Regenerate site memory**

Run: `node tools\export-site-memory.cjs`

Expected: `skills/sfx-knowledge/references/site-video-memory.md` contains 84 unique record sections and both new canonical source URLs.

- [ ] **Step 4: Run focused data and portable tests**

```powershell
node --test tests\magic-video-import.test.cjs tests\site-data.test.cjs tests\dual-index-site.test.cjs tests\video-subtitles.test.cjs tests\export-site-memory.test.cjs
node tools\verify-portable-kit.cjs
```

Expected: all focused tests pass; portable verification reports 84/84 reviewed records, 947/947 timed steps, 870/870 screenshot steps, 97/97 public cases, 84/84 subtitle catalog entries, 77 subtitle assets, and 84/84 site-memory entries.

- [ ] **Step 5: Commit the complete content batch**

```powershell
git add index.html src\video-subtitles.js assets\subtitles\lLTbxhK_QLU.json assets\subtitles\Oo3SRd_94VE.json assets\shots\full\lLTbxhK_QLU-*.png assets\shots\preview\lLTbxhK_QLU-*.webp assets\shots\full\Oo3SRd_94VE-*.png assets\shots\preview\Oo3SRd_94VE-*.webp tests\site-data.test.cjs tests\dual-index-site.test.cjs tools\verify-portable-kit.cjs skills\sfx-knowledge\references\video-learnings.md skills\sfx-knowledge\references\site-video-memory.md
git commit -m "content: add water and holy magic breakdowns"
```

## Task 7: Full Verification, Browser Acceptance, And Deployment

**Files:**
- Verify only, except a narrowly scoped test-first fix if verification exposes a defect.

- [ ] **Step 1: Run syntax and full automated verification**

```powershell
node --check src\video-subtitles.js
node --check src\youtube-caption-player.js
node --check tools\batch-site-subtitles.cjs
.\.venv\Scripts\python.exe -m py_compile tools\prepare-sfx-video.py
node --test tests\*.test.cjs
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
node tools\verify-portable-kit.cjs
git diff --check
```

Expected: zero Node failures, zero Python failures apart from any already documented platform skip, portable verification fully green, and no whitespace errors.

- [ ] **Step 2: Start a local static server**

Run the repository's existing local server command on an unused loopback port. If no project-specific command is running, use:

```powershell
.\.venv\Scripts\python.exe -m http.server 8891 --bind 127.0.0.1
```

Expected: `http://127.0.0.1:8891/` returns HTTP 200.

- [ ] **Step 3: Verify both detail routes in a real browser**

Open:

```text
http://127.0.0.1:8891/#video=yt-lLTbxhK_QLU
http://127.0.0.1:8891/#video=yt-Oo3SRd_94VE
```

At desktop 1440×900 and mobile 390×844, verify embedded playback, correct video ID, subtitle overlay, CC toggle, transcript seeking, site fullscreen subtitles, chapter navigation, all screenshots, lightbox, canonical source link, no overlaps, and no horizontal overflow. Capture browser screenshots as local acceptance evidence under ignored `.work/`.

- [ ] **Step 4: Inspect the final diff and prohibited-file boundary**

```powershell
git status --short
git diff --stat
git diff --check
```

Expected: only the approved spec/plan/test, two records, two subtitle JSON files, 46 screenshot assets, generated catalog/memory, and explicit count updates are present. No `.work`, VTT, video, audio, cookie, token, or absolute local path is staged.

- [ ] **Step 5: Push and verify GitHub Pages**

```powershell
git push origin main
```

After GitHub Pages deploys, open both public hash routes under `https://zhaoshangqi.github.io/sfx-knowledge-site/` with a cache-busting query. Verify HTTP 200, both records, both subtitle assets, embedded playback, and screenshot loading. Report the commit ID, test totals, coverage totals, and public URL.
