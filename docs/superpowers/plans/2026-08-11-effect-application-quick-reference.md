# Effect Application Quick Reference Implementation Plan

**Goal:** Replace the dense parameter-oriented effect index with screenshot-backed
effect profiles that explain where an effect fits, what it does, and what audible
result to expect.

**Architecture:** Keep all `effectUses` records as the factual source, then project
them into canonical effect profiles at render time. Each public profile aggregates
matching source uses, derives concise non-parameter copy, and selects no more than
three verified screenshots in this order:

1. The screenshot explicitly linked by the effect use.
2. A source-video step whose title or factual description names the effect.
3. A cataloged official product image.

Profiles without a reliable screenshot remain available in their source video but
are omitted from the public effect index.

**Tech stack:** Static HTML, CSS, JavaScript, `SfxKnowledgeModel`, Node.js built-in
tests, Python tests, and Playwright browser validation.

## Completed Work

- [x] Add an `EffectIndexData` projection with canonical grouping.
- [x] Prefer verified video screenshots and use official images as fallback.
- [x] Limit each profile gallery to three deduplicated images.
- [x] Reject matches found only in generated chain scaffolding.
- [x] Prevent generic effect terms from claiming product-specific screenshots.
- [x] Omit uncertain profiles that have no reliable screenshot.
- [x] Replace the dense effect rows with responsive screenshot cards.
- [x] Keep only search and source filters in effect mode.
- [x] Show only effect name, suitable material, purpose, audible result, and cases.
- [x] Remove parameter, vendor, chain-position, and evidence UI from effect pages.
- [x] Replace technical control text and numeric units with plain application copy.
- [x] Reuse the same concise profile copy in video-detail effect summaries.
- [x] Preserve stable video/effect hash navigation and keyboard return behavior.

## Verification

- [x] `node --test tests\\*.test.cjs`
- [x] `python -m pytest tests\\test_prepare_sfx_video.py -q`
- [x] `node tools\\verify-portable-kit.cjs`
- [x] Parse every inline script with Node's `vm.Script`.
- [x] Run `git diff --check`.
- [x] Validate desktop and mobile layouts in Chromium.
- [x] Force-load every effect-card image and verify no image is broken.
- [x] Confirm no parameter units remain in the three public summary fields.

## Acceptance Snapshot

- 256 screenshot-backed public effect profiles.
- 202 profiles led by verified video-operation screenshots.
- 54 profiles led by checked official interface images.
- 0 broken images after eager loading.
- 0 parameter-unit leaks in public application summaries.
- 82 of 82 video records retained by the portable-kit verification.
