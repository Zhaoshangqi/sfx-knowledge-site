# In-Video Subtitle Overlay Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让本站整理的中文字幕始终显示在视频画面内，并在普通播放、站内全屏和移动端保持清晰可读；同时把字幕全文折叠收纳，避免页面出现重复字幕。

**Architecture:** 保留 YouTube iframe 负责视频播放，继续由 `YouTubeCaptionPlayer` 读取本站 WebVTT 并同步当前 cue。播放器舞台内只保留一个视觉字幕覆盖层，舞台外保留一个仅供辅助技术读取的 live region；完整字幕稿使用原生 `<details>` 折叠。字幕构建器在生成阶段把过长 cue 拆成不丢字、时间连续的短 cue，从数据源头约束两行显示。

**Tech Stack:** 静态 HTML/CSS、原生 JavaScript、YouTube IFrame API、WebVTT、Node.js `node:test`、Python `pytest`、Playwright 浏览器验收

---

**Approved specification:** `docs/superpowers/specs/2026-08-13-in-video-subtitle-overlay-design.md`

**Working directory:** `E:\zhaoshangqi\AI\.worktrees\sfx-knowledge-site\video-knowledge-dual-index`

**Branch:** `feature/video-knowledge-dual-index`

**Delivery target:** existing pull request [#1](https://github.com/Zhaoshangqi/sfx-knowledge-site/pull/1)

## Task 1: Render One Visual Caption Surface And A Collapsed Transcript

**Files:**
- Modify: `tests/youtube-caption-player.test.cjs:195-225`
- Modify: `src/youtube-caption-player.js:42-97`

- [ ] **Step 1: Add a failing render contract for the approved structure**

Extend the existing player render test so a video with a local subtitle track must contain:

- one `[data-caption-overlay]` inside `.video-player-stage`;
- one `[data-caption-line]` live region outside the stage;
- one closed `.video-transcript-disclosure` with summary text `字幕全文`;
- one `.video-transcript` list inside that disclosure;
- no `open` attribute on the `<details>` element.

Also extend the no-track render test so it confirms there is no transcript disclosure and no transcript cue button.

Use assertions shaped like:

```js
assert.match(html, /class="video-caption-overlay" data-caption-overlay/);
assert.match(html, /class="video-caption-line" data-caption-line aria-live="polite"/);
assert.match(html, /<details class="video-transcript-disclosure">/);
assert.match(html, /<summary>字幕全文<\/summary>/);
assert.match(html, /<ol class="video-transcript" aria-label="中文字幕全文">/);
assert.doesNotMatch(html, /<details class="video-transcript-disclosure"[^>]*\sopen(?:\s|>)/);
```

- [ ] **Step 2: Run the focused player test and confirm the intended failure**

Run:

```powershell
node --test tests\youtube-caption-player.test.cjs
```

Expected: FAIL because `.video-transcript-disclosure` and the `字幕全文` summary do not exist yet. Existing synchronization tests should remain green.

- [ ] **Step 3: Wrap the full transcript in a native closed disclosure**

In `render`, construct the transcript panel only when a track exists:

```js
var transcriptPanel = hasTrack
  ? '<details class="video-transcript-disclosure">' +
      '<summary>字幕全文</summary>' +
      '<ol class="video-transcript" aria-label="中文字幕全文">' + transcript + '</ol>' +
    '</details>'
  : '<p class="video-transcript-empty">这条视频尚未整理本站字幕。</p>';
```

Keep both synchronization targets, but give them distinct responsibilities:

- `[data-caption-overlay]`: the only visible current subtitle;
- `[data-caption-line]`: the `aria-live` status for screen readers;
- `.video-transcript`: the seekable full transcript, closed by default.

Do not add an `open` attribute and do not change cue seeking, CC state, YouTube lifecycle, or fullscreen behavior in this task.

- [ ] **Step 4: Re-run the focused test**

Run:

```powershell
node --test tests\youtube-caption-player.test.cjs
```

Expected: all player tests PASS.

- [ ] **Step 5: Commit the structural change**

```powershell
git add src/youtube-caption-player.js tests/youtube-caption-player.test.cjs
git commit -m "feat: collapse video transcript by default"
```

## Task 2: Show Site-Owned Subtitles Inside The Video At Every Viewport

**Files:**
- Modify: `tests/dry-goods-contract.test.cjs:1-55`
- Modify: `index.html:709-861`
- Modify: `index.html:1369-1380`

- [ ] **Step 1: Add a failing CSS contract for the normal overlay**

Add a focused test that reads the inline stylesheet and verifies the base `.video-caption-overlay` rule includes all approved invariants:

- `position: absolute`;
- horizontal centering with `left: 50%` and `transform: translateX(-50%)`;
- `bottom: clamp(56px, 10%, 84px)`;
- `max-width: 86%`;
- `font-size: 16px`;
- `pointer-events: none`;
- an opaque-enough translucent dark background;
- no ellipsis, line clamp, or hidden overflow that could discard text.

Assert that empty or disabled overlays are hidden:

```css
.video-caption-overlay:empty,
.subtitles-hidden .video-caption-overlay
```

Assert that `.video-caption-line` is visually hidden but remains in the accessibility tree with the 1px/clip pattern.

- [ ] **Step 2: Add failing responsive and transcript CSS contracts**

In the same test, verify:

- fullscreen overlay uses `bottom: clamp(72px, 8%, 112px)` and `font-size: 20px`;
- mobile normal overlay uses `font-size: 14px`;
- mobile fullscreen/landscape overlay uses `font-size: 16px`, including wide-but-short 844 x 390 viewports;
- `.video-transcript-disclosure` has a visible summary affordance;
- fullscreen hides `.video-transcript-disclosure` and `.video-transcript-empty`;
- normal `.video-player-stage` remains 16:9.

Keep these as source-level contracts rather than brittle full-style snapshots.

- [ ] **Step 3: Run the CSS contract and confirm the intended failure**

Run:

```powershell
node --test tests\dry-goods-contract.test.cjs
```

Expected: FAIL because the current base overlay is `display: none` and the current visible caption is below the player.

- [ ] **Step 4: Implement the base overlay and accessible live region styles**

Replace the hidden base overlay with the approved visual surface:

```css
.video-caption-overlay {
  position: absolute;
  left: 50%;
  bottom: clamp(56px, 10%, 84px);
  z-index: 4;
  display: block;
  width: max-content;
  max-width: 86%;
  margin: 0;
  padding: 6px 10px;
  border-radius: 4px;
  color: #fff;
  background: rgba(9, 11, 12, 0.76);
  transform: translateX(-50%);
  text-align: center;
  overflow-wrap: anywhere;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.75);
  font-size: 16px;
  line-height: 1.45;
  font-weight: 800;
  pointer-events: none;
}

.video-caption-overlay:empty,
.subtitles-hidden .video-caption-overlay {
  display: none;
}

.video-caption-line {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

Do not use `-webkit-line-clamp`, `text-overflow: ellipsis`, or a fixed height. The cue-length task below is responsible for keeping subtitles within two practical lines without hiding text.

- [ ] **Step 5: Style the collapsed transcript as a compact utility region**

Add restrained styles for:

```css
.video-transcript-disclosure
.video-transcript-disclosure > summary
.video-transcript-disclosure[open] > summary
.video-transcript
```

The summary must remain a standard keyboard-operable disclosure, use the existing border/color tokens, and read as a compact row rather than a new card. Remove the transcript list's duplicate top border when it sits inside the disclosure.

- [ ] **Step 6: Implement fullscreen and mobile overlay rules**

Use the approved fullscreen values:

```css
.video-player:fullscreen .video-caption-overlay {
  bottom: clamp(72px, 8%, 112px);
  max-width: 84%;
  padding: 8px 12px;
  font-size: 20px;
}

.video-player:fullscreen .video-transcript-disclosure,
.video-player:fullscreen .video-transcript-empty {
  display: none;
}
```

Within the existing mobile media query, use:

```css
.video-caption-overlay {
  bottom: clamp(44px, 12%, 64px);
  max-width: 92%;
  font-size: 14px;
}

.video-player:fullscreen .video-caption-overlay {
  bottom: clamp(56px, 10%, 80px);
  max-width: 92%;
  font-size: 16px;
}
```

The existing mobile query stops at 640 px, so add an explicit short-landscape rule for phones whose CSS viewport is wider than that:

```css
@media (orientation: landscape) and (max-height: 520px) {
  .video-caption-overlay,
  .video-player:fullscreen .video-caption-overlay {
    bottom: clamp(48px, 12%, 72px);
    max-width: 92%;
    font-size: 16px;
  }
}
```

Keep this rule after the base fullscreen rule so the short landscape viewport receives the intended phone size.

Preserve the existing player header, controls, stable stage dimensions, and site fullscreen wrapper.

- [ ] **Step 7: Run focused CSS and player regressions**

Run:

```powershell
node --test tests\dry-goods-contract.test.cjs tests\youtube-caption-player.test.cjs
```

Expected: all tests PASS.

- [ ] **Step 8: Commit the visible overlay change**

```powershell
git add index.html tests/dry-goods-contract.test.cjs
git commit -m "feat: show site subtitles inside video"
```

## Task 3: Bound Generated Cue Length Without Dropping Subtitle Text

**Files:**
- Modify: `tests/build-site-subtitles.test.cjs:196-288`
- Modify: `tests/video-subtitles.test.cjs`
- Modify: `tools/build-site-subtitles.cjs:16-21`
- Modify: `tools/build-site-subtitles.cjs:151-241`

- [ ] **Step 1: Add a failing unit test for one overlong source cue**

Create a source cue longer than 48 Unicode code points and assert that `compactCues`:

- returns more than one cue;
- keeps every cue at or below 48 code points using `Array.from(cue.text).length`;
- preserves the first start and final end;
- emits ordered, non-overlapping, contiguous timings;
- preserves all non-whitespace source text in the same order.

Normalize only whitespace in the preservation assertion:

```js
const normalize = (value) => value.replace(/\s+/gu, "");
assert.equal(normalize(result.map((cue) => cue.text).join("")), normalize(sourceText));
```

Also lower the existing dense-short-run assertion from 80 to 48 characters.

- [ ] **Step 2: Run the converter test and confirm the intended failure**

Run:

```powershell
node --test tests\build-site-subtitles.test.cjs
```

Expected: FAIL because a single long source cue currently survives unsplit and merge logic allows up to 80 characters.

- [ ] **Step 3: Introduce one display-length constant and punctuation-aware splitting**

Replace the merge-only limit with a shared display contract:

```js
const MAX_DISPLAY_TEXT_LENGTH = 48;
const MAX_MERGED_TEXT_LENGTH = MAX_DISPLAY_TEXT_LENGTH;
```

Add `splitTextForDisplay(text)` that:

1. counts Unicode code points with `Array.from`;
2. prefers the last whitespace or Chinese/English punctuation boundary between 60% and 100% of the 48-character limit;
3. hard-splits at 48 when no useful boundary exists;
4. trims boundary whitespace only;
5. never drops punctuation or non-whitespace text.

Suggested implementation shape:

```js
function splitTextForDisplay(text) {
  const remaining = Array.from(text);
  const parts = [];
  const minimumBoundary = Math.floor(MAX_DISPLAY_TEXT_LENGTH * 0.6);

  while (remaining.length > MAX_DISPLAY_TEXT_LENGTH) {
    let cut = MAX_DISPLAY_TEXT_LENGTH;
    for (let index = MAX_DISPLAY_TEXT_LENGTH; index >= minimumBoundary; index -= 1) {
      if (/[\s，。！？；：、,.!?;:]/u.test(remaining[index - 1])) {
        cut = index;
        break;
      }
    }

    const part = remaining.splice(0, cut).join("").trim();
    if (part) parts.push(part);
    while (remaining[0] && /\s/u.test(remaining[0])) remaining.shift();
  }

  const tail = remaining.join("").trim();
  if (tail) parts.push(tail);
  return parts;
}
```

- [ ] **Step 4: Split cue duration proportionally and preserve boundaries**

Add `splitCueForDisplay(cue)` after text splitting. Divide the original cue duration according to each part's code-point length, force the first part to start at the original start, and force the last part to end at the original end:

```js
function splitCueForDisplay(cue) {
  const parts = splitTextForDisplay(cue.text);
  if (parts.length <= 1) return [cue];

  const weights = parts.map((part) => Array.from(part).length);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const duration = cue.end - cue.start;
  let consumedWeight = 0;

  return parts.map((text, index) => {
    const start = index === 0
      ? cue.start
      : cue.start + (duration * consumedWeight / totalWeight);
    consumedWeight += weights[index];
    const end = index === parts.length - 1
      ? cue.end
      : cue.start + (duration * consumedWeight / totalWeight);
    return { start, end, text };
  });
}
```

Apply this after normalization/non-overlap and before adjacent-cue merging:

```js
const displayCues = nonoverlapping.flatMap(splitCueForDisplay);
```

Run the existing merge loop over `displayCues`, not `nonoverlapping`. Preserve all current invalid-time and overlap safeguards.

This changes only cue compaction behavior. Keep the existing WebVTT schema, manifest fields, subtitle review status, and source provenance unchanged.

- [ ] **Step 5: Run the converter tests**

Run:

```powershell
node --test tests\build-site-subtitles.test.cjs
```

Expected: all converter tests PASS, including text preservation and timing continuity.

- [ ] **Step 6: Add a published-track regression**

In `tests/video-subtitles.test.cjs`, assert every cue in the committed `Xl5u91oQv-k` track is at most 48 Unicode code points. Keep the existing cue-count, monotonic-time, source-kind, and manifest checks intact.

This test documents the display contract for real shipped data without regenerating or inventing any missing subtitles.

- [ ] **Step 7: Run subtitle data and converter tests together**

Run:

```powershell
node --test tests\build-site-subtitles.test.cjs tests\video-subtitles.test.cjs
```

Expected: all tests PASS.

- [ ] **Step 8: Commit the generation safeguard**

```powershell
git add tools/build-site-subtitles.cjs tests/build-site-subtitles.test.cjs tests/video-subtitles.test.cjs
git commit -m "fix: keep generated subtitles within overlay limits"
```

## Task 4: Verify Integration, Accessibility, And Browser Behavior

**Files:**
- Modify if a missing contract is discovered: `tests/dual-index-site.test.cjs:2216-2285`
- Modify only for verified defects: files covered by Tasks 1-3

- [ ] **Step 1: Run syntax checks**

Run:

```powershell
node --check src\youtube-caption-player.js
node --check tools\build-site-subtitles.cjs
```

Expected: both commands exit 0 with no syntax errors.

- [ ] **Step 2: Run the full Node test suite**

Run:

```powershell
node --test "tests\*.test.cjs"
```

Expected: zero failures. Record the exact pass/total counts for delivery rather than relying on an older count.

- [ ] **Step 3: Run the Python test suite**

Run:

```powershell
python -m pytest tests
```

Expected: zero failures. Record the exact pass count.

- [ ] **Step 4: Verify the portable package**

Run:

```powershell
node tools\verify-portable-kit.cjs
```

Expected: JSON reports `"ok": true`; record the current record count and verified/total count.

- [ ] **Step 5: Check patch hygiene**

Run:

```powershell
git diff --check
git status --short
```

Expected: no whitespace errors and only intentional source/test/doc changes. Do not stage media, browser cookies, `.work`, secrets, or generated scratch files.

- [ ] **Step 6: Start a local static server on a free port**

First verify whether `http://127.0.0.1:8891/` already serves this exact worktree. If ownership is uncertain or the port is occupied by another checkout, start a hidden server on 8892:

```powershell
Start-Process -FilePath python -ArgumentList @('-m','http.server','8892','--bind','127.0.0.1') -WorkingDirectory 'E:\zhaoshangqi\AI\.worktrees\sfx-knowledge-site\video-knowledge-dual-index' -WindowStyle Hidden
```

Open:

```text
http://127.0.0.1:8892/#video=yt-Xl5u91oQv-k
```

- [ ] **Step 7: Perform desktop browser acceptance at 1440 x 900**

Verify with Playwright or the in-app browser:

- the cover remains lazy and does not create an iframe before play;
- after play, the current Chinese cue appears inside the video stage;
- the old visible duplicate line below the stage is absent;
- the overlay stays above YouTube controls and does not intercept clicks;
- cues wrap to no more than two practical lines and no text is truncated;
- CC off clears the overlay and CC on restores synchronization;
- `字幕全文` is closed by default, expands by mouse and keyboard, and cue clicks seek;
- entering site fullscreen keeps the same synchronized overlay in the fullscreen wrapper;
- fullscreen hides the transcript disclosure;
- no console errors and no horizontal overflow appear.

Capture one normal and one fullscreen screenshot as temporary QA evidence; do not commit those screenshots unless the repository already has an explicit approved artifact location.

- [ ] **Step 8: Perform mobile acceptance at 390 x 844 and 844 x 390**

Verify:

- portrait subtitles use the smaller size and stay within 92% width;
- landscape/fullscreen subtitles remain readable above controls;
- title, player controls, subtitle overlay, and disclosure do not overlap incoherently;
- the 16:9 normal stage does not resize when cue text changes;
- no horizontal scroll is introduced.

- [ ] **Step 9: Verify the no-track state**

Open a video whose subtitle status is `中文字幕整理中` and verify:

- CC remains disabled;
- no empty subtitle background is rendered;
- the incomplete-state message remains explicit;
- no fabricated transcript or cue buttons appear.

- [ ] **Step 10: Fix only defects reproduced during acceptance**

For every defect, first add the narrowest failing automated test, confirm it fails for the observed reason, make the smallest implementation change, and rerun the focused test plus the full suite. Commit any resulting correction separately with a message describing the behavior fixed.

- [ ] **Step 11: Request specification and code-quality review gates**

Use independent review passes:

1. specification review against every bullet in `docs/superpowers/specs/2026-08-13-in-video-subtitle-overlay-design.md`;
2. code-quality review for synchronization, accessibility, responsive CSS, cue splitting, and regression coverage.

Resolve actionable findings with tests before delivery. Review claims alone are not completion evidence.

- [ ] **Step 12: Run final verification after all review fixes**

Repeat:

```powershell
node --check src\youtube-caption-player.js
node --check tools\build-site-subtitles.cjs
node --test "tests\*.test.cjs"
python -m pytest tests
node tools\verify-portable-kit.cjs
git diff --check
git status -sb
```

Expected: every check passes and the branch contains only intentional commits.

- [ ] **Step 13: Push the completed branch and update the existing PR**

Run:

```powershell
git push origin feature/video-knowledge-dual-index
```

Confirm the pushed head matches local `HEAD` and PR #1 shows the subtitle-overlay commits. Report the exact commit IDs, test counts, browser viewport results, portable verification count, branch-sync state, and PR URL.

## Plan Self-Review

- [ ] Every approved normal, fullscreen, desktop, portrait-mobile, and landscape-mobile state has an implementation step and browser acceptance check.
- [ ] The plan retains a single visible subtitle surface while preserving an accessible live region.
- [ ] Transcript collapse and cue seeking are covered without adding custom disclosure JavaScript.
- [ ] No-track behavior remains explicit and no subtitle text is invented.
- [ ] Cue splitting preserves text and timing boundaries and is tested with Unicode-aware counts.
- [ ] Cue compaction changes do not alter the WebVTT format, manifest schema, review status, or provenance.
- [ ] The plan introduces no subtitle position, font, color, or YouTube translation settings.
- [ ] Test commands use the repository's current Node, Python, and portable verification entry points.
- [ ] Delivery updates the existing PR instead of creating a duplicate.
