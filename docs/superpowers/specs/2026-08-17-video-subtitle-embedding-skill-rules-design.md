# Video and Subtitle Embedding Skill Rules

## Goal

Make the repository `sfx-knowledge` Skill explicitly preserve the site's proven video and subtitle architecture whenever a video-learning page is created or maintained.

## Chosen Approach

Add a concise, mandatory section to `skills/sfx-knowledge/SKILL.md` and keep the detailed operating procedures in `docs/learning-workflow.md` and `README.md`. The Skill will state the non-negotiable product and publishing rules; the existing documents remain the source for commands and file schemas.

## Required Rules

1. Embed each YouTube video inside the site through the YouTube IFrame API. Keep the canonical source URL as a fallback, but do not make an external jump the primary viewing path.
2. YouTube is the published website playback source. Never host or commit source videos or full audio tracks. Temporary analysis media may be downloaded only into ignored `.work` according to `docs/learning-workflow.md` and must never be published or committed.
3. Keep Chinese subtitles site-owned and independent of YouTube translation. Store validated tracks as `assets/subtitles/<videoId>.json`, register every site video in `src/video-subtitles.js`, and load tracks lazily by video ID.
4. Synchronize short subtitle cues to the embedded player. The same cues drive the in-player overlay, CC visibility, seeking, and the derived full transcript; transcript formatting must not rewrite cue timing or text.
5. Preserve subtitles in the site's fullscreen player wrapper so the video and overlay remain visible together. Do not depend on the YouTube iframe's native subtitle translation.
6. Represent coverage truthfully as `track`, `missing`, or approved `no-speech`. Never claim every video has subtitles, fabricate tracks, or silently hide a missing state.
7. Preserve the canonical source link and usable video playback when a subtitle track is missing or fails to load.
8. Commit only validated Chinese JSON tracks, the generated catalog, code, tests, and documentation. Never commit media, cookies, login state, raw VTT, local transcription evidence, tokens, or machine-specific paths.

## Verification

Add a repository contract test that reads `skills/sfx-knowledge/SKILL.md` and requires the section to cover:

- YouTube IFrame API embedding and source-link fallback.
- Published playback-source semantics and temporary ignored `.work` analysis media boundaries.
- Site-owned Chinese JSON subtitles and lazy loading by video ID.
- Cue synchronization, CC, seeking, transcript derivation, and fullscreen overlay behavior.
- Truthful `track`, `missing`, and `no-speech` states.
- Prohibited media and credential commits.
- Allowed validated JSON, catalog, code, test, and documentation commits.

Run the focused contract test first and confirm it fails before editing the Skill. After the edit, rerun the focused test, the full Node test suite, and `node tools/verify-portable-kit.cjs`.

## Deployment

Treat the repository copy as authoritative. After verification, run `tools/install-sfx-skill.ps1 -Force` to synchronize the installed Codex Skill, confirm the installed and repository `SKILL.md` hashes match, then commit and push `main` to `origin`.
