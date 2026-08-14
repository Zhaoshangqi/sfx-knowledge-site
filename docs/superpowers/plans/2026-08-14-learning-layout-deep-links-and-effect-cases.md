# Learning Layout Deep Links And Complete Effect Cases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the player first, provide sticky chapter-driven reading, make every verified step/screenshot/effect use seekable, split quick conclusions from complete evidence, and render all 97 public effect cases with strict screenshot ownership.

**Architecture:** Existing hash routing gains validated `t` and `section` parameters. The player controller owns queued and active seeking while the page owns route transitions. Video detail becomes a stable player-first two-column shell with a small navigation controller and native evidence disclosures. Effect detail renders cases from `profile.uses`, joining strict visuals by `useId` instead of treating a capped visual gallery as the case list.

**Tech Stack:** Static HTML/CSS, vanilla JavaScript, UMD/CommonJS helpers, YouTube IFrame API, Node.js `node:test`, Playwright/browser acceptance.

**Prerequisites and order:** Execute `2026-08-14-timeline-review-and-data.md` first, then `2026-08-14-transcript-paragraphs-and-glossary.md`, then this plan. The timeline coverage gates must be green before Task 9, and this plan owns final integration, delivery, and public-site verification.

---

## File Structure

- Create `src/detail-navigation.js`: section whitelist, disclosure opening, scroll/focus behavior, and scrollspy lifecycle.
- Create `tests/detail-navigation.test.cjs`: section normalization, click behavior, observer state, and cleanup.
- Modify `src/youtube-caption-player.js`: queued `seekTo`, user-triggered `playAt`, activation callback, and stable initial start.
- Modify `tests/youtube-caption-player.test.cjs`: pre-ready, ready, blocked-autoplay, and destroy behavior.
- Modify `index.html`: module loading, deep-link routing, video information architecture, complete effect cases, event delegation, and responsive CSS.
- Modify `tests/dual-index-site.test.cjs`: routes, complete cases, detail order, folding, jump controls, chapter navigation, and CSS contracts.
- Modify `tests/dry-goods-contract.test.cjs`: preserve all factual content and no-course/no-parameter quick-reference boundaries.
- Modify `tools/verify-portable-kit.cjs`: assert final route modules and public case render coverage.
- Modify `docs/learning-workflow.md`: document deep-link and evidence hierarchy contracts.

## Task 1: Validated Time And Section Hash Routes

**Files:**
- Modify: `index.html:32167-32232`
- Modify: `tests/dual-index-site.test.cjs:1812-1837`

- [ ] **Step 1: Write failing parse and serialize tests**

```js
test('supports validated video time and section deep links', () => {
  assert.deepEqual(plainValue(nav.parseHashRouteHash('#video=video-a&t=42&section=steps&origin=effects')), {
    video: 'video-a', effect: '', view: '', origin: 'effects', time: 42, section: 'steps'
  });
  assert.equal(nav.serializeHashRoute({ video: 'video-a', time: 42.8, section: 'steps', origin: 'effects' }),
    '#video=video-a&origin=effects&t=42&section=steps');
});

test('drops invalid time and section values without breaking legacy routes', () => {
  assert.equal(nav.parseHashRouteHash('#video=video-a&t=-1&section=unknown').time, null);
  assert.equal(nav.parseHashRouteHash('#video=video-a&t=Infinity').section, '');
  assert.equal(nav.serializeHashRoute({ effect: 'use-a', time: 20 }), '#effect=use-a');
  assert.equal(nav.serializeHashRoute({ view: 'effects' }), '#view=effects');
});
```

- [ ] **Step 2: Run the route tests and verify the missing fields failure**

Run: `node --test --test-name-pattern="time and section|stable video and effect hash" tests\dual-index-site.test.cjs`

Expected: FAIL because the current route omits `time` and `section`.

- [ ] **Step 3: Add fixed section and time normalization**

Inside `DualIndexNavigation`:

```js
const sectionIds = new Set(['quick', 'steps', 'effects', 'glossary', 'transcript', 'evidence']);

function normalizeTime(value) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.floor(number) : null;
}

function normalizeSection(value) {
  return sectionIds.has(value) ? value : '';
}
```

Return `time` and `section` from `parseHashRouteHash()`. Serialize them only when a valid `video` route exists, preserving canonical parameter order `video`, `origin`, `t`, `section`.

