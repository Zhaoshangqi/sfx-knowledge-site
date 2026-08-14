# Verified Timeline Review And Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a fail-closed local review workflow and populate verified video durations, all 924 step timecodes, and all 97 public effect-case mappings without guessing from subtitles.

**Architecture:** A small UMD timeline module owns runtime validation and time inheritance. CommonJS maintenance tools parse the inline site data, build subtitle-only candidate locations, serve a token-protected loopback review UI, persist review state only under `.work`, and apply fully reviewed records back through a fixed JSON boundary. Content review is committed in nine measurable batches.

**Tech Stack:** Vanilla JavaScript, UMD/CommonJS, Node.js `node:test`, YouTube IFrame API, static JSON and HTML.

---

## File Structure

- Create `src/video-timeline.js`: runtime timeline validation, time inheritance, formatting, and coverage.
- Create `tests/video-timeline.test.cjs`: pure timeline contract and real-record coverage tests.
- Create `tools/site-data.cjs`: structured extraction and replacement of `records` and `imageManifest` literals.
- Create `tests/site-data.test.cjs`: fixed-boundary and malformed-input tests.
- Create `tools/timeline-review-data.cjs`: review queue and subtitle candidate generation.
- Create `tests/timeline-review-data.test.cjs`: candidate safety and deterministic ordering tests.
- Create `tools/timeline-review-page.cjs`: local review HTML renderer.
- Create `tools/timeline-review-server.cjs`: token-protected `127.0.0.1` review server and fixed review-state writer.
- Create `tests/timeline-review-server.test.cjs`: binding, token, path, body-size, and persistence tests.
- Create `tools/apply-timeline-review.cjs`: validated review-state application and legacy-use migration.
- Create `tests/apply-timeline-review.test.cjs`: all-or-nothing update and explicit effect-use migration tests.
- Modify `src/knowledge-model.js`: normalize `startSeconds` while preserving legacy behavior.
- Modify `index.html`: add reviewed `timeline`, `steps[].startSeconds`, and explicit public `effectUses` data.
- Modify `tools/verify-portable-kit.cjs`: enforce final timeline and public-case coverage.
- Modify `docs/learning-workflow.md`: document the local review and application commands.
- Modify `skills/sfx-knowledge/references/site-video-memory.md`: regenerate from reviewed site data after all batches.

## Task 1: Runtime Timeline Contract

**Files:**
- Create: `src/video-timeline.js`
- Create: `tests/video-timeline.test.cjs`
- Modify: `src/knowledge-model.js:230-270`
- Test: `tests/knowledge-model.test.cjs`

- [ ] **Step 1: Write failing tests for valid time inheritance and fail-closed input**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const timeline = require('../src/video-timeline.js');

const record = {
  id: 'video-a',
  timeline: { durationSeconds: 90, reviewedAt: '2026-08-14', source: 'youtube-player' },
  steps: [
    { order: 1, name: 'Source', startSeconds: 4, imageKey: 'shot-a' },
    { order: 2, name: 'Effect', startSeconds: 25 }
  ]
};

test('resolves step, screenshot, and inherited effect-use time from one verified source', () => {
  assert.equal(timeline.stepStart(record, 1), 25);
  assert.equal(timeline.screenshotStart(record, 'shot-a'), 4);
  assert.equal(timeline.effectStart(record, { stepIndex: 1 }), 25);
  assert.equal(timeline.effectStart(record, { stepIndex: 1, startSeconds: 31 }), 31);
});

