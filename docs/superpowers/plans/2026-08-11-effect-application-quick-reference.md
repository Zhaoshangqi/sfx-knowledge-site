# Effect Application Quick Reference Implementation Plan

**Goal:** Replace the dense parameter-oriented effect index with screenshot-backed
effect profiles that explain where an effect fits, what it does, and what audible
result to expect.

**Architecture:** Keep all `effectUses` records as the factual source, then project
them into canonical effect profiles at render time. Each public profile aggregates
matching source uses, derives concise non-parameter copy, and selects no more than
three verified screenshots in this order:

1. A screenshot explicitly linked by the effect use whose source-step title names
   the same single product.
2. A source-video step whose title identifies one and only one matching product.
3. A cataloged official image for the exact product and product version.

Profiles without a reliable screenshot remain available in their source video but
are omitted from the public effect index.

**Tech stack:** Static HTML, CSS, JavaScript, `SfxKnowledgeModel`, Node.js built-in
tests, Python tests, and Playwright browser validation.

## Completed Work

- [x] Add an `EffectIndexData` projection with canonical grouping.
- [x] Prefer verified video screenshots and use official images as fallback.
- [x] Limit each profile gallery to three deduplicated images.
- [x] Reject matches found only in generated chain scaffolding.
- [x] Reject chain labels and names that contain multiple processors.
- [x] Reject bare effect-type names when they do not identify a concrete product.
- [x] Never infer screenshot identity from prose descriptions or effect parameters.
- [x] Require exact product identity for official fallback images.
- [x] Keep product versions isolated and globally assign each video asset to at most one profile.
- [x] Apply search and source filters after global screenshot ownership is fixed.
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

- 66 screenshot-backed public effect profiles with one product name each.
- 27 profiles led by verified video-operation screenshots.
- 39 profiles led by checked exact-product official interface images.
- 0 composite effect names and 0 duplicated video-screenshot ownership.
- 0 broken images after eager loading.
- 0 parameter-unit leaks in public application summaries.
- 82 of 82 video records retained by the portable-kit verification.