- [ ] **Step 4: Carry time and section through `routeDecision()`**

Video decisions return `{ target, id, mode, returnMode, time, section }`. Effect and library decisions return `time: null` and `section: ''` so stale values cannot leak between views.

- [ ] **Step 5: Run route tests**

Run: `node --test --test-name-pattern="route|deep link" tests\dual-index-site.test.cjs`

Expected: all matching tests PASS.

- [ ] **Step 6: Commit deep-link routing**

```powershell
git add index.html tests\dual-index-site.test.cjs
git commit -m "feat: add video time and section routes"
```

## Task 2: Public Player Seek Controller

**Files:**
- Modify: `src/youtube-caption-player.js:230-661`
- Modify: `tests/youtube-caption-player.test.cjs:554-1036`

- [ ] **Step 1: Write failing queued-seek tests**

```js
test('seekTo queues a valid time before activation and applies it on ready', async () => {
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));
  assert.equal(controller.seekTo(42), true);
  assert.equal(runtime.getPlayerConfig(), null);
  fixture.cover.dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();
  assert.deepEqual(runtime.calls.seek, [[42, true]]);
  controller.destroy();
});

test('playAt activates, seeks, and plays from a user action', async () => {
  const request = controller.playAt(31);
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();
  await request;
  assert.deepEqual(runtime.calls.seek.at(-1), [31, true]);
  assert.equal(runtime.calls.play, 1);
});
```

- [ ] **Step 2: Write failing validation, callback, and destroyed-state tests**

Assert `seekTo(-1)`, `seekTo(Infinity)`, and `playAt('12')` fail closed; `onActivationChange(true)` fires once when a player becomes ready; and both methods return false or reject after destroy without touching the old player.

- [ ] **Step 3: Run focused tests and verify the controller API failure**

Run: `node --test --test-name-pattern="seekTo|playAt|activation" tests\youtube-caption-player.test.cjs`

Expected: FAIL because only `destroy()` is currently public.

- [ ] **Step 4: Implement pending start state and a shared seek helper**

```js
var pendingStartSeconds = Number.isFinite(options.startSeconds) && options.startSeconds >= 0
  ? Math.floor(options.startSeconds) : null;
var onActivationChange = typeof options.onActivationChange === 'function'
  ? options.onActivationChange : null;

function applyPendingSeek(activePlayer) {
  if (pendingStartSeconds == null || !activePlayer || typeof activePlayer.seekTo !== 'function') return;
  activePlayer.seekTo(pendingStartSeconds, true);
}
```

`seekTo(seconds)` validates, stores the integer, applies immediately when ready, synchronizes captions, and returns a boolean. It does not create an iframe.

- [ ] **Step 5: Implement `playAt(seconds)` through the existing activation promise**

```js
function playAt(seconds) {
  if (!seekTo(seconds)) return Promise.reject(new TypeError('seconds must be finite and non-negative'));
  return activate().then(function (activePlayer) {
    if (destroyed) throw new Error('player has been destroyed');
    applyPendingSeek(activePlayer);
    if (typeof activePlayer.playVideo === 'function') activePlayer.playVideo();
    synchronize();
    return activePlayer;
  });
}
```

Call `applyPendingSeek(player)` during `onReady`, then safely call `onActivationChange(true)`. The initial deep-link cover text is updated to `从 MM:SS 播放` before activation.

- [ ] **Step 6: Export the expanded frozen controller**

```js
return Object.freeze({
  destroy: destroy,
  playAt: playAt,
  seekTo: seekTo
});
```

Keep the existing destroy body as the named `destroy()` function and clear pending state and callbacks there.

- [ ] **Step 7: Run the full player test file and commit**

```powershell
node --check src\youtube-caption-player.js
node --test tests\youtube-caption-player.test.cjs
git add src\youtube-caption-player.js tests\youtube-caption-player.test.cjs
git commit -m "feat: expose verified player seeking"
```

Expected: all tests PASS.

## Task 3: Detail Chapter Navigation Controller

**Files:**
- Create: `src/detail-navigation.js`
- Create: `tests/detail-navigation.test.cjs`
- Modify: `index.html:1601-1607`

- [ ] **Step 1: Write failing normalization and disclosure tests**