test('rejects unreviewed, negative, non-finite, and out-of-duration time data', () => {
  assert.equal(timeline.stepStart({ ...record, timeline: { ...record.timeline, reviewedAt: '' } }, 0), null);
  assert.equal(timeline.stepStart({ ...record, steps: [{ startSeconds: -1 }] }, 0), null);
  assert.equal(timeline.effectStart(record, { startSeconds: 90, stepIndex: 1 }), null);
  assert.deepEqual(timeline.coverage([], []), {
    records: 0, reviewedRecords: 0, steps: 0, timedSteps: 0,
    publicCases: 0, timedPublicCases: 0, screenshotCasesReviewed: 0
  });
});
```

- [ ] **Step 2: Run the focused tests and verify the missing module failure**

Run: `node --test tests\video-timeline.test.cjs`

Expected: FAIL with `Cannot find module '../src/video-timeline.js'`.

- [ ] **Step 3: Implement the frozen UMD timeline API**

```js
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SfxVideoTimeline = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function finiteNonNegative(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  function validRecord(record) {
    var timeline = record && record.timeline;
    return Boolean(timeline && finiteNonNegative(timeline.durationSeconds) &&
      timeline.durationSeconds > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(timeline.reviewedAt || '')) &&
      timeline.source === 'youtube-player');
  }

  function bounded(record, seconds) {
    return validRecord(record) && finiteNonNegative(seconds) && seconds < record.timeline.durationSeconds
      ? seconds : null;
  }

  function stepStart(record, stepIndex) {
    var steps = record && Array.isArray(record.steps) ? record.steps : [];
    var step = Number.isInteger(stepIndex) && stepIndex >= 0 ? steps[stepIndex] : null;
    return step ? bounded(record, step.startSeconds) : null;
  }

  function screenshotStart(record, imageKey) {
    var key = String(imageKey || '').trim();
    if (!key) return null;
    var index = (record && Array.isArray(record.steps) ? record.steps : []).findIndex(function (step) {
      return step && step.imageKey === key;
    });
    return stepStart(record, index);
  }

  function effectStart(record, use) {
    var explicit = bounded(record, use && use.startSeconds);
    return explicit == null ? stepStart(record, use && use.stepIndex) : explicit;
  }

  function formatTime(seconds) {
    var whole = finiteNonNegative(seconds) ? Math.floor(seconds) : 0;
    var hours = Math.floor(whole / 3600);
    var minutes = Math.floor((whole % 3600) / 60);
    var secs = whole % 60;
    var mm = minutes < 10 ? '0' + minutes : String(minutes);
    var ss = secs < 10 ? '0' + secs : String(secs);
    return hours ? hours + ':' + mm + ':' + ss : mm + ':' + ss;
  }

  function coverage(records, publicUses) {
    var safeRecords = Array.isArray(records) ? records : [];
    var safeUses = Array.isArray(publicUses) ? publicUses : [];
    var byId = Object.create(null);
    safeRecords.forEach(function (record) { if (record && record.id) byId[record.id] = record; });
    var result = {
      records: safeRecords.length,
      reviewedRecords: safeRecords.filter(validRecord).length,
      steps: 0,
      timedSteps: 0,
      publicCases: safeUses.length,
      timedPublicCases: 0,
      screenshotCasesReviewed: 0
    };
    safeRecords.forEach(function (record) {
      var steps = Array.isArray(record.steps) ? record.steps : [];
      result.steps += steps.length;
      result.timedSteps += steps.filter(function (_, index) { return stepStart(record, index) != null; }).length;
    });
    safeUses.forEach(function (use) {
      var record = byId[use && use.sourceRecordId];
      if (effectStart(record, use) != null) result.timedPublicCases += 1;
      if (use && use.screenshotReviewed === true) result.screenshotCasesReviewed += 1;
    });
    return Object.freeze(result);
  }

  return Object.freeze({ coverage: coverage, effectStart: effectStart, formatTime: formatTime,
    screenshotStart: screenshotStart, stepStart: stepStart, validRecord: validRecord });
}));
```

- [ ] **Step 4: Extend normalized effect uses with reviewed timing fields**

In `makeUse()` add these fields without coercing strings into numbers:

```js
startSeconds: typeof (input && input.startSeconds) === 'number' ? input.startSeconds : null,
screenshotReviewed: Boolean(input && input.screenshotReviewed),
```

- [ ] **Step 5: Run the timeline and knowledge-model tests**

Run: `node --test tests\video-timeline.test.cjs tests\knowledge-model.test.cjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit the runtime contract**

