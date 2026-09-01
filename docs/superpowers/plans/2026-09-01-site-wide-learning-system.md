# Site-Wide Learning System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every video and all four primary site surfaces to one adaptive, evidence-grounded learning system, then publish the complete result in one release.

**Architecture:** Keep the static HTML/UMD architecture and introduce one shared adaptive learning-map validator plus a reviewed per-video content catalog under `content/learning-maps/`. Deterministic tools prepare evidence packets, validate reviewed content, and atomically merge only `learningMap` and `steps[*].learning` into `index.html`; existing renderers then consume the shared projection. Video and effect interfaces are updated after all content is complete, followed by exhaustive data, browser, and public Pages verification.

**Tech Stack:** Static HTML/CSS/JavaScript, CommonJS/UMD modules, Node.js built-in test runner, Python `unittest`, Playwright for browser QA, GitHub Pages.

---

## File Map

**Create**

- `src/learning-map.js` — frozen UMD API for adaptive learning-map validation and projection.
- `content/learning-maps/workflow/`, `impact/`, `scifi/`, `environment/`, `magic/`, and `creature/` — one reviewed JSON source file for every actual video ID enumerated in Tasks 5–14.
- `tools/learning-map-catalog.cjs` — catalog discovery, entry validation, merging, and coverage reporting.
- `tools/build-learning-maps.cjs` — check/dry-run/write CLI with atomic `index.html` replacement.
- `tools/prepare-learning-map-review.cjs` — deterministic ignored review packets containing source evidence and a non-publishable draft.
- `tools/verify-learning-content.cjs` — content-quality and evidence-boundary checks.
- `tools/verify-learning-ui.py` — desktop/mobile traversal and screenshot QA for the four primary surfaces.
- `tests/learning-map.test.cjs` — adaptive schema and projection tests.
- `tests/learning-map-catalog.test.cjs` — catalog, merge, atomicity, and coverage tests.
- `tests/learning-content.test.cjs` — full content and preservation contract.
- `tests/test_verify_learning_ui.py` — browser-verifier helper tests.

**Modify**

- `index.html` — load shared module, add `version: 1`, render adaptive data, redesign four primary surfaces, and update responsive/print styles.
- `src/knowledge-model.js` — keep all new learning fields searchable without exposing parameters or practice scaffolding.
- `src/effect-guides.js` — add explicit problem and limitation fields to every published effect guide.
- `tests/dual-index-site.test.cjs` — adaptive rendering, card, effect, route, accessibility, and CSS contracts.
- `tests/effect-guides.test.cjs` — strict five-field usage guide contract.
- `tests/veto-video-import.test.cjs` — versioned Veto fixture and all-record coverage expectations.
- `tools/export-site-memory.cjs` and its tests only if the new learning fields are not already exported by generic record serialization.

## Execution Invariants

- Stay on `feat/site-wide-learning-system`; do not push intermediate content.
- Use `tools/site-data.cjs` for every `index.html` records read/write.
- Add production behavior only after a focused failing test demonstrates the missing contract.
- Never modify existing `detail`, `params`, timeline, subtitle, screenshot, plugin, or `effectUses` values during learning migration.
- A content file cannot be publishable until it has `reviewed: true` and passes the shared validator and content lint.
- Commit after every engineering task and every disjoint content batch.

---

### Task 1: Add The Adaptive Learning-Map Contract

**Files:**
- Create: `src/learning-map.js`
- Create: `tests/learning-map.test.cjs`

- [ ] **Step 1: Write failing adaptive-schema tests**

Test a valid fixture with 3 roles, 2 decisions, 2 chapters, and 5 steps; also test 6/3/5 as the upper bounds. Reject version mismatch, 2 or 7 roles, 1 or 4 decisions, 1 or 6 chapters, duplicate chapter IDs, missing/duplicate step orders, blank four-field values, and accessor/custom-prototype inputs.

```js
test('projects a versioned adaptive learning map', () => {
  const record = fixture({ roleCount: 3, decisionCount: 2, chapterOrders: [[1, 2], [3, 4, 5]] });
  const projected = LearningMap.project(record, { steps: record.steps });
  assert.equal(projected.version, 1);
  assert.equal(projected.roles.length, 3);
  assert.deepEqual(projected.chapters.flatMap((chapter) => chapter.stepOrders), [1, 2, 3, 4, 5]);
});

test('fails closed outside adaptive bounds', () => {
  assert.equal(LearningMap.project(fixture({ version: 2 }), detail()), null);
  assert.equal(LearningMap.project(fixture({ roleCount: 2 }), detail()), null);
  assert.equal(LearningMap.project(fixture({ decisionCount: 4 }), detail()), null);
  assert.equal(LearningMap.project(fixture({ chapterOrders: [[1, 2, 3, 4, 5]] }), detail()), null);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/learning-map.test.cjs`