```js
const navigation = require('../src/detail-navigation.js');

test('normalizes only approved detail section ids', () => {
  assert.equal(navigation.normalizeSection('steps'), 'steps');
  assert.equal(navigation.normalizeSection('unknown'), '');
});

test('revealSection opens ancestor details before focus and scroll', () => {
  const fixture = buildSectionFixture();
  assert.equal(navigation.revealSection(fixture.root, 'evidence'), true);
  assert.equal(fixture.details.open, true);
  assert.equal(fixture.heading.focusCalls, 1);
  assert.equal(fixture.heading.scrollCalls, 1);
});
```

- [ ] **Step 2: Write failing mount lifecycle tests**

Assert nav clicks prevent default, set `aria-current="location"`, use injected `IntersectionObserver`, respect reduced motion, and `destroy()` removes every listener and disconnects the observer.

- [ ] **Step 3: Run tests and verify the missing module failure**

Run: `node --test tests\detail-navigation.test.cjs`

Expected: FAIL with `Cannot find module '../src/detail-navigation.js'`.

- [ ] **Step 4: Implement the UMD controller**

Export:

```js
return Object.freeze({
  mount: mount,
  normalizeSection: normalizeSection,
  revealSection: revealSection
});
```

`mount(navRoot, contentRoot, options)` finds `[data-section-target]` links and `[data-detail-section]` targets, observes only targets that exist, updates one `aria-current`, and returns a frozen `{ reveal(id), destroy() }` controller.

- [ ] **Step 5: Load the module before inline application code**

```html
<script src="src/detail-navigation.js?v=20260814-detail-nav-1"></script>
```

Place it after `youtube-caption-player.js` and before the inline app.

- [ ] **Step 6: Run tests and commit**

```powershell
node --check src\detail-navigation.js
node --test tests\detail-navigation.test.cjs
git add src\detail-navigation.js tests\detail-navigation.test.cjs index.html
git commit -m "feat: add detail chapter navigation"
```

Expected: all tests PASS.

## Task 4: Player-First Quick Conclusion Layout

**Files:**
- Modify: `index.html:564-920`
- Modify: `index.html:33260-33379`
- Modify: `tests/dual-index-site.test.cjs:2215-2269`
- Modify: `tests/dry-goods-contract.test.cjs`

- [ ] **Step 1: Write failing information-order tests**

```js
test('video detail puts the player before quick conclusions and folded evidence', () => {
  const source = sourceSlice('function renderDetail() {', 'function renderEffectDetail(effectId) {');
  assert.ok(source.indexOf('video-study-rail') < source.indexOf('detail-quick'));
  assert.ok(source.indexOf('detail-quick') < source.indexOf('detail-section-nav'));
  assert.ok(source.indexOf('detail-section-nav') < source.indexOf('complete-evidence'));
  assert.match(source, /<details[^>]*class="evidence-disclosure"/);
});
```

- [ ] **Step 2: Write failing content-preservation tests**

For each real record, assert the rendered quick area contains `summary`, at most three complete `coreIdeas`, and every step name/time. Assert the folded evidence output still contains every cleaned `coreIdea`, step detail, parameter clue, chain focus, tip, source URL, and evidence boundary exactly once.

- [ ] **Step 3: Run focused tests and verify current order failure**

Run: `node --test --test-name-pattern="player|quick|folded|complete evidence" tests\dual-index-site.test.cjs tests\dry-goods-contract.test.cjs`

Expected: FAIL because the current player follows long design-thought content and evidence is always expanded.

- [ ] **Step 4: Add focused rendering helpers**

Define these functions before `renderDetail()`:

```js
function renderQuickConclusion(record) {
  const ideas = VideoDetailData.array(record.coreIdeas).slice(0, 3);
  return '<section class="detail-quick" data-detail-section="quick">' +
    '<h3 tabindex="-1">快速结论</h3><p class="detail-summary">' + escapeHtml(record.summary) + '</p>' +
    (ideas.length ? '<ul class="quick-decisions">' + ideas.map((idea) =>
      '<li>' + escapeHtml(idea) + '</li>').join('') + '</ul>' : '') + '</section>';
}

function renderStepTimeline(record) {
  return '<section class="step-timeline-section" data-detail-section="steps">' +
    '<h3 tabindex="-1">处理链速览</h3><ol class="step-timeline">' + record.steps.map((step, index) => {
      const seconds = SfxVideoTimeline.stepStart(record, index);
      if (!Number.isFinite(seconds) || seconds < 0) {
        return '<li><span class="step-time-unavailable"><span>' + escapeHtml(step.name) +
          '</span><span>时间待复核</span></span></li>';
      }
      return '<li><button type="button" class="step-time-link" data-seek-seconds="' + seconds +
        '" data-section="steps" aria-label="播放步骤 ' + escapeAttr(step.name) + '，' +
        escapeAttr(SfxVideoTimeline.formatTime(seconds)) + '"><span>' + escapeHtml(step.name) +
        '</span><time>' + escapeHtml(SfxVideoTimeline.formatTime(seconds)) + '</time></button></li>';
    }).join('') + '</ol></section>';
}

function renderCompleteEvidence(record, fullStepHtml, chainHtml, sourceHtml) {
  const fullIdeas = VideoDetailData.array(record.coreIdeas).map((idea) =>
    '<div class="learning-point">' + escapeHtml(idea) + '</div>').join('');
  const groups = [
    ['完整设计思路', fullIdeas],
    ['逐步制作过程与截图', fullStepHtml],
    ['完整效果链与参数线索', chainHtml],
    ['限制、证据边界与来源', sourceHtml]
  ].filter((group) => group[1]);
  return '<section class="complete-evidence" data-detail-section="evidence"><h3 tabindex="-1">完整证据</h3>' +
    groups.map((group) => '<details class="evidence-disclosure"><summary>' + escapeHtml(group[0]) +
      '</summary><div class="evidence-disclosure-body">' + group[1] + '</div></details>').join('') + '</section>';
}

function renderSectionNavigation(sections) {
  return '<nav class="detail-section-nav" aria-label="本案例章节">' + sections.filter((section) =>
    section.present).map((section) => '<a href="#' + escapeAttr(section.id) + '" data-section-target="' +
    escapeAttr(section.id) + '">' + escapeHtml(section.label) + '</a>').join('') + '</nav>';
}

function videoDetailSections(record, glossaryTerms, subtitleEntry) {
  return [
    { id: 'quick', label: '快速结论', present: true },
    { id: 'steps', label: '处理步骤', present: record.steps.length > 0 },
    { id: 'effects', label: '效果器用法', present: effectUses.some((use) => use.sourceRecordId === record.id) },
    { id: 'glossary', label: '术语', present: glossaryTerms.length > 0 },
    { id: 'transcript', label: '字幕', present: subtitleEntry?.contentStatus === 'track' },
    { id: 'evidence', label: '证据与来源', present: true }
  ];
}
```

`renderQuickConclusion()` uses only `summary` plus the first three complete `coreIdeas`. `renderStepTimeline()` renders all steps as compact links with `SfxVideoTimeline.formatTime(step.startSeconds)`. `renderCompleteEvidence()` produces separate native disclosures for full ideas, steps/screenshots, chain/parameter facts, and limitations/sources.

- [ ] **Step 5: Render the new stable shell**

The render string after title/meta must use this exact order:

```js
'<div class="detail-learning-layout">' +
  '<aside class="video-study-rail" data-player-rail>' + playerHtml + '</aside>' +
  '<div class="detail-learning-content">' +
    quickHtml + navigationHtml + timelineHtml + effectHtml +
    '<div data-glossary-anchor>' + glossaryHtml + '</div>' +
    '<section class="transcript-section" data-detail-section="transcript"><h3 tabindex="-1">字幕</h3>' +
      '<div data-video-transcript-root></div></section>' + evidenceHtml +
  '</div></div>'
```

Do not nest section cards. Use separators and constrained text width.

- [ ] **Step 6: Mount player, transcript, glossary callback, and navigation once**

Add `let activeDetailNavigation = null;`. Destroy it beside the active player on every route change. Pass `transcriptRoot`, route start time, `onTrackLoaded`, and `onActivationChange` to the player. After mount, create one `SfxDetailNavigation.mount()` controller and reveal the route section after the reader is visible.

- [ ] **Step 7: Run detail and dry-goods tests**

```powershell
node --test tests\dual-index-site.test.cjs tests\dry-goods-contract.test.cjs
```

Expected: all tests PASS and no factual field disappears.

- [ ] **Step 8: Commit the new information architecture**

```powershell
git add index.html tests\dual-index-site.test.cjs tests\dry-goods-contract.test.cjs
git commit -m "feat: add player-first evidence reading layout"
```

## Task 5: Step, Screenshot, Effect, And Transcript Time Jumps

