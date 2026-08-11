---
name: sfx-knowledge
description: Use this sound-design knowledge base when designing, critiquing, processing, learning from videos, or iterating game SFX in REAPER or middleware; especially for impact, weapon, magic, melee, sci-fi, water/electric, UI/equip sounds, loop design, transient shaping, plugin-chain order, reverb/delay automation, stereo placement, Wwise implementation, loudness matching, and troubleshooting unclear or weak SFX.
---

# SFX Knowledge

Use this skill as the decision guide for game sound-design work. Prefer it together with:

- `local-sfx-library` when selecting source assets.
- `reaper-plugin-library` when choosing installed plugins.

Load `references/video-learnings.md` when the user asks to design a sound inspired by prior analyzed videos, asks what has been learned, or asks for a game-SFX workflow. Load `references/site-video-memory.md` when exact website-module steps, screenshots, visible parameters, plugin roles, structured effect uses, effect-chain reasoning, or evidence boundaries are needed. Load `references/sfx-knowledge.md` when the user needs the larger historical knowledge base, detailed plugin settings, troubleshooting tables, export targets, or older video-derived notes.

## Video Learning Rule

After every analyzed tutorial/reference video:

1. Require full visual evidence at readable resolution; subtitles may locate moments but cannot be the only source. Skip the video if visuals cannot be obtained.
2. Extract reusable production principles, not just a summary.
3. Record concrete layer roles, plugin chains, visible parameters, routing, automation, middleware behavior, and why each choice works.
4. Treat the output as a complete reference archive: omit exercises and course tasks, but retain every evidenced production decision, parameter, route, automation move, limitation, and failed attempt.
5. Add a new entry to `references/video-learnings.md` using the established format.
6. When working in the website repository, update the video's independent module and regenerate `references/site-video-memory.md` with `node tools/export-site-memory.cjs`.
7. When later designing SFX, actively retrieve relevant entries and combine them with the general principles below.

## Core Principles

- Impact comes from transient shape, not low-frequency stacking. If a sound lacks force, first adjust attack/punch/click/transient speed before boosting bass.
- Build effect chains as serial sculpting. Each plugin should reshape the output of the previous one. Order matters.
- Use physical/organic recordings as the main body when possible; use synth layers to fill missing bands or add stylized motion.
- Reverb and delay can blur impact. Keep wet amount low at the attack and raise it in the decay/tail with automation or staged tails.
- Always compare dry and processed versions at matched loudness.
- Keep low end focused and mostly mono; widen motion, shimmer, water, UI detail, and tails rather than the core hit.
- For interactive game sounds, split by player-perceived event: input feedback, physical motion, UI state change, power/energy detail, sustained loop, confirmation, release/tail.

## Default Impact Chain

For weapon, melee, magic-hit, metal, or sci-fi impact sounds, start from this order and adapt:

1. Transient shaper: define punch, attack/click, speed, and sustain.
2. Filter or EQ tone shaping: remove mud, set brightness, emphasize useful resonance.
3. Controlled space: short room, shimmer, or special reverb with low wet at the transient.
4. Saturation/distortion: add harmonic density and aggression without flattening dynamics.
5. Delay or movement: short delay, Doppler, pitch motion, or stereo motion for direction and depth.
6. Final EQ: narrow cuts for harsh 3-8 kHz resonances; gentle brightness around the neutral presence zone.
7. Optional stereo tool: widen only upper texture/tail layers; keep the core impact centered.

## Equip/UI Sound Chain

For ability equips, HUD popups, sci-fi UI, targeting screens, and magic/tech activations:

1. Instant feedback: short bleep/click on input.
2. Physical layer: hand, cloth, gear, weapon, or object movement.
3. UI/state layer: screen, hologram, magic glyph, targeting reticle, or menu reveal.
4. Detail layer: small "tasty treat" tied to visual micro-motion such as energy outline, light sweep, spark, rune, or servo tick.
5. Sustained loop when the state persists.
6. Confirmation/select blips and release/off transitions.
7. Middleware behavior: loops, fades, crossfades, randomization, and parameter-driven transitions.

## REAPER Workflow

- Keep dry source tracks or staged dry stems before destructive edits.
- Build separate layer tracks instead of forcing every asset through one bus.
- Give each layer a role: transient, body, texture, movement, tail, ambience, loop, UI feedback.
- Make item endings intentional: use fade-outs or pre-rendered faded stems instead of hard cuts.
- A/B plugins one at a time. If a plugin does not add a clear role, bypass or remove it.
- When importing through MCP, stage media in an ASCII-only path first to avoid offline media from path encoding.

## Troubleshooting

- Weak impact: increase transient attack/punch; shorten sustain; do not simply add low EQ.
- Muddy sound: reduce overlapping low-mid energy across layers; separate roles with EQ.
- Tail feels chopped: create longer tail stems or add fades; do not only shorten item length.
- Elements unclear: reduce layer count or carve EQ space; pan water/electric/UI details apart from the core.
- Too wet/soft: reduce reverb wet at attack; automate wet upward after impact.
- Harsh: narrow cut resonances in 3-8 kHz before broad tonal changes.
- UI/equip feels flat: add a subtle detail layer tied to a small visual event.
- Loop feels fake: test loop points with crossfades; a slight pulse can be intentional if it supports the technology/magic style.

## Targets

- Keep enough headroom for later game mix and middleware processing.
- For moderate impact references: RMS around -21 dBFS can be a useful starting point, not a rigid rule.
- Preserve wide dynamic contrast between the transient and decay.
- Export 48 kHz WAV when the game pipeline does not specify otherwise; keep both dry and wet variants when useful.