```powershell
git add src\video-timeline.js src\knowledge-model.js tests\video-timeline.test.cjs tests\knowledge-model.test.cjs
git commit -m "feat: add verified video timeline model"
```

## Task 2: Structured Site Data Boundary

**Files:**
- Create: `tools/site-data.cjs`
- Create: `tests/site-data.test.cjs`

- [ ] **Step 1: Write failing extraction and replacement tests**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const siteData = require('../tools/site-data.cjs');

const html = '<script>\n    const records = [{"id":"a"}];\n\n    const imageManifest = {"shot":{"preview":"p.webp","full":"f.webp"}};\n    const pluginReferenceCatalog = [];\n</script>';

test('parses and replaces only the fixed records literal', () => {
  const parsed = siteData.parse(html);
  assert.deepEqual(parsed.records, [{ id: 'a' }]);
  assert.deepEqual(parsed.imageManifest, { shot: { preview: 'p.webp', full: 'f.webp' } });
  const next = siteData.replaceRecords(html, [{ id: 'b', steps: [] }]);
  assert.deepEqual(siteData.parse(next).records, [{ id: 'b', steps: [] }]);
  assert.deepEqual(siteData.parse(next).imageManifest, parsed.imageManifest);
});

test('rejects duplicate, missing, and non-array record boundaries', () => {
  assert.throws(() => siteData.parse(''), /records boundary/);
  assert.throws(() => siteData.replaceRecords(html, {}), /records must be an array/);
});
```

- [ ] **Step 2: Run the test and verify the missing module failure**

Run: `node --test tests\site-data.test.cjs`

Expected: FAIL with `Cannot find module '../tools/site-data.cjs'`.

- [ ] **Step 3: Implement fixed-marker JSON parsing and replacement**

```js
'use strict';
const RECORD_MARKER = '    const records = ';
const IMAGE_MARKER = '    const imageManifest = ';
const PLUGIN_MARKER = '    const pluginReferenceCatalog = ';

function literalBoundary(html, marker, nextMarker, label) {
  const source = String(html || '');
  const markerStart = source.indexOf(marker);
  const start = markerStart < 0 ? -1 : markerStart + marker.length;
  const end = start < 0 ? -1 : source.indexOf(nextMarker, start);
  if (start < 0 || end < 0 || source.indexOf(marker, start) >= 0) {
    throw new Error('Expected exactly one ' + label + ' boundary');
  }
  return { source, start, end };
}

function parseLiteral(part) {
  return JSON.parse(part.source.slice(part.start, part.end).trim().replace(/;$/, ''));
}

function parse(html) {
  const records = parseLiteral(literalBoundary(html, RECORD_MARKER, IMAGE_MARKER, 'records'));
  const imageManifest = parseLiteral(literalBoundary(html, IMAGE_MARKER, PLUGIN_MARKER, 'imageManifest'));
  if (!Array.isArray(records)) throw new Error('records must be an array');
  if (!imageManifest || Array.isArray(imageManifest) || typeof imageManifest !== 'object') {
    throw new Error('imageManifest must be an object');
  }
  return { records, imageManifest };
}

function replaceRecords(html, records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const part = literalBoundary(html, RECORD_MARKER, IMAGE_MARKER, 'records');
  return part.source.slice(0, part.start) + JSON.stringify(records, null, 2) + ';\n\n' +
    part.source.slice(part.end);
}