**Files:**
- Modify: `index.html:33304-33379`
- Modify: `index.html:33580-33630`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing control coverage tests**

For every real record assert:

```js
assert.equal((markup.match(/data-step-time=/g) || []).length, record.steps.length);
assert.equal((markup.match(/data-seek-seconds=/g) || []).length >= record.steps.length, true);
record.steps.filter((step) => step.imageKey).forEach((step) => {
  assert.match(markup, new RegExp('data-image-key="' + escapeRegex(step.imageKey) + '"[\\s\\S]*?data-screenshot-time'));
});
```

Also assert each published video-detail effect use and every transcript paragraph has a seek control.

- [ ] **Step 2: Write failing same-video and cross-route behavior tests**

Same-video controls must call `activeVideoPlayer.playAt(seconds)` and update the hash with `replaceState`. Cross-video effect controls must call `openVideoDetail(recordId, true, { time, section: 'effects' })`, preserve `origin=effects`, and queue the start time without acting on the old player.

- [ ] **Step 3: Run focused tests and verify missing control failures**

Run: `node --test --test-name-pattern="time jump|seek|screenshot time" tests\dual-index-site.test.cjs`

Expected: FAIL because current controls only open videos or lightboxes.

- [ ] **Step 4: Render separate image and time controls**

Never nest a button inside `.step-shot`. Use:

```html
<div class="step-visual">
  <button class="step-shot" type="button" data-image-key="shot-a" aria-label="放大步骤截图">
    <img src="assets/shots/preview/shot-a.jpg" alt="步骤截图" loading="lazy" decoding="async">
  </button>
  <button class="time-jump" type="button" data-seek-seconds="42" data-screenshot-time>
    <span aria-hidden="true">▶</span><span>00:42</span>
  </button>
</div>
```

Step headings and effect summaries use the same `.time-jump` control with distinct accessible names.

- [ ] **Step 5: Handle time controls before lightbox controls**

At the start of the detail click handler:

```js
const seekControl = target.closest ? target.closest('[data-seek-seconds]') : null;
if (seekControl) {
  const seconds = Number(seekControl.dataset.seekSeconds);
  if (Number.isFinite(seconds) && seconds >= 0 && activeVideoPlayer) {
    activeVideoPlayer.playAt(seconds).catch(() => {});
    writeHashRoute({ video: state.activeId, time: seconds, section: seekControl.dataset.section || 'steps',
      origin: state.returnMode === 'effects' ? 'effects' : '' }, true);
  }
  return;
}
```

Cross-route `[data-open-video]` controls read `data-seek-seconds` and pass it to `openVideoDetail()` before this same-video branch.

- [ ] **Step 6: Respect deep-link autoplay limits**

On page-load routes, call `activeVideoPlayer.seekTo(route.time)` but do not call `playAt()`. The cover reads `从 MM:SS 播放`. Only a user click calls `playAt()`.

- [ ] **Step 7: Run route, player, and detail tests**

```powershell
node --test tests\youtube-caption-player.test.cjs tests\dual-index-site.test.cjs
```

Expected: all tests PASS.

- [ ] **Step 8: Commit all verified jump controls**

```powershell
git add index.html tests\dual-index-site.test.cjs
git commit -m "feat: connect evidence to verified video times"
```

## Task 6: Render All Public Effect Cases

**Files:**
- Modify: `index.html:32620-32670`
- Modify: `index.html:33381-33458`
- Modify: `tests/dual-index-site.test.cjs:1942-2067`

- [ ] **Step 1: Replace capped-gallery expectations with full-case tests**

```js
test('effect detail renders every profile use exactly once', () => {
  const markup = renderEffectDetailFixture(profile);
  assert.equal((markup.match(/class="effect-case"/g) || []).length, profile.uses.length);
  profile.uses.forEach((use) => {
    assert.equal((markup.match(new RegExp('data-effect-case-id="' + escapeRegex(use.id) + '"', 'g')) || []).length, 1);
  });
});

test('real public profiles expose all 97 cases instead of 34 strict visuals', () => {
  const profiles = EffectIndexData.profiles(effectUses, records, pluginReferenceCatalog, imageManifest);
  assert.equal(profiles.reduce((sum, profile) => sum + profile.uses.length, 0), 97);
  assert.equal(profiles.reduce((sum, profile) => sum + renderedCaseCount(profile), 0), 97);
});
```