Expected: FAIL because `src/learning-map.js` does not exist.

- [ ] **Step 3: Implement the frozen UMD API**

Export exactly `project(record, detailData)` and `limits()`. Reuse the current Veto projection behavior, but replace identity and fixed-count gates with these constants:

```js
var LIMITS = Object.freeze({
  version: 1,
  roles: Object.freeze({ min: 3, max: 6 }),
  decisions: Object.freeze({ min: 2, max: 3 }),
  chapters: Object.freeze({ min: 2, max: 5 }),
  learningKeys: Object.freeze(['input', 'problem', 'action', 'result'])
});
```

`project` must trim strings, require plain data objects/arrays, require unique positive step orders, require unique chapter IDs, preserve actual step-array indexes, and return `null` unless chapter orders exactly equal the set of step orders.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/learning-map.test.cjs`

Expected: all adaptive contract tests PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/learning-map.js tests/learning-map.test.cjs
git commit -m "feat: add adaptive learning map contract"
```

### Task 2: Integrate The Shared Contract And Version Veto

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `tests/veto-video-import.test.cjs`

- [ ] **Step 1: Write failing integration tests**

Require `src/learning-map.js` before inline data, require Veto `learningMap.version === 1`, require all three detail renderers to call `SfxLearningMap.project(record, detailData)`, and remove tests that assert Veto-only 6/3/5/17 activation.

```js
assert.ok(indexHtml.indexOf('src/learning-map.js') < indexHtml.indexOf('    const records = '));
assert.equal(veto.learningMap.version, 1);
assert.equal((rendererSource.match(/SfxLearningMap\.project\(record, detailData\)/g) || []).length, 3);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/learning-map.test.cjs tests/dual-index-site.test.cjs tests/veto-video-import.test.cjs`

Expected: FAIL on missing browser module load and missing Veto version.

- [ ] **Step 3: Wire the module and replace the inline validator**

Add:

```html
<script src="src/learning-map.js?v=20260901-sitewide-1"></script>
```

Add `"version": 1` to Veto `learningMap`. Replace the body of the inline `projectLearningTemplate` helper with:

```js
function projectLearningTemplate(record, detailData) {
  return SfxLearningMap.project(record, detailData);
}
```

Update the VM test context to inject `SfxLearningMap`.

- [ ] **Step 4: Run focused and full Node tests**

Run: `node --test tests/learning-map.test.cjs tests/dual-index-site.test.cjs tests/veto-video-import.test.cjs`

Expected: focused tests PASS.

Run: `node --test tests/*.test.cjs`

Expected: full suite PASS with no Veto regression.

- [ ] **Step 5: Commit**

```powershell
git add index.html tests/dual-index-site.test.cjs tests/veto-video-import.test.cjs
git commit -m "refactor: share adaptive learning projection"
```

### Task 3: Add Reviewed Per-Video Catalog And Atomic Builder

**Files:**
- Create: `tools/learning-map-catalog.cjs`
- Create: `tools/build-learning-maps.cjs`
- Create: `tests/learning-map-catalog.test.cjs`
- Create: `content/learning-maps/scifi/3JjAK2uhxM4.json`

- [ ] **Step 1: Write failing catalog tests**

Cover recursive JSON discovery, filename/video-ID agreement, duplicate IDs, unknown IDs, `reviewed: true`, schema projection, partial check mode, complete write mode, preservation of all non-learning data, deterministic output, temporary sibling creation, atomic rename, and cleanup after write failure.

```js
test('merges only reviewed learning fields', () => {
  const merged = catalog.mergeEntry(sourceRecord, reviewedEntry);
  assert.deepEqual(stripLearning(merged), stripLearning(sourceRecord));
  assert.deepEqual(merged.learningMap, reviewedEntry.learningMap);
  assert.deepEqual(merged.steps.map((step) => step.learning), reviewedEntry.steps.map((step) => step.learning));
});

test('complete writes reject missing records', () => {
  assert.throws(() => catalog.validateCoverage(records, entries.slice(1), true), /missing learning maps/);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/learning-map-catalog.test.cjs`

Expected: FAIL because catalog modules do not exist.

- [ ] **Step 3: Implement catalog entry validation**

Each tracked file has this exact shape; this complete two-step fixture demonstrates every required key and valid lower bounds:

```json
{
  "videoId": "fixture-video",
  "reviewed": true,
  "reviewedAt": "2026-09-01",
  "learningMap": {
    "version": 1,
    "goal": "让机械启动的动作、重量和能量身份都能被听清。",
    "roles": [
      { "name": "动作提示", "description": "用短瞬态标记启动时点。" },
      { "name": "重量主体", "description": "用中低频层建立机械体量。" },
      { "name": "能量尾部", "description": "用持续层延续启动后的能量。" }
    ],
    "decisions": [
      "先让可见动作成立，再补充画面没有直接来源的力量层。",
      "瞬态和持续层分开处理，避免所有职责挤在同一频段。"
    ],
    "sequence": "启动瞬态 → 机械主体 → 能量尾部",
    "chapters": [
      {
        "id": "start",
        "title": "建立启动动作",
        "question": "怎样让启动时点清楚？",
        "summary": "先用短瞬态锁定画面动作。",
        "stepOrders": [1]
      },
      {
        "id": "body-tail",
        "title": "补足主体与尾部",
        "question": "怎样让动作同时具有重量和持续能量？",
        "summary": "主体负责重量，尾部负责延续能量身份。",
        "stepOrders": [2]
      }
    ]
  },
  "steps": [
    {
      "order": 1,
      "learning": {
        "input": "干净的机械点击素材。",
        "problem": "原素材起点清楚，但无法独立说明机械体量。",
        "action": "保留点击作为启动提示，只让它负责动作起点。",
        "result": "启动时点明确，并为后续重量层留出空间。"
      }
    },
    {
      "order": 2,
      "learning": {
        "input": "低频机械运动与持续能量素材。",
        "problem": "两个持续层直接叠加时会互相遮挡。",
        "action": "让低频承担重量，让较亮的持续层只延续能量。",
        "result": "机械主体和能量尾部拥有清楚的职责分工。"
      }
    }
  ]
}
```

`mergeEntry` must clone plain data, set only `learningMap`, and attach learning by explicit step order. `validateEntry` must call `SfxLearningMap.project` on the merged clone.

- [ ] **Step 4: Implement the builder CLI**

Support these exact modes:

```text
node tools/build-learning-maps.cjs --check --allow-incomplete
node tools/build-learning-maps.cjs --check --category workflow
node tools/build-learning-maps.cjs --check --videos 3JjAK2uhxM4,Ns8e5612fUw
node tools/build-learning-maps.cjs --write
```

`--write` must reject incomplete coverage, use `siteData.replaceRecords`, write a unique sibling with exclusive create, close it, atomically rename it, and print JSON counts for records, steps, warnings, and failures.

- [ ] **Step 5: Extract the approved Veto content into its catalog file**