module.exports = Object.freeze({ parse, replaceRecords });
```

- [ ] **Step 4: Run the parser tests**

Run: `node --test tests\site-data.test.cjs`

Expected: all tests PASS.

- [ ] **Step 5: Commit the structured boundary**

```powershell
git add tools\site-data.cjs tests\site-data.test.cjs
git commit -m "test: add structured site data boundary"
```

## Task 3: Candidate Queue Builder

**Files:**
- Create: `tools/timeline-review-data.cjs`
- Create: `tests/timeline-review-data.test.cjs`

- [ ] **Step 1: Write failing tests that candidates never become confirmations**

```js
test('buildReviewQueue keeps subtitle matches unreviewed and sorted by score then time', () => {
  const queue = buildReviewQueue([{ id: 'a', videoId: 'abc123DEF45', steps: [
    { order: 1, name: 'Use Pro-Q 3', detail: 'cut resonance' }
  ] }], {
    abc123DEF45: { cues: [
      { start: 20, end: 22, text: 'Now Pro-Q 3 cuts the resonance.' },
      { start: 5, end: 7, text: 'Pro-Q 3.' }
    ] }
  });
  assert.equal(queue[0].steps[0].status, 'unreviewed');
  assert.equal(queue[0].steps[0].startSeconds, null);
  assert.deepEqual(queue[0].steps[0].candidates.map((item) => item.start), [20, 5]);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests\timeline-review-data.test.cjs`

Expected: FAIL because `buildReviewQueue` is missing.

- [ ] **Step 3: Implement deterministic token scoring**

Export these exact functions:

```js
module.exports = {
  buildReviewQueue,
  candidateCues,
  tokenize
};
```

`tokenize()` must lowercase Latin text, keep plugin tokens of three or more characters, keep Chinese runs of two or more characters, remove the fixed generic stop list, and never inspect `record.summary` as proof. `candidateCues()` returns at most three immutable `{ start, end, text, score, matchedTerms }` values. `buildReviewQueue()` always emits `status: 'unreviewed'` and `startSeconds: null` for untouched steps.

- [ ] **Step 4: Add malformed-track, tie-order, Chinese-term, and no-subtitle tests**

```js
assert.deepEqual(candidateCues({ cues: [] }, ['Pro-Q']), []);
assert.deepEqual(buildReviewQueue([{ id: 'a', videoId: 'missing', steps: [] }], {})[0].subtitleStatus, 'missing');
assert.ok(Object.isFrozen(candidateCues(track, ['瞬态'])));
```

- [ ] **Step 5: Run candidate tests**

Run: `node --test tests\timeline-review-data.test.cjs`

Expected: all tests PASS.

- [ ] **Step 6: Commit candidate generation**

```powershell
git add tools\timeline-review-data.cjs tests\timeline-review-data.test.cjs
git commit -m "feat: build timeline review candidates"
```

## Task 4: Token-Protected Loopback Review Server

**Files:**
- Create: `tools/timeline-review-page.cjs`
- Create: `tools/timeline-review-server.cjs`
- Create: `tests/timeline-review-server.test.cjs`

- [ ] **Step 1: Write failing server safety tests**

```js
test('review server binds loopback and rejects missing token and arbitrary paths', async () => {
  const fixture = await startReviewServer({ port: 0, token: 'fixed-token', writeState });
  t.after(() => fixture.close());
  assert.equal(fixture.address.address, '127.0.0.1');
  assert.equal((await fetch(fixture.url + '/api/review', { method: 'POST', body: '{}' })).status, 403);
  assert.equal((await fetch(fixture.url + '/api/review?token=fixed-token', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: '../../index.html' })
  })).status, 400);
});
```

- [ ] **Step 2: Run the server test and verify it fails**

Run: `node --test tests\timeline-review-server.test.cjs`

Expected: FAIL because the server module is missing.

- [ ] **Step 3: Implement the fixed loopback API**

`startReviewServer(options)` must:

```js
httpServer.listen(options.port || 0, '127.0.0.1');
```

It exposes only `GET /`, `GET /api/queue`, `GET /api/review`, and `POST /api/review`. Every API request requires the startup token. POST bodies are capped at 2 MiB, validated against `{ records: [{ recordId, videoId, durationSeconds, status, steps, cases }] }`, and written through an injected `writeState` function to the fixed `.work/timeline-review/review.json` path.

- [ ] **Step 4: Render the review controls and YouTube player**

`renderReviewPage()` must include semantic buttons with these stable hooks:

```html
<button type="button" data-seek-delta="-5" aria-label="后退 5 秒">-5</button>
<button type="button" data-seek-delta="5" aria-label="前进 5 秒">+5</button>
<button type="button" data-record-current>记录当前时间</button>
<button type="button" data-prev-item aria-label="上一个项目">↑</button>
<button type="button" data-next-item aria-label="下一个项目">↓</button>
```

The page may send only the validated review object; it never sends a filesystem path. It displays candidate timestamps as seek-only buttons and requires a separate explicit confirmation click before changing an item to `reviewed`.

- [ ] **Step 5: Add persistence, body-limit, invalid-origin, and late-write tests**

Expected assertions: the valid state is persisted once, a 2 MiB plus one byte body returns 413, wrong token returns 403, and closing the server prevents later writes.

- [ ] **Step 6: Run server tests**

Run: `node --test tests\timeline-review-server.test.cjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit the local review server**