- [ ] **Step 2: Add screenshot ownership and missing-image tests**

Assert a case gets only a `kind === 'video'` visual whose `useId` matches exactly. Cases without one render `本案例暂无对应截图`. Official visuals may appear once in the profile-level interface reference, never inside a case. Parameter arrays and numeric settings must not appear in effect quick-reference markup.

- [ ] **Step 3: Run focused effect tests and verify current representative-case failure**

Run: `node --test --test-name-pattern="every profile use|all 97|effect detail|screenshot ownership" tests\dual-index-site.test.cjs`

Expected: FAIL because current detail uses `visuals[0]` plus `visuals.slice(1)`.

- [ ] **Step 4: Remove the three-visual collection cap without weakening matching**

Change only:

```js
if (!visual) return;
```

Keep exact alias, step-title, unique ownership, composite-name rejection, generic-name rejection, and evidence-use-first rules unchanged.

- [ ] **Step 5: Build one case projection per use**

```js
function effectCaseForUse(profile, use) {
  const { sourceRecord, sourceStep } = sourceStepFor(use);
  const visual = profile.visuals.find((item) => item.kind === 'video' && item.useId === use.id) || null;
  const startSeconds = SfxVideoTimeline.effectStart(sourceRecord, use);
  return { use, sourceRecord, sourceStep, visual, startSeconds };
}
```

Sort the evidence use first, then source record update time descending, then time ascending.

- [ ] **Step 6: Render profile header coverage and all cases**

Coverage text is computed from projections: video count, use count, timed count, and exact screenshot count. Every case shows source title, step name, target, purpose, result, time control, strict screenshot or truthful missing state, evidence labels, and limitations. No parameter list is rendered.

- [ ] **Step 7: Keep one profile-level interface reference**

Choose an official visual from `profile.visuals` when available; otherwise retain the evidence-use video visual. Label it explicitly as `官方界面对照` or `视频操作截图` so the user never confuses product reference with case evidence.

- [ ] **Step 8: Run the complete effect test set**

Run: `node --test tests\effect-guides.test.cjs tests\knowledge-model.test.cjs tests\dual-index-site.test.cjs`

Expected: 27 profiles, 97 rendered cases, strict screenshot tests PASS, and no parameter-information regression.

- [ ] **Step 9: Commit complete effect cases**

```powershell
git add index.html tests\dual-index-site.test.cjs
git commit -m "feat: show every verified effect case"
```

## Task 7: Responsive Sticky Player And Stable Controls

**Files:**
- Modify: `index.html:564-920`
- Modify: `index.html:1360-1438`
- Modify: `index.html:33320-33390`
- Modify: `tests/dual-index-site.test.cjs:2088-2131`

- [ ] **Step 1: Write failing CSS and control-state tests**

Assert the desktop shell uses two explicit columns with the rail sticky and reserved; tablet/mobile use one column; inactive mobile covers are not sticky; `.player-activated` enables sticky behavior; `.sticky-collapsed` keeps a stable restore strip; and the fullscreen selector overrides sticky constraints.

- [ ] **Step 2: Write failing no-remount tests**

Clicking the sticky toggle must not call `SfxYouTubeCaptionPlayer.mount()`, `destroy()`, or rewrite `detailEl.innerHTML`. It only toggles a class and `aria-expanded`.

- [ ] **Step 3: Run focused tests and verify missing layout failure**

Run: `node --test --test-name-pattern="sticky|two-column|remount" tests\dual-index-site.test.cjs`

Expected: FAIL because the current reader is one flow and has no sticky state.

- [ ] **Step 4: Add stable desktop and tablet layout**

```css
.detail-learning-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(420px, 520px);
  align-items: start;
  gap: 32px;
}
.video-study-rail { grid-column: 2; grid-row: 1; position: sticky; top: 16px; min-width: 0; }
.detail-learning-content { grid-column: 1; grid-row: 1; min-width: 0; }
@media (max-width: 1039px) {
  .detail-learning-layout { grid-template-columns: minmax(0, 1fr); }
  .video-study-rail, .detail-learning-content { grid-column: 1; }
  .video-study-rail { grid-row: 1; }
  .detail-learning-content { grid-row: 2; }
}
```

- [ ] **Step 5: Add activation-only mobile sticky behavior**

