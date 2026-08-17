# Magic Sound Design Video Import

## Status

Approved approach: full archive import (方案 A) for two independent video records.

## Sources

### Water Spell Breakdown

- Video ID: `lLTbxhK_QLU`
- Canonical URL: `https://www.youtube.com/watch?v=lLTbxhK_QLU`
- Original title: `Overwatch Style Water Spells: Sound Design Breakdown`
- Site title: `《守望先锋》风格水系法术音效拆解`
- Creator: `Dietrich Dice Sound`
- Published: `2025-12-18`
- Duration: `16:26`
- Available evidence: public 1080p60 video, English automatic captions, and Simplified Chinese automatic captions

### Holy Magic From Original Recordings

- Video ID: `Oo3SRd_94VE`
- Canonical URL: `https://www.youtube.com/watch?v=Oo3SRd_94VE`
- Original title: `I Made Holy Magic Without a Single Sample Library: Sound Design Breakdown & Tutorial`
- Site title: `零素材库制作圣光魔法音效：录音、合成与画面对位`
- Creator: `Michael Cheung`
- Published: `2026-08-17`
- Duration: `25:17`
- Available evidence: public video up to 2160p60, English automatic captions, and Simplified Chinese automatic captions
- No manual subtitle track is available; both caption tracks are machine generated

## Goal

Add both videos as complete but separate learning records. The water-spell record explains how six source groups are selected, layered, processed, and assembled. The holy-magic record explains how original recordings, synthesis, household materials, and four picture-design passes become a coherent spell sound without relying on a sample library. Both records must prioritize reusable design reasoning and concise effect usage over parameter copying or exercises.

## Archive Structure

Each video receives one independent record in the existing video library. Each record must include:

- Embedded YouTube playback with the canonical source link as fallback.
- A site-owned Chinese subtitle track loaded by `videoId`.
- A concise overview of the design target and the final sound's functional sections.
- A chaptered timeline covering every source chapter and every final picture-design section listed below.
- Learning steps that connect each recording, synthesized element, or source group to its role in the final sound.
- Screenshots tied to the exact video moment and the exact source, edit, or effect named by the step.
- Effect-use records only when the processor identity and its role are directly supported by narration or visible evidence.

## Timeline Coverage

### Water Spell Timeline

The review must cover the full `00:00-16:26` timeline, including these source chapters from the creator's description:

| Start | Section |
| --- | --- |
| `00:00` | Final Result |
| `00:17` | Intro |
| `00:45` | Source Examples |
| `02:00` | Source 1 |
| `04:15` | Source 2 |
| `05:32` | Source 3 |
| `07:41` | Source 4 |
| `09:42` | Source 5 |
| `11:26` | Source 6 |
| `12:06` | Video Breakdown |
| `15:52` | Outro |

Chapter labels may be rewritten in Chinese after full review, but timestamps must remain traceable to the source.

### Holy Magic Timeline

The review must cover the full `00:00-25:17` timeline, including these source chapters from the creator's description:

| Start | Section |
| --- | --- |
| `00:00` | Source Recordings |
| `00:46` | Final Design |
| `02:47` | Synths |
| `05:04` | All Building Blocks Showcase |
| `09:22` | Singing Bowl |
| `10:56` | Jingle Bells |
| `12:59` | Bubble Wrap |
| `15:30` | Balloon Deflating |
| `16:22` | Saran Wrap |
| `16:39` | Plastic Wrap |
| `17:57` | Bubble Wrap |
| `18:26` | More Saran Wrap |
| `18:39` | Designing to Video |
| `18:54` | Designing to Video Pt. 1 |
| `20:42` | Designing to Video Pt. 2 |
| `21:13` | Designing to Video Pt. 3 |
| `23:05` | Designing to Video Pt. 4 |
| `24:22` | Variation Generator Pro Tip |

The record must preserve the distinction between raw recording demonstrations, processed building blocks, and the later picture-design passes.

## Evidence Rules