```powershell
git add tools\timeline-review-page.cjs tools\timeline-review-server.cjs tests\timeline-review-server.test.cjs
git commit -m "feat: add local timeline review workbench"
```

## Task 5: All-Or-Nothing Review Application

**Files:**
- Create: `tools/apply-timeline-review.cjs`
- Create: `tests/apply-timeline-review.test.cjs`
- Modify: `tools/verify-portable-kit.cjs`

- [ ] **Step 1: Write failing application tests**

```js
test('applies a fully reviewed video and migrates a public legacy use explicitly', () => {
  const result = applyReview({ records, review, publicUseIds: new Set(['video-a:effect:pro-q-3:1']) });
  assert.deepEqual(result.records[0].timeline, {
    durationSeconds: 90, reviewedAt: '2026-08-14', source: 'youtube-player'
  });
  assert.equal(result.records[0].steps[0].startSeconds, 12);
  assert.equal(result.records[0].effectUses[0].stepIndex, 0);
  assert.equal(result.records[0].effectUses[0].screenshotReviewed, true);
  assert.deepEqual(result.records[0].effectUses[0].replacesPluginIndexes, [0]);
});

test('rejects partial videos, stale step order, candidate-only time, and out-of-range values', () => {
  assert.throws(() => applyReview({ records, review: partialReview }), /all steps must be reviewed/);
  assert.throws(() => applyReview({ records, review: staleReview }), /step identity mismatch/);
  assert.throws(() => applyReview({ records, review: candidateReview }), /human confirmation required/);
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `node --test tests\apply-timeline-review.test.cjs`

Expected: FAIL because `applyReview` is missing.

- [ ] **Step 3: Implement strict review application**

The module exports `applyReview`, `validateReview`, and `runCli`. It must compare `recordId`, `videoId`, exact step count, each step `order` and `name`, and each public case `useId`. It writes a whole reviewed video or none of it. Legacy public uses are copied into explicit `effectUses` with stable ID and `replacesPluginIndexes`; existing explicit uses are updated in place.

- [ ] **Step 4: Add a dry-run CLI and JSON report**

Run shape:

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
```

Expected report keys: `recordsReviewed`, `stepsTimed`, `publicCasesMapped`, `screenshotCasesReviewed`, `failures`, and `changedRecordIds`. Without `--write`, `index.html` must remain byte-identical.

- [ ] **Step 5: Extend portable verification with final coverage checks**

Add assertions based on `SfxVideoTimeline.coverage()`:

```js
assert.equal(coverage.records, 82);
assert.equal(coverage.reviewedRecords, 82);
assert.equal(coverage.steps, 924);
assert.equal(coverage.timedSteps, 924);
assert.equal(coverage.publicCases, 97);
assert.equal(coverage.timedPublicCases, 97);
assert.equal(coverage.screenshotCasesReviewed, 97);
```