Below 640 px, `.video-study-rail.player-activated:not(.sticky-collapsed)` is sticky at `top: 0`, has `max-height: 36vh`, and a restrained shadow/separator. Before activation it remains static. The toggle uses `aria-expanded` and an `⌃`/`⌄` glyph with an accessible label; no text pill is used.

- [ ] **Step 6: Preserve the iframe during collapse**

`.sticky-collapsed` reduces the media stage to zero block-size with overflow hidden while retaining the same DOM/player instance and a 48 px restore strip. Entering fullscreen clears the visual collapse class and restores it on exit without reconstructing the iframe.

- [ ] **Step 7: Keep dimensions stable**

Set aspect ratio, toolbar height, icon button size, chapter-nav row height, and time-button minimum width. Verify long Chinese titles wrap outside controls and never resize the video stage.

- [ ] **Step 8: Run CSS contract tests and commit**

```powershell
node --test tests\dual-index-site.test.cjs
git add index.html tests\dual-index-site.test.cjs
git commit -m "feat: keep the active player visible while reading"
```

Expected: all tests PASS.

## Task 8: Navigation, Evidence, And Accessibility Integration

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `docs/learning-workflow.md`

- [ ] **Step 1: Test dynamic chapter presence**

Records with glossary and transcript render those chapter links; `missing` subtitle records omit the transcript link; empty glossary results omit the glossary link. Every link target exists exactly once.

- [ ] **Step 2: Test keyboard and reduced-motion behavior**

Enter/Space activate time controls, native summary controls retain default keyboard behavior, chapter targets receive programmatic focus, and scroll behavior becomes `auto` under `prefers-reduced-motion: reduce`.

- [ ] **Step 3: Test print behavior**

`@media print` hides player controls and chapter navigation, shows every evidence disclosure body, and prints sources and screenshot captions without fixed/sticky positioning.

- [ ] **Step 4: Run accessibility-focused tests**

Run: `node --test tests\detail-navigation.test.cjs tests\youtube-caption-player.test.cjs tests\dual-index-site.test.cjs`

Expected: all tests PASS.

- [ ] **Step 5: Document route and evidence hierarchy**

In `docs/learning-workflow.md`, document `#video=<id>&t=<seconds>&section=<id>`, screenshot versus time-button behavior, quick versus complete evidence, and the rule that only strict use-owned screenshots enter effect cases.

- [ ] **Step 6: Commit integration and documentation**

```powershell
git add index.html tests\dual-index-site.test.cjs docs\learning-workflow.md
git commit -m "docs: define evidence navigation contracts"
```

## Task 9: Browser Acceptance Across Desktop And Mobile

**Files:**
- Verify only; screenshots stay outside the repository.

- [ ] **Step 1: Start a local server on an unused port**

```powershell
python -m http.server 8891 --bind 127.0.0.1
```

Expected: the site returns HTTP 200. Use another port if 8891 is occupied.

- [ ] **Step 2: Verify video detail at 1440x900**

Open `#video=yt-Xl5u91oQv-k`. Confirm title then player, quick conclusion, chapter navigation, all seven steps with times, folded complete evidence, relevant glossary, paragraph transcript, and sources. Play, scroll through every section, and verify the rail remains visible without overlap.

- [ ] **Step 3: Verify multi-case effect detail**

Open the FabFilter Pro-Q 3 effect profile. Confirm exactly eight cases, all different source titles/times, one strict screenshot only where owned, truthful missing screenshot states elsewhere, and no parameter block. Jump from at least two cases to their distinct verified times and return to the effect library.

- [ ] **Step 4: Verify 390x844 portrait**

Confirm player-first order, activated sticky player at no more than 36vh, collapse/restore without playback reset, horizontally scrollable chapter navigation, readable quick content, no text/control overlap, and no horizontal page overflow.

- [ ] **Step 5: Verify 844x390 landscape and site fullscreen**

Confirm video controls and two-line site subtitles remain visible, complete transcript stays outside fullscreen, sticky rules do not constrain fullscreen, and exit restores the same player/time.

- [ ] **Step 6: Verify a missing-subtitle record**

Open `#video=b6df5249`; confirm playback and structured time jumps work, truthful subtitle-missing evidence remains, transcript chapter is absent, and no empty section appears.

- [ ] **Step 7: Capture acceptance evidence and console state**

Save desktop video, desktop effect detail, mobile portrait, and mobile landscape screenshots to a temporary QA directory. Record zero console errors and inspect canvas/iframe pixels to ensure the player is nonblank.

