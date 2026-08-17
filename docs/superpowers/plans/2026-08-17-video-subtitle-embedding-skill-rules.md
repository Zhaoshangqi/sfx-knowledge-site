# Video and Subtitle Embedding Skill Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the repository and installed `sfx-knowledge` Skill require the site's established YouTube video and site-owned Chinese subtitle embedding behavior.

**Architecture:** Add one contract test to the existing maintenance suite, then add one concise mandatory section to the repository Skill. Keep detailed schemas and commands in the existing workflow documentation, install the verified repository copy locally, and integrate the reviewed feature commit into `main` with a fast-forward merge before pushing.

**Tech Stack:** Markdown, Node.js `node:test`, PowerShell, Git, GitHub Pages repository.

---

### Task 1: Add the Skill contract test

**Files:**
- Modify: `docs/superpowers/specs/2026-08-17-video-subtitle-embedding-skill-rules-design.md`
- Modify: `tests/dry-goods-contract.test.cjs`
- Test: `tests/dry-goods-contract.test.cjs`

- [ ] **Step 1: Append the failing contract test**

Add a contract test that isolates the unique `Website Video and Subtitle Embedding Rule` section between `Video Learning Rule` and `Core Principles`, then loops over readable `[pattern, message]` requirements for every published-playback, temporary-`.work`, subtitle, cue, fullscreen, state, failure, commit-boundary, and documentation rule.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test --test-name-pattern="the repository skill requires embedded video and site-owned subtitle behavior" tests\dry-goods-contract.test.cjs
```

Expected: FAIL because `SKILL.md` does not yet contain the required section heading.

### Task 2: Add the mandatory Skill rules

**Files:**
- Modify: `skills/sfx-knowledge/SKILL.md`
- Test: `tests/dry-goods-contract.test.cjs`

- [ ] **Step 1: Add the rule section after `Video Learning Rule`**

```markdown
## Website Video and Subtitle Embedding Rule

When creating or maintaining the video-learning website:

1. Embed each video in the page with the YouTube IFrame API. Keep the canonical source URL as a fallback; an external jump must not be the primary viewing path.
2. YouTube is the published website playback source. Never host or commit source videos or full audio tracks. Temporary analysis media may be downloaded only into ignored `.work` according to `docs/learning-workflow.md` and must never be published or committed.
3. Keep Chinese subtitles site-owned and independent of YouTube translation. Store validated tracks at `assets/subtitles/<videoId>.json`, register every site video in `src/video-subtitles.js`, and load tracks lazily by video ID.
4. Use the validated short cues as the single timing and text source for the in-player overlay, CC visibility, seeking, and the derived full transcript. Transcript formatting must not rewrite cue text or timing.
5. Keep the subtitle overlay inside the site's fullscreen player wrapper so video and captions remain visible together; do not rely on the YouTube iframe's translated captions.
6. Represent every video's subtitle state truthfully as `track`, `missing`, or an approved `no-speech`. Never claim complete coverage, fabricate a track, or hide a missing state.
7. If subtitles are missing or fail to load, preserve usable video playback and the canonical source link.
8. Never commit source videos, full audio tracks, cookies, login state, raw VTT, local transcription evidence, tokens, or machine-specific paths. Commit only validated Chinese JSON tracks, the generated catalog, code, tests, and documentation.

Use `docs/learning-workflow.md` and `README.md` for the subtitle schema, import commands, coverage reporting, and verification workflow.
```

- [ ] **Step 2: Run the focused test and verify GREEN**

Run:

```powershell
node --test --test-name-pattern="the repository skill requires embedded video and site-owned subtitle behavior" tests\dry-goods-contract.test.cjs
```

Expected: PASS.

- [ ] **Step 3: Check the diff for formatting errors**

Run:

```powershell
git diff --check
```

Expected: no output and exit code 0.

### Task 3: Verify, install, and publish

**Files:**
- Commit: `docs/superpowers/specs/2026-08-17-video-subtitle-embedding-skill-rules-design.md`
- Verify: `skills/sfx-knowledge/SKILL.md`
- Verify: `tests/dry-goods-contract.test.cjs`
- Install to: `$CODEX_HOME/skills/sfx-knowledge/`

- [ ] **Step 1: Run the full repository verification**

Run:

```powershell
node --test tests\*.test.cjs
node tools\verify-portable-kit.cjs
```

Expected: every Node test passes and the portable verifier reports no failures.

- [ ] **Step 2: Install the authoritative repository Skill locally**

Run:

```powershell
powershell -ExecutionPolicy Bypass -File tools\install-sfx-skill.ps1 -Force
```

Expected: the script installs `sfx-knowledge` under the current Codex home and reports the target path.

- [ ] **Step 3: Confirm repository and installed Skill hashes match**

Run:

```powershell
$repoHash = (Get-FileHash -Algorithm SHA256 skills\sfx-knowledge\SKILL.md).Hash
$installedHash = (Get-FileHash -Algorithm SHA256 "$HOME\.codex\skills\sfx-knowledge\SKILL.md").Hash
if ($repoHash -ne $installedHash) { throw "Installed Skill hash mismatch" }
```

Expected: exit code 0 with no mismatch.

- [ ] **Step 4: Commit only the implementation files**

Run:

```powershell
git add docs\superpowers\specs\2026-08-17-video-subtitle-embedding-skill-rules-design.md tests\dry-goods-contract.test.cjs skills\sfx-knowledge\SKILL.md docs\superpowers\plans\2026-08-17-video-subtitle-embedding-skill-rules.md
git commit -m "docs: add video embedding rules to sfx skill"
```

Expected: one commit containing the design specification, implementation plan, contract test, and Skill update.

- [ ] **Step 5: Verify feature-worktree scope before integration**

In the feature worktree, verify the exact changed-file scope and a clean status after committing:

```powershell
git diff --name-only 2fb4d2973603eb37f01941e0fd0d0f36bc47c781..HEAD
git status --short
```

Expected: exactly the four approved files are listed and status is clean.

- [ ] **Step 6: Verify the primary checkout before integration**

In the primary checkout on `main`, fetch `origin` and confirm `main` is clean:

```powershell
git fetch origin
git status --short --branch
```

Expected: `main` is checked out, clean, and ready for integration.

- [ ] **Step 7: Fast-forward the reviewed feature into `main`**

In the primary checkout, merge the feature branch without creating a merge commit:

```powershell
git merge --ff-only feature/video-subtitle-skill-rules
```

- [ ] **Step 8: Push `main` and verify remote synchronization**

Run:

```powershell
git push origin main
git fetch origin
git rev-list --left-right --count origin/main...main
```

Expected: push succeeds and the final count is `0 0`.