Parse `imageManifest` through `site-data.cjs` and keep the existing screenshot assets as a second hard gate:

```js
const screenshotSteps = records.flatMap((record) => record.steps.filter((step) => step.imageKey));
assert.equal(screenshotSteps.length, 847);
screenshotSteps.forEach((step) => {
  const asset = imageManifest[step.imageKey];
  assert.ok(asset, `missing imageManifest entry: ${step.imageKey}`);
  ['preview', 'full'].forEach((size) => {
    assert.ok(asset[size], `missing ${size} path: ${step.imageKey}`);
    assert.ok(fs.existsSync(path.join(root, asset[size])), `missing ${size} asset: ${asset[size]}`);
  });
});
```

Keep this final gate disabled only behind an explicit `--allow-incomplete-timeline` flag while batch review is in progress. The default verifier must enforce the gate before final delivery.

- [ ] **Step 6: Run tool and portable-kit focused tests**

Run: `node --test tests\apply-timeline-review.test.cjs tests\video-timeline.test.cjs`

Expected: all tests PASS.

- [ ] **Step 7: Commit review application**

```powershell
git add tools\apply-timeline-review.cjs tools\verify-portable-kit.cjs tests\apply-timeline-review.test.cjs
git commit -m "feat: apply verified timeline reviews"
```

## Task 6: Document The Review Workflow

**Files:**
- Modify: `docs/learning-workflow.md`

- [ ] **Step 1: Add exact local review commands and safety boundaries**

```powershell
node .\tools\timeline-review-server.cjs --index .\index.html --work .\.work\timeline-review
node .\tools\apply-timeline-review.cjs --index .\index.html --review .\.work\timeline-review\review.json --dry-run
node .\tools\apply-timeline-review.cjs --index .\index.html --review .\.work\timeline-review\review.json --write
```

Document that subtitle matches are seek candidates only, `reviewed` requires visible YouTube verification, the service binds only loopback, and `.work` state must never be committed.

- [ ] **Step 2: Verify commands and documentation references**

Run: `rg -n "timeline-review|候选|reviewed|127\.0\.0\.1" docs\learning-workflow.md`

Expected: all four concepts are documented.

- [ ] **Step 3: Commit the workflow documentation**

```powershell
git add docs\learning-workflow.md
git commit -m "docs: document timeline verification workflow"
```

## Task 7: Review Batches 1-3

**Files:**
- Modify: `index.html`
- Modify: `.work/timeline-review/review.json` locally only; never stage it.

- [ ] **Step 1: Review batch 1 and apply 135 steps / 21 public cases**

Video IDs: `T-Txp62Xp7E`, `ChlEY5CCv-A`, `1uFMVg7TrGU`, `-vxdSIdNAw4`, `zxfbE0exXKk`, `Ns8e5612fUw`, `jVifbszcv2c`, `tj5Sn_rZhnk`, `6xUsp9K61Nc`, `-pmOXv31j6s`.

Expected cumulative coverage: 10 reviewed records, 135 timed steps, 21 mapped public cases.

- [ ] **Step 2: Run batch 1 audit and commit**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\verify-portable-kit.cjs --allow-incomplete-timeline
git add index.html
git commit -m "data: verify timeline batch 1"
```

Expected report after write: 10 reviewed records, 135 timed steps, 21 mapped public cases, and no failures.

- [ ] **Step 3: Review batch 2 and apply 100 steps / 8 public cases**

Video IDs: `ZjRnoIezCnA`, `ruFsZPu3qO0`, `vU0EZlUoW7g`, `6MMXjU4mH3w`, `HsFlJ_UJyxs`, `qB23qR9KMGY`, `8-DGPoItgcE`, `TNnLxeWVjM0`, `nRPOnY3a8YU`, `upBjw_iHT7E`.

Expected cumulative coverage: 20 reviewed records, 235 timed steps, 29 mapped public cases.

- [ ] **Step 4: Audit and commit batch 2**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\verify-portable-kit.cjs --allow-incomplete-timeline
git add index.html
git commit -m "data: verify timeline batch 2"
```