## Task 10: Final Integration Verification

**Files:**
- Modify only if verification reveals a scoped defect.

- [ ] **Step 1: Run all JavaScript syntax checks**

```powershell
node --check src\detail-navigation.js
node --check src\video-timeline.js
node --check src\video-subtitles.js
node --check src\sfx-glossary.js
node --check src\youtube-caption-player.js
```

Expected: every command exits 0.

- [ ] **Step 2: Run the full Node and Python suites**

```powershell
node --test tests\*.test.cjs
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

Expected: Node suite has zero failures; Python suite has zero failures apart from the documented Windows symlink permission skip.

- [ ] **Step 3: Run final content and repository gates**

```powershell
node tools\export-site-memory.cjs
node tools\verify-portable-kit.cjs
git diff --check
git status --short
```

Expected: 82/82 reviewed timelines, 924/924 timed steps, 847/847 declared step screenshots resolving to preview/full assets, 97/97 complete public effect cases, 97/97 screenshot reviews, 82/82 subtitle catalog entries, 75 subtitle assets unless actual reviewed coverage changed, 82/82 site-memory records, and no unintended files.

If verification finds a defect, return to the owning task, add a failing regression test there, make the scoped fix, rerun that task's tests, and use that task's explicit file list and commit command. Final verification itself must leave `git status --short` clean.

## Task 11: Deliver And Verify The Public Site

**Files:**
- Verify only; do not create deployment-only source changes.

- [ ] **Step 1: Confirm the feature branch is clean and based on current main**

```powershell
git status --short --branch
git log --oneline --decorate -5
git diff main...HEAD --check
git merge-base --is-ancestor main HEAD
```

Expected: branch is `feature/learning-flow-deep-links`, the worktree is clean, `main` is an ancestor, and every command exits 0.

- [ ] **Step 2: Push the verified feature branch**

```powershell
git push -u origin feature/learning-flow-deep-links
```

Expected: the remote branch points at the locally verified commit.

- [ ] **Step 3: Fast-forward the primary checkout and publish main**

Run from the implementation worktree:

```powershell
git -C E:\zhaoshangqi\AI\sfx-knowledge-site status --short --branch
git -C E:\zhaoshangqi\AI\sfx-knowledge-site merge --ff-only feature/learning-flow-deep-links
git -C E:\zhaoshangqi\AI\sfx-knowledge-site push origin main
```

Expected: the primary checkout is clean before merge, `main` fast-forwards without a merge commit, and `origin/main` reaches the verified feature commit.

- [ ] **Step 4: Poll GitHub Pages for the new application markers**

```powershell
$base = 'https://zhaoshangqi.github.io/sfx-knowledge-site/'
$deadline = (Get-Date).AddMinutes(5)
$deployed = $false
do {
  $cacheBuster = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $response = Invoke-WebRequest -UseBasicParsing ($base + '?cb=' + $cacheBuster) -TimeoutSec 30
  $deployed = $response.StatusCode -eq 200 -and
    $response.Content -match 'src/detail-navigation.js' -and
    $response.Content -match 'src/sfx-glossary.js' -and
    $response.Content -match 'data-player-rail'
  if (-not $deployed) { Start-Sleep -Seconds 10 }
} while (-not $deployed -and (Get-Date) -lt $deadline)
if (-not $deployed) { throw 'GitHub Pages did not expose the verified build within five minutes.' }
```

Expected: HTTP 200 and all three new-site markers are present before the deadline.

- [ ] **Step 5: Repeat critical browser acceptance on the public URL**

Open the cache-busted public URL at 1440x900 and 390x844. Recheck one timed video deep link, the eight-case Pro-Q 3 profile, sticky playback, paragraph subtitles, glossary links, truthful missing screenshot states, no horizontal overflow, and zero console errors. Capture public desktop and mobile screenshots in the temporary QA directory.

- [ ] **Step 6: Record delivery evidence**

```powershell
git -C E:\zhaoshangqi\AI\sfx-knowledge-site rev-parse HEAD
git -C E:\zhaoshangqi\AI\sfx-knowledge-site status --short --branch
git ls-remote origin refs/heads/main
```

Expected: local `main`, `origin/main`, and the public build all correspond to the same verified delivery; report the commit ID, test counts, browser viewports, and `https://zhaoshangqi.github.io/sfx-knowledge-site/`.
