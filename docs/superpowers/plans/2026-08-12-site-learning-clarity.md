# Site Learning Clarity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing dual-index site into a compact learning reference that can be entered by video, effect name, or sound-design goal without changing its evidence standard.

**Architecture:** Keep the static single-page application and inline records. Add one small UMD/CommonJS module for curated effect learning goals, then update the existing render functions and CSS in `index.html`; behavior remains covered by `node:vm` tests.

**Tech Stack:** Static HTML/CSS/JavaScript, CommonJS-compatible UMD modules, Node test runner, Python unittest/pytest compatibility, GitHub Pages.

---

### Task 1: Lock the learning-goal navigation contract

**Files:**
- Create: `src/effect-learning-paths.js`
- Create: `tests/effect-learning-paths.test.cjs`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Write failing coverage tests**

Assert that the module exposes the seven ordered filters, assigns every published guide name to one or two known goals, rejects unknown names, and never duplicates canonical names.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `node --test tests\effect-learning-paths.test.cjs tests\dual-index-site.test.cjs`

Expected: FAIL because `src/effect-learning-paths.js` and the page integration do not exist.

- [ ] **Step 3: Implement the curated navigation module**

Expose immutable `goals()`, `goalsFor(name)`, and `matches(name, goalId)` methods. Keep the mapping separate from `effect-guides.js` so the five evidence fields remain frozen.

- [ ] **Step 4: Load the module before inline application data**

Add a cache-versioned script tag after `effect-guides.js` and before the inline records.

- [ ] **Step 5: Run the focused tests**

Expected: PASS.

### Task 2: Compact the site shell and control band

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Add failing markup assertions**

Cover useful header statistics, a compact control band, visible section headings, an effect-goal navigation target, search labels, and concise card `aria-label` values.

- [ ] **Step 2: Run the dual-index test and confirm failure**

Run: `node --test tests\dual-index-site.test.cjs`

- [ ] **Step 3: Restructure the shell markup**

Move the view switch and toolbar out of the large introduction block into a full-width control band. Keep all existing element IDs so routing and event wiring remain stable.

- [ ] **Step 4: Update responsive shell CSS**

Reduce hero height, keep controls on one desktop row, use two compact filter columns on mobile, and make category/goal rows horizontally scrollable on narrow screens.

- [ ] **Step 5: Run the dual-index test**

Expected: PASS.

### Task 3: Make the effect index goal-first and scannable

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`

- [ ] **Step 1: Add failing behavior tests**

Load the effect filter helpers in `node:vm` and assert combined goal, source, and query filtering; query highlighting must escape source text before adding `<mark>`.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests\dual-index-site.test.cjs`

- [ ] **Step 3: Implement goal state and rendering**

Add `effectGoal` state, render goal buttons with counts, filter published profiles through `SfxEffectLearningPaths.matches`, and reset the goal when the empty-state action is used.

- [ ] **Step 4: Rewrite the effect card hierarchy**

Render result first as the primary sentence, followed by compact input and action rows. Keep screenshot ownership, source counts, and evidence gating unchanged.

- [ ] **Step 5: Add safe visible-match highlighting**

Escape all text, then wrap only the case-insensitive literal query match in `<mark class="search-hit">`.

- [ ] **Step 6: Run the focused tests**

Expected: PASS.

### Task 4: Strengthen detail-page evidence and video scanning

**Files:**
- Modify: `index.html`
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `tests/dry-goods-contract.test.cjs`

- [ ] **Step 1: Add failing render-contract assertions**

Require “能得到什么”, “适合什么输入”, “怎么处理”, “证据截图”, and “看图重点” in the effect detail renderer. Assert that “看图重点” comes from `visual.stepName` and that no parameter tutorial copy is added.

- [ ] **Step 2: Run the relevant tests and confirm failure**

Run: `node --test tests\dual-index-site.test.cjs tests\dry-goods-contract.test.cjs`

- [ ] **Step 3: Recompose effect details**

Put the result-led summary and primary evidence visual in the first grid. Show source, step/time, and the verified step name below the image; render remaining visuals as supporting cases.

- [ ] **Step 4: Tighten video cards and long-form rhythm**

Clamp index summaries, simplify metadata hierarchy, and reduce reader title/section spacing without deleting any record data or detail section.

- [ ] **Step 5: Run the relevant tests**

Expected: PASS.

### Task 5: Complete regression and visual verification

**Files:**
- Modify only if verification reveals a defect.

- [ ] **Step 1: Run the full automated suite**

Run: `node --test tests`

Run: `python -m pytest tests\test_prepare_sfx_video.py`

- [ ] **Step 2: Run repository verification**

Run: `node tools\verify-portable-kit.cjs`

Run: `node --check src\effect-learning-paths.js`

Run: `git diff --check`

- [ ] **Step 3: Verify the rendered page**

Check video index, effect goal filtering, empty-state reset, effect detail, cross-link back to video, and image lightbox at desktop, tablet, and mobile sizes.

- [ ] **Step 4: Inspect the final diff and repository status**

Confirm that no media, cookies, credentials, local absolute paths, `.work` files, or unrelated changes are included.

- [ ] **Step 5: Commit and push**

Commit the verified implementation to `feature/video-knowledge-dual-index` and push it to the existing Pull Request.