1. Review both full timelines with temporary media stored only under ignored `.work/` paths.
2. Use subtitles to locate statements, then confirm conclusions against the visible project, audible before/after example, or both.
3. Separate creator statements, directly visible facts, audible observations, and analyst inference in the notes.
4. Do not infer plugin names, routing, automation, source identity, or processing order from category knowledge alone.
5. Do not publish a plugin card when one screenshot shows multiple possible processors or when the named processor is not uniquely identifiable.
6. A visible parameter may be recorded as evidence for that exact instance, but the learning summary should explain purpose and audible change rather than teach fixed values.
7. When evidence is insufficient, preserve the useful source/layer lesson and omit the uncertain effect-use record.

## Effect Description Format

Every displayed effect use must answer only these three questions:

- Input: what concrete source or layer is being processed?
- Action: what does the identified effect change?
- Result: what specific audible change does the creator demonstrate or describe?

Avoid generic phrases such as “增强质感”, “更有层次”, or “进行塑形” unless the object and audible result are made explicit. Do not combine several processors into one effect card.

## Screenshot Rules

- Capture evidence from sources prepared at no less than 1080p; the first video offers 1080p60 and the second offers up to 2160p60.
- Create matching `assets/shots/full/` and `assets/shots/preview/` files using the repository naming convention.
- Prefer one screenshot for each major source role, processing decision, or final assembly stage.
- A screenshot must visibly support its title; generic talking-head, unrelated timeline, subtitle-only, or multi-plugin ambiguity frames are not valid effect evidence.
- Register every accepted image in the existing screenshot manifest and reject captures that are unreadable at the site's detail-page size.

## Subtitle Track

- Build `assets/subtitles/lLTbxhK_QLU.json` and `assets/subtitles/Oo3SRd_94VE.json` from their public automatic caption tracks.
- Use the English original track to check terminology and the Simplified Chinese track only as a translation draft.
- Normalize product names, DAW terms, sound-design vocabulary, and sentence boundaries.
- Keep short monotonic cues for overlay, seeking, transcript, and fullscreen synchronization.
- Mark the track `draft` unless the complete Chinese text and timing receive manual review; do not label machine translation as reviewed.
- Register both tracks in `src/video-subtitles.js` and preserve truthful fallback behavior if either track fails to load.

## Repository Integration

- Add both new records without changing existing record IDs or routes.
- Update all generated record, subtitle, and coverage counts from their actual data sources rather than hand-editing display totals.
- Add both complete learning notes to `skills/sfx-knowledge/references/video-learnings.md`.
- Regenerate `skills/sfx-knowledge/references/site-video-memory.md` with the repository tool.
- Keep downloaded video, audio, raw captions, contact sheets, and intermediate analysis files out of Git.

## Verification

Before publishing:

1. Run the focused timeline, record-schema, image-manifest, subtitle, and route tests.
2. Run the complete Node and Python test suites.
3. Run `node tools/verify-portable-kit.cjs` and `git diff --check`.
4. Open both new detail routes in a real browser and verify desktop and mobile layouts.
5. Verify embedded playback, Chinese cue synchronization, transcript seeking, CC visibility, fullscreen overlay, screenshots, and canonical source fallback for both videos.
6. Confirm the repository contains no downloaded media, raw caption files, credentials, cookies, tokens, or machine-specific paths.
7. Commit and push only after all checks pass, then verify the public GitHub Pages route.

## Non-goals

- Hosting the source video or audio in the repository.
- Adding exercises, assignments, or parameter recipes.
- Claiming either redesign is an official game asset or copying either creator's branding as a site identity.
- Filling missing evidence with general plugin documentation or guesses.
- Reworking unrelated records, visual styles, routes, or subtitle tracks.

## Acceptance Criteria

- The site contains 84 unique video records; `lLTbxhK_QLU` and `Oo3SRd_94VE` each appear exactly once.
- Both detail pages play their YouTube videos inside the site and retain working source links.
- The full 16:26 water-spell timeline has been reviewed and all six source chapters are represented.
- The full 25:17 holy-magic timeline has been reviewed, including original recordings, synths, building blocks, four picture-design passes, and the variation-generator tip.
- Both Chinese subtitle assets load and remain synchronized in normal and site fullscreen playback.
- Every visible screenshot matches the named source, step, or uniquely identified effect.
- Every visible effect use has concrete input, action, and audible result evidence; uncertain effects are absent.
- The Skill references and generated site memory include both new records.
- Automated tests, portable verification, browser acceptance, push, and public-page verification all pass.