Copy the current Veto `learningMap` and all 17 ordered `learning` objects exactly, add the catalog review metadata, and keep the same data in `index.html` until the final all-record build.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/learning-map.test.cjs tests/learning-map-catalog.test.cjs tests/veto-video-import.test.cjs`

Expected: all tests PASS; incomplete catalog check reports `1/85 records`, `17/964 steps`, and no invalid entries.

- [ ] **Step 7: Commit**

```powershell
git add tools/learning-map-catalog.cjs tools/build-learning-maps.cjs tests/learning-map-catalog.test.cjs content/learning-maps/scifi/3JjAK2uhxM4.json
git commit -m "feat: add reviewed learning content catalog"
```

### Task 4: Add Evidence Packets And Content Lint

**Files:**
- Create: `tools/prepare-learning-map-review.cjs`
- Create: `tools/verify-learning-content.cjs`
- Create: `tests/learning-content.test.cjs`

- [ ] **Step 1: Write failing review-tool tests**

Require deterministic ignored packets containing record identity, summary, core ideas, materials, every original step, matching effect uses, nearby subtitle cues, and a `reviewed: false` draft. Require linter failures for blank fields, parameter-table language, practice language, generic generated placeholders, duplicate chapter summaries, screenshot/effect identity drift, and unsupported learning text.

```js
assert.deepEqual(Object.keys(packet), ['videoId', 'recordId', 'category', 'evidence', 'draft']);
assert.equal(packet.draft.reviewed, false);
assert.equal(packet.evidence.steps.length, record.steps.length);
assert.throws(() => verifyEntry(parameterHeavyEntry, context), /parameter language/);
assert.throws(() => verifyEntry(practiceEntry, context), /practice language/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/learning-content.test.cjs`

Expected: FAIL because both tools are missing.

- [ ] **Step 3: Implement deterministic review packets**

Write packets only under the six `.work/learning-review/` category directories, using the actual YouTube video ID as the filename. The draft may reuse the summary first sentence, up to three `coreIdeas`, contiguous 2–5 chapter ranges, and source step sentences, but it must remain `reviewed: false` and must never be accepted by the catalog builder.

- [ ] **Step 4: Implement content lint and evidence checks**

Reject `练习`, `作业`, `打卡`, `建议你`, `参数设置`, `设置为`, numeric unit tables, `自动生成`, `待补充`, `未知输入`, and blank boilerplate. For each step, require at least one normalized content token from its source name/detail/materials/effect use in `input`, `action`, or `result`; allow the exact transparent prefix `视频未单独说明处理前问题` in `problem`.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/learning-content.test.cjs tests/learning-map-catalog.test.cjs`

Expected: PASS, and packet generation leaves tracked files unchanged.

- [ ] **Step 6: Commit**

```powershell
git add tools/prepare-learning-map-review.cjs tools/verify-learning-content.cjs tests/learning-content.test.cjs
git commit -m "feat: add learning content review tools"
```

## Content Batch Contract

For Tasks 5–14, every listed video gets one file in its named category directory; the filename is exactly the listed YouTube video ID plus `.json`. Each task follows this sequence:

1. Generate ignored evidence packets for the exact listed IDs.
2. Read every packet and the corresponding source record; rewrite the draft into concrete Chinese facts.
3. Set `reviewed: true` only after all steps, chapter coverage, screenshots, and effects are checked.
4. Run the exact batch check and content lint; expected record/step counts must match.
5. Review the diff for vague repetition, parameter leakage, and invented causality before committing.

The four labels remain fixed, but wording must describe that video's actual design logic. Never average steps mechanically into chapters after review.

### Task 5: Review Workflow Videos

**Files:** Create 10 JSON files under `content/learning-maps/workflow/` for:

`T-Txp62Xp7E`, `g0lt1bjOMWw`, `Ub5ozlVecII`, `hfZnCFgt3TI`, `uh9yIziU8Pk`, `2VQTuApNrPA`, `St6GD7CbdcM`, `ceC_RDgx71s`, `C_5qPsn1GWY`, `xCorcGCP218`.

- [ ] Generate packets: `node tools/prepare-learning-map-review.cjs --category workflow`
- [ ] Author and review all 10 files covering exactly 111 steps.
- [ ] Verify: `node tools/build-learning-maps.cjs --check --category workflow`
- [ ] Lint: `node tools/verify-learning-content.cjs --category workflow`
- [ ] Expected: `10 records`, `111 steps`, `0 warnings`, `0 failures`.
- [ ] Commit: `git commit -m "content: structure workflow learning maps"`

### Task 6: Review Impact Videos A

**Files:** Create 8 JSON files under `content/learning-maps/impact/` for:

`ChlEY5CCv-A`, `1uFMVg7TrGU`, `-vxdSIdNAw4`, `tj5Sn_rZhnk`, `8-DGPoItgcE`, `z_-lgxCj_Do`, `FlZ8V453BfA`, `M0cOtthAje0`.

- [ ] Generate packets with `--videos ChlEY5CCv-A,1uFMVg7TrGU,-vxdSIdNAw4,tj5Sn_rZhnk,8-DGPoItgcE,z_-lgxCj_Do,FlZ8V453BfA,M0cOtthAje0`.
- [ ] Author and review all 8 files covering exactly 100 steps.
- [ ] Run builder check and content lint with the same `--videos` value.
- [ ] Expected: `8 records`, `100 steps`, `0 warnings`, `0 failures`.
- [ ] Commit: `git commit -m "content: structure impact learning maps A"`

### Task 7: Review Impact Videos B

**Files:** Create 8 JSON files under `content/learning-maps/impact/` for:

`2L6qe8uRf0Y`, `cHWeJHlXb54`, `EQw3BCxIRPk`, `eKCYZz98-N4`, `f9OrpDtedSI`, `2cTDQ_MetsE`, `v1IGAnVJylY`, `FuFfkk7dxcY`.

- [ ] Generate packets with the exact eight IDs.
- [ ] Author and review all 8 files covering exactly 77 steps.
- [ ] Run builder check and content lint for the exact eight IDs.
- [ ] Expected: `8 records`, `77 steps`, `0 warnings`, `0 failures`.
- [ ] Commit: `git commit -m "content: structure impact learning maps B"`

### Task 8: Review Science-Fiction Videos A

**Files:** Create 8 JSON files under `content/learning-maps/scifi/` for:

`zxfbE0exXKk`, `Ns8e5612fUw`, `jVifbszcv2c`, `vU0EZlUoW7g`, `nRPOnY3a8YU`, `D0qibJgxYHY`, `cLhevQYlvlI`, `M1KBLV0Zz6I`.

- [ ] Generate packets for the exact eight IDs.
- [ ] Author and review all 8 files covering exactly 96 steps.
- [ ] Run builder check and content lint for the exact eight IDs.
- [ ] Expected: `8 records`, `96 steps`, `0 warnings`, `0 failures`.
- [ ] Commit: `git commit -m "content: structure scifi learning maps A"`

### Task 9: Review Science-Fiction Videos B

**Files:** Create 8 JSON files under `content/learning-maps/scifi/` for:

`iyAwO9g_rAQ`, `YVto08ZB9Lk`, `6oJUotZGz0k`, `h1uYic59pf0`, `Xl5u91oQv-k`, `kv0yNg1CPAk`, `fYqe17OJRNM`, `LyNsYzCN5_A`.

- [ ] Generate packets for the exact eight IDs.
- [ ] Author and review all 8 files covering exactly 86 steps.
- [ ] Run builder check and content lint for the exact eight IDs.
- [ ] Expected: `8 records`, `86 steps`, `0 warnings`, `0 failures`.
- [ ] Re-run the full scifi check; with Veto it must report `17 records`, `199 steps`.
- [ ] Commit: `git commit -m "content: structure scifi learning maps B"`

### Task 10: Review Environment Videos

**Files:** Create 9 JSON files under `content/learning-maps/environment/` for:

`6xUsp9K61Nc`, `ZjRnoIezCnA`, `6MMXjU4mH3w`, `HsFlJ_UJyxs`, `Vlhaimjv1Jw`, `26TcO5_3pxo`, `Pvkfc32V8Mo`, `E_wGGNkVcrw`, `wWms0-ad6fw`.

- [ ] Generate packets: `node tools/prepare-learning-map-review.cjs --category environment`
- [ ] Author and review all 9 files covering exactly 86 steps.
- [ ] Run category builder check and content lint.
- [ ] Expected: `9 records`, `86 steps`, `0 warnings`, `0 failures`.
- [ ] Commit: `git commit -m "content: structure environment learning maps"`

### Task 11: Review Magic Videos A

**Files:** Create 8 JSON files under `content/learning-maps/magic/` for:

`-pmOXv31j6s`, `qB23qR9KMGY`, `TNnLxeWVjM0`, `dxWLnuPUGTE`, `0orLvTF1vj8`, `3yrKFdjORy0`, `dZsVzf2NWw0`, `kFxuNtkv4CU`.

- [ ] Generate packets for the exact eight IDs.
- [ ] Author and review all 8 files covering exactly 88 steps.
- [ ] Run builder check and content lint for the exact eight IDs.
- [ ] Expected: `8 records`, `88 steps`, `0 warnings`, `0 failures`.
- [ ] Commit: `git commit -m "content: structure magic learning maps A"`

### Task 12: Review Magic Videos B

**Files:** Create 8 JSON files under `content/learning-maps/magic/` for:

`ii9vXwAxFSI`, `Ze9enZLKA2I`, `BPuxpbey-Ks`, `ahbdvI6nLgA`, `xWtyeqmjPKk`, `wA5afo1P6tE`, `uP135z2QBTM`, `fpazzwJnMdM`.

- [ ] Generate packets for the exact eight IDs.
- [ ] Author and review all 8 files covering exactly 112 steps.
- [ ] Run builder check and content lint for the exact eight IDs.
- [ ] Expected: `8 records`, `112 steps`, `0 warnings`, `0 failures`.
- [ ] Commit: `git commit -m "content: structure magic learning maps B"`

### Task 13: Review Magic Videos C

**Files:** Create 8 JSON files under `content/learning-maps/magic/` for:

`TOdyCTjzHLE`, `RdVQYDBTB48`, `Ipbfcr-DFTI`, `j4POSc1YeAo`, `yYUB55kMMV8`, `cJ75ykkqV64`, `lLTbxhK_QLU`, `Oo3SRd_94VE`.

- [ ] Generate packets for the exact eight IDs.
- [ ] Author and review all 8 files covering exactly 89 steps.
- [ ] Run builder check and content lint for the exact eight IDs.
- [ ] Expected: `8 records`, `89 steps`, `0 warnings`, `0 failures`.
- [ ] Re-run the full magic check; it must report `24 records`, `289 steps`.
- [ ] Commit: `git commit -m "content: structure magic learning maps C"`

### Task 14: Review Creature Videos

**Files:** Create 9 JSON files under `content/learning-maps/creature/` for:

`ruFsZPu3qO0`, `upBjw_iHT7E`, `WOl66EfI9EQ`, `WdZ9DFDHaqI`, `gLldwkc-0Vs`, `Iz4rtBgqLlg`, `aKkZZ-XeSqs`, `ir8d3PUj5JU`, `NdGNqhV8cpM`.

- [ ] Generate packets: `node tools/prepare-learning-map-review.cjs --category creature`
- [ ] Author and review all 9 files covering exactly 102 steps.
- [ ] Run category builder check and content lint.
- [ ] Expected: `9 records`, `102 steps`, `0 warnings`, `0 failures`.
- [ ] Commit: `git commit -m "content: structure creature learning maps"`

### Task 15: Enforce Full Coverage And Build Learning Data Into The Site

**Files:**
- Modify: `index.html`
- Modify: `tests/learning-content.test.cjs`
- Modify: `tests/veto-video-import.test.cjs`
- Modify: `tools/export-site-memory.cjs` only if required by a failing export test

- [ ] **Step 1: Add failing all-record coverage and preservation tests**

Parse the production site and catalog, assert all current records are represented, all current steps are represented, every entry is reviewed, and every non-learning projection remains deep-equal after merge.

```js
assert.equal(entries.length, records.length);
assert.equal(entries.reduce((sum, entry) => sum + entry.steps.length, 0), 964);
records.forEach((record) => {
  const merged = catalog.mergeEntry(record, byVideoId.get(record.videoId));
  assert.deepEqual(stripLearning(merged), stripLearning(record));
});
```

- [ ] **Step 2: Run coverage tests and verify RED**

Run: `node --test tests/learning-content.test.cjs tests/veto-video-import.test.cjs`

Expected: FAIL because `index.html` still contains only the Veto learning data.

- [ ] **Step 3: Run complete validation and deterministic dry run**

Run: `node tools/build-learning-maps.cjs --check`

Expected: `85 records`, `964 steps`, `0 warnings`, `0 failures`.

Run the builder dry-run twice and compare its output hash; both hashes must match.

- [ ] **Step 4: Atomically write the complete learning data**

Run: `node tools/build-learning-maps.cjs --write`

Expected: one update to `index.html`; every record has `learningMap.version: 1` and every step has exactly four learning keys.

- [ ] **Step 5: Re-run data, export, and portability tests**

Run:

```powershell
node --test tests/learning-map.test.cjs tests/learning-map-catalog.test.cjs tests/learning-content.test.cjs tests/veto-video-import.test.cjs tests/export-site-memory.test.cjs
node tools/export-site-memory.cjs
node tools/verify-portable-kit.cjs
```

Expected: all tests PASS, export is deterministic, verifier reports `ok: true`, `85/85` records, and `964/964` timed steps.

- [ ] **Step 6: Commit**

```powershell
git add index.html content/learning-maps tools tests src
git commit -m "content: publish complete learning maps"
```

### Task 16: Redesign Video Index Cards Around Learning Goals

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing card-render tests**

Require every rendered video card to show `learningMap.goal`, up to three role names, chapter count, step count, source, and category. Reject the old full `record.summary` paragraph and parameter/plugin counts.

```js
assert.match(card, new RegExp(escapeRegex(record.learningMap.goal)));
assert.equal((card.match(/class="card-role"/g) || []).length, Math.min(3, record.learningMap.roles.length));
assert.match(card, new RegExp(`${record.learningMap.chapters.length} 章 · ${record.steps.length} 步`));
assert.doesNotMatch(card, new RegExp(escapeRegex(record.summary)));
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: FAIL because cards still show the legacy summary and processing count.

- [ ] **Step 3: Implement compact learning cards and CSS**

Render goal as the main card summary, role names as compact non-interactive labels, and chapter/step counts in metadata. Keep the entire card as one accessible link and use the complete title in its `aria-label`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: PASS for all 85 card fixtures and existing mode/filter/route contracts.

- [ ] **Step 5: Commit**

```powershell
git add index.html tests/dual-index-site.test.cjs
git commit -m "feat: make video cards learning first"
```

### Task 17: Generalize Video Detail Rendering To All Records

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing all-detail rendering tests**

Loop over every production record and require one learning map, 2–5 chapters, one four-field grid and one folded source detail per step, complete time controls, and no legacy quick conclusion.

```js
records().forEach((record) => {
  const projected = detailData.project(record);
  assert.ok(SfxLearningMap.project(record, projected), record.id);
  assert.match(renderQuickConclusion(record, projected), /30 秒读懂/);
  assert.equal((renderDetailedSteps(record, projected).match(/step-learning-grid/g) || []).length, record.steps.length);
});
```

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: FAIL on any remaining Veto-specific labels/count assumptions.

- [ ] **Step 3: Make labels and layouts adaptive**

Change section navigation label from `快速结论` to `30 秒读懂` when the shared projection is valid. Ensure role grids handle 3–6 items, decision lists handle 2–3 items, chapters handle 2–5 items, and detailed learning resolves by explicit step order rather than array coincidence.

- [ ] **Step 4: Preserve fail-closed legacy fixtures**

Keep unit fixtures for missing version, partial maps, malformed partitions, and unsafe objects; all three render surfaces must fall back together.

- [ ] **Step 5: Run focused and full Node tests**

Run: `node --test tests/dual-index-site.test.cjs tests/learning-map.test.cjs`

Expected: PASS.

Run: `node --test tests/*.test.cjs`

Expected: full suite PASS.

- [ ] **Step 6: Commit**

```powershell
git add index.html tests/dual-index-site.test.cjs
git commit -m "feat: render adaptive learning details site wide"
```

### Task 18: Complete Effect Usage Guides

**Files:**
- Modify: `src/effect-guides.js`
- Modify: `tests/effect-guides.test.cjs`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing five-field guide tests**

Require every published guide to contain exactly `canonicalName`, `evidenceUseId`, `input`, `problem`, `action`, `result`, and `limitations`; require the evidence use to exist, match the canonical effect profile, and own a reviewed screenshot.

```js
assert.deepEqual(Object.keys(guide), [
  'canonicalName', 'evidenceUseId', 'input', 'problem', 'action', 'result', 'limitations'
]);
assert.ok(guide.problem.trim());
assert.ok(guide.limitations.trim());
assert.doesNotMatch(JSON.stringify(guide), parameterPattern);
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/effect-guides.test.cjs tests/dual-index-site.test.cjs`

Expected: FAIL because current guides omit problem and limitations.

- [ ] **Step 3: Author problem and limitation fields for all 27 guides**

Derive `problem` from the guide's evidence use target/purpose and source step; derive `limitations` from the use limitations/evidence boundary. Keep each sentence concise, non-parameterized, and specific to confirmed use.

- [ ] **Step 4: Add fields to strict profile projection and search**

`EffectIndexData.profiles` must reject guides missing either field. Include both fields in effect search, while preserving generated-text and parameter filters.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/effect-guides.test.cjs tests/dual-index-site.test.cjs`

Expected: 27 published profiles, 27 exact screenshots, and all guide tests PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/effect-guides.js tests/effect-guides.test.cjs tests/dual-index-site.test.cjs index.html
git commit -m "content: complete effect usage guides"
```

### Task 19: Redesign The Effect Index

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing effect-card tests**

Require card order: name, suitable input, problem, result, case counts. Keep action out of the compact card but searchable. Require the first image to be the strict evidence screenshot and forbid nested cards.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: FAIL because current cards show result/input/action and omit problem.

- [ ] **Step 3: Implement the use-first effect cards**

Render `适用输入`, `解决问题`, and `得到结果` in that order, followed by video/use counts. Keep goal tabs, source filter, literal search highlighting, empty-state reset, and stable button dimensions.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `node --test tests/dual-index-site.test.cjs tests/effect-guides.test.cjs`

Expected: PASS for 27 cards, all filters, search hints, and screenshot ownership.

- [ ] **Step 5: Commit**

```powershell
git add index.html tests/dual-index-site.test.cjs
git commit -m "feat: redesign effect index around use cases"
```

### Task 20: Redesign Effect Detail Pages

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing effect-detail order tests**

Require one usage overview followed by input, problem, action, result, limitations, then every evidence case. Assert each case has source video, step name, time jump, evidence labels, and its own strict screenshot.

- [ ] **Step 2: Run focused test and verify RED**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: FAIL on missing problem/limitations and old field order.

- [ ] **Step 3: Implement the new detail hierarchy**

Use a semantic `dl` for the five usage fields, a separate unframed limitation band, and the existing two-column case evidence layout. Do not render parameter arrays anywhere in the public effect detail.

- [ ] **Step 4: Verify routes and return behavior**

Retain `#effect=<id>`, timed `#video=<id>&t=<seconds>&section=effects`, keyboard return activation, focus movement, and malformed visual fallback.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `node --test tests/dual-index-site.test.cjs tests/effect-guides.test.cjs`

Expected: PASS for all 27 effect details and 101 timed public cases.

- [ ] **Step 6: Commit**

```powershell
git add index.html tests/dual-index-site.test.cjs
git commit -m "feat: make effect details usage first"
```

### Task 21: Unify Responsive, Print, And Accessibility Behavior

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing structural CSS and accessibility tests**

Require stable grid tracks, `min-width: 0`, `overflow-wrap: anywhere`, card radius at most 8px, no nested card selectors, one-column mobile role/learning layouts, compact chapter buttons, print-expanded source details, contextual labels, and unique section targets.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: FAIL on selectors changed by Tasks 16–20 until unified rules are added.

- [ ] **Step 3: Implement desktop and mobile layout rules**

Keep the desktop player rail and existing activation-only mobile sticky behavior. At `max-width: 640px`, use one-column roles, chapters, four-field rows, and effect facts. At short landscape heights, preserve player controls and caption offsets.

- [ ] **Step 4: Implement print and accessible names**

Print must show every folded source body and hide summaries, sticky controls, filters, lightbox controls, and playback buttons. Every chapter/source/effect control must name its video, chapter, step, or effect context.

- [ ] **Step 5: Run focused and full Node tests**

Run: `node --test tests/dual-index-site.test.cjs tests/detail-navigation.test.cjs tests/youtube-caption-player.test.cjs`

Expected: PASS.

Run: `node --test tests/*.test.cjs`

Expected: full suite PASS.

- [ ] **Step 6: Commit**

```powershell
git add index.html tests/dual-index-site.test.cjs
git commit -m "fix: unify responsive learning layouts"
```

### Task 22: Add Exhaustive Browser Verification

**Files:**
- Create: `tools/verify-learning-ui.py`
- Create: `tests/test_verify_learning_ui.py`

- [ ] **Step 1: Write failing verifier-helper tests**

Test route generation for 85 videos and 27 effects, category representative selection, DOM metric evaluation, overlap detection, horizontal-overflow detection, and failure reporting.

- [ ] **Step 2: Run Python tests and verify RED**

Run: `python -m unittest tests.test_verify_learning_ui -v`

Expected: FAIL because the verifier module does not exist.

- [ ] **Step 3: Implement the Playwright verifier**

The CLI accepts `--base-url`, `--output-dir`, and `--screenshots`. At desktop `1440x1000` and mobile `390x844`, visit every video route and assert one learning map, the record's chapter count, one learning grid/source disclosure per step, zero horizontal overflow, and no page errors. Visit video/effect indexes and all effect details; capture representative screenshots for all six categories plus four primary surfaces under `.work/qa/`.

- [ ] **Step 4: Run helper tests and local browser verification**

Start: `python -m http.server 8891 --bind 127.0.0.1`

Run: `python tools/verify-learning-ui.py --base-url http://127.0.0.1:8891 --output-dir .work/qa --screenshots`

Expected: `85/85 video routes`, `27/27 effect routes`, `0 overflows`, `0 overlaps`, `0 page errors`.

- [ ] **Step 5: Inspect every generated representative screenshot**

Check title wrapping, role density, chapter controls, four-field readability, screenshot/effect identity, player framing, captions, mobile stacking, and absence of nested cards. Record no unresolved visual failures in `.work/qa/report.json`.

- [ ] **Step 6: Commit**

```powershell
git add tools/verify-learning-ui.py tests/test_verify_learning_ui.py
git commit -m "test: verify every learning interface route"
```

### Task 23: Run Final Integrated Verification And Review

**Files:** Verification only unless a failing check requires a focused TDD fix.

- [ ] Run `node --test tests/*.test.cjs`; expect zero failures.
- [ ] Run `python -m unittest discover -s tests -p "test_*.py"`; expect zero failures with only documented environment skips.
- [ ] Run `node tools/build-learning-maps.cjs --check`; expect full current-record/current-step coverage and zero warnings.
- [ ] Hash `skills/sfx-knowledge/references/site-video-memory.json`, run `node tools/export-site-memory.cjs`, and verify the second export is a byte-identical no-op.
- [ ] Run `node tools/verify-portable-kit.cjs`; expect `ok: true` and no failures.
- [ ] Run `git diff --check` and `git status --short`; expect clean output after final commit.
- [ ] Re-run the complete local browser verifier and inspect its report.
- [ ] Dispatch an independent final code/content reviewer against `9aca1c6..HEAD`; fix every Critical or Important finding with a failing regression test and request re-review.
- [ ] Commit any focused review fixes, then repeat all checks affected by those fixes.

### Task 24: Merge Once, Publish Once, And Verify GitHub Pages

**Files:** Git state and public deployment only.

- [ ] Confirm the feature branch is clean and all Task 23 evidence is current.
- [ ] Fast-forward or merge `feat/site-wide-learning-system` into local `main` following the approved branch-finishing workflow.
- [ ] Re-run full Node, Python, builder, portable, and local browser verification on merged `main`.
- [ ] Push `main` once to `origin`.
- [ ] Poll the public Actions API until the Pages run for the exact pushed SHA is `completed/success`; do not infer deployment from push success.
- [ ] Generate a cache-refresh URL with `$cb=[DateTimeOffset]::UtcNow.ToUnixTimeSeconds(); $url="https://zhaoshangqi.github.io/sfx-knowledge-site/?cb=$cb"`, then open `$url` and all four representative hash routes in a fresh browser context.
- [ ] Verify public HTML, `src/learning-map.js`, one subtitle JSON, and representative screenshot assets return HTTP 200 and the expected current markers.
- [ ] Verify the public browser shows 85 current records, adaptive video cards, 30-second maps, chapters, four-field steps, use-first effect cards/details, working subtitles, and zero page errors.
- [ ] Confirm `HEAD`, `origin/main`, and the Pages run `head_sha` are identical; report the SHA, run URL, public URL, final test totals, content coverage, and any documented skips.

---

## Final Acceptance Checklist

- [ ] Every current video has one reviewed catalog file and one valid versioned learning map.
- [ ] Every current step has exactly four non-empty, evidence-grounded learning fields.
- [ ] Original non-learning record data is unchanged by the migration.
- [ ] All four primary surfaces use the approved hierarchy.
- [ ] Every published effect profile has input, problem, action, result, limitation, and a strict screenshot-backed case.
- [ ] Desktop, mobile, print, keyboard, search, routes, player, captions, glossary, and evidence behavior pass.
- [ ] No Critical or Important review finding remains.
- [ ] One final Pages deployment exposes the exact verified `main` SHA.