Expected report after write: 20 reviewed records, 235 timed steps, 29 mapped public cases, and no failures.

- [ ] **Step 5: Review batch 3 and apply 100 steps / 8 public cases**

Video IDs: `dxWLnuPUGTE`, `z_-lgxCj_Do`, `Vlhaimjv1Jw`, `FlZ8V453BfA`, `M0cOtthAje0`, `26TcO5_3pxo`, `0orLvTF1vj8`, `WOl66EfI9EQ`, `3yrKFdjORy0`, `g0lt1bjOMWw`.

Expected cumulative coverage: 30 reviewed records, 335 timed steps, 37 mapped public cases.

- [ ] **Step 6: Audit and commit batch 3**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\verify-portable-kit.cjs --allow-incomplete-timeline
git add index.html
git commit -m "data: verify timeline batch 3"
```

Expected report after write: 30 reviewed records, 335 timed steps, 37 mapped public cases, and no failures.

## Task 8: Review Batches 4-6

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Review batch 4 and apply 132 steps / 7 public cases**

Video IDs: `D0qibJgxYHY`, `Pvkfc32V8Mo`, `dZsVzf2NWw0`, `2L6qe8uRf0Y`, `WdZ9DFDHaqI`, `gLldwkc-0Vs`, `Ub5ozlVecII`, `Iz4rtBgqLlg`, `kFxuNtkv4CU`, `ii9vXwAxFSI`.

Expected cumulative coverage: 40 reviewed records, 467 timed steps, 44 mapped public cases. Four source videos in this batch have no site subtitle track, so every time is located manually in the player.

- [ ] **Step 2: Audit and commit batch 4**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\verify-portable-kit.cjs --allow-incomplete-timeline
git add index.html
git commit -m "data: verify timeline batch 4"
```

Expected report after write: 40 reviewed records, 467 timed steps, 44 mapped public cases, and no failures.

- [ ] **Step 3: Review batch 5 and apply 140 steps / 6 public cases**

Video IDs: `cLhevQYlvlI`, `Ze9enZLKA2I`, `BPuxpbey-Ks`, `ahbdvI6nLgA`, `xWtyeqmjPKk`, `wA5afo1P6tE`, `uP135z2QBTM`, `fpazzwJnMdM`, `TOdyCTjzHLE`, `RdVQYDBTB48`.

Expected cumulative coverage: 50 reviewed records, 607 timed steps, 50 mapped public cases.

- [ ] **Step 4: Audit and commit batch 5**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\verify-portable-kit.cjs --allow-incomplete-timeline
git add index.html
git commit -m "data: verify timeline batch 5"
```

Expected report after write: 50 reviewed records, 607 timed steps, 50 mapped public cases, and no failures.

- [ ] **Step 5: Review batch 6 and apply 139 steps / 23 public cases**

Video IDs: `Ipbfcr-DFTI`, `hfZnCFgt3TI`, `M1KBLV0Zz6I`, `iyAwO9g_rAQ`, `aKkZZ-XeSqs`, `uh9yIziU8Pk`, `YVto08ZB9Lk`, `cHWeJHlXb54`, `6oJUotZGz0k`, `h1uYic59pf0`.

Expected cumulative coverage: 60 reviewed records, 746 timed steps, 73 mapped public cases.

- [ ] **Step 6: Audit and commit batch 6**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\verify-portable-kit.cjs --allow-incomplete-timeline
git add index.html
git commit -m "data: verify timeline batch 6"
```

Expected report after write: 60 reviewed records, 746 timed steps, 73 mapped public cases, and no failures.

## Task 9: Review Batches 7-9 And Close Coverage

**Files:**
- Modify: `index.html`
- Modify: `skills/sfx-knowledge/references/site-video-memory.md`

- [ ] **Step 1: Review batch 7 and apply 81 steps / 10 public cases**

Video IDs: `EQw3BCxIRPk`, `2VQTuApNrPA`, `Xl5u91oQv-k`, `kv0yNg1CPAk`, `St6GD7CbdcM`, `eKCYZz98-N4`, `f9OrpDtedSI`, `2cTDQ_MetsE`, `ceC_RDgx71s`, `fYqe17OJRNM`.

Expected cumulative coverage: 70 reviewed records, 827 timed steps, 83 mapped public cases.

- [ ] **Step 2: Audit and commit batch 7**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\verify-portable-kit.cjs --allow-incomplete-timeline
git add index.html
git commit -m "data: verify timeline batch 7"
```

Expected report after write: 70 reviewed records, 827 timed steps, 83 mapped public cases, and no failures.

- [ ] **Step 3: Review batch 8 and apply 81 steps / 11 public cases**

Video IDs: `j4POSc1YeAo`, `C_5qPsn1GWY`, `ir8d3PUj5JU`, `E_wGGNkVcrw`, `wWms0-ad6fw`, `xCorcGCP218`, `v1IGAnVJylY`, `LyNsYzCN5_A`, `FuFfkk7dxcY`, `NdGNqhV8cpM`.

Expected cumulative coverage: 80 reviewed records, 908 timed steps, 94 mapped public cases.

- [ ] **Step 4: Audit and commit batch 8**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\verify-portable-kit.cjs --allow-incomplete-timeline
git add index.html
git commit -m "data: verify timeline batch 8"
```

Expected report after write: 80 reviewed records, 908 timed steps, 94 mapped public cases, and no failures.

- [ ] **Step 5: Review batch 9 and apply 16 steps / 3 public cases**

Video IDs: `yYUB55kMMV8`, `cJ75ykkqV64`.

Expected final coverage: 82 reviewed records, 924 timed steps, 97 mapped and screenshot-reviewed public cases.

- [ ] **Step 6: Enable the default complete-timeline verifier and regenerate Skill memory**

```powershell
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --dry-run --report .work\timeline-review\apply-report.json
node tools\apply-timeline-review.cjs --index index.html --review .work\timeline-review\review.json --write
node tools\export-site-memory.cjs
node tools\verify-portable-kit.cjs
```

Expected: the apply report has no failures; verifier reports 82/82 reviewed records, 924/924 timed steps, 847/847 declared step screenshots resolving to preview/full assets, 97/97 timed public cases, 97/97 screenshot reviews, 82/82 catalog entries, 75 subtitle assets, and 82/82 site-memory entries.

- [ ] **Step 7: Commit final timeline data and regenerated memory**

```powershell
git add index.html tools\verify-portable-kit.cjs skills\sfx-knowledge\references\site-video-memory.md
git commit -m "data: complete verified video timelines"
```

## Task 10: Timeline Plan Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run syntax checks**

```powershell
node --check src\video-timeline.js
node --check tools\site-data.cjs
node --check tools\timeline-review-data.cjs
node --check tools\timeline-review-page.cjs
node --check tools\timeline-review-server.cjs
node --check tools\apply-timeline-review.cjs
```

Expected: all commands exit 0.

- [ ] **Step 2: Run focused tests**

```powershell
node --test tests\video-timeline.test.cjs tests\site-data.test.cjs tests\timeline-review-data.test.cjs tests\timeline-review-server.test.cjs tests\apply-timeline-review.test.cjs tests\knowledge-model.test.cjs
```

Expected: all tests PASS with zero failures.

- [ ] **Step 3: Run full repository validation**

```powershell
node --test tests\*.test.cjs
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
node tools\verify-portable-kit.cjs
git diff --check
git status --short
```

Expected: Node suite has zero failures; Python suite has zero failures apart from the documented Windows symlink skip; portable verifier reaches all final coverage gates including 847/847 screenshot assets; diff check is clean; status contains only intended changes or is clean after commits.
