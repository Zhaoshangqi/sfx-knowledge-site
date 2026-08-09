# Video Learnings

This file is the reusable memory bank for analyzed sound-design videos. Add one concise entry per video. Focus on techniques that can be applied when designing new SFX.

## Entry Forma

```markdown
## YYYY-MM-DD - Short title

- Source: URL or video id
- Domain: equip / weapon / magic / UI / loop / impact / ambience / etc.
- Reusable pattern: one paragraph describing the core production strategy.
- Layer map: list layer roles and what each layer contributes.
- Plugin and processing notes: concrete chains, visible parameters, automation, routing, and middleware details.
- Design principles learned: bullets that can guide future original SFX.
- Use when: prompts or sound types where this entry should influence the design.
```

## 2026-05-09 - Valorant Tejo Rockets Equip Sound

- Source: `https://www.youtube.com/watch?v=jVifbszcv2c`
- Domain: sci-fi ability equip, tactical shooter UI, targeting HUD, sustained loop, Wwise loop implementation.
- Reusable pattern: Build the equip as a sequence of player-perceived events rather than one composite sound. The Tejo rocket equip separates instant input confirmation, gauntlet/hand foley, HUD/screen reveal, a subtle energy-detail layer, a sustained targeting loop, and selection blips. Each layer answers a specific question for the player: "did I press it?", "what moved?", "is the UI ready?", "what extra detail makes it satisfying?", "what state am I holding?", and "did I select a target?"
- Layer map:
  - `Bleep`: short digital feedback at the start; confirms the button press. Keep it brief and tame piercing highs with EQ.
  - `Foley`: glove, gauntlet, jacket, shield/visor motion, and rocket-mechanism material. Mostly subtractive processing; limit low end and overly wide stereo so it sits in front.
  - `Screen`: fuzzy CRT/HUD reveal layer; marks the screen/map coming online and the ready-to-select moment.
  - `Tasty Treat`: small energy-outline/glassy detail after the screen appears. It is not the main action, but it adds the premium satisfaction layer.
  - `Loop`: sustained state sound while the player holds the targeting screen open. In this video it starts from a power-amp hum and is sculpted into a high-tech idle texture.
  - `Select Location`: small confirmation blips for target selection.
- Plugin and processing notes:
  - `FabFilter Pro-Q 3` / `ReaEQ`: used repeatedly for subtractive shaping. Visible loop-chain high-cut point: about `4812.3 Hz`, `Q 0.895`, `12 dB/oct`. Narration also calls out trimming plugin-chain noise around `12-13 kHz`.
  - `Waves Z-Noise`: used on the Tasty Treat to remove scratchy/white-noise material while preserving glassy/plinky energy.
  - `KHS Reverb`: pushes subtle detail layers back so they feel integrated instead of pasted on.
  - `Waves S1 Stereo Imager`: narrows material so it sits in front rather than wrapping the listener. Tasty Treat width visible around `0.72`; loop width visible around `0.32`.
  - `ReaPitch`: pitches the hum/loop material upward before further design.
  - `Soundtoys Crystallizer`: used on the loop for granular/delay sci-fi character. Visible label/preset: `Atari Sounds`; visible values include `Pitch -1200 cent`, `Splice 0.1 msec`, `Delay 0.1 msec`. Do not assume 100% wet; blend original and processed signal by ear.
  - `Soundtoys PhaseMistress`: adds moving phase/tech modulation to the loop. Visible values include `Attack 0.1ms` and `Release about 197.8ms`.
  - `Wwise`: handles the in-game loop. The exported loop does not need a printed fade-in; Wwise can fade it in and crossfade the loop point. A slight pulse at the loop point can be an intentional tech feel.
- Design principles learned:
  - For equip sounds, design by interaction state and visual event, not by asset count.
  - "Tasty treat" details matter: small visual changes like energy outlines, glows, lights, screen traces, or glyph motion deserve subtle sounds.
  - Ordinary sources such as `power amp hum` can become sci-fi loops through filtering, pitch, granular echo, phase modulation, stereo control, and reverb.
  - Foley often needs less width and less low end to feel like it is attached to the character/object in front of the player.
  - A loop point can have personality. A perfectly invisible loop is not always better if a tiny pulse supports the device behavior.
- Use when: designing Valorant-style ability equips, sci-fi weapon readiness sounds, targeting UI/HUD sounds, hologram/map activation, powered-device idle loops, and any effect where the user asks for "premium detail", "game-ready interaction feedback", or "Wwise-ready loop behavior".

## 2026-05-09 - Boom Source Redesign With Long FX Chain

- Source: `https://www.youtube.com/watch?v=tj5Sn_rZhnk`
- Domain: explosion/boom redesign, cinematic impact, kit-bashing, destructive variation rendering, final impact bus processing.
- Reusable pattern: Treat a pre-designed boom as raw material, not as the finished sound. Push it through many small serial changes: cleanup, subtle modulation stacks, resonant sweeps, controlled grit, clipping for headroom, dynamic multiband carving, aggressive limiting, pitch/formant transformation, and tremolo/envelope-driven variation. Render a batch of variants, then use the best ones as separate layers in the real design and finish them with spectral cleanup plus bus processing.
- Layer map:
  - `Source boom`: CTDS2 HIT EXPLOSION Hard Rock, playback-rate shifted and used as the starting transient/body/tail material.
  - `Movement stack`: multiple low-mix flangers/phasers/filters create motion without sounding like one obvious modulation effect.
  - `Density stack`: Decapitator, Indent 2, Pro-L 2, and L3-style limiting add crunch, clip peaks, create headroom, and raise apparent density.
  - `Transformation stack`: Manipulator pitch/formant changes and Shade tremolo/follower modulation create alternate identities from the same source.
  - `Rendered variants`: variations are printed, auditioned, and arranged as separate impact/body/tail/texture/bass layers.
  - `Final bus`: Gullfoss/Soothe/Pro-MB/Saturn/MLimiterMB balance brightness, tame harshness, reshape low-frequency behavior, add drive, and tighten multiband loudness.
- Plugin and processing notes:
  - `Waves Z-Noise`: first in the chain; cleans noise/details while leaving or adding a slightly warbly modulated character.
  - `u-he Uhbik-F`, `kHs Flanger`, `Soundtoys PhaseMistress`, `Waves Enigma`: use several subtle modulators rather than one dramatic one. Solid Flange and Washi Flange are mentioned; PhaseMistress uses dirt mode for a little bubble; Enigma adds delay-based spectral movement.
  - `Soundtoys FilterFreak`: Fat-mode resonant sweep for squelchy high-end motion.
  - `Soundtoys Decapitator`: grit at about `32%` mix; full wet can sound tasty but may dominate the source.
  - `Unfiltered Audio Indent 2`: Tube input clipping plus Soft Clip output, both around `0.5x`, with `100%` mix. The point is to shave peaks and get headroom for more downstream processing.
  - `FabFilter Pro-MB`: dynamically tucks around `370 Hz` based on bass content, reduces boxiness, and later changes low-frequency behavior over time. Use dynamic bands when the problem is temporal behavior, not just tone.
  - `FabFilter Pro-L 2`: Transparent style with roughly `+30 dB` gain from narration; visible gain is about `+28.58 dB`. This was called a key ingredient.
  - `Polyverse Manipulator`: pitch up (`1.44` visible), formant down (`-4.41` visible), dry/wet around `63%`. Avoid 100% wet if it locks onto a harsh resonant high tone.
  - `UVI Shade`: `NS - Tremolo Premier` preset; custom multi-segment tremolo plus envelope follower. Visible values include speed about `1.92x`, depth about `54.9%`, follower attack `5 ms`, release `152 ms`. Toggle it on/off while changing pitch or rate to print varied material.
  - `Unveil` / `Unfilter` / `Gullfoss`: run as a batch after rendering to rebalance spectrum, trim low end, control sustain, emphasize transients, make the sound closer, and avoid keeping CPU-heavy processors live.
  - `Soothe2`, `Saturn`, `MLimiterMB`: final stage. Soothe tames ouchy/crunchy transient frequencies, Saturn brings back bass and drive, and multiband limiting can "whiten" the spectrum by compressing poking bands differently.
- Design principles learned:
  - Long chains work when each processor has a tiny job. If a plugin has no audible role, bypass it; if it has a role, keep the dose intentional.
  - Several subtle movement processors can make a source feel alive without telegraphing flanger/phaser as an effect.
  - Distortion and clipping are also gain-structure tools. Use them to create headroom and density before more processing.
  - Dynamic multiband tools are for changing how a frequency range behaves over time; do not replace them with static EQ when punch, boxiness, or low-end decay is the issue.
  - Print exploratory chains into a variation pool. Then design from selected layers instead of leaving random, CPU-heavy chains live forever.
  - Mastering-style processors on SFX are not just about loudness: use them to manage harshness, brightness, low-end timing, drive, and spectrum shape.
- Use when: designing explosions, sci-fi impacts, cinematic booms, magic impacts, monster/vehicle hits, trailer hits, or any task where a pre-designed library sound needs to become a new original asset through resynthesis, variation rendering, and final bus shaping.

## 2026-05-09 - BeckyS Audio Channel Sound-Design Experiments

- Source: `https://www.youtube.com/@BeckySAudio/videos`
- Domain: broad game-SFX practice: source recording, creature, magic, water, UI, weapon, ambience, footsteps, Wwise/Unity implementation.
- Reusable pattern: BeckyS repeatedly turns ordinary source recordings into reusable texture palettes. The pattern is: record or choose an organic source, exaggerate scale with playback rate/pitch, use one or two identity-changing processors such as granular, resonant filtering, pitch/formant, delay/glitch, or feedback, render several variants, then cut those variants into layers with clear roles. Longer redesign videos add a second pattern: build atmosphere first, split visual events into cast/release/impact/tail/UI states, and only then fill each event with processed sources.
- Layer map:
  - `Organic source`: water, rock, soil, celery, dog, bird, cardboard, knife, raincoat, door, goose, paper, bottle, glass, footsteps, and field ambience provide believable texture.
  - `Scale layer`: pitch/playback-rate changes make tiny material read as giant sword, monster, alien wildlife, space rock, or looming horror.
  - `Motion layer`: FilterFreak, Morph EQ, Mobius Filter, Wave Warper, Stutter Edit, Transmutator, delay and pan automation bind sound to visual movement.
  - `Texture layer`: granular, resonator, formant, flanger, chorus, phaser, feedback and glitch processors create shimmer, bubble, robot, creature and sci-fi detail.
  - `Impact/body layer`: transient shaper, saturation, low thump, rifle/metal/stone layers, and controlled mono low end provide physical hit.
  - `Tail/space layer`: Crystallizer, Little Plate, Blackhole, Space Lite and reverb tails are usually better on duplicated or tail-only layers than on the attack.
  - `Implementation layer`: Wwise containers, material switches, pitch/volume randomization, avoid-repeat and initial delay turn a designed sound into interactive behavior.
- Plugin and processing notes:
  - `Manipulator`: pitch/formant identity changes for dog-to-monster, boom variants, bubble dissolve, rock sci-fi impact. Keep dry/wet under control if harsh resonances appear.
  - `Faceplant/Phase Plant`: granular and sampler patches with randomizer/LFO routing for shimmer, heartbeat, tiny robot voice, horror drone, and playable impact instruments.
  - `Wave Warper 2`: start with whoosh presets, replace module sources, use XY/radius to modulate volume/rate/filtering for silky pass-bys.
  - `Stutter Edit 2`, `Transmutator`, `Cataract`, `Black Mask`: perform and record outputs to make glitch, dissolve, rewind and water-creature texture pools.
  - `FilterFreak`, `Morph EQ`, `Mobius Filter`: use movement or morph automation as the audible gesture, especially for magic casts, rock buildup, resonant alien textures and underwater movement.
  - `Crystallizer`, `Little Plate`, `Blackhole`, `Space Lite`: build shimmer and space, but keep transients readable by using wet-only duplicates or tail-focused layers.
  - `Wwise + Unity`: build switch/random containers by surface material, add generic/sweetener/accessory layers, randomize pitch/volume, set avoid-repeat based on file count, and randomize accessory delay.
- Per-video distilled techniques:
  - `6xUsp9K61Nc` Noisevember Day 23 Wildlife (creature ambience / exotic wildlife): 把普通鸟叫和野外录音拉慢到约 0.3-0.4 播放率，音高自然下沉后会变成异域森林或外星生态。处理重点不是堆效果，而是先用 EQ 去掉雨声、噪声和刺耳共振，再少量补进几条 exotic bird 素材，让生态层次更像一个真实地点。
  - `-pmOXv31j6s` Noisevember Day 22 Silky (whoosh / vehicle pass-by): 用 Wave Warper 2 的 whoosh 预设当骨架，然后替换模块里的音频源。XY/radius 控制主要驱动音量、rate 和滤波运动，能把素材揉成丝滑、饱满的飞船掠过声。核心是把插件当成动态合成器，而不是固定预设库。
  - `ZjRnoIezCnA` Noisevember Day 21 Dissolve (bubbles / dissolve / alchemy): 从气泡录音出发，先用 Manipulator 强化谐波和低频细节，再用 Crystallizer 的 Crystal Builder 类预设制造结晶尾巴，最后用 Transmutator 这类多模块效果生成正向和反向的溶解质感。一个小气泡可以变成药锅、魔法液体或酸蚀溶解。
  - `ruFsZPu3qO0` Noisevember Day 18 Hairy (creature growl): 狗的低吼和呼吸通过 Manipulator 降谐波、压低音高、强调粗糙 formant 后，可以变成大型怪物。关键不是让狗叫更低，而是保留喉咙摩擦和呼吸的生命感，再把比例和音域放大。
  - `vU0EZlUoW7g` Noisevember Day 17 Stutter (glitch / alien sweep): 把 drones 或普通音频文件送进 iZotope Stutter Edit 2，现场弹奏和录制预设输出，得到断续、切片、门限式的外星扫动。它适合先生成一批 glitch/sweep 源素材，再从里面剪出 UI、传送、能量故障片段。
  - `6MMXjU4mH3w` Noisevember Day 16 Terrifying (horror drone / cave creature): Phase Plant/Faceplant 里用多个 granular 模块叠层：上层是空气感呼吸，低层是下移的 growl，长尾 creature growl 再进第三个粒子模块。ensemble、reverser、reverb 和 pan spread 把它拉成恐怖洞穴无人机，不同音高输出可当高低两组素材。
  - `HsFlJ_UJyxs` Noisevember Day 15 Opposite (reverse delay / stereo drone): Love 插件的 ping-pong delay 和 Snap Heap 里的 bounce/dual delay 能把素材变成低调、宽阔的科幻 drone。做法是先降低 tone，保留立体声回声运动，再用 de-click/de-crackle 清理处理伪影。
  - `qB23qR9KMGY` Noisevember Day 14 Inner Peace (shimmer drone / meditation magic): 复用 Day 12 的 Faceplant shimmer patch，把新素材拖进去替换粒子源。酒杯尾音可跳过 transient，只喂 tail；某些层直接路由到 Lane 3 绕开前面的滤波和 Lane 2，让同一个 patch 在安静魔法、精神空间和高频氛围之间快速换皮。
  - `8-DGPoItgcE` Noisevember Day 13 Ouch (weapon impact / sci-fi hit): 多数层来自同一段 rifle 录音：低冲击用尾巴增强和 Beat Slammer，闷击用 Deja Vu、Memory、Sub Filter，瞬态层用 EQ 和 transient shaper，科幻纹理用 Cryogen、Glitch、Manipulator。再用机甲声做前后动作，母线用 Ozone EQ、Inflator 和 limiter 收口。
  - `TNnLxeWVjM0` Noisevember Day 12 Shimmer (granular shimmer patch): Faceplant 里两个 granular 模块由 randomizer 控制 grain position 和第二组粒子的 level，后面经过问题频段滤波、Ensemble 扩宽、reverb 和高频聚焦滤波。这个 patch 的价值是可替换源音频，快速生成长尾 shimmer、能量环境或魔法光雾。
  - `nRPOnY3a8YU` Noisevember Day 9 Tiny (tiny robot voice / creature UI): 从 noise 做出小机器人/老鼠声：fast randomizer 同时控制 gain、filter cutoff、resonator、formant filter 和 flanger。resonator 让噪声像声道，flanger 负责颤动；如果要更像对话，把 randomizer 换成按节奏画好的 LFO。
  - `upBjw_iHT7E` Noisevember Day 8 Organ (heartbeat / internal body): 用 noise 和快速 envelope 做心跳形状；Lane 1 下移 pitch 并低通，Lane 2 用 LFO 每次音符内上推 pitch shifter，resonator 填身体共鸣，Lane 3 的 reverb/phaser 和 50% spread 让它像在头内或身体内部跳动。
  - `dxWLnuPUGTE` Noisevember Day 7 Glow (dark portal / glow): 暗黑传送门由四层组成：岩石碎裂纹理来自 Day 4，免费 glitch 素材拉慢到 0.5 并切掉共振低频，glow 层下移音高后用 Blue Cat Chorus 加厚，另一层直接 -24 半音制造恐怖低光感。发光不一定要亮，低八度能让它变危险。
  - `z_-lgxCj_Do` Noisevember Day 6 Pressure (horror pressure stinger): 用 kick 和金属 impact 做压力释放式 stinger。主 hit 过 Spacer，grain delay 生成节奏化回声；复制一层关掉 grain delay 保留共同空间。再加低金属层、sub impact、Crystallizer 并行容器、reversed reverb buildup 和 wood 高频，形成 buildup 到压力破裂的结构。
  - `Vlhaimjv1Jw` Noisevember Day 5 Resonant (resonant alien texture): 纸板刮擦先过 Morph EQ 的 Twin Peaks，并给 morph 参数做 modulation，录出来后再进 Love 的 swarm granular。低频版本加 Rift Feedback Lite，复制拉慢到 0.3 变外星低吼；另一路加 stereo spread 和 Transmutator。普通刮擦可以被共振峰和反馈变成完整素材池。
  - `FlZ8V453BfA` Noisevember Day 4 Instrumental (instrument patch / impact generator): 先从 Sound Effects Pro 9000 add-on 取输出，再拖回 Faceplant sampler patch。所有 gain 受 envelope 控制，randomizer 同时改 pitch shifting 和 sample offset；Lane 1 的 chorus/compression/flanger 负责运动，其他层经 transient shaper 统一冲击。它像一个可演奏的 SFX 打击乐器。
  - `M0cOtthAje0` Noisevember Day 3 Sandwich (giant sword from small knife): 小刀声通过拉慢、切片和分轨，能变成巨剑。并行 Reaper containers 里放三组 Manipulator 预设，再整体 pitch down；whoosh 和 impact 来自金属 hit 与刀砍木头，所有层用相似的 stereo/space 处理黏在一起。
  - `26TcO5_3pxo` Noisevember Day 2 Bubbly (water ambience / bubble UI): 长水流、水听器和稳定气泡录音被拉长做水下 ambience，EQ 去多余低频，Blackhole 把空间统一。UI select 则剪小气泡瞬态，叠加 phase、OTT 和 transient shaper；反向气泡用 plop 提速升调、reverse chop 和更快 rate 叠成选择反馈。
  - `0orLvTF1vj8` Sound Design Experiments Ep 4: Magic Casting (magic casting / spell whoosh): 用雨衣/尼龙等日常材料做魔法 whoosh 源，先通过噪声/音调分离类处理留下 tonal 低频魔法感，再用 FilterFreak、Wave Warper、Snap Heap follower、pitch shifting、Ravage/rumble、MicroShift 和 OTT 生成一批可剪素材。重点是先做 palette，再用 palette 重设 Arcane 画面。
  - `WOl66EfI9EQ` Sound Design Experiments Ep 3: Embers of Mirrim Redesign (creature magic / orb color variation): 先用 drone、玻璃 ringing 和 Crystallizer/Little Plate wet-only 层铺出闪烁高频，再用水瓶 plop、瓶子、锁芯和 phaser/ring mod/filter motion 做生物和能量喷出。绿色/紫色 orb 复用同一组层，但用不同 pitch 和高频 EQ 区分颜色与魔法属性。
  - `3yrKFdjORy0` Sound Design Experiments Ep 2: Mages of Mystralia Spell Redesign (spell cast / explosion / pickups): 先做草地、鸟、水瀑、脚步等 atmosphere 并按画面 pan/automate，再把法术拆成 casting、release、explosion 和 pickup。门吱声、反向开关、浴室门、鹅 hiss、纸张火焰和 Devil-Loc/Decapitator 填满频谱，让魔法既有动作轨迹也有爆炸重量。
  - `g0lt1bjOMWw` Wwise + Unity Footstep Implementation Walkthrough (middleware / footsteps): Unity FPS controller 改为调用 Audiokinetic engine，Wwise 中按材质建立 random containers：grass、dirt、wood、stone 等，再叠 generic、sweetener、bag/key 层。每层做音量/音高随机、avoid-repeat 和初始延迟随机，让脚步既响应材质又不会机械重复。
  - `D0qibJgxYHY` Becky Street - No Man's Sky - Sound Redesign (short full-scene redesign): 这条没有字幕，只有 31 秒成片型 redesign，因此只作为视觉/成品参考，不强行推断看不到的插件链。可学习的是短片级完整性：飞船、环境、UI、动作和过渡都必须在同一声场里，而不是孤立展示单个素材。
  - `Pvkfc32V8Mo` Sound Design Experiments Ep 1: Water Sounds (recorded water / creature texture): 用 RODE NT1-A 和 Zoom F8 录水冲击、水滴、泼溅和水体运动，本来服务 shooter game，后来把水体 movement 送进 Soundtoys 和 Glitchmachines Cataract 试验，得到类似生物的液体纹理。录音素材先覆盖互动需求，再把长 movement 变成可再设计纹理。
- Design principles learned:
  - A finished SFX often starts as a library of rendered experiments. Name and save useful outputs as palettes instead of leaving random heavy chains live.
  - Ordinary recordings are strongest when each layer keeps a physical reason to exist: crack, scrape, breath, bubble, thump, air, shimmer, debris, or accessory movement.
  - Use playback-rate and pitch changes before complex plugins when changing scale; then add formant/granular/resonant processing for identity.
  - Automate pan, width, low-pass, filter morph, delay or reverb to follow picture. Static processing rarely feels attached to animation.
  - Keep attack and tail decisions separate: transients need punch and clarity; tails can carry shimmer, underwater width, horror space or magical afterimage.
  - For interactive audio, the middleware graph is part of sound design. Randomization, avoid-repeat, switch logic, loops and fades are learned behavior, not just implementation detail.
- Use when: designing creature vocals, magic casts, water/bubble UI, sci-fi glitches, horror drones, weapon impacts, plant/organic growth, footsteps, full-scene redesigns, or when the user asks to make original SFX from local ordinary recordings.

## 2026-05-09 - Bilibili Neuro Bass Cataclysm Rumble Reference

- Source: `https://www.bilibili.com/video/BV1KwVRzmECi/`
- Local reference audio: `D:\AI\音频学习\runs\reference_audio\bilibili_rumble_reference.wav`
- Title: `用neuro bass合成大灾变同款rumble`
- Analysis report: `D:\AI\音频学习\runs\reference_audio\bilibili_rumble_reference_analysis.json`
- Domain: synth-designed neuro bass rumble / cataclysm impact, not natural explosion tail redesign.
- Measured traits:
  - Duration about `19.97s`; peak `0.0 dBFS`, RMS about `-11.25 dBFS`, crest about `11.25 dB`.
  - Six major loud events detected. First five are short pulses around `0.125-0.5s`; final rumble event is about `2.425s`.
  - Dominant low fundamentals cluster around `41-59 Hz`.
  - Event low-energy ratios are extremely sub-heavy: sub `20-60 Hz` often around `0.88-0.97`, with some events adding `60-140 Hz` body.
- Layer map:
  - `Sub layer`: clean mono sine or triangle-like low fundamental around `41-59 Hz`; keep this cleaner than the rest.
  - `Neuro body layer`: distorted/resampled mid-bass with formant or filter motion; this supplies the recognizable talking/tearing rumble identity.
  - `Grit layer`: narrow distorted harmonics in the low-mid/mid range, preferably high-passed away from the sub.
  - `Pulse layer`: repeated envelope peaks instead of one explosion transient; use short pressure bursts and a longer final tail.
  - `Movement layer`: LFO/envelope automation of filter cutoff, wavetable position, FM amount, or distortion tone; motion is the style, not decoration.
- Production rules learned:
  - Do not try to make this style by only low-passing explosion-library material. Start from synth/resampled bass.
  - Keep the sub centered and relatively clean; put saturation, clipping, phaser/formant, and aggressive filtering mostly on the mid-bass/grit layer.
  - Use rhythmic low-frequency envelope movement in the approximate `5-20 Hz` feel range, plus slower phrase-level pulses.
  - Design several short pulses plus one longer rumble tail when matching this reference, rather than a single cinematic boom.
  - If the result feels weak, add controlled harmonic grit and filter movement before boosting sub level.
  - If the result feels dirty or broken, reduce low-band distortion and split the dirty layer above the clean sub.
- Use when: user asks for `neuro bass`, `大灾变 rumble`, synthetic rumble impact, bass-designed cinematic hit, clean-but-aggressive rumble, or says prior explosion-library rumble sounds too natural/weak/dirty.

## 2026-05-09 - User REAPER Track 25 Rumble Impact Chain

- Source: current REAPER project, UI Track 25.
- Local template descriptor: `D:\AI\音频学习\rumble_impact_chain_track25.json`
- Local apply script: `D:\AI\音频学习\apply_track25_rumble_impact_chain.py`
- Domain: reusable rumble impact / low-frequency distorted sci-fi impact processing chain that can accept many source SFX types.
- FX order captured:
  - `kHs Filter`
  - `Uberloud`
  - `MVocoder`
  - `Disperser`
  - `Pro-Q 3`
  - `OTT`
  - `kHs Ensemble`
  - `kHs Pitch Shifter`
  - `Uberloud`
  - `bx_subfilter`
  - `kHs Transient Shaper`
  - `TRAVELER`
- Design principles learned:
  - Treat this as a reusable processing chain, not a one-off patch. Put arbitrary source SFX on a track, then copy this FX chain from Track 25.
  - The chain works because it reshapes the source through filtering, weight, vocoder/dispersion movement, EQ, compression, ensemble/pitch coloration, sub enhancement, transient recovery, and final motion/space.
  - For tight rumble impact, keep this chain's delay/space behavior short and controlled; do not add a separate long delay unless the user asks for a cinematic tail.
  - If the result is too dirty, reduce the amount of source low end feeding distortion before changing the late sub/transient stages.
  - If the result lacks impact, adjust source transient/clip gain or the late transient/sub stages before simply boosting bass.
- Use when: user asks to imitate Track 25, apply a reusable rumble impact chain, process any source into low distorted sci-fi impact, or says "这个效果链接近 rumble impact".

<!-- BEGIN PENGUIN_GRENADE_SFX_2026_05_09 -->

## 2026-05-09 - Penguin Grenade SFX Channel Pass

- Source: `https://www.youtube.com/@PenguinGrenadeSFX/videos`
- Scope: 29 channel videos checked; 20 videos had usable 1080-quality frames and were learned as individual modules. Videos without usable frames or with visibly low-resolution frames were not added to this skill; the skip audit lives in `penguingrenadesfx_final_report.json`.

## 2026-05-09 - Penguin Grenade - Aggressive Energy Demo

- Source: `https://youtu.be/dZsVzf2NWw0`
- Domain: aggressive energy, electric/magic attack, final-demo reference.
- Reusable pattern: 短片展示了高攻击性的能量类成品听感：画面重点是电弧、闪光、爆发和快速衰减。因为没有可用讲解字幕和插件画面，这条只作为成品参考，不反推不可见插件链。
- Layer map: 读取画面能量节奏; 建立攻击性感知; 用作后续设计标尺.
- Plugin and processing notes: 未确认插件链: 本视频没有可确认的制作画面或字幕讲解，仅记录成品特征。 (不推断不可见参数)
- Design principles learned:
  - 短能量 demo 适合作为听感标尺，不适合编造看不见的插件链。
  - 高攻击性能量要有瞬态、闪烁层、持续噪声层和尾巴层的时间分工。
  - 能量亮度要跟画面闪光同步，低频只负责压力和规模。
- Use when: energy, electric, aggressive, demo, reference; 用它校准能量音效的亮度、攻击速度和尾巴长度；不要把它当插件配方。

## 2026-05-09 - Penguin Grenade - Heavy Mechanism Demo

- Source: `https://youtu.be/2L6qe8uRf0Y`
- Domain: heavy mechanism, machinery, industrial movement, final-demo reference.
- Reusable pattern: 短片展示重型机械库的成品方向：大质量启动、金属冲击、齿轮/伺服细节和机械尾音。无讲解字幕，因此只学习可观察到的成品结构。
- Layer map: 质量层; 机构层; 终止层.
- Plugin and processing notes: 未确认插件链: 该条是成品演示，未出现可确认的处理链。 (reference-only)
- Design principles learned:
  - 重机械音效的可信度来自动作链：启动、运动、撞击、停止。
  - 低频给质量，高频给部件识别，金属尾音给材质。
  - 演示类视频只提炼结构，不写没有证据的插件细节。
- Use when: mechanism, machinery, metal, industrial, demo; 做重型门、机甲、武器装填时，把动作分成至少三段：预备重量、机构运动、停止惯性。

## 2026-05-09 - Penguin Grenade - Creature Vox Large 2 Demo

- Source: `https://youtu.be/WdZ9DFDHaqI`
- Domain: creature vocal, monster, final-demo reference.
- Reusable pattern: 短片展示大型怪物声库的成品范围。没有教程字幕，因此只提炼可复用的怪物声分层判断：喉咙、气息、嘴部、尖叫、低频体积和攻击瞬态。
- Layer map: 喉咙和身体; 嘴部细节; 威胁高频.
- Plugin and processing notes: 未确认插件链: 该条是声音库成品展示，未出现可确认插件链。 (reference-only)
- Design principles learned:
  - 怪物声要有身体、嘴、气息、威胁四类层。
  - 高频危险层只负责咬人，不能覆盖喉咙主体。
  - 成品 demo 用来校准比例，不作为插件教程。
- Use when: creature, monster, vox, roar, demo; 设计怪物时先做可理解的生物动作，再加恐怖质感；先问它在吸气、张口、攻击还是受伤。

## 2026-05-09 - Penguin Grenade - Creature Sound Design feat Presley Hynes

- Source: `https://youtu.be/gLldwkc-0Vs`
- Domain: creature design, monster roar, organic source layering.
- Reusable pattern: Presley Hynes 讲解 creature 声音设计：先理解源素材的情绪和频段角色，再按画面节奏组织高/中/低层，最后用有限处理强化电感、恐怖感和怪物体积。
- Layer map: 先理解源素材; 无处理排节奏; 构建吼叫主体; 高频危险层; 低频和怪异纹理.
- Plugin and processing notes: Snap Heap: 对 creature 层做电感、颤动和运动调制。 (结合 LFO/tremolo 自动化); OTT-style compression: 提高层的密度和存在感。 (用于吼叫主体，不让尾巴过度糊住); Basement / RoboVoice: 补低频和异常声码器质感。 (用于 bass/drone 层)
- Design principles learned:
  - 怪物声先按源素材角色分层，再决定处理。
  - 无处理编辑能暴露节奏和叙事问题，处理只负责放大已有意图。
  - 高频威胁层要跟动作点同步，低频体积要保持可控。
- Use when: creature, roar, Snap Heap, OTT, Basement, RoboVoice; 怪物音效先做四个文件夹：喉咙主体、嘴部瞬态、高频危险、低频/异世界体积。

## 2026-05-09 - Penguin Grenade - S-Layer Sampler Sound Design

- Source: `https://youtu.be/Ub5ozlVecII`
- Domain: sampler randomization, magic one-shots, variation generation.
- Reusable pattern: SeungJun Park 演示用 Reaktor 6 的 S-Layer 把 Penguin Grenade 素材变成可演奏、可随机的魔法声音生成器。重点是设定随机范围，录制大量输出，再挑选可用片段。
- Layer map: 加载 S-Layer; 设置随机范围; 录制随机演奏; 后处理魔法尾巴; 加入冲击层.
- Plugin and processing notes: Reaktor 6 S-Layer: 样本随机化和演奏式变体生成。 (pitch ±12, pan 70/30, volume 40-100); Reverb / Soft Clipper / Compressor: 整合随机输出的尾巴、响度和峰值。 (Full D reverb, soft clipper, blue compressor)
- Design principles learned:
  - 随机化要设边界，边界决定输出是否可用。
  - 先录一大段随机素材，再从中挑选，而不是每个声音手工摆满。
  - 随机魔法尾巴需要单独的 punch 层，否则动作反馈会软。
- Use when: S-Layer, Reaktor, randomization, magic, sampler; 想快速做魔法变体时，先用 sampler 随机生成 2-3 分钟素材池，再切出可用的一拍。

## 2026-05-09 - Penguin Grenade - Armory Creatures Contest Winner Walkthrough

- Source: `https://youtu.be/Iz4rtBgqLlg`
- Domain: creature walkthrough, home-recorded sources, monster layering.
- Reusable pattern: 最佳 walkthrough 展示了如何用家里材料制作怪物声：先录管子、门把手、叉子刮锅、嘴部声音、塑料/橡胶/气球/黏液等，再重度变调、渲染成素材池，最后按怪物动作重组。
- Layer map: 在家录怪物源; 先破坏再整理; 从素材池重建角色; 处理特殊纹理; 30 秒内讲故事.
- Plugin and processing notes: Shade / Transgressor / Soothe / Sonic Maximizer: 对家录素材做音色破坏、瞬态控制和刺耳频段整理。 (用于源素材渲染阶段); Enforcer / MRatioMB: 补 punch 和多频段动态控制。 (用于怪物主体和冲击层); MOCoder / Pro-Q 3 / FilterFreak: 给橡胶、口腔和黏液层增加有机调制和频段控制。 (配合音量/滤波自动化)
- Design principles learned:
  - 怪物源可以来自日用品，关键是录到摩擦、湿度、弹性和失败的质感。
  - 先把源处理成素材池，再从池里设计，速度和变化都会更好。
  - 怪物层要有明确器官角色，不要只堆吼叫。
- Use when: creature, home recording, Shade, Transgressor, MOCoder, FilterFreak; 录 creature 源时，目标不是干净，而是可变形：摩擦、湿、弹、裂、喘都值得保留。

## 2026-05-09 - Penguin Grenade - Magic Cinematic Linear Redesign

- Source: `https://youtu.be/kFxuNtkv4CU`
- Domain: cinematic magic redesign, linear scene, Pro Tools organization, whoosh processing.
- Reusable pattern: Thibault Receveur 展示大型线性魔法重设计。画面和接触图显示大量 Pro Tools 分组、Soundminer/素材库检索、箭矢/角色/魔法事件分区，以及 Phase Plant、Snap Heap、Tremolator、FabFilter 等处理。
- Layer map: 按画面角色建组; 素材库和现场源结合; 箭矢系统化处理; 角色声分层; whoosh 预处理; Phase Plant 粒化再采样.
- Plugin and processing notes: Phase Plant / Faceplant granular: 把长处理文件粒化，random LFO 控制 pitch、grain length 和 playhead。 (random LFO to pitch/grain/playhead macro); Snap Heap: 用 pitch shifter、low-pass、envelope、distortion、gain 制作 whoosh 与 impact 运动。 (gain percent mode, LFO/random LFO, envelope to pitch/drive/gain); Soundtoys Effect Rack / Tremolator / FilterFreak: 制作 phase、propeller、threshold-filter 和低通运动。 (Tremolator propeller, FilterFreak input threshold to filter frequency); FabFilter Pro-Q 3 / Pro-MB / Pro-L 2: 频谱整理、动态控制和渲染/总线响度。 (Pro-Q3 natural phase, Pro-L2 1:1 during print, Pro-MB mastering preset)
- Design principles learned:
  - 大型线性 redesign 的第一技巧是组织，不是插件。
  - 把 whoosh/bed 先处理成可选素材池，再二次粒化和二次冲击化。
  - 同一源的独特纹理越多，后面加工出的 whoosh 和 impact 差异越自然。
- Use when: cinematic magic, Phase Plant, Snap Heap, Tremolator, Pro-Q3, Pro-MB, whoosh; 大型魔法场景先按视觉对象建轨道组；每组只回答一个动作问题，最后再统一响度和空间。

## 2026-05-09 - Penguin Grenade - Magic Fire Spell Design feat Ryan Felberbaum

- Source: `https://youtu.be/ii9vXwAxFSI`
- Domain: fire magic, spell cast, flame texture, transient shaping.
- Reusable pattern: Ryan Felberbaum 演示火焰魔法设计：把热锅蒸汽、flash paper、纸张、沙粒、指甲刮吉他、布料抽击等素材拆成施法、火墙打开、噪声尾巴和低频支撑，再用饱和、滤波、瞬态和 whoosh 工具塑形。
- Layer map: 拆出火法事件; 选择火源素材; 饱和和包络滤波; 运动和空间; 瞬态和总线.
- Plugin and processing notes: Decapitator: 给火焰和纸/沙素材增加热感、粗糙度和密度。 (多层使用，按层控制强度); FabFilter Volcano 3: 用 envelope follower 做火焰滤波运动。 (slower attack); Snap Heap transient shaper: 用 audio follower 控制 attack/sustain，让火焰瞬态更有动作。 (attack/sustain follower); Tonsturm Traveler / Tremolator / Ensemble: 增加 whoosh、摆动和宽度。 (用于运动层)
- Design principles learned:
  - 火焰魔法不是只有 crackle，还要有启动、扩张、热空气、火星和尾巴。
  - 火焰滤波可以跟随音频包络，但 attack 不宜太快，否则会变成硬开关。
  - 火法需要亮度和噪声，也需要低频热压，但低频要独立控制。
- Use when: fire, magic, Decapitator, Volcano, Traveler, Snap Heap; 火焰层先高通出空间，低频热压单独做；否则火花、空气和冲击会互相糊住。

## 2026-05-09 - Penguin Grenade - Spaceship Sound Design feat Orrin Keep

- Source: `https://youtu.be/cLhevQYlvlI`
- Domain: spaceship, sci-fi pass-by, engine, impact rack, Doppler-like movement.
- Reusable pattern: Orrin Keep 展示飞船设计，接触图能看到 DAW 中分色轨道和插件窗口。核心不是直接找飞船素材，而是把布料、纸板、扑克牌、猫呼噜、泡沫滚筒、锣、打火机等处理成引擎、撞击、Doppler 和 tonal rack。
- Layer map: 先做源素材; Phase Doppler rack; Impact rack; Scanner/engine rack; Tonal rack.
- Plugin and processing notes: Kilohearts pitch shifter / filter / gain: 构建 Phase Doppler rack，输入音量调制 pitch/filter 运动。 (incoming volume follower); Supercharger GT / Diablo Lite: 压平和硬削波持续源，做成重击或机械冲击。 (flatten source, hard clipping/dirty distortion); Kilohearts Transient Shaper / Ensemble / Space Modulator: 强化攻击、宽度和科幻运动。 (transient attack, movement widening); Short feedback delays: 用两个极短 delay 形成 tonal rack。 (perform delay time live)
- Design principles learned:
  - 飞船声可以由日常摩擦和持续震动源合成，不必从飞船库开始。
  - Doppler 感可以用音量跟随的 pitch/filter/gain rack 伪造。
  - 持续源经过压缩、削波、瞬态和收窄后可以变成撞击。
- Use when: spaceship, Doppler, Kilohearts, impact rack, engine, tonal delay; 做飞船时先分 engine、pass-by、impact、scanner、tonal 五类素材池，再贴画面组合。

## 2026-05-09 - Penguin Grenade - Magic Spell Sound Design feat Jesse Rope

- Source: `https://youtu.be/Ze9enZLKA2I`
- Domain: Reaper workflow, magic spell, source drawer, processing buses.
- Reusable pattern: Jesse Rope 展示 Reaper 中的魔法设计工作流：Media Explorer 预听通过处理轨和多个 bus，候选素材先进入 source drawer，再按瞬态、movement、body 和 tail 剪成法术。
- Layer map: Reaper 预听处理架; source drawer; 瞬态 cast; movement bus; 先工作流后精修.
- Plugin and processing notes: Reaper routing / Media Explorer: 把预听素材送进处理链，快速听 processed source。 (parallel processing buses); EQ / Distortion / Compressor / Flanger: movement bus 的核心处理。 (用于纸、气球、芯片、摩擦等纹理); Transient Shaper / Limiter: 施法瞬态的攻击与峰值控制。 (minimal processing on transient)
- Design principles learned:
  - Reaper 可以用路由和预听 bus 搭出快速素材处理系统。
  - source drawer 让设计过程不丢灵感，也避免时间线过早混乱。
  - 法术瞬态和 movement 应该分 bus 处理，便于独立控制清晰度。
- Use when: Reaper, magic spell, source drawer, Media Explorer, processing bus; 在 Reaper 做 SFX 时建一个 source drawer 轨道组，保存所有可能可用的干/湿片段。

## 2026-05-09 - Penguin Grenade - Magic Spell Extended Cut feat Mark Kilborn

- Source: `https://youtu.be/BPuxpbey-Ks`
- Domain: raw process, dark/evil spell, iterative source auditioning.
- Reusable pattern: Mark Kilborn 用 Raw Magic 素材做 80 分钟左右的原始过程：随机听素材、丢进时间线、处理、重采样、放弃不工作的层，再不断迭代出第一人称邪恶法术。
- Layer map: 从感觉找源; 快速试错和重采样; 烟雾身体层; 瞬态和 punch; 微运动链; 第一遍成片收口.
- Plugin and processing notes: Multipass: 快速试 preset、微调 macro、做运动和动态。 (used for high-pitch extraction and later subtle processing); PaulXStretch: 把 friction brush 变成长烟雾/呼吸纹理。 (frozen stretch, texture recording); Tremolo / Vibrato / Ensemble / All-pass: very subtle movement chain，增加微运动。 (movement should be felt more than heard); Convolver / delay / saturation / EQ: 给水、箭哨、body 和总线增加空间、粘合和频段控制。 (nuclear reactor hall impulse, high-pass lows)
- Design principles learned:
  - 真实 SFX 工作常是试错和筛选，不是按完美计划执行。
  - 烟雾、诡异和魔法感可以由拉长的摩擦源和微调制得到。
  - 瞬态与身体要留出动态空间，body 可以在 transient 后抬起。
- Use when: Mark Kilborn, Raw Magic, PaulXStretch, evil spell, iteration; 快速设计时允许有 graveyard 轨道；丢弃但不删除，让后续能回收已试过的音色。

## 2026-05-09 - Penguin Grenade - Magic Spell Sound Design feat Mark Kilborn

- Source: `https://youtu.be/ahbdvI6nLgA`
- Domain: magic spell breakdown, layer review, game first-pass workflow.
- Reusable pattern: 这条是 Mark Kilborn 对同一法术的一小时 first pass 分解版。重点是最终层次回顾：buildup、transient cast、firework sparkle、whistle/body、convolver body、PaulStretch breath、low rumble 和总线微饱和。
- Layer map: buildup 层; punch/cast 层; sparkle 和 whistle; body 和 breath; 游戏 first pass 思路.
- Plugin and processing notes: Transient Shaper / Polyverse Wider: punch 层塑形与轻微加宽。 (Wider used tiny amount); Convolver / Ensemble: 把 resampled body 变成 vocal/creepy texture。 (beverage impulse, high-pass after); PaulStretch: 将 hissy friction 源变成 breath/smoke texture。 (long frozen texture); Saturation / compression / EQ: 总线轻微粘合，控制 resonance 和 mud。 (do not overdrive bus)
- Design principles learned:
  - 法术 first pass 要能进入游戏测试，而不是追求离线完美。
  - subtle movement 让静态层活起来，但宽度和延迟必须让位给瞬态。
  - 无画面设计只能是草案，最终需要 gameplay 反馈。
- Use when: magic first pass, Mark Kilborn, PaulStretch, Convolver, game iteration; 魔法 first pass 至少导出 3-5 个 variation 进游戏听，离线单听不等于可用。

## 2026-05-09 - Penguin Grenade - Modern Magic Energy Sound Design feat Brandon Mueller

- Source: `https://youtu.be/xWtyeqmjPKk`
- Domain: modern magic energy, Ableton/DAW processing, multiband movement.
- Reusable pattern: Brandon Mueller 的现代魔法能量设计以橙色工程轨道、效果 rack、多段处理和参数调制为主。接触图显示大量插件窗口、包络/滤波曲线、重复脉冲切片和多轨能量层。
- Layer map: 能量脉冲池; 多段/宏控制; 瞬态与尾巴分离; 重复打印.
- Plugin and processing notes: Multiband/rack processing: 从画面可见的多段效果 rack 和曲线推断其用于能量频段运动；具体插件参数未逐项确认。 (macro/filter envelope workflow); EQ / filter automation: 控制能量开合和频段焦点。 (visible envelope/filter curves); Render/print workflow: 把处理结果打印为音频片段再挑选。 (commit useful variations)
- Design principles learned:
  - 现代魔法能量常靠脉冲、滤波包络和多频段运动建立科技感。
  - 把 attack 和 tail 分离，才能同时获得反馈和漂亮空间。
  - 复杂 rack 最好打印成素材池，再剪辑组合。
- Use when: modern magic, energy, multiband, rack, pulse; 做现代魔法时先生成脉冲素材池，再用滤波/多频段自动化给每次 pulse 不同表情。

## 2026-05-09 - Penguin Grenade - Magic Sound Design Tricks feat Juan Pablo Uribe

- Source: `https://youtu.be/wA5afo1P6tE`
- Domain: magic tricks, Serum sampler, pitch delay, slime/liquid processing.
- Reusable pattern: Juan Pablo Uribe 展示多个魔法小技巧：金属 goblet 通过频移/粒化/OTT/shimmer 变亮，Serum sampler 用 LFO 做 pitch/filter/comb 运动，firework 和口技可变成爆裂或 creature，slime 气泡可变成动漫式魔法液体。
- Layer map: 金属 goblet 魔法化; Serum sampler 演奏源; firework 做爆裂; 口技变 creature; slime 气泡动漫化.
- Plugin and processing notes: Valhalla FreqEcho / Crystallizer / Shimmer: 给金属源增加魔法亮度、频移和空间尾巴。 (goblet hits/scrapes); Serum sampler: LFO 控制 pitch、filter/flanger、comb 和失真压缩。 (LFO to pitch and cutoff); SoundHack Pitch Delay: 将口技点击变成怪物/魔法纹理。 (with limiter); OTT / Devil-Loc / Frequency Shifter: 强化 slime/liquid 气泡，形成动漫式液体魔法。 (automate cutoff, record many variations)
- Design principles learned:
  - 小技巧的价值在于把普通源变成可重复生成的素材方法。
  - Serum 这类 synth/sampler 不只用于音乐，也可当 SFX 运动引擎。
  - 液体、金属、口技和烟火都能在 pitch/filter/delay 后进入魔法素材池。
- Use when: Serum, FreqEcho, Crystallizer, OTT, slime, Pitch Delay; 任何 trick 都要录多次输出；魔法设计通常靠挑选最有生命的瞬间。

## 2026-05-09 - Penguin Grenade - Dark Magic Spell Sound Design feat Noah Sitrin

- Source: `https://youtu.be/uP135z2QBTM`
- Domain: dark magic, trope inversion, render-pool workflow.
- Reusable pattern: Noah Sitrin 的黑暗魔法设计强调不要只套 whisper/noise/dissonant tone。先从 Raw Magic 里做 impact、sustain 和 whoosh 源池，经过多个命名处理链渲染，再从随机 mixdown 中挑出新的冲击和运动。
- Layer map: 避开黑魔法套路; 建立源池; 命名处理链; 渲染并标记收藏; 随机 mixdown 再设计.
- Plugin and processing notes: Named processing chains: 用命名链快速创造 impact、sweep、gut、balloon 和 grumble 方向。 (impact grain modulator, spin Trace sweep, gut puncher); Doppler / high-pass / modulation: 最终层处理，保留运动但清理泥低频。 (line up gaps carefully); Render/bounce workflow: 将链输出做成可剪素材池。 (mark favorites)
- Design principles learned:
  - 黑魔法可以从物理材质出发，而不是从恐怖套路出发。
  - 源素材阶段可以粗暴，最终阶段要严格清理低端和冲突频段。
  - 随机 mixdown 是创造新冲击的有效方式。
- Use when: dark magic, render pool, Doppler, high-pass, Raw Magic; 黑魔法不要一上来就堆 whisper；先问它是烟、骨、皮革、纸、液体还是能量。

## 2026-05-09 - Penguin Grenade - Elden Ring Magic Spell Redesign feat Chris Burgess

- Source: `https://youtu.be/fpazzwJnMdM`
- Domain: Elden Ring magic redesign, limited-source challenge, minimal processing.
- Reusable pattern: Chris Burgess 用 Raw Magic 库为 Elden Ring 法术做多个设计版本。限制是只用这个库，主要靠选源、剪画面、pitch/time stretch、少量插件和不同设计思路来完成。
- Layer map: 限制素材范围; 三种同画面方案; 选让耳朵有反应的源; 干净 tonal 版本.
- Plugin and processing notes: Pitch/time stretching: 改变 Raw Magic 素材规模和动作速度。 (mostly DAW-level processing); Parallel compression: 拉起尾部细节，不完全压扁瞬态。 (blend to taste); Reverb / width: 让 wide wind 和魔法尾巴进入游戏空间。 (contextual space)
- Design principles learned:
  - 限制素材库能训练源选择和剪辑，而不是依赖无限素材。
  - 同画面多方案能逼出设计语言差异。
  - 先把第一反应做出来，再做克制版本。
- Use when: Elden Ring, Raw Magic, minimal processing, parallel compression, variation; 给同一个法术做三个版本：直觉版、克制版、极端版；最后混合最好的动作和质感。

## 2026-05-09 - Penguin Grenade - Ice Magic Spell Sound Design feat Jay Sabins

- Source: `https://youtu.be/TOdyCTjzHLE`
- Domain: ice magic, accessible/free plugins, variation generation.
- Reusable pattern: Jay Sabins 用 Raw Magic 库和可访问插件做冰魔法。方法是先做一个完整层组，再复制并微调层生成多个 variation，适合游戏实现。
- Layer map: 只用库和免费工具; 冰法瞬态; movement bus; 冰质感材料; submix 收口并复制变体.
- Plugin and processing notes: Reaper EQ/Distortion/Compressor: movement bus 的基础音色塑形。 (accessible stock effects); Kilohearts Distortion: 总线轻微 saturation/drive。 (drive a little); Transient Shaper / Compressor / Limiter: 总线攻击、动态和峰值控制。 (minor attack/sustain, game-audio submix)
- Design principles learned:
  - 冰魔法可由纸、尼龙、气球、鞋底、刷毛和低频滚动组成。
  - 先做一个完整可用层组，再复制修改，是做游戏 variation 的高效方法。
  - 免费插件也能完成：EQ、失真、压缩、瞬态和 limiter 足够建立基本冰法。
- Use when: ice magic, Reaper, Kilohearts, Melda, variation, free plugins; 做可实现的游戏冰法时，先做 1 个完整声音，再复制成 variation，而不是从零做每个随机项。

## 2026-05-09 - Penguin Grenade - Electricity Ability Casting feat Presley Hines

- Source: `https://youtu.be/RdVQYDBTB48`
- Domain: electricity ability, casting to picture, zaps, rubber/paper sources.
- Reusable pattern: Presley Hines 演示电能力施法：纸、橡胶、气球、喷罐、布料、rice paper、packing tape 等被处理成 zippy/zappy 的电弧、whoosh、低频和空间尾巴。
- Layer map: 电源不只用电; 通用电链; audio follower 触发电感; 频段和低频 whoosh; 最终空间.
- Plugin and processing notes: Melda/Snap patch audio follower: 控制 filter table/shaper table 产生 zippy attack。 (audio follower to filter/shaper); Multipass / Transient Shaper / Ambassador / Exciter: 分频、攻击和亮度控制。 (two filter types, per-layer tweaks); Tonsturm Traveler: 从 cardboard/balloon 做低频电能 whoosh。 (low-end whooshes); Snap Heap convolver/reverb: 最终空间和电感尾巴。 (space glue)
- Design principles learned:
  - 电声的源可以是弹性、撕裂、纸张和喷气，而不只是电流录音。
  - audio follower 让滤波/波形整形跟攻击动，是电弧感的关键。
  - 低频 whoosh 和高频 zap 分开控制，最终用空间统一。
- Use when: electricity, zap, audio follower, Multipass, Traveler, Snap Heap; 电音效先做高频 zap、中频 warble、低频 whoosh 三个层，再用 follower 让它们同一时间启动。

## 2026-05-09 - Penguin Grenade - Positive Magic Spell Sound Design with CJ Ridings

- Source: `https://youtu.be/Ipbfcr-DFTI`
- Domain: positive magic, bright spell, metallic shimmer, sub support.
- Reusable pattern: CJ Ridings 展示积极/明亮魔法：测量勺、金属片、羽毛掸子打沙、球轴承在 pitcher 里旋转、垃圾桶盖 bowed 等素材被做成轻盈、上升和明亮的施法。
- Layer map: 反转金属 lead-in; 旋转亮层; 冲击和低频; 空间和空气; 响度收口.
- Plugin and processing notes: Kilohearts Multipass: 对 ball bearing 旋转声做低/中/高分频运动。 (split lows/mids/highs); Slate Infinity Bass: 给 feather duster + sand hit 增加 sub harmonic 支撑。 (sub support); Eventide Crystals: 增加明亮运动和空间尾巴。 (movement/reverb); Ozone Maximizer: 最终响度控制。 (level finish)
- Design principles learned:
  - 积极魔法更依赖轻金属、旋转、空气和清晰上升感。
  - 低频仍需要，但应该是柔软支撑，不是黑暗压迫。
  - Crystals 类效果可提供运动和空间，不只是延迟。
- Use when: positive magic, Multipass, Crystals, Infinity Bass, Ozone; 积极魔法也需要低频，但低频要像垫子，不像威胁。

## 2026-05-09 - Penguin Grenade - Raw Magic Sound Effects Library Walkthrough

- Source: `https://youtu.be/hfZnCFgt3TI`
- Domain: raw magic library, source selection, DSP auditioning.
- Reusable pattern: Barney Oram 讲解 Raw Magic 库：它来自 Essential Magic 的原始录音，定位是 cleaned source，不是已经设计好的成品层。重点是素材要能 pitch、process、layer，而不是开箱即成片。
- Layer map: 理解库定位; 用 DSP rack 测试; 材料范围; 挑能变形的源; 后续设计原则.
- Plugin and processing notes: FilterFreak / UberMod: 快速测试滤波、节奏和空间调制潜力。 (DSP audition rack); PitchMonster: 测试 granular doubler 和 pitch 变形能力。 (double granular doubler); Transient/punch processors: 测试源是否能成为可用 attack。 (punch check)
- Design principles learned:
  - Raw library 的价值是可处理性，不是立即成品。
  - 素材筛选要测试 pitch、transient、modulation 和 tail 表现。
  - 同一库可以服务 magic、creature、电、whoosh 和 UI，只要先按层角色分类。
- Use when: Raw Magic, source library, FilterFreak, UberMod, PitchMonster, audition; 买/用 raw 库时先做 audition rack，给每个素材打标签：transient、texture、tone、tail、processable。

<!-- END PENGUIN_GRENADE_SFX_2026_05_09 -->

<!-- BEGIN HTML_KB_BACKFILL_2026_05_10 -->

# Backfilled Video Learnings From 音效知识库

These entries were generated from the standalone HTML knowledge base so every analyzed video has a corresponding skill-memory entry.

## 2026-05-09 - 金属撞击音效制作流程
- Source: `https://youtu.be/ChlEY5CCv-A`
- Domain: impact, workflow, Transient Shaper, EQ Equalization, Stereo Processing, Dynamic Range, Multi-track Mixing, Metal Impact Sounds, DAW Workflow, Automation Envelope
- Reusable pattern: 视频展示了使用多款DAW软件（Reaper、FL Studio、Ableton Live等）制作重金属撞击音效的完整工作流程。创作者演示了录音、多轨编辑、效果处理和混音的核心方法，强调了音效设计中的瞬态处理和频率塑造技巧。
- Step / event map:
  - 音源录制: 使用麦克风在室内环境录制金属撞击声音素材（刀、刀片、金属架等），录制的原始素材将作为后续处理的基础。
  - 音频导入与轨道编排: 将录制的音频素材导入DAW中，按时间轴排列多个音频片段，建立多轨编辑环境。
  - 瞬态塑形处理: 使用Transient Shaper插件调整金属音效的瞬态特性，通过调整 Punch、Speed、Sustain 等参数强化攻击部分和衰减部分。
  - 频率均衡与EQ调整: 使用均衡器对音频频率进行精细调整，结合频谱分析工具实时监测音频频率分布，调整中低频、中频、高频的增益比例。
  - 立体声处理与宽度调整: 使用StereoLab等立体声处理插件调整音效的立体声宽度和空间感，通过改变左右声道的频率或相位关系创建更宽广的音场效果。
  - 混音与音量调整: 在混音器界面调整各音轨的音量推子、声像（Pan）和效果参数，通过多轨混音平衡不同音效素材的电平。
  - 效果链配置: 按顺序添加多个效果插件：通常先做瞬态处理，再做EQ和立体声处理。效果链顺序直接影响最终音色。
  - 自动化与动态调整: 使用音量包络和自动化曲线在不同时间点动态调整参数，使音效在播放过程中产生自然的动态变化。
- Plugin and processing notes:
  - Transient Shaper: 调整音频的瞬态特性，强化或削弱攻击部分和衰减部分
  - EQ（均衡器）: 对音频频率进行精细调整，塑造音效的音色特征和亮度
  - StereoLab: 调整音效的立体声宽度和空间感，创建宽广的音场效果
  - Enforcer: 提供预设的音效塑造和鼓组音色，可调整频率、增益和混合比例
  - Spire合成器: 通过合成方式生成或处理音效，提供丰富的参数调节空间
- Design principles learned:
  - 金属音效的核心在于瞬态处理——通过Transient Shaper强化初始冲击感和快速衰减
  - 频率塑造决定音效的音色特征——使用EQ和频谱分析工具精细调整中低频、中频和高频的比例
  - 立体声处理增加空间感——StereoLab等插件可以拓宽音场，使金属音效更具沉浸感
  - 多轨混音提供灵活性——不同音源（原始录音、合成器、采样）的组合能创造更复杂的音效
  - 效果链的顺序影响最终音色——不同顺序的插件组合会产生完全不同的结果
- Use when: Transient Shaper; EQ Equalization; Stereo Processing; Dynamic Range; Multi-track Mixing; Metal Impact Sounds; DAW Workflow; Automation Envelope; 始终使用频谱分析工具监听，确保音效的频率均衡在不同监听环境中一致; 瞬态塑形器的Punch参数直接影响音效的冲击感，建议从中等值开始逐步调整; 立体声处理不要过度——过宽的立体声在单声道播放时可能导致相位干涉问题

## 2026-05-09 - 《Arcane》近战撞击音效重制完整流程
- Source: `https://youtu.be/1uFMVg7TrGU`
- Domain: impact, workflow, scifi, transient_shaping, effect_chain, reverb_processing, foley_recording, dynamic_automation, synthesizer_design, Doppler_effect, multitrack_mixing
- Reusable pattern: 完整的游戏音效设计教程，展示如何为《Arcane》创建沉重的近战金属撞击音效。使用 Reaper、Ableton Live 以及 Valhalla、FilterFreak、Decapitator 等专业插件进行音效合成、效果链设计和参数自动化，涵盖 foley 录制到最终渲染的全流程。
- Step / event map:
  - 素材录制与采集: 使用麦克风录制雪箔（snow foley）、员工布料（staff cloth）、泡沫塑料（styrofoam）等物理素材，作为后期处理的基础音源。
  - 瞬态参数调整: 在 DAW 中打开原始音频，针对法术施法瞬态（spell cast transient）和员工甜化器（staff sweetener）进行初步参数整理。
  - 构建效果链路由: 在 Reaper 中搭建完整信号链：FilterFreak → Valhalla Supermassive → Decapitator → Deelay → Doppler Dome → Flux EQ，形成层次递进的效果路由。
  - 滤波器参数调整: 使用 FilterFreak 对音频进行频率滤波，调整截止频率和共鸣，突出中高频撞击感。
  - 混响处理: 调用 Valhalla Supermassive 设置空间感参数，为干音效添加环境尾音和空间深度。
  - 失真与动态处理: Decapitator 适度过载增加力度，同时用 Transient Shaper 的 Pump 参数调整 Speed 和 Click，精确整形瞬态特性。
  - 延迟效果添加: 通过 Deelay 创建回声效果，调整延迟时间和反馈参数，为音效增加层次感。
  - 多普勒与空间效果: 使用 Doppler Dome 模拟音源在空间中移动的感觉，增强动态感知和空间真实感。
- Plugin and processing notes:
  - FilterFreak: 频率滤波和共鸣塑形，强化或削弱特定频段
  - Valhalla Supermassive: 添加混响和空间感，为干音效增加环境深度和尾音
  - Decapitator: 失真和过载处理，增加音效的侵略性和力度
  - Deelay: 添加延迟效果，创建回声和层次感
  - Doppler Dome: 多普勒移频效果，模拟音源在空间移动的感觉
  - Transient Shaper: 瞬态整形，Pump 参数调整 Speed 和 Click 控制打击感
  - Flux Equalizer: 频率均衡和精细调整，优化整体音色
  - iZotope Stereolab: 立体声处理，优化立体声宽度和平衡
- Design principles learned:
  - 从真实物理素材（snow foley、styrofoam等）出发录制基础音源，而非完全合成，能获得更自然和有机的撞击质感
  - 建立串联效果链而非并联处理，让每个插件在前一个效果基础上逐步塑形音色，形成层次递进的声学变化
  - 瞬态整形（Transient Shaper）和多普勒效果（Doppler）用于创建动态感和空间感，是近战音效的关键差异化手段
  - 混响和延迟必须适度使用，过量会削弱瞬时冲击力，应通过自动化曲线动态控制其湿度
  - 在处理前后进行实时对比预览是发现问题和优化方向的最有效方法，避免盲目调参
  - EQ 均衡是频率塑形的最后一步，应在所有动态处理后进行，以保持处理后的自然感
- Use when: transient_shaping; effect_chain; reverb_processing; foley_recording; dynamic_automation; synthesizer_design; Doppler_effect; multitrack_mixing; Decapitator; Valhalla; plugin_chain_architecture; 始终保留原始未处理音频副本，便于随时与处理版本对比，这是发现问题最快的方法; 效果链的顺序很关键：滤波 → 混响 → 失真 → 延迟 → 空间效果 → EQ，不同顺序会产生截然不同的结果; 使用自动化曲线动态控制混响和延迟的湿度（wet）参数，在瞬态时减少，在衰减期增加，保持打击清晰度

## 2026-05-09 - 游戏暴力音效设计：Overkill 音效库制作与应用
- Source: `https://www.youtube.com/watch?v=-vxdSIdNAw4`
- Domain: impact, scifi, environment, gore_sound_design, transient_shaping, granular_synthesis, time_stretching, convolution_reverb, multi_band_compression, frequency_modulation, sample_manipulation
- Reusable pattern: 视频展示如何使用Rock The Speakerbox Professional Sound FX中的Overkill音效库创建逼真的恐怖/暴力游戏音效。讲师演示了多个专业DAW和插件（Serum、Audition、After Effects等）在音效处理、合成和混音中的应用，包括音高调整、时间拉伸、效果器链等核心技术。
- Step / event map:
  - 选择音效库素材: 从RTSB Overkill音效库中选择暴力打击音效（刀砍、箭矢等），这些是超逼真的gore音效素材，适合恐怖或残暴动作游戏。
  - 在DAW中导入并分层处理: 将音效导入Adobe Audition或Premiere Pro，使用多条轨道分层堆砌不同的音效素材（如METLFric-CK_WEAPON、GOREBone等），创建复杂的复合音效。
  - 时间拉伸与速率调整: 使用时间拉伸功能调整音效播放速度，常见速率参数范围0.025至1.762倍速，以改变音效的感知时长和质感。例如0.282、0.572、0.821等参数用于微调音效时间。
  - 增益与音量调整: 调整音频增益以防止爆音和失真。常见的增益调整范围从-21.16dB到+14.6dB，确保音效在混音中的声压级合适。监测波形峰值，红色区域表示音量过高需要降低。
  - 应用合成器进行音色塑造: 使用Serum、Phaseplant、Skanner XT等合成器改造原始音效。调整包络线（Attack、Sustain、Release）、LFO调制（Free模式、Normal曲线、15ms时间）、滤波器等参数创建新的音色。
  - 应用效果器链: 使用Soundtoys插件（Superplate、Crystallizer、Devil-Loc）、OTT多频段压缩等创建特殊质感。Crystallizer延迟31.3ms、音高1300cents；OTT Depth 67%、Time 611%。
  - 高级调制与特殊效果: 应用Valhalla调制器（混合76.6%、速率-0.13Hz、深度30ms）、Convolver卷积混响（Fade In/Out 0%、拉伸100%、延迟0ms）等高级效果创建空间感和特殊质感。
  - 均衡与频率整形: 使用Ozone 11均衡器调整特定频率范围。对刀片滑动音效的处理中，速率0.025、频率-63.97Hz（削减刺耳的金属谐波点）。
- Plugin and processing notes:
  - Serum合成器: 从原始素材生成新的音色，通过包络、LFO、波表调制创建游戏音效
  - Native Instruments Skanner XT: 高级采样器和音效重新合成，创建独特的扫描合成音色
  - Soundtoys Superplate: 混音级混响效果，增加空间感和深度，适合金属表面反射感
  - Soundtoys Crystallizer: 颗粒合成回声，创建刀剑/弓箭的金属回响层或空灵拖尾
  - Soundtoys Devil-Loc: 音频损毁和失真效果，专为粗糙感/暴力感设计，Darkness越高越暗沉
  - iZotope Ozone 11 EQ: 多频段均衡和EQ处理，精准控制特定频率范围
  - kHs Transient Shaper: 瞬态整形器，强化或柔和音效的Attack和Sustain
  - Brainworx Bx_Subsynth: 低频增强和音色合成，增加bass层和谐波丰富度
- Design principles learned:
  - 分层堆砌是创建复杂游戏音效的核心：多个简单素材通过准确的时间和音量调整可以创建逼真的复合音效
  - 时间拉伸和速率调整是音效个性化的关键：同一素材通过不同的播放速率（0.025~1.762倍速）可以产生完全不同的质感
  - 效果器链的顺序：混响→压缩→失真的顺序（gore类与金属撞击链路不同）能创建更自然的空间感和冲击力
  - 频率均衡对game sound的定义至关重要：EQ精准控制关键频点（如刀片音效-63.97Hz）
  - 动态范围管理确保混音清晰：监测峰值、避免红色过载区域、保持-20.7dB到+2.60dB的安全范围
  - 合成器改造原始素材能创建新的音色：通过包络、LFO、滤波器调制，简单的gore音效可以变成独特的游戏声效
- Use when: gore_sound_design; transient_shaping; granular_synthesis; time_stretching; convolution_reverb; multi_band_compression; frequency_modulation; sample_manipulation; audio_layering; dynamic_range_management; 使用分层技术堆砌音效：多个简单素材的组合往往比单个素材更逼真和复杂; 监测波形峰值避免失真：红色区域表示音量过高，需要及时降低增益以防止爆音; 时间拉伸范围0.025~1.762倍速：极低速率（0.025）创建戏剧化效果，高速率（1.5+）创建快速质感

## 2026-05-09 - 《Destiny 2》音效设计深度剖析：声码器应用
- Source: `https://www.youtube.com/watch?v=zxfbE0exXKk`
- Domain: scifi, magic, Vocoder, OTT, Multi-band compression, Serum synthesis, Tape saturation, SampHold filter, Transient processing, Game audio design
- Reusable pattern: 视频深入分析了Destiny 2游戏音效设计工作流，重点演示了如何使用Serum合成器、iZotope Vocoder、OTT动态均衡器等插件链来塑造复杂的游戏音效。制作过程包括合成音源处理、音频效果堆叠、波形优化和最终混音。
- Step / event map:
  - 分析源音材料质量: 检查音频波形质量，区分good source、not as good source和very good source三个等级，评估立体声声道清晰度和噪声水平，优质源素材能承受更多效果处理。
  - 使用Serum生成基础音色: 在Serum中配置Sub低频层、Noise噪声层、OSC A (Monster 6)和OSC B (Trilobyte 2)振荡器，调整波表位置、八度数(OCT)、细调(FIN)和混合(BLEND)参数。
  - 应用SampHold采样保持滤波器: 在Serum的滤波器模块中选择SampHold预设，调整CUTOFF、RES、DRIVE、PAN、MIX五个参数来创建采样保持效果，产生独特的步进式频率调制和'颗粒感'音色。
  - 配置双Vocoder实例并联处理: 在混音链中串联两个Vocoder效果器实例，左实例设置8频段(7.9dB增益)产生粗糙感，右实例设置40频段(14dB增益)产生平滑感，两者均采用Enhance载波模式、Fast响应速度。
  - 调整Vocoder核心参数: 设置Vocoder的载波模式为Enhance，配置频段数40、带宽18kHz、Mono深度分别为120%和105%，启用快速检测模式(Fast)，微调Formant参数至-15.8/-8.40dB。
  - 应用OTT多频段动态处理: 使用OTT动态均衡器将音频分为三频段独立处理：高频(2.50kHz)增益+5.4~+14.6dB、中频+2.7~+11.9dB、低频(88.3Hz)增益+8.8~+14.5dB，输出8.4~10.3dB，攻击13.5ms，释放282ms，Soft Knee。
  - 集成iZotope磁带饱和失真: 在Trash 2或Ozone的Distortion模块中应用Tape Sat.预设，设置频率330Hz、Q值2.0~3.0，在中低频点增加谐波内容和温暖感而不掩盖高频细节。
  - 应用Little Radiator前级放大: 使用Soundtoys Little Radiator 1566A前级话筒放大器插件模拟模拟硬件的温暖感，调整NOISE噪声、BIAS偏置、HEAT温暖度(-15到+15)和MIX干湿比参数，比Decapitator更温和透明。
- Plugin and processing notes:
  - Serum合成器: 生成基础合成音色，Sub+Noise+OSC A/B四层音源，SampHold滤波器产生颗粒感
  - iZotope Vocoder: 双实例并联调制音色，8频段+40频段组合创建复杂谐波结构
  - OTT多频段压缩器: 三频段独立动态控制，平衡音频频率响应
  - iZotope Trash 2 / Ozone Distortion: 磁带饱和失真，在330Hz增加谐波和温暖感
  - Soundtoys Little Radiator 1566A: 模拟前级放大器，比Decapitator更温和的过载特性
  - NI Transient Master: 整体瞬态控制，应用于Master轨获得更全局的动态控制效果
  - iZotope RX De-click: 前期音频修复，自动检测并修复点击/杂音，允许后期更激进处理
  - Delay延迟效果器: 配合SampHold创建节奏化步进空间效果
- Design principles learned:
  - Vocoder双实例并联处理：8频段(粗糙感)与40频段(平滑感)的左右组合，两者均使用Enhance载波模式+18kHz带宽，创建更丰富的谐波层次
  - OTT多频段动态均衡通过独立处理三个频段(高2.5kHz/中/低88.3Hz)来平衡能量，输出8.4-10.3dB是游戏音效安全范围
  - SampHold采样保持滤波器产生步进式频率调制和'颗粒感'音色，是创建异质感电子游戏音效的关键Serum滤波器预设
  - 效果链顺序实验：先压缩后失真产生温暖感，先失真后压缩产生激进感——两种顺序截然不同
  - 磁带饱和(Tape Sat.)在330Hz处增加谐波内容，配合OTT压缩能模拟模拟硬件温暖感
  - NI Transient Master应用于Master轨而非单轨，获得更整体的瞬态控制效果
- Use when: Vocoder; OTT; Multi-band compression; Serum synthesis; Tape saturation; SampHold filter; Transient processing; Game audio design; Convolution; Audio restoration; Vocoder频段数影响调制细节：8频段产生粗糙感，40频段产生平滑感，可根据需要并联两者同时使用; OTT的三频段输出增益应匹配整体混音电平，8.4-10.3dB输出范围是游戏音效的安全值; SampHold滤波器与延迟级联时，延迟时间5-30ms能创建自然步进感而不产生明显回声

## 2026-05-09 - 《Valorant》Veto 拦截器装备音效制作全流程
- Source: `https://www.youtube.com/watch?v=Ns8e5612fUw`
- Domain: scifi, workflow, environment, Doppler, Phase Mistress, Stereo Imager, Cellophane, Sound layering, Game audio design, Self-recorded materials, EQ subtraction
- Reusable pattern: Riot Games音效设计师Nathan讲解Valorant Veto特工Interceptor（拦截器）装备激活音效的完整制作过程。通过Reaper DAW展示了双段式结构（A段激活+B段就绪）的设计思路，使用Doppler、Phase Mistress、Stereo Imager等插件，结合自录瓷砖素材与Tonstrom素材库，创造出有空间感和即时反馈的装备激活音效。
- Step / event map:
  - 音效结构规划（A/B双段）: 将装备音效分为A段（激活起始）和B段（变为可释放时刻）。A段是按下按钮时的即时反馈，B段是能力就绪的确认反馈。这是Riot处理所有装备音效的标准两段式结构。
  - A段第一层：点击能量层: 使用Tonstrom whoosh库的'whoosh digital process bull roar rubber'素材。应用Doppler插件模拟声音远离听众的效果（音高下降），配合手绘音高曲线（蓝色线）和音量曲线（红色线）进行精细时间控制。
  - A段第二层：低频颤动层: 同样使用Tonstrom库的whoosh素材，但音频特征更低沉。同样应用Doppler插件处理，与第一层一起构成主要的clicky energy特征音。
  - A段中间：运动音效层: 添加表示运动的声音效果，帮助传达物体在空间中移动的感知。这是主动构建运动感的层，不依赖原始素材自带运动感。
  - A段末尾：粗粒质感层（EQ切除）: 添加粗粒/脆音素材层为按键提供即时反馈感。应用大幅EQ切除多余频率，去掉浑浊感后声音变清晰紧凑。EQ以减法为主：切掉不需要的，而非增加。
  - B段：自录瓷砖素材: 从Lowe's（五金店）购买瓷砖，录制瓷砖叠放 + 迫击炮浆料混合的碰撞声。这是B段（球落入手掌）的核心物理素材，代表拦截球落入手掌的真实物理感。
  - B段：Phase Mistress水感处理: 对瓷砖录音应用Phase Mistress插件，选择watery预设作为起点，然后微调参数。效果：普通碰撞音变成有弹性、水感的落球音。工作流：先用预设接近目标，再精细调整。
  - B段：冲击层（能力就绪标记）: 添加2-3个粗粒冲击层，标记球最终进入手掌的最终时刻，让玩家清楚感知能力已就绪。这是游戏音效中最关键的反馈时刻，需要多层冲击音强化。
- Plugin and processing notes:
  - Doppler插件: 模拟声音远离听众的多普勒效应，产生音高下降和距离感，为装备激活添加动态空间感
  - Phase Mistress（Soundtoys）: 为自录瓷砖音添加水感/液体质感和轻微颤动，让碰撞音变成有弹性的落球感
  - Stereo Imager: 动态控制立体声宽度，创建随时间聚焦的空间感叙事
  - EQ均衡器: 大幅切除粗粒/脆音层的多余频率，使声音清晰紧凑，提供清晰的按键点击反馈
  - Reverb混响: 为Doppler点击能量层添加微量混响，增加空间感补充
- Design principles learned:
  - 装备音效的两段式结构（A段激活+B段就绪）是Riot的标准模式，清晰标记用户交互关键时刻
  - Doppler插件模拟声音远离+手绘音高/音量曲线，是将静态素材转换为有动感特征音的核心技术
  - Phase Mistress的watery预设：预设是起点不是终点，先快速接近目标音色，再精细微调个性化参数
  - Stereo Imager宽度自动化（宽→收窄）可强化声音的时间叙事感，适合所有'能量汇聚/落定'类音效
  - Cellophane是游戏音效中创建电感/科技感的经典素材，只需少量即可增加能量感
  - 自录素材（Lowe's瓷砖+迫击炮浆料）提供无法从库中找到的真实物理感，成本极低
- Use when: Doppler; Phase Mistress; Stereo Imager; Cellophane; Sound layering; Game audio design; Self-recorded materials; EQ subtraction; Width automation; Valorant; Riot Games; 装备音效分A段（激活）和B段（就绪）两段制作，每段有独立的时间标记和反馈目的; Doppler插件+手绘音高曲线配合使用，能精确控制'运动感'的时间曲线; Phase Mistress先用预设快速接近目标，再微调——这个工作流适用于所有插件的预设使用

## 2026-05-10 - Nathan_SFX：Valorant Gekko Dizzy 飞行音效设计
- Source: `https://www.youtube.com/watch?v=M1KBLV0Zz6I`
- Domain: scifi, workflow, magic, Valorant, Gekko, Dizzy, travel loop, ally enemy variants, pulsing localization, varispeed, Pitch n Time Pro
- Reusable pattern: 这条视频拆解 Valorant 角色 Gekko 的 Dizzy 在空中飞行时的声音。作者先对比友方版和敌方版，再进入 Pro Tools 展示 start/stop、Active Loop、敌我差异、脉冲可定位性和失真处理。核心不是单个插件预设，而是把同一套飞行材料拆成可循环的运动层、可定位的脉冲层、起停 ramp 层，再按玩家需要把敌方版本做得更尖锐、更危险。
- Step / event map:
  - 先确认游戏里的信息职责: 作者先在游戏中听友方 Dizzy 和敌方 Dizzy。友方音效要提示玩家可以跟进、利用闪光；敌方音效要让玩家立刻意识到危险并躲避。敌我不是单纯音量不同，而是同一功能在玩家决策里的意义不同。
  - 把游戏声音还原成 Pro Tools 结构: Pro Tools 工程里可以看到 DizzyLoopStartStp、DizzyActiveLoop、Aux 和 Bounce 轨道。实际游戏里飞行声音由起飞、循环、停止几块拼起来，Loop 部分要能稳定循环，同时要和游戏里听到的运动时长对齐。
  - 用 varispeed 做起停 ramp: 起飞和停止不是直接硬切，而是把几层声音合成后用 Pitch 'n Time Pro 做向上或向下的 varispeed/pitch 变化。这样起飞有加速感，停止有收束感。作者也提到这类效果可以用 pitch automation 实现。
  - Active Loop 分层：飞行、Drone、晶体、脉冲: 循环主体由多层组成：NEON_ZIPS 类素材提供飞行运动，NeonDrone 提供持续能量床，Crystal Fragment 提供可识别的 Dizzy 质感，UI/Sonar Beeps 被切成重复脉冲。每一层都有明确职责，避免全部素材同时做同一种事。
  - 先用 EQ 解决 masking: 作者强调 FilterFreak 在某些层上并不是主要变化，真正关键是用 Pro-Q 3 切掉低频和低中频，避免这些层和更重要的游戏声音抢频段。视频里能看到约 500 Hz 一带的削减和较陡的滤波形状。
  - PhaseMistress 给层加运动和激光感: 晶体/脉冲层关闭插件时会偏干、偏像木块敲击；PhaseMistress 带来 laser zappiness 和周期运动。作者保留这种运动感，但后面再用 EQ 去掉不想要的低频脉动，并加一点 spring reverb 让声音不那么干。
  - 把慢脉冲切片成更快的定位节奏: 视频最后展示了脉冲层的做法：原素材的重复速率更慢，作者把它切成小块并贴在一起，形成更快、更稳定的 pulsing。移动物体带脉冲会让玩家更容易跟踪空间位置，尤其适合飞行道具、无人机、能量球和 UI 化技能。
  - 敌方版本用 Decapitator 做危险感: 敌方循环并不是另起炉灶，而是在友方材料基础上加入更强的 Decapitator 失真，让声音更刺、更粗糙、更危险。画面中可以看到 Soundtoys Decapitator，Punish 打开，Drive 较高；之后再用 EQ 把过度尖锐的部分压回可用范围。

- Layer/source map:
  - NEON_ZIPS / CA 类飞行素材
  - NeonDrone 持续能量床
  - NEON TEXTURE Crystal Fragment 晶体质感
  - UIAlert / Sonar Beeps 脉冲素材
  - Agrob / Agrobot 起停 one-sho
  - 电流层
  - 晶体层
  - 被切片的 pulse layer
  - 友方 loop 版本
  - 敌方 distorted loop 版本
- Plugin and processing notes:
  - Serato Pitch 'n Time Pro: 用于 AudioSuite 式的起停变速/变调处理。画面中可见 Range 2x、Algorithm Harmonic、Pitch 区域选择 Varispeed，用来把合成后的 start/stop 做成加速或减速 ramp。
  - Soundtoys FilterFreak 2: 作为部分层的滤波处理出现，但作者强调它不是主要贡献；重点是后续 EQ 对遮蔽频段的整理。
  - FabFilter Pro-Q 3: 用于低频/低中频裁剪、Decapitator 后 tone down、保留飞行层高频运动信息。截图里能看到约 500 Hz 附近削减和较陡的滤波曲线。
  - Soundtoys PhaseMistress: 给晶体/脉冲层加入 laser zappiness、周期感和可定位运动。作者再用后级 EQ 去掉不想要的低频脉动。
  - Spring Reverb / Little Spring 类混响: 给干燥的晶体/脉冲层一点空间和尾巴，让它不只是干硬的点击，但湿度需要克制，不能糊掉定位脉冲。
  - Soundtoys Decapitator: 敌方版本的主要危险感来源。画面中可见 Punish ON、Drive 较高、Style E 一类设置；处理后再用 EQ 和动态控制收拾过度尖锐的部分。
  - FabFilter Pro-MB / Multiband Compressor: 作者把多段压缩解释成“有条件发生的 EQ”。它只在特定频段超过阈值时压缩，适合在失真前后控制脉冲层的尖叫感。
  - Waves L3 Multimaximizer: 工程插入链中可见，用于总线或轨道电平限制/收束；它不是讲解主角，但提醒最终循环需要受控峰值。
- Design principles learned:
  - 游戏音效先服务玩家决策，再服务“好不好听”：友方技能和敌方技能应该给出不同的行动暗示。
  - 移动物体的循环音效要有可感知的脉冲或周期变化，玩家才更容易在空间里追踪它。
  - Start、Loop、Stop 分开设计，比把一个长声音直接塞进游戏里更可控，也更适合中间件循环。
  - 敌方版本可以复用友方材料作为识别基因，再用失真、EQ 和动态控制提高危险感。
  - 低中频 masking 会让技能和其它重要声音打架；飞行/电流/晶体层通常只需要保留有用的运动频段。
  - 调制插件带来的好处和副作用可以分开处理：先用 PhaseMistress 做运动，再用 EQ 切掉不需要的低频脉动。
- Use when: Valorant; Gekko; Dizzy; travel loop; ally enemy variants; pulsing localization; varispeed; Pitch n Time Pro; PhaseMistress; Decapitator; Pro-Q 3; Pro-MB; L3 Multimaximizer; masking; sci-fi UI; loop start stop; enemy danger tone; 做飞行道具时，先决定玩家需要“跟进”还是“躲避”，再决定音色粗糙度。; 能循环的 travel loop 最好拆成 start、loop、stop 三个资产，方便中间件做状态切换。; 脉冲层不要只当装饰，它是玩家定位运动物体的重要线索。

## 2026-05-10 - Nathan_SFX：Valorant Clove 烟雾 Alive / Dead 音效设计
- Source: `https://www.youtube.com/watch?v=iyAwO9g_rAQ`
- Domain: scifi, magic, impact, Valorant, Clove, smoke, alive dead variants, REAPER, event sequence, equip, incoming
- Reusable pattern: 这条视频拆解 Valorant 角色 Clove 的烟雾音效，重点是 Alive 版和 Dead 版的差异。作者先在游戏里对比两种状态，再在 REAPER 中按 Equip、Equip Idle、Select Location、Cast、Incoming、Spawn、Loop、End 展示完整序列。Alive 版偏明亮、灵动、带紫色魔法和烟雾质感；Dead 版大量复用同一批资产，但通过父轨处理、Crystallizer、ReaPitch 降调、混响、EQ 和立体声处理，把同一技能变得更暗、更不稳定，表达 Clove 死后仍能放烟的状态。
- Step / event map:
  - 先听 Alive 与 Dead 的游戏语境: 作者先在游戏内播放 Clove 烟雾 Alive 版，再播放 Dead 版。这里的重点不是单个声音，而是同一技能在两种角色状态下给玩家的不同信息：Alive 版清晰、流动、可操作；Dead 版更暗、更异样，但仍必须让玩家识别为 Clove 的烟。
  - 把技能拆成完整事件序列: REAPER 工程按游戏事件拆分：Smoke_Equip、Equip Alive、Smoke_Select、Smoke_Cast、Smoke_Incoming、Smoke_Spawn、Smoke_Loop、Smoke_End。这样的拆法让每个动作都有独立反馈，也方便在游戏里按状态触发不同资产。
  - Spawn 与 Loop 分开负责出现和持续: 烟雾出现时有 Spawn 层负责瞬态、膨胀和视觉冲击，烟雾成型后进入 Loop 层负责持续氛围。Spawn 可以有更明显的冲击和 whoosh，Loop 则需要平稳、可循环、不过度抢注意力。
  - Incoming Alive 用多层铺出 Clove 身份: Incoming Alive 不是重插件链，而是以 EQ 和分层为主。层里有短促 impact、烟雾冲击、bamboo flute 式设计元素、whoosh/chime、暗色 body。作者说 bamboo flute 这类音色很能给出 Clove 的身份，而底部暗色层把整体粘起来。
  - Dead Incoming 复用素材，再走父轨处理: Dead Incoming 的主体复用 Alive 里听过的资产。工程里紫色区域是 Dead 相关轨道，多个子轨缩进到父轨中，父轨上的处理会同时影响这些层。这样能保留同一技能的识别基因，同时用统一处理把状态染成更暗的颜色。
  - Dead 父轨链：颗粒、降调、空间、EQ、立体声: Dead 处理链可见：Soundtoys Crystallizer、Cockos ReaPitch、Eventide SP2016 Reverb、FabFilter Pro-Q 3、Waves S1 Imager Stereo。作者先关闭处理听原素材，再打开处理，声音立刻更 dissonant、更 harsh、更像 Dead smoke。
  - Crystallizer 做暗色颗粒和颤动: Crystallizer 是 Dead 版本的核心颜色来源。画面里可见 Soundtoys Crystallizer，预设名类似 Metallicah，Pitch 显示 -50 cents，Splice 约 127.3 ms，Delay 约 7.4 ms。它让原本熟悉的 whoosh/flute 产生颗粒回声、微小不协和和 flutter。
  - Smoke Loop Alive：风、Riot Chimes、闪光高频: Alive Loop 由 windy drone、Riot Chimes 和高频 sparkle/chime 层组成。作者提到这些 chimes 是 League 团队录制后放入 Riot 素材库的 building blocks。Loop 的任务是持续包住烟雾视觉，但不能像 Spawn 一样每一秒都在抢戏。

- Layer/source map:
  - Bamboo flute 式 whoosh / 角色身份层
  - Smoke-like impac
  - Dark body impac
  - WHSH_WHOOSH_LIGHT / DARK 类 whoosh
  - MAFDS BUFF LARGE Divinity
  - MAFCK METAL Sequence Wind Chimes
  - Riot Chimes
  - DSGNDrone abstract ambience / wind rumble
  - High sparkle chime layers
  - 额外 Dead windy layer
- Plugin and processing notes:
  - Soundtoys Crystallizer: Dead 版本的核心颗粒/暗色处理。画面中可见 Granular Echo Synthesizer，预设名类似 Metallicah，Pitch 约 -50 cents、Splice 约 127.3 ms、Delay 约 7.4 ms，用来制造 flutter、不协和和幽灵感。
  - Cockos ReaPitch: 用于 Dead 版素材降调。字幕中作者明确提到把某层降低 7 个半音，让它保留 Alive smoke 的轮廓但变得更暗。
  - Eventide SP2016 Reverb: 给 Dead 处理链增加空间尾巴和深度，让颗粒/降调后的层不只是干硬地贴在前景。
  - FabFilter Pro-Q 3: 用于清理和塑造 Dead 处理后的频谱，也用于 Alive Incoming 中以 EQ 和 layering 为主的整理；暗色版本仍保留必要高频可读性。
  - Waves S1 Imager Stereo: 作为 Dead 父轨链末端的立体声处理，让处理后的烟雾更包裹，但核心信息仍需要保持清晰。
  - REAPER Parent / Folder Routing: 多个 Dead 子轨缩进到父轨，父轨插件统一作用于所有子层。这是快速制作同源状态变体的关键工作流。
- Design principles learned:
  - 技能音效要按玩家可感知事件拆分：equip、idle、select、cast、incoming、spawn、loop、end 各自承担不同反馈。
  - 状态变体不一定要重做素材；复用同源材料，再通过父轨链统一染色，可以同时保留识别度和差异。
  - Alive 与 Dead 的差异可以用音色明暗、不协和、降调、颗粒回声和空间感来表达，而不是只靠音量或滤波。
  - Incoming 声音需要告诉玩家“烟马上要出现”，所以可以有 impact、whoosh、flute identity 和 dark body 的组合。
  - Loop 声音要比 Spawn 更克制，强调持续包裹和材质，而不是持续制造瞬态冲击。
  - 高频 chimes/sparkle 即使在暗色 Dead 版本里也不能全切掉，因为它们提供可读性和技能身份。
- Use when: Valorant; Clove; smoke; alive dead variants; REAPER; event sequence; equip; incoming; spawn; loop; Soundtoys Crystallizer; ReaPitch; SP2016 Reverb; Pro-Q 3; S1 Imager; detuned chimes; parent routing; Riot Chimes; state variant; magic smoke; 为技能做音效时，先写出完整事件清单，再决定每个事件需要瞬态、身份、空间还是持续层。; 状态变体优先尝试复用原素材；只要轮廓还在，玩家就能识别同一个技能。; Dead、corrupted、ghost 这类状态可以从降调、detune、颗粒回声和不协和开始设计。

<!-- END HTML_KB_BACKFILL_2026_05_10 -->

## 2026-08-08 - Serum 金属断奏：用 Stepwise Morph 制作科幻纹理
- Source: `https://www.youtube.com/watch?v=Xl5u91oQv-k`
- Domain: scifi, workflow, impact, 插件技巧, Serum, GRM Reson, Transient Shaper, Stepwise Morph, spectral morphing, resonator stacking
- Reusable pattern: 先用 Serum 的单振荡器 wavetable、PWM 与 Reverb 滤波器建立短促谐波源，再串联多个设置不同的 GRM Reson 形成金属峰群；首个共振器后用 Transient Shaper 整理起音，第二种版本再在共振链后加入 Stepwise Morph 多点曲线。画面确认后段顺序为 Gain -> soothe2 -> Pro-L 2；作者说明衰减与 limiter 的需要，但 soothe2 的具体用途只能作为分析推断。复用时应把画面确认值、作者口述方向和听感分析推断分开记录。
- Step / event map:
  - 对齐两个目标声音: 先比较 00:00-00:20 的 Sound #1 与 00:20-00:40 的 Sound #2。前者是短促、彼此分隔的金属谐波块；后者段内更宽、更连续。频谱差异属于本地分析推断，不写成作者的算法结论。
  - Serum 建立谐波源: 画面确认预设 Metallic_transformers_transient、OSC A wavetable 4088、OSC B 未参与、PWM 调制与 Reverb 滤波器；调谐约 -5.51 只记录为该画面的当前值。作者还展示 Serum 多段压缩用于增加密度与延音，但没有可可靠抄录的完整参数。
  - 四个 GRM Reson 建立峰群: 画面确认 Serum 后连续使用四个 GRM Reson Stereo。frame_000145 当前实例可读 Gain -3、Mix 29%、56 filters、distribution 69%、random 0.935、S&H 0.075、resonance 0.40、mono/stereo 46%、1037-15000 Hz；这些值不能推广给另外三个实例。
  - 首个共振器后整理瞬态: 画面确认 Kilohearts Transient Shaper 位于第一个 GRM Reson 后，Attack、Pump、Sustain、Speed 与 Clip 控件可见，但旋钮数值不可可靠读取；只记录其收紧起音与延音关系的功能角色。
  - Morph 生成第二种频谱形态: 画面确认 Sound #2 在四个 GRM Reson 后加入 Stepwise Morph，多点起伏曲线的 FFT Size 为 8192。作者口述从近似直线增加控制点并改变曲线峰谷，以获得更明显的科幻质感。
  - 管理共振后的输出: 画面确认 Sound #2 后段为 Morph -> kHs Gain -> soothe2 -> FabFilter Pro-L 2。作者明确说共振链会让输出很响，并提到衰减与 limiter。分析推断：基于插件位置与旁路听感，soothe2 可能用于整理突出的共振峰；作者没有口述它的用途。
  - 打印与归档变体: 分别改变 GRM Reson 的 Resonance、S&H Rate、频段边界以及 Morph 的曲线控制点，保存无 Morph、直线 Morph、多点 Morph 和最终动态整理版，归档时标明每项证据等级。
- Plugin and processing notes:
  - Xfer Serum: 单振荡器 wavetable 4088 配合 PWM 与 Reverb 滤波器生成谐波丰富的短促金属源；画面可见调谐约 -5.51，Serum 内多段压缩用于增加密度与延音。
  - Ina-GRM GRM Reson Stereo: 四个不同设置的串联实例构成主要金属峰群；作者建议通过 Resonance 与 Sample-and-Hold Rate 快速制作变体。
  - Kilohearts Transient Shaper: 放在第一个共振器之后整理起音，画面不足以确认具体旋钮数值，因此只按更紧/更松、更短/更长的方向调节。
  - Stepwise Morph: 放在 Sound #2 的共振链之后，通过多点频谱曲线改变纹理形态；当前唯一画面确认的 FFT Size 是 8192。
  - Kilohearts Gain: 在高能量共振与 Morph 后先回收电平，为后级动态处理留出余量。
  - oeksound soothe2: 画面只确认它位于 Gain 与 Pro-L 2 之间。分析推断：它可能用于整理过度突出的共振峰、避免科幻金属纹理变得刺耳；作者未说明其用途，视频也未显示可可靠抄录的具体数值。
  - FabFilter Pro-L 2: 链末限制峰值并稳定输出，响度匹配后检查是否损失短音冲击。
- Design principles learned:
  - 谐波源与材质塑形分工：Serum 提供可控源，多个共振器决定金属身份，比让一个复杂预设承担全部角色更容易调试。
  - 多实例共振的价值来自差异化峰群；复制四个相同设置只会堆积能量，应该改变频段、共振、随机量与 S&H 速度。
  - 瞬态处理插在共振链中段，可以先整理已经出现的攻击轮廓，再把结果送入后续共振器继续塑形。
  - Morph 曲线应从近似直线基准开始逐点编辑；小幅节点变化也可能显著改变频谱，因此必须保存可回退版本并做响度匹配。
  - 画面确认共振与频谱变形后的链位是 Gain -> soothe2 -> Pro-L 2，作者确认衰减与限制需求。soothe2 是否承担动态共振抑制属于分析推断，应通过旁路试听验证，不能写成作者结论。
  - 教程复刻必须保留证据等级：可读画面数值可以引用，作者口述可总结，频谱和听感推断必须明确标为分析推断。
- Use when: 金属 UI 断奏; 科幻武器瞬态; 机器人动作; 机械警告; 能量碰撞; Serum PWM 声源; GRM Reson 共振器堆叠; Stepwise Morph 频谱变形; 需要从同一声源快速制作短促版与宽密变体; 需要建立可审计的插件参数笔记

## 2026-08-08 - Serum 动漫音效：从振荡器到高速能量变化
- Source: `https://www.youtube.com/watch?v=kv0yNg1CPAk`
- Domain: scifi, magic, workflow, 插件技巧, Serum, anime SFX, door hinge recording, Noise Phase, Pitch modulation, Frequency Shifter, resampling, item FX, track FX
- Reusable pattern: 教程标题沿用“Serum 动漫音效”的说法，但画面确认的实际声源不是 OSC A/B 振荡器：作者关闭两组振荡器，把一段门轴录音放入 Noise 模块，用多个快慢不同的 LFO 大幅推动 Noise Phase 与 Pitch，连续录下实验后筛选 one-shot。单个片段在 item 级用 Pro-Q 3、Delay 或 ValhallaFreqEcho 建立局部音色和尾巴，整组结果再经过轨道级 Frequency Shifter 自动化与 Pro-R 统一运动；Oxford Inflator 只为可选响度，不是核心方法。
- Step / event map:
  - 选择可被调制的门轴素材: 作者使用很久以前在 Microsoft 录下的门声，截取门轴开始转动的部分。合适录音应有弱音高感但不过度音乐化，同时保留摩擦噪声，才能兼顾可追踪谐波和老式动漫的粗糙质地。
  - Serum 只启用 Noise: frame_000130 画面确认 OSC A/B 均关闭，Noise 名称以 CREAKS_micr... 开头，Filter 为 Cmb+。标题中的“振荡器”不能被理解成 wavetable OSC；本案例实际只有 Noise 采样源参与发声。
  - 多个 LFO 同时推动 Phase 与 Pitch: 画面与作者口述共同确认多个 LFO 控制 Noise Phase 和 Pitch。frame_000170 的 L2 是指数下降曲线、当前速率 9.3 Hz；作者持续改变 Rate、曲线和调制深度，因此该数值只属于这一截图时刻。
  - 长录实验再筛选 one-shot: 作者不是寻找一条固定预设，而是在实时改调制时录下长段输出，再按起音、运动方向和尾音挑出有用片段。分析推断：这一步把不可预测的实时调制转化成可编辑、可归档的游戏资产。
  - 轨道级 Frequency Shifter 统一运动: frame_000470 画面确认 Frequency Shifter 当前为 1.64 kHz，自动化曲线在不同片段间重画。可见轨道链为 Frequency Shifter -> FabFilter Pro-R -> Oxford Inflator Native -> Waves S1 Imager Stereo -> Waves L1 Limiter Stereo。
  - Item Pro-Q 3 聚焦 bubbly 质感: frame_000560 显示中频峰形提升与高频窄带衰减。作者说明中频提升可加强 bubbly 感，但截图没有可靠显示中心频率或增益，因此只记录曲线方向，不写伪精确 Hz/dB。
  - Item Delay 与 FreqEcho 建立尾音: frame_000570 的 Kilohearts Delay 当前为 244 ms。frame_000595 的 ValhallaFreqEcho 为 Mix 50.0%、Delay 56.48 ms、Shift 0.56 Hz、Feedback 53.60%、Low Cut 200 Hz、High Cut 15000 Hz、Stereo；这些值只绑定各自截图，不能推广为固定预设。
- Plugin and processing notes:
  - Xfer Serum: 本案例关闭 OSC A/B，只用 Noise 模块载入 CREAKS_micr... 门轴录音；Cmb+ 可见。多个 LFO 大幅调制 Noise Phase/Pitch，Serum FX 还可见 Tube Distortion 与 Compressor，但具体阈值、比率不可可靠读取。
  - Kilohearts Frequency Shifter: 轨道级核心运动插件。frame_000470 当前读数 1.64 kHz；复用重点是为每个片段重画上扬、下坠或反转轨迹，不是固定该频移量。
  - FabFilter Pro-R: 位于轨道 Frequency Shifter 后，为整组变体增加统一空间；视频没有显示可可靠抄录的完整参数。
  - FabFilter Pro-Q 3: 在 item 级强化有用中频并削减刺耳高频峰。曲线可见但精确频率/增益不可读，必须按当前素材扫频确认。
  - Kilohearts Delay: frame_000570 当前为 244 ms，用来为个别 item 增加可被后续轨道频移一起推动的尾巴。
  - ValhallaFreqEcho: frame_000595 的 Mix 50.0%、Delay 56.48 ms、Shift 0.56 Hz、Feedback 53.60%、200-15000 Hz、Stereo 只描述该画面当前状态。
  - Oxford Inflator Native: 作者明确说明只用来增加响度，并非方法必须项；画面还出现过授权连接提示，复刻时可直接关闭。
  - Waves S1 Imager Stereo / L1 Limiter Stereo: 位于轨道末端，分别负责宽度与峰值收束；画面只确认链位，没有可靠参数。
- Design principles learned:
  - 有弱音高的有机摩擦录音比完全无音高噪声更适合 Phase/Pitch 激进调制，因为它既保留粗糙纹理，又能提供可跟踪的谐波骨架。
  - 快慢 LFO 应承担不同角色：快调制负责细碎能量，慢调制负责整体运动；截图速率是实验状态，不应被当成唯一答案。
  - 长录再筛选是设计流程，不是善后步骤。先允许调制产生意外，再把最有方向感的结果剪成 one-shot，往往比过度预设化更高效。
  - Item FX 与 Track FX 要明确分工：item 负责每个变体的局部 EQ/尾音，track 负责整组统一频移、空间和输出控制。
  - Inflator、S1、L1 等末端插件不能掩盖核心方法。先关闭它们做响度匹配 A/B，确认 Noise 调制和频移运动本身已经成立。
  - 所有证据都要分级：画面可见值只限定到对应帧，作者口述可以总结，流程关系产生的听感结论必须标为分析推断。
- Use when: 动漫能量变化; 科幻冲刺; 魔法弹道; 气泡式 UI; 门轴录音; Serum Noise; OSC A/B off; Noise Phase; Pitch LFO; Frequency Shifter automation; Pro-Q 3 bubbly EQ; Kilohearts Delay; ValhallaFreqEcho; resampling; one-shot curation; item FX vs track FX; 需要从一段有机录音生成大量同族变体; 需要把随机调制转化为可编辑游戏资产

## 2026-08-08 - 单声道变电影感：初学者的空间与层次处理
- Source: `https://www.youtube.com/watch?v=St6GD7CbdcM`
- Domain: workflow, environment, scifi, 插件技巧, mono to cinematic, event duplication, timing offset, panning, ramp layer, UBERLOUD, bx_limiter True Peak
- Reusable pattern: 从一条干净 mono 事件开始，把同一素材复制到独立轨道，保留中心时间锚点，再按作者口述让左右伴随副本轻微向相反方向错开，并用声像与相对电平建立宽度和存在感。需要时在主撞击下加入更轻的 ramp take 补起始运动。画面确认 Stereo Out 顺序为 BOOM Library UBERLOUD -> Brainworx bx_limiter True Peak，-6.00 dB 仅为本视频作者目标。响度匹配旁路和单声道兼容检查属于分析建议，不是作者口述。
- Step / event map:
  - 挑选并复制单声道撞击: 作者先选一条干净金属撞击，保守裁切、加小淡入，再复制到独立干净轨道。frame_000138 只确认堆叠结构，不支持抄录精确位移。
  - 用轻微错位、左右展开和相对电平建立宽度: 作者口述外侧副本向相反时间方向轻微移动并分别展开到左右；frame_000153 显示独立 mixer 通道、panner 和 fader，但具体毫秒、声像及推子数值不可读。
  - 加入较轻 ramp 层: 作者把另一条带 ramp 的 take 滑到主撞击下方并降低电平。frame_000225 确认短事件位于主堆叠下方，职责是丰富起始运动而不是成为第二次撞击。
  - 输出链先塑形再限制: frame_000300 画面确认 Stereo Out 为 UBERLOUD -> bx_limiter True Peak。UBERLOUD 可见 3-Band 与 Nice character；limiter 的 -6.00 dB 是本视频作者为后续工作留空间的目标，不推广为行业标准。
  - 迁移到喷火器长素材: 作者把复制、左右轻微错位和既有声像布局用于喷火器录音，并旁路比较 UBERLOUD。frame_000340 确认长事件平行排列，说明可复用的是轨道结构与调节顺序，而不是金属撞击的数值。
  - 分析复核: 宽度布局完成后折叠到单声道检查瞬态，输出处理旁路时做响度匹配。两项均为分析建议，不能写成作者结论。
- Plugin and processing notes:
  - Cubase event editing and mixer: 复制 mono 事件并分别控制时序、左右展开和电平。画面确认控件与布局，但不支持精确毫秒、声像或推子读数。
  - BOOM Library UBERLOUD: 在 Stereo Out 增加冲击、低频推动、中频存在感、高频细节与清晰度；frame_000300 可见 3-Band、Nice character 与它在 limiter 之前的位置，精确 Push 数值不可读。
  - Brainworx bx_limiter True Peak: 位于 UBERLOUD 后管理峰值。frame_000300 显示 -6.00 dB，本条只把它记录为作者当前目标，其余设置不猜测。
  - Optional reverb, chorus, distortion: 作者仅口述这些效果可利用干净通道增加角色，没有逐一展示为启用 insert，不能反推具体插件链。
- Design principles learned:
  - 单声道电影感的第一步是建立可独立编辑的副本结构，而不是立即用单一宽化插件覆盖源素材。
  - 时间、声像和电平应分开调节；一次只改变一个维度，才能知道宽度、前后感和瞬态变化来自哪里。
  - ramp 是补充层，不是默认必需层。只有主撞击缺少起始运动时才加入，并保持在主瞬态之下。
  - 输出塑形放在空间布局成立之后。UBERLOUD 与 limiter 可以增加存在感和控制峰值，但不能替代清楚的层间关系。
  - 截图数值必须绑定证据帧：本条唯一确定输出值是 -6.00 dB，且只属于作者在本视频的目标。
  - 响度匹配和单声道复核能避免把增益或相位损失误判为设计改进，但这是本地分析建议，不是教程原话。
- Use when: 单声道撞击; mono to cinematic; 金属 impact; 环境录音宽化; 科幻喷射; Cubase event duplication; timing offset; panning; layer balance; ramp layer; BOOM Library UBERLOUD; bx_limiter True Peak; 插件技巧; 需要把一条 mono 素材扩展为可控的电影感层次; 需要迁移同一轨道布局到不同长度素材

## 2026-08-08 - Valorant Tejo 火箭爆炸音效拆解
- Source: `https://www.youtube.com/watch?v=eKCYZz98-N4`
- Domain: impact, scifi, workflow, 插件技巧, Valorant, Tejo, close distant events, combat readability, distance crossfade, flam, Wwise occlusion
- Reusable pattern: 把一次游戏爆炸实现为同时触发的 close 与 distant 两个事件。close 先按 Transient、Energy、Tail 分工，并通过短尾与强 EQ 保持高密度战斗可读性；distant 使用相关素材或同库变体，经过子层频谱滚降，再送入 Reverb -> Pro-Q 3 -> S1 Imager parent。Wwise 用距离增益曲线交叉两组事件，并在遮挡时叠加额外 EQ。画面中的距离和 Pro-Q 3 数值只属于对应证据帧，不能泛化。
- Step / event map:
  - 组织 close 的 Transient/Energy/Tail: frame_000130 确认三类角色与短事件结构。作者用 transient 提供 thump 和 scratchy 起音，Energy 提供音调身份，Tail 补余韵，并刻意压短主要事件以给脚步和连续技能让位。
  - 强 EQ 雕刻 close 层: frame_000300 显示陡峭低切、高切和中频凹口。唯一可读选中节点约为 2558.9 Hz、-11.1 dB、Q 4.23，只绑定当前画面，其余节点不猜测。
  - 建立 Distant parent: 作者让相关素材或同库变体先做低高频滚降。frame_000490 只确认 bypass A/B 画面中的链成员和顺序为 kHs Reverb -> Pro-Q 3 -> S1 Imager Stereo，不证明该瞬间链已启用，也不支持抄参数。
  - 距离交叉 close 与 distant: 两个事件同时触发。frame_000650 显示 close 约 4500 开始下降、约 5200 静音，distant 约 4000 后上升；这些值只属于本游戏画面，3250 脚步距离也仅是上下文。
  - 用轻微 flam 增加 ult 重量: frame_000820 确认前三个 transient 的细小起点错位。作者说明轻微 flam 增加角色，过大间隔则形成分离起音并加重连续爆炸的掩蔽；画面不支持毫秒值。
  - 简化 distant ult 并延长尾音: 作者说明 distant ult 层数更简单、位置更远、播放更安静，因此较长尾音不易遮挡近处信息。frame_001000 只证明层数与时长的视觉差异，不证明频谱、宽度或 mono 处理。
- Plugin and processing notes:
  - FabFilter Pro-Q 3: close 层使用积极频谱雕刻；frame_000300 唯一可读选中节点约为 2558.9 Hz、-11.1 dB、Q 4.23，其他 close/distant EQ 数值均不建立预设。
  - kHs Reverb -> FabFilter Pro-Q 3 -> Waves S1 Imager Stereo: frame_000490 确认 Distant parent 的成员与顺序，作者口述 S1 把远距结果向 mono 收窄；截图处于 bypass A/B 状态，完整参数未展示。
  - REAPER close/distant groups: 近距和远距各自保留可编辑的 transient、energy、tail 角色；同库来源不等于每层都是同一文件的复制。
  - Wwise distance, occlusion and EQ: 两事件同步触发后按距离交叉增益，遮挡时追加 EQ。视频未展示遮挡频率、增益、曲线或项目配置。
- Design principles learned:
  - 游戏爆炸的冲击力和可读性必须一起设计。close 尾部越占空间，连续爆炸时越容易遮住脚步、语音或技能反馈。
  - 远近变化不仅是整体音量衰减：相关素材、频谱滚降、混响和宽度收窄共同形成 distant 版本的身份。
  - close/distant 同时触发再交叉增益，可以让距离过渡连续；交叉区必须在实际地图尺度中检查音量洞、峰值叠加和音色跳变。
  - flam 是微小时序关系，不是固定毫秒预设。应从对齐开始逐步拉开，并在连续事件而非 solo 中判断掩蔽。
  - distant ult 的作者事实只包括层数更简单、位置更远、播放更安静，以及因此长尾较少遮挡近处信息；不能把普通火箭 Distant parent 的频谱与宽度处理套到 ult。
  - 截图数值和状态必须绑定证据：frame_000490 只证明 bypass A/B 时可见的链顺序；frame_000650 的距离值和 frame_000300 的 EQ 节点都不是通用规范。
  - 分析建议：对 distance crossover、频谱、宽度、mono 兼容、等响旁路和高密度战斗可读性做项目内复核；这些检查不属于作者对 distant ult 的处理说明。
- Use when: Valorant; Tejo; 火箭爆炸; impact; scifi; 插件技巧; Transient Energy Tail; close distant events; combat readability; FabFilter Pro-Q 3; kHs Reverb; Waves S1 Imager; Wwise distance crossfade; occlusion EQ; flam; distant long tail; 需要为同一爆炸制作近距和远距资产; 需要在连续技能中控制掩蔽

## 2026-08-08 - 日常物件制作现代爆炸：录音、分层与处理
- Source: `https://www.youtube.com/watch?v=f9OrpDtedSI`
- Domain: impact, workflow, 插件技巧, household objects, Nerf transient, leather granular tail, shaker debris, plastic tube tonal launcher, staggered explosion, convolution reverb
- Reusable pattern: 先把 Nerf 玩具枪、皮夹克、shaker 与塑料管按行为分配为 transient、tail、debris 和 tonal launcher，再分别清理并串联角色化处理。Nerf pop 经瞬态增强、中频清理、峰值控制与调制成为主起音；皮革经重新选取麦克风位置、两级去噪和 MGranularMB 延展成长尾；shaker 经 Portal、ReaEQ、MRatioMB 隐藏字面身份；塑料管经饱和、失真、降八度、增厚与调制成为轻声发射体。最终分开 launch/main explosion，轻微错开相关瞬态并添加卷积尺度层。frame_000408 的 MGranularMB 数值与 frame_001004 的 Altiverb 7 IR、87.70% wet 只可作为各自截图当前状态引用，其他设置均保持作者口述或画面成员边界。
- Step / event map:
  - 清理并塑造 Nerf 瞬态: 作者口述公寓底噪需要 RX Spectral De-noise，Nerf 还使用 De-reverb；transient shaping 收紧 pop，Enforcer 增加合成瞬态，EQ 处理约 1-2 kHz 不悦堆积，limiter 控制 clipping，FilterFreak 增加幅度调制。frame_000170 只确认 Enforcer 所在链和编辑后的瞬态变体，不提供完整预设。
  - 延展皮夹克尾音: 作者因第一次录音低频过多而改变麦克风位置重录，以获得更多高频细节。两级 RX 去噪后，Inflator、Sonic Maximizer、Pro-MB、Air Flanger 与 SerumFX 分别承担密度、亮度、低频控制、音调与宽度；MGranularMB 把短动作切分、延迟和错开为长 decay。
  - 约束 MGranularMB 数值证据: frame_000408 当前可读总 Dry/Wet 50%、Output 约 -4 dB、Grain Size 60 ms、Random 1000 ms、Pitch -12、Copies 10。它们只属于该截图状态，不是通用皮革尾音预设。
  - 强化尾音内部攻击: 作者用 Transgressor 检测并强调多个尾部瞬态，用 Fresh Air 增加中频和上中频 crackle，后续再加饱和、低音高强化与卷积混响。frame_000505 只确认 Transgressor 2，不支持 detector、EQ、hold、release 或 gain 数值。
  - 把 shaker 与塑料管隐藏成新角色: frame_000612 确认 shaker 的 Portal -> ReaEQ -> MRatioMB 可见链；作者说明 ping-pong delay 只能近似部分 Portal 运动。frame_000700 确认塑料管轨可见 Pro-L 2、Decapitator、Saturn 2、H3000 Factory、Inflator、FilterFreak；只有 H3000 下移一个八度来自作者口述，其他隐藏值不抄录。
  - 组装两拍爆炸: 作者把 launch 和 main explosion 分开，反向皮革配手绘 volume envelope 形成 flyby，并把多个 Nerf 派生瞬态轻微错开。frame_001035 只确认短 impact 与错开的长尾布局；frame_001004 清楚显示 Altiverb 7 位于 Track 22，IR 为 `Great Pyramid / Chamber, Giza Kings Chamber`，当前 Dry/Wet Mix 为 87.70% wet。字幕确认高 wet 卷积混响生成爆炸尾音与环境上下文；IR 和 wet 值只绑定该帧当前状态，pre-delay 与 decay 未确认。
- Plugin and processing notes:
  - iZotope RX 8 Spectral De-noise / RX De-reverb: 清理公寓底噪和 Nerf 房间反射。作者确认皮革使用两级去噪，但没有公开可迁移的 threshold 或 reduction。
  - Newfangled Audio Enforcer / Neutron 3 / Kilohearts Transient Shaper: 增强并收紧 Nerf 主起音。frame_000170 只确认 Enforcer 所在链；其他完整参数不可读。
  - ReaEQ / FabFilter Pro-L 2 / Soundtoys FilterFreak: 作者分别说明约 1-2 kHz 清理、增强后 clipping 控制和幅度调制职责；画面不支持固定频点、阈值或调制速率。
  - Oxford Inflator / BBE Sonic Maximizer / FabFilter Pro-MB / AIR Flanger / SerumFX: 为皮革增加密度、亮度、低频控制、音调与 chorus-like 宽度。frame_000390 证明可见成员，不证明完整 preset。
  - MeldaProduction MGranularMB: 把短皮革动作变成长而带闪电感的 decay；唯一可引用数值严格绑定 frame_000408 当前状态。
  - Boz Digital Labs Transgressor 2 / Slate Digital Fresh Air: 前者强调尾音内部攻击，后者增加 crackle/detail；frame_000505 只支持前者的可见处理角色。
  - Output Portal / ReaEQ / MRatioMB: 打散 shaker、去除无用低频并减弱重复摇动身份。无 Portal 时 ping-pong delay 只是作者建议的部分近似。
  - Decapitator / FabFilter Saturn 2 / H3000 Factory / Oxford Inflator / FilterFreak: 把塑料管做成轻声 tonal launcher；作者确认 H3000 下移一个八度，其余精确设置不公开。
  - Audio Ease Altiverb 7: frame_001004 确认插件位于 Track 22，IR 为 `Great Pyramid / Chamber, Giza Kings Chamber`，当前 Dry/Wet Mix 为 87.70% wet；字幕确认高 wet 卷积混响用于生成爆炸尾音与环境上下文。IR 与 87.70% wet 只属于该帧当前状态，不是通用预设，pre-delay 与 decay 仍未确认。
- Design principles learned:
  - 选择小物件时先听可迁移行为：短机械 pop、可延展摩擦、颗粒动作和空心音调，比物件名称更能决定最终层职责。
  - 清理必须先于激进处理，但去噪和去混响只解决真实录音问题；过度清理会牺牲后续需要的瞬态和高频纹理。
  - 每个源先承担一个主角色，再决定插件。这样 transient、tail、debris 和 tonal body 可以独立删减，不必靠整组总线掩盖冲突。
  - 颗粒延展不仅是把声音做长，还要管理每次出现的间隔；尾音彼此挤压时，颗粒细节会变成无法辨认的 wash。
  - 作者的 less is more 落在时序上：多个相关瞬态可以轻微错开，但不应被拉成分离的多次击打，也不应全部压在同一采样点。
  - 三级背景 tonal launcher 必须轻于主瞬态；它负责支撑 launch 身份，不承担主爆炸重量。
  - 分析建议：卷积混响加入后做等响旁路、尾部遮蔽、低频焦点与 mono 兼容复核；这些是迁移验收，不是教程里的固定参数。
- Use when: 现代爆炸; 日常物件录音; Nerf transient; 皮夹克尾音; MGranularMB; shaker debris; Output Portal; plastic tube tonal launcher; Transgressor 2; Altiverb 7; convolution reverb; staggered transients; launch and main explosion; impact; workflow; 插件技巧; 需要用小型家用物件搭建大型爆炸; 需要严格区分作者口述、画面事实和分析建议

## 2026-08-08 - 日常物件制作超写实武器爆炸音效
- Source: `https://www.youtube.com/watch?v=2cTDQ_MetsE`
- Domain: impact, workflow, scifi, 插件技巧, daily objects, weapon explosion, role folders, geophone can, chip bag, TONSTURM TRAVELER, Xfer OTT, SpaceBlender, Tremolator, ValhallaShimmer, Foley
- Reusable pattern: 分析归纳：作者把日常录音按 Kick、Mech、Explosion、Ambience、Zoom、Foley 六类场景职责归档。地震检波器录下的罐体瞬态经处理得到 kick-like 结果并与短 click 分层，钥匙串提供机械细节，薯片袋同时保留简单降调层与多个增强变体，水瓶、呼吸和罐体承担环境素材，短 squeeze/rattle/布料/脚步事件逐动作排列。可迁移建议是先明确角色，再决定简单或重处理；这不是作者给出的固定爆炸链。
- Step / event map:
  - 建立六个角色文件夹: frame_000090 确认 Submix 下方的 Kick、Mech、Explosion、Ambience、Zoom、Foley。Master 可见 Insight 2、RCInflator 2、Pro-L 2，但作者没有解释设置或贡献，因此只作会话上下文。
  - 处理罐体并与短 click 分层: 作者口述先降调、EQ 去高频、Transient Shaper 加 punch、MSaturator 增密、Pro-L 2 防 clipping；TRAVELER 意外产生可用 kick-like 结果，作者再把处理结果与较短 click 分层。frame_000153 确认可见顺序和 `BASIC LEFT TO RIGHT` 当前状态；证据边界是不建立 movement 预设，也不推断每次试听的启用状态。
  - 用不同薯片变体建立 Explosion: 画面事实是 frame_000255 显示多个长度与 item rate 不同的 chip 事件。作者口述确认一层只降调、不加插件，其他示例加入 pitch/reverb；其中一条增强示例使用瞬态塑形、OTT、Waves RBass 与饱和来增加攻击、密度、低频支持和饱满度。七张发布帧没有展示这组完整增强处理，因此不声明精确顺序、参数或启用状态。
  - 制作 crunchy high debris: 作者在字幕 05:46-05:56 对一个 chip 示例说明 OTT gain 为 `+14`，随后使用 distortion 和 EQ 控制 noisy highs。frame_000352 只确认 OTT、kHs Distortion、Pro-Q 4 成员及当前陡峭高频衰减；画面本身不显示 +14，该数值也不是推荐起点。
  - 把罐体转为移动 ambience: 作者使用 plate、SpaceBlender default preset 和 Tremolator，并称 Tremolator 是运动关键。frame_000455 显示 Pro-Q 4 -> SuperPlate -> SpaceBlender -> Tremolator，以及 SpaceBlender 当前 `Time: 4500 msec`；4500 ms 只属于此帧与此素材。
  - 拆分三条 Ambience 素材: 作者对大幅降速的水瓶砸击只削弱明显瞬态，以保留细微 crackle；另一条环境素材使用 ValhallaShimmer、Pro-C 2、Pro-Q 4 增加空间、控制峰值和亮度；呼吸素材只采用相近的 shimmer 与亮度控制。frame_000525 确认的是另一条环境素材的可见成员，不能把该链归给水瓶，也不能据此认定呼吸素材使用完全相同的插件链。
  - 用 Zoom 与 Foley 解释动作: Zoom 把 bottle squeeze、keychain scope-in 与 cocking 拆成短事件；Foley 使用布料、iPhone 室外脚步、机械 rattles 和 reload 小事件。frame_000700 确认多排短事件逐动作对齐，罐体 Kick 低频只在该场景补靴子重量。
- Plugin and processing notes:
  - FabFilter Pro-Q 4 / Kilohearts Transient Shaper / MSaturator / Pro-L 2: 罐体 Kick 的音色、punch、密度与峰值控制链。frame_000153 确认成员和顺序，完整参数未公开。
  - TONSTURM TRAVELER: 作者保留它意外产生的 kick-like 结果并与短 click 分层；当前界面值不能泛化。
  - Kilohearts Transient Shaper / Xfer OTT / Waves RBass / MSaturator: 作者口述直接支持这些处理和各自角色，只属于一条增强 chip body 示例；七张发布帧没有展示完整处理，不声明精确顺序、参数或启用状态。教程同时保留简单无插件层。
  - Xfer OTT / Kilohearts Distortion / Pro-Q 4: crunchy chip 分支。`+14` 来自作者对一个示例的口述，frame_000352 只支持链成员与高频控制方向。
  - Soundtoys SuperPlate / SpaceBlender / Tremolator: 罐体 ambience 的长度与运动链。frame_000455 的 Default/4500 ms 仅为当前状态；Tremolator 数值未公开。
  - ValhallaShimmer / FabFilter Pro-C 2 / Pro-Q 4: 对另一条选定环境素材增加空间、降低瞬态峰值并控制亮度。frame_000525 不提供通用 mix、shift、threshold 或 EQ 值；该链不属于水瓶 crackle 层，呼吸素材只确认相近方向。
  - Insight 2 / RCInflator 2 / Pro-L 2: 仅在 Master 列表中可见，作者未讲解，不能转写为必需母带方案。
- Design principles learned:
  - 分析建议：先判断素材承担 kick、mechanism、body、crunch、ambience 还是 action detail，再决定处理，避免多层重复占用同一频段和时序。
  - 分析建议：保留只降调的 chip 基准，用来判断增强处理是否真的增加角色，而不只是增加响度。
  - 分析归纳：同一录音可以跨文件夹复用；迁移时应改变时长、pitch、包络和上下文，使它从源身份转为新功能。
  - 分析建议：分别验收水瓶 crackle、另一条 shimmer 环境素材与呼吸纹理，避免把削弱瞬态、完整插件链和相近音色方向误记成同一处理流程。
  - 证据边界：OTT `+14` 只属于作者在 05:46-05:56 的单条 chip 示例，SpaceBlender `4500 ms` 只属于 frame_000455 当前状态。
  - 证据边界：可见 FX 列表不自动证明启用、自动化或隐藏设置。主总线列表和未讲解恢复插件只能记录为画面上下文。
  - 分析建议：逐文件夹静音、等响旁路、小音箱低频和 mono 兼容检查可以验证角色贡献，但这些不是作者原话。
- Use when: 超写实武器爆炸; Battlefield 风格重设计; 日常物件录音; geophone can; chip bag explosion; keychain mechanism; bottle ambience; breath texture; Kick Mech Explosion Ambience Zoom Foley; TONSTURM TRAVELER; Xfer OTT; SpaceBlender; Tremolator; ValhallaShimmer; impact; workflow; scifi; 插件技巧; 需要让有限家用素材覆盖完整武器场景; 需要区分画面事实、作者口述和分析建议

## 2026-08-08 - 将 DAW 音频路由到 Whoosh 的完整方法
- Source: `https://www.youtube.com/watch?v=ceC_RDgx71s`
- Domain: workflow, scifi, 插件技巧, REAPER, TONSTURM Whoosh, Reaktor 6, VST effect, Source+Mix, plugin pin connector, multichannel sends, stereo return, track template
- Reusable pattern: 作者在 REAPER 中以 Reaktor 6 VST effect 载入 Whoosh，在 Source+Mix 和 WHOOSH 顶层各建立 Port 1-8，把四条立体声源轨的自身 1/2 依次发送到目标 1/2、3/4、5/6、7/8，再让处理后结果只从 1/2 返回。四源播放验证后，完整层级被放入外层 Parent 并保存为 Track Template。分析建议是先逐对测试、排除干声旁路和循环发送，再在需要时建立不回送的 print track；视频本身没有演示打印或反馈故障。
- Step / event map:
  - 选择 Reaktor VST effect: frame_000060 同时显示 `VST: Reaktor 6 ... (16ch)` 与 VSTi 条目。作者明确选择 effect 版本处理外部音频；视频未展示声卡或系统音频设备设置。
  - 在 Source+Mix 建立四对输入: 作者创建八个 Terminal Input，Port 设为 1-8，并按 1/2、3/4、5/6、7/8 连接到 Source 1-4 L/R。frame_000135 显示八个编号端口和最终配对；它们是四个立体声对，不是八个立体声源。
  - 在 WHOOSH 顶层暴露同样端口: frame_000180 显示顶层 1-8 与 Source+Mix 八个 In 的连线。作者随后退出 Edit 并保存修改后的 ensemble；项目版本后缀只是分析建议，不是作者规范。
  - 配置八入与立体声返回: frame_000235 显示 REAPER pin matrix 将 Track Channels 1-8 对角映射到 Reaktor 1L-4R，输出侧只把 Reaktor 1L/1R 返回 Track Channels 1/2。
  - 路由四条源轨: 作者把 Track 1-4 的自身 1/2 依次发送到目标 1/2、3/4、5/6、7/8。frame_000260 证明 Track 2 当前为 1/2 -> 3/4，并显示 Post-Fader (Post-Pan)；作者未比较其他 send mode，不能写成唯一要求。
  - 验证四源播放: frame_000285 显示四条源轨、Whoosh 四个 Source 区域和处理后返回同时活动。该段证明实时播放，不证明录音、打印文件或反馈恢复。
  - 保存完整层级: 作者把 Whoosh 路由放入外层 Parent，让后续 FX 不破坏内部设置，再保存 Track Template。frame_000345 显示层级和模板对话框；nvk_SEARCH 只是可选召回工具。
- Plugin and processing notes:
  - Native Instruments Reaktor 6 VST (16ch): 作为多通道效果器接收 DAW 音频并承载 Whoosh；本流程不使用 VSTi 入口。16ch 是本次画面标签，不代表所有 DAW 菜单相同。
  - TONSTURM Whoosh v1.5 / Source+Mix: Source+Mix 和 WHOOSH 顶层都要暴露 Port 1-8；修改后通过 Reaktor Host save 保存 ensemble。
  - REAPER plug-in pin connector: 输入侧为 Track Channels 1-8 到 Reaktor 1L-4R，输出侧只从 Reaktor 1L/1R 回到 Track Channels 1/2。
  - REAPER multichannel sends: 四条源轨映射到 1/2、3/4、5/6、7/8。Post-Fader (Post-Pan) 只属于 frame_000260 当前状态；干声 parent/master 路径需按工程检查。
  - REAPER Track Template / nvk_SEARCH: Track Template 保存整个 Parent 层级；nvk_SEARCH 是作者展示的便利工具，不是路由依赖。
- Design principles learned:
  - 多通道路由应先画成单向拓扑：四个源对进入 Whoosh，处理后的单一立体声返回离开 Whoosh；不要把返回再次送进任何输入对。
  - 内部 Source+Mix 端口、WHOOSH 顶层端口、DAW pin matrix 和轨道 send 是四个独立检查层，任何一层配对错误都会造成错源、丢声道或串路。
  - 分析建议：先单源逐对测试，只允许对应 Source 1-4 meter 响应，再执行四源齐播；这比只看最终总线更容易定位问题。
  - 可见 send mode 不等于通用要求。是否关闭 parent/master send、如何管理干声路径，应由实际 REAPER 文件夹与监听结构决定。
  - 外层 Parent 把后续 FX 与关键路由隔离；模板召回后仍应在空工程重复逐对测试，不能把“能保存”当成“路由一定正确”。
  - 分析建议：打印时只把处理后 1/2 返回送到文件夹外的专用立体声轨，并禁止回送；低电平启动、持续 meter 检查和打印复核均不属于视频已演示内容。
- Use when: DAW 路由 Whoosh; TONSTURM Whoosh; Reaktor 6 VST effect; Source+Mix Port 1-8; REAPER plugin pin connector; multichannel sends; 1/2 3/4 5/6 7/8; stereo return; four source test; track template; nvk_SEARCH; feedback prevention; print track; workflow; scifi; 插件技巧; 需要从四条 DAW 轨把任意声音送入 Whoosh; 需要排查多通道错对、干声旁路或循环发送

## 2026-08-08 - Wave Shifter 制作科幻与动漫音效
- Source: `https://www.youtube.com/watch?v=fYqe17OJRNM`
- Domain: scifi, magic, workflow, 插件技巧, Minimal Audio Wave Shifter, Freq Shift, Feedback, Feedback Time, modulation, anime sound design, source generation
- Reusable pattern: 作者在 Ableton Live 中把独立版 Wave Shifter 设为 Freq Shift / Stereo，并在素材生成阶段从 100% Wet 开始。处理顺序是先按素材扫描 Frequency，再加入 Feedback、单独调整 Feedback Time；短素材只轻用内置 modulation。短 Cardboard Falls hit 被分别测试为小幅正、负频移，找到角色后再按需串联两只 Fuse Compressor、INTENSITY、TransX Multi、第二只 Wave Shifter 与 Pro-L 2。anime 分支把 Pro-R 2 放在第二只 Wave Shifter 前，让空间尾部进入后级 Frequency / FM。截图中的所有数值都只属于对应帧和 source，不是通用 preset。
- Step / event map:
  - 选择 Freq Shift / Stereo: frame_000053 展开 Style 菜单，列出 `Freq Shift`、`Ring Mod`、`Amp Mod`；圆点确认当前选中 Freq Shift，浅色 Ring Mod 只是鼠标悬停。作者本片主要示范 frequency shifting，没有比较其他模式优劣。
  - 从全湿素材生成开始: 作者先把 Wet 设为 100%，再扫描 Frequency。frame_000061 同时确认 Freq Shift、Stereo、Wet 100% 与较长 Cardboard Rips 素材；100% Wet 只属于本次 source-generation 起点，不推广到成品总线。
  - 单独调整 Feedback Time: 作者强调 Feedback Time 容易被忽略，却会显著改变反馈纹理，过度会 washed out。frame_000195 的 `0.48 ms` 只绑定当前状态；视频没有给出内部 comb、delay 或 time-stretch 公式。
  - 按长度控制 modulation: frame_000225 显示波形、Mod Depth、Sync、Snap、Rate、Shape、Randomize、Offset。作者对短 asset 只轻用内置 modulation，通常更偏向外部自动化；本视频没有展示一条可读包络。
  - 对照正负频移短 hit: frame_000309 的 `+26.7 Hz` 与 frame_000317 的 `-7.32 Hz` 属于同一 Cardboard Falls 素材。作者称本例正向更 bubbly、负向更低沉且更有 punch，但明确强调甜点位依赖 source。
  - 串联后处理: frame_000365 确认 Wave Shifter -> Fuse Compressor x2 -> INTENSITY -> TransX Multi -> 第二只 Wave Shifter -> Pro-L 2。作者口述后续可用 multiband compression、saturation 与 transient shaping；不能据此把 INTENSITY 定义为固定 saturation 算法。
  - 建立 anime 分支: frame_000410 确认 Pro-R 2 位于第二只 Wave Shifter 前，第二实例当前为 `5.65 Hz`。作者让 reverb tail 进入后级 Frequency / FM，以生成 anime-style source；Pro-R 2 参数和固定 FM 预设均未公开。
- Plugin and processing notes:
  - Minimal Audio Wave Shifter: 本片使用 Freq Shift / Stereo；素材生成阶段从 100% Wet 开始，再依次探索 Frequency、Feedback、Feedback Time、modulation 与 FM。所有瞬时数值都必须绑定证据帧。
  - Minimal Audio Fuse Compressor x2: frame_000365 确认两个连续实例，作者将其归入 multiband compression 阶段；八张发布帧没有给出可迁移的 band、ratio、time、mix 或 preset。
  - Zynaptiq INTENSITY: 位于 Fuse Compressor x2 与 TransX Multi 之间。作者只概括可继续加入 saturation，画面不足以确认 INTENSITY 的固定算法、preset 或强度。
  - Waves TransX Multi Stereo: 作者口述用于 transient shaping，frame_000365 确认链位；插件界面和参数没有展开。
  - FabFilter Pro-R 2: anime 分支放在第二只 Wave Shifter 前，让 reverb tail 进入后级频移 / FM。frame_000410 只证明顺序，不支持补写空间参数。
  - FabFilter Pro-L 2: 作者说明末端另加 limiter 管理激进 Feedback 和后处理峰值；画面不提供可靠 threshold、style、lookahead 或 output 数值。
- Design principles learned:
  - Wave Shifter 的可迁移方法是按顺序寻找甜点位，而不是抄旋钮：Frequency -> Feedback -> Feedback Time，每次只改变一个变量。
  - 全湿适合生成新 source，但不等于所有插入位置都应 100% Wet。保留 dry 副本，才能恢复动作、瞬态或并行角色。
  - 正移与负移的听感方向依赖 source。`+26.7 Hz`、`-7.32 Hz` 只能说明本例的两个候选，不是 bubbly / punch 的普遍定律。
  - modulation 剂量应与素材长度和用途匹配。短 hit 需要可重复、可控的变化，长素材才适合放宽运动后再筛选片段。
  - 后处理链在 core character 成立后才有意义。两只 Fuse、INTENSITY、TransX、第二只 Wave Shifter 都应逐级等响旁路，避免只增加响度或抹平素材差异。
  - reverb 放在频移 / FM 前，会让尾部本身进入后级调制；若主攻击因此变软，可把 anime tail 与 core hit 分成独立资产。
  - 分析建议：分阶段打印 dry / core Wave Shifter / post chain / anime tail，再按游戏功能命名和验收；视频没有展示 render、freeze 或 export 流程。
- Use when: Minimal Audio Wave Shifter; Freq Shift; frequency shifting; Feedback Time; modulation; positive shift; negative shift; anime sound design; sci-fi UI; energy projectile; magic activation; Fuse Compressor; INTENSITY; TransX Multi; Pro-R 2 before Wave Shifter; Pro-L 2; source generation; scifi; magic; workflow; 插件技巧; 需要从有机录音生成同族科幻变体; 需要严格区分截图值与通用预设

## 2026-08-08 - 正弦波制作动漫气泡旋律弹跳音
- Source: `https://www.youtube.com/watch?v=j4POSc1YeAo`
- Domain: magic, scifi, workflow, 插件技巧, sine wave, random pitch, Phase Plant, Default Wavetable, Wave Shifter, laser, spectral whoosh, metallic goop, bubble fire, Flex Chorus, MHarmonizerMB, TRAVELER, print and resample
- Reusable pattern: 先用短包络调性源和高速随机音高建立可读的 bubbly 身份，再按角色复制调制关系，而不是复制整条插件链。laser 改用更接近 pluck 的包络和 wavetable / filter motion；spectral 分支用快速 LFO、Frequency Shifter、Delay 与前后瞬态塑形；metallic 分支从 sine+white noise 出发再进入反馈、随机频谱、颗粒与 robotification；rapid-fire 分支用双层发生器、filter / phaser / delay、chorus 与 harmonizer 扩展宽度和旋律。打印后再按 bass、laser、spectral、magic、metallic、ping、bubble 与 charge 组织最终动作。关键边界是 frame_000977 的 UI 明确显示 Wavetable / Default Wavetable，而作者口述称其为 sine-wave synth；不能把界面改写为 Analog oscillator。
- Step / event map:
  - 建立核心随机音高源: 作者口述起点是 simple sine wave 加 really fast random frequency modulation。frame_000187 显示 Phase Plant Analog 正弦、1.00 ms Attack、100 ms Decay、100% Sustain、5.00 ms Release 和 30.50 Hz Random 到 pitch；Random +120.00 及约 -60 / +60 semitones 只属于该帧。
  - 增加 Wave Shifter 旁带: 作者在既有 bubbly source 上尝试 Frequency 与 Feedback。frame_000332 是 Freq Shift / Stereo 启用态，当前 34.3 Hz、右侧 1.06 kHz、Width 100%；分析稿核对了旁路 / 启用 A/B，但发布回放没有严格响度匹配。
  - 派生 laser: frame_000506 显示 Harmonic Wanderer、Frame 171、1.00 ms Attack、122 ms Decay、0.2% Sustain、5.00 ms Release、12.98 Hz Pyramid LFO、54.3 ms Delay 和 Randflange Filter Table。作者目标是 classic sci-fi laser sound，这组数值不推广到核心 magic patch。
  - 派生 spectral whoosh: 作者说明 Crystal wavetable、快速 LFO 到 pitch / frequency shifter，并加入 compressor、transient shaper、delay、transient shaper。frame_000566 确认 Crystal、64.1 ms Decay、32.16 Hz LFO、35.2 ms Delay、Frequency Shifter 与前后两处 Transient Shaper；隐藏深度和 mix 不补写。
  - 建立 metallic source: 作者口述 initial patch 由 sine waves 加 white noise 组成。frame_000760 同时显示 Analog 调性层和 Noise，调性层当前 -16 semitones、x4 MAJOR；之后的 Uhbik-F、Snap Heap、MGranularMB、MTransformer 角色来自作者口述，不由该静态帧补造参数。
  - 核对 rapid-fire 双生成器: frame_000977 的上下模块均明确标为 Wavetable / Default Wavetable，上层 Harmonic x1、Release 1.16 s，下层 Harmonic x36、Release 721 ms，并可见 Filter、Phaser、Dual Delay 与 Delay。作者把它们口述为 sine-wave synth；UI 类型和作者措辞必须并列保留。
  - 加入 movement 与 melodic voice: 作者说 Flex Chorus 增加 movement，harmonizer 增加 melodic voice。frame_000990 显示 MHarmonizerMB 当前 C major / 1 octave、总 Dry/Wet 42.9%，以及 Flex Chorus 的 Frosted Highs、4 Voices、Smooth、Multi-Band；这些值只属于当前 bubble-fire 分支。
  - 按角色组装最终版本: frame_001419 的 redesign 回放旁可读 Bass impacts、Laser、Spectral whoosh、Magic Flutter、metallic layer、Pings、Flickers、Bubble Boy、EXP Charge。22:48 起是 original，23:35 起才是 redesign；作者仍指出 white-noise whoosh、hanger action 和 impact accents 可改进。
- Plugin and processing notes:
  - Kilohearts Phase Plant: 核心 frame_000187 是 Analog 正弦；rapid-fire frame_000977 是两个 Wavetable / Default Wavetable。不同分支通过发生器类型、包络、Random / LFO、filter 和内部效果改变职责，截图值不构成 preset。
  - Minimal Audio Wave Shifter: 用 Frequency 与 Feedback 为已成立的 source 增加旁带、金属与液态运动。frame_000332 的 34.3 Hz、1.06 kHz、Width 100% 只绑定一次启用态。
  - Phase Plant Delay / Filter Table / Frequency Shifter / Transient Shaper: laser 与 spectral 分支分别用短延迟、频谱运动、频移旁带和前后瞬态塑形建立动作；54.3 ms、35.2 ms、12.98 Hz、32.16 Hz 只绑定对应帧。
  - Minimal Audio Flex Chorus: 作者用于增加 bubble fire 的 movement；frame_000990 当前 Frosted Highs、4 Voices、Smooth、Multi-Band 不构成通用动漫预设。
  - MeldaProduction MHarmonizerMB: 作者用于增加 melodic voice；frame_000990 当前 C major / 1 octave、42.9% 只属于该画面，视频没有公开全项目调性或 MIDI 旋律。
  - Uhbik-F / Snap Heap / MGranularMB / MTransformer: metallic 分支中分别承担高反馈 flanger、随机 spectral filter table、颗粒伪影和 robotification。作者把 MTransformer 用在 metallic，不得误写成最终 spectral whoosh 的必经步骤。
  - TONSTURM TRAVELER: 作者从打印后的 bubble / spectral 素材派生 whoosh、impact 与 Doppler 变体；八张发布帧没有展示其参数。
- Design principles learned:
  - 先在 source 层验证身份。短包络、快速 pitch movement 和 filter response 足够清楚时，再用频移、空间和动态处理扩展；长链不应掩盖弱源。
  - 复用的是调制关系，不是截图数值。核心 pop、laser、spectral 与 rapid-fire 可以共享“快速调制”的语法，却必须按事件长度重做发生器、包络和尾部。
  - 界面事实与作者措辞不能互相覆盖。frame_000977 的 UI 是 Default Wavetable，作者说 sine-wave synth；记录两者比强行统一名称更可靠。
  - chorus 与 harmonizer 解决不同问题：前者增加 movement / width，后者增加 melodic voice。逐个旁路，避免同时改动后只剩“更大更宽”的模糊结论。
  - metallic 分支应保留 sine+noise 基准，再逐级加入 feedback、spectral filter、granular 和 robotification；这样能判断每一级增加的是角色还是仅仅响度 / 刺耳度。
  - print / resample 是角色分化点。master patch 生成同族素材，打印后的时长、Doppler、音高和编辑位置才把它们变成 laser、whoosh、impact、voice 或 UI。
  - 最终验收按画面职责而不是插件数量。逐动作 solo / mute，并保留作者明确提出的 white-noise、action recording 与 impact accent 改进项。
- Use when: 正弦波; bubbly melodic pops; anime sound design; Phase Plant; Analog oscillator; Default Wavetable; random pitch; fast LFO; Wave Shifter; frequency shifting; laser; spectral whoosh; metallic goop; bubble fire; Flex Chorus; MHarmonizerMB; TRAVELER; print and resample; magic; scifi; workflow; 插件技巧; 需要从同一调制语法派生一组动漫魔法和科幻资产; 需要严格区分 UI 类型与作者口述

## 2026-08-08 - iZotope RX De-Clip 的创意声音设计
- Source: `https://www.youtube.com/watch?v=C_5qPsn1GWY`
- Domain: workflow, impact, scifi, 插件技巧, iZotope RX De-clip, creative resynthesis, intentional clipping, volume safety, Multi-band De-click, Z-Noise, pitch envelope, tonal sweetener, electricity, dark magic
- Reusable pattern: 把 De-clip 当作创意再合成器，而不是常规修复器。先选择带清楚 motion 的 source，在降低监听和打印前增益后制造极端削波，再按 source 扫 De-clip threshold；第一轮 EQ + Boost 后先保存可用 core，De-click、Z-Noise 与 soothe2 只按用途选择。用 item rate 与 pitch / rate envelope 生成 scream-like 变体，最后把它作为 tonal sweetener 叠到保留瞬态和重量的 generic cinematic hit。frame_000090 明确警告实际失真远比视频播放响；可见设置、红表头、视频 WAV 与听到的播放音量都不是安全或交付响度模板。
- Step / event map:
  - 选择运动源: 作者口述具体来源影响没有想象中大，但素材必须有 motion。frame_000001 同时显示 synth、sine / reverb、bass drop、rock crumbling 与 RX SYNTH SCREAM_01..04；轨名不能证明未显示参数。
  - 打印极端削波源: 作者用 Event Horizon Clipper、JS Distortion、MSaturator 与 Pro-L 2 建立 clipped print。frame_000090 当前 Event Horizon 为 Threshold -30.0 dB、Ceiling -0.1 dB、Soft Clip 2.0 dB，并明确写出视频已自动降音量、实际远比听到的响；这些值绝不是安全模板。
  - 深推 De-clip: 作者从 0 阈值开始预听，扩大识别范围后声音快速变得异常。frame_000168 当前为 -16.0 / -16.0 dB、9471 repairs、Quality Low、Makeup 0.0 dB、Post-limiter off；作者没有把它定义为最佳拐点。
  - 完成最小 core: 作者先用 EQ 去异常 sub 与刺耳频段，再用 Boost 抬低电平细节；完成 De-clip + EQ + Boost 后已经可用，后续属于 optional territory。
  - 可选 Multi-band De-click: 作者希望少 click / noise、多 tonality，并认为 Multi-band 在这类素材上较少明显 pumping。frame_000287 当前 Sensitivity 10.0、Frequency skew 0.0、Click widening 0.0 ms、82 repairs；数字只属于该播放状态。
  - 可选低量清理: 作者说明 Z-Noise 看起来激进但实际处理量很低，重点处理 lows / low-mids，soothe2 只收敛突出 artifacts。frame_000306 的 Z-Noise 曲线和数值只绑定该帧，NR -7.9 是动态读数。
  - 生成 scream 变体: frame_000370 显示 Rate 0.516 (-11.46) 与蓝色 pitch / rate 包络，邻近 item 为 Rate 0.357 (-17.84)。作者用移调和 pitch modulation 生成多种 scream-like 结果；包络节点值不可从该缩放补写。
  - 核对最终叠层: frame_000430 是 generic-hit 轨组 Solo 的 before，frame_000456 是 Solo 解除、generic hit 与多条 RX scream 共同参与的 after。作者将 screams 定位为 sweetener / supplement；分析归纳为 hit body 加 tonal motion，而非替换主体。
- Plugin and processing notes:
  - Event Horizon Clipper / JS Distortion / MSaturator: 串联制造极端 clipped source。frame_000090 只展开 Event Horizon；视频明确自动压低示范音量，任何参数和表头都不能作为监听或交付目标。
  - FabFilter Pro-L 2: 作者用它把失真后的工作电平拉回较可操作范围再打印，不代表最终 limiter 或响度规范；八张发布帧没有展开其完整设置。
  - iZotope RX 6 De-clip: 本例用于创意再合成。frame_000168 的 -16 / -16 dB、9471 repairs、Low Quality 与 Post-limiter off 只是一种深推状态，repair count 不是品质分数。
  - FabFilter Pro-Q 3 / UrsaDSP Boost: 首轮清理异常 sub、刺耳频段与低电平细节；作者在此后已认为素材可用。八张发布帧不支持把隐藏数值写成 preset。
  - iZotope RX 6 De-click: 可选地减少 click / noise 并突出 tonality。frame_000287 的 Multi-band、Sensitivity 10.0 与 82 repairs 只绑定当前 source / 选区。
  - Waves Z-Noise / oeksound soothe2: 都是可选清理。frame_000306 只展开 Z-Noise；soothe2 仅在 FX 列表可见，不补写其隐藏参数。
  - REAPER item rate / pitch-rate envelope: 用降速联动移调和包络调制建立不同时长、音区与弧线的 scream 变体；0.516、0.357 与包络形状不构成固定模板。
- Design principles learned:
  - 安全先于复刻。极端 clipping 很响，frame_000090 已明确说明视频播放被自动压低；先降监听、保留 headroom，不用耳机按原电平照抄。
  - 这是创意再合成，不是忠实修复。把输出作为新 source 管理，并保留独立 dry / clipped print / De-clip core。
  - De-clip threshold 必须按 source 扫描。repaired intervals 只提示覆盖状态，不能充当质量分数或最佳阈值。
  - 第一轮 De-clip + EQ + Boost 已是可交付候选；De-click、Z-Noise 与 soothe2 只有在解决明确问题时才加入。
  - 可见参数只绑定对应帧。-16 dB、Quality Low、Sensitivity 10、82 repairs、Z-Noise 曲线与 rate 都不能推广为 preset。
  - item rate 改变时长、音区和颗粒尺度，包络负责贴合动作弧线；两者需同时检查 alias、低频堆积与尾长。
  - generic hit 保留物理撞击瞬态和重量，RX scream 只补 electricity / dark-magic tonal motion；sweetener 不应独自承担 impact body。
  - 按 hit-only -> sweetener-only -> blend 做相近响度 A/B。若 blend 只显得更响，说明 tonal contribution 尚未建立。
- Use when: iZotope RX De-clip; creative resynthesis; intentional clipping; extreme distortion; volume safety; Event Horizon Clipper; JS Distortion; MSaturator; Pro-L 2; Pro-Q 3; UrsaDSP Boost; RX De-click; Multi-band De-click; Z-Noise; soothe2; item rate; pitch envelope; synth scream; tonal sweetener; electricity; dark magic; cinematic hit; workflow; impact; scifi; 插件技巧; 需要把极端失真重建成科幻或暗黑魔法补充层; 需要严格区分创意用法、可选清理与安全响度边界

## 2026-08-08 - 狗玩具变异形龙吼：怪物声音设计
- Source: `https://www.youtube.com/watch?v=ir8d3PUj5JU`
- Domain: creature, scifi, workflow, 插件技巧, alien dragon roar, self-recorded sources, organ layering, DogPoopMetalScreech, REAPER item rate, MTremolo rate automation, selective reverb
- Reusable pattern: 先把自录素材按 throat/core、body、breath、mouth/skin、threat、motion 与 space 分工，再用 item rate、reverse、stretch、饱和、频段让位和选择性空间建立同一生物从 idle 到 roar 再回落的连续性。标题概括为 dog toys，但 frame_000056 还显示家居物件、人声/空气、布料/皮革、金属和碗/水等来源；第二段主声必须按媒体项写成 DogPoopMetalScreech，不能改写为普通吱叫玩具。核心方法是先保住一条可读主声，再让低频身体、撞击起音、口腔纹理和空间在时间与频谱上让位。post-roar 的 MTremolo 加速只由 18:21.8-18:28.2 带声 motion 完整证明，frame_001130 只记录一个瞬时参数状态。
- Step / event map:
  - 核对素材池: frame_000056 同屏展示弦乐器、碗、衣物、橡胶件、球/玩具和管件；作者说明比赛限制为自录素材，但画面不能证明每件物体都进入最终 cue，也不能把全部来源归为狗玩具。
  - 限定视觉参考: frame_000231 只支持 `Monster Hunter: World final-boss reference` 与蓝白带翼异星龙的体型/外观方向；不补角色名、种族、技能或游戏内实现。
  - 建立 idle 器官层: frame_000281 可见 Human Air、Leather Bag、Rubber Treat 和多组 rate/pitch。作者还讲解 rubber cover、zombie、spoon、mouth、duck call、deadcat 与 water bowl；分析标签不冒充作者轨名。
  - 写出 breath lead: frame_000598 显示 Human Air Blow reversed、Rate 0.831 (-3.21)、另一空气项 0.771 (-4.50)，以及 `1.00x -> 0.75x -> 1.18x -> 1.00x` stretch markers；这证明速度手势，不证明 formant 或 granular stage。
  - 收紧核心主声: frame_000866 显示 dog main-track Ozone Imager 2 当前 Width -98%、Stereoize 6.0 ms、Mode II，并可见 Decapitator -> Saturn 2 -> OTT -> Squash -> Pro-Q 3 -> Imager 链；链位不等于每一级始终 active。
  - 分开 body 与 impact: frame_000931 同屏显示 WindSpinner、Washer Impact、Door Impact。WindSpinner 当前 Rate 0.031 (-60.22) 只属于本 item；持续低频、撞击起音和 throat voice 是不同职责。
  - 锁定第二吼来源: frame_001018 的媒体项名为 `Dice_Foley_Creature_DogPoopMetalScreech-glued-03.wav`，并显示 `1.00x -> 1.17x -> 1.00x` 手势。`glued` 不等于颗粒处理，文件名也不支持补品牌、材料或录法。
  - 验证 post-roar 加速: frame_001130 只显示 MTremolo 当前 Depth 67.6%、Rate 19.99 Hz、Width 0 deg [0%]；附带 6.4 秒带声 motion 同时显示播放、rate automation 和脉冲收紧，动态结论只绑定这段 motion。
  - 管理选择性空间: frame_001255 是 EW Spaces II active，当前 IR 名为 `WLA Parking Garage TS RR 3.7s`，下方 wet automation 可见。作者说明 roar 处让出 wet，main roar 才选择性进入额外 reverb/delay。
- Plugin and processing notes:
  - REAPER item rate / stretch / reverse: 负责体型、时长与局部手势。所有 rate、semitone 和 marker 都只绑定对应 item；视频没有独立 formant mode 或 granular engine 证据。
  - Decapitator / Saturn 2 / OTT / Squash: 按不同层增加密度、谐波和频带颜色。threat high 的 OTT 47%、dog main 的 20% 与 Kaiju master 的 6% 是三个独立帧状态，不是建议范围。
  - Pro-Q 3 / RBass: 用于腾出冲突频段和补 body。322.51 Hz、4448.9 Hz、RBass 256 Hz 等当前值不能推广为 creature preset。
  - Ozone Imager 2: dog main-track 当前 Width -98%，verb-here bus 当前 Width -7%；两个实例上下文不同，禁止互换。
  - MeldaProduction MTremolo: WindSpinner 和 post-roar flavor 都可见。4.517 Hz 与 19.99 Hz 只是两个时刻，post-roar 的动态轨迹由带声 motion 验收。
  - kHs Transient Shaper / Chorus / Radiator: washer 与 door impact 以不同起音、谐波和空间建立重量；作者没有公开完整可迁移旋钮，FX 列表存在也不证明所有实例 active。
  - Spaces II / Raum / kHs Delay: 主空间在 roar 处降低 wet，main roar 再选择性送入额外空间。Parking Garage IR 与 delay 6/16 只属于各自展示帧。
  - soothe2 / Pro-MB: 作者用于 Kaiju master 的 harshness control；作者明确说部分 master width、clipper 与链中 Saturn 没有实际使用，不能按列表补成 audible stage。
- Design principles learned:
  - 主声身份先于层数。先 solo 一条 core voice，只有明确听到缺口时才增加 body、threat、mouth 或 impact。
  - 标题、字幕和画面需分级。dog toys 是标题概括，DogPoopMetalScreech 是媒体项事实，Monster Hunter: World final boss 是作者口述边界。
  - 同一生物必须跨状态连续。idle 的 breath/mouth/skin、lead 的空气手势、roar 的 core/body 和 post-roar 的材料回收应共享角色语言但保持职责清楚。
  - 体型来自角色分工与频谱让位，不是单纯降速或加层。持续低频、撞击起音、主声与高频威胁应能分别 mute 出其属性。
  - 动态命题需要动态证据。静态曲线和 19.99 Hz 不能独立证明 acceleration；只有该步骤的带声 motion 支持随时间收紧。
  - 空间应避开主攻击。主 reverb wet 在 roar 附近让位，额外 delay/reverb 只接 main roar，避免 breath、mouth 和 impact 全部进入长尾。
  - 插件存在不等于启用。优先采用明确 active/bypassed 标题和作者口述，不从 FX list 推断听感贡献。
  - 发布音轨的 -24.3 LUFS、-1.2 dBTP 与 final 低频比例只描述教程混音，不能当作游戏资产、总线或交付目标；视频也没有展示 render、middleware 或 in-game test。
- Use when: creature sound design; alien dragon roar; dog toys; DogPoopMetalScreech; self-recorded sources; organ layering; throat core voice; body mass; breath lead; mouth skin texture; REAPER item rate; stretch markers; MTremolo; rate automation; motion evidence; Ozone Imager 2; Spaces II; selective reverb; time spacing; spectral spacing; creature; scifi; workflow; 插件技巧; 需要用自录物件建立从 idle 到 roar 的同一生物; 需要严格区分静态参数与动态加速证据

## 2026-08-08 - 用系统自带插件把任意声音变成液体
- Source: `https://www.youtube.com/watch?v=E_wGGNkVcrw`
- Domain: environment, creature, magic, 插件技巧, FL Studio, stock plugins, liquid sound design, 3x Osc, resonant peak, Multiband Delay, delay banks, Morph, Scale, Feedback, Transient Processor, Frequency Shifter, wet-only spring send, sample harvest
- Reusable pattern: 在 FL Studio 中先用 3x Osc noise 与可调包络生成事件，再用两个速度不同的正向共振高通扫频建立可辨频谱脉冲。主 Multiband Delay 把频带写成 8 个不同的时间 bank，并通过 Morph、Scale、Feedback 分阶段变化；Transient Processor 重新约束起音/持续，第二 delay 与慢速负向 frequency shift 只补 variation。Fruity Convolver 必须按 frame_000185 的画面纠错放在 wet-only send，最后从长结果中筛选、fade、命名和分用途验收。标题里的 any sound 只由 noise 与 Cardboard Break 两类输入示范；Linear Phase 的 perfect alignment 是作者解释，不是独立测量结论。
- Step / event map:
  - 锚定 noise source: frame_000027 显示 FL Studio 的 `3x Osc`，第一振荡器选中 noise 图标。自动字幕中的 Apple Studio 与 Fruity X Oscillator 都是错误；包络旋钮没有可读精确值。
  - 建立双共振预处理: frame_000088 同时显示两个 Fruity Parametric EQ 2 的高通边缘正向共振峰。作者口述第一层约 300 Hz -> 8 kHz 慢扫并配合低通，第二层约 200 Hz -> 2 kHz、更快；它们不是 notch cut，Q/gain/filter order 不可读。
  - 写 delay-bank 时间图: frame_000104 显示 16 bands、bank 3 与先升后降的 DELAY 图形。作者建立 8 个 bank；每带毫秒值不能从坐标反推，Linear Phase 的 perfect phase alignment 保留作者归属。
  - 分开三条核心调制: frame_000126 同屏显示 Morph、Delay Scale、Delay Feedback automation 与主 Multiband Delay。作者只把问题称为 artifacts；click/zipper 只能作为复现时的可能机制，Smoothing 没有可复用数值。
  - 重新约束瞬态: frame_000145 显示 Transient Processor 控件。作者口述约 40% Attack/Release、100% Split Balance 与 sharp shape 来 tame 当前结果；这是本例起点，不是静帧精读或客观更好听的证明。
  - 增加 variation: frame_000150 显示第二 Multiband Delay、独立 Morph lane 与 Frequency Shifter，当前频移为 -52.7 Hz。该值只属于此帧；作者所述约 -200 Hz -> -40 Hz、20 kHz range 与约 40% Mix 也只绑定本例。
  - 遵循 send 纠错: frame_000185 明确写 `JUST THE WET SIGNAL, NOT DRY, MY BAD`，并显示 Fruity Convolver、spring IR 与 Pitch Shifter。send 中关闭 dry，只返回 wet；Stretch、wet level 与 pitch 没有可复用精确值。
  - 筛选切片: frame_000285 可见 `liquid samples` 到 `liquid samples_21` 与一排短 clip。它证明候选切片和命名存在，不代表 21 个均已通过质量、响度、版权或交付验收。
- Plugin and processing notes:
  - 3x Osc / Fruity Parametric EQ 2: noise source 先经包络形成短/长事件，两级正向共振扫频再把能量组织成速度不同的窄带运动。第一 EQ 不是 notch，精确包络、Q、gain 与速度需按源重做。
  - Multiband Delay #1: 16 bands、8 banks 与 Linear Phase 可见；不同 bank 的频带延迟形状负责时间色散。Morph、Scale、Feedback 应逐条旁路，避免同时调制后失去因果判断。
  - Transient Processor: 位于核心 delay 后，用于把连续纹理重新组织成可切片事件。视频没有固定 LFO 相位或响度匹配 A/B，参数和听感都不能推广。
  - Multiband Delay #2 / Frequency Shifter: 第二实例在较高频段增加较慢变化，负向频移继续移动纹理。frame_000150 的 -52.7 Hz 只是运行中的瞬时状态。
  - Fruity Convolver / Pitch Shifter: spring send 按画面纠错为 wet-only；Pitch Shifter 只做作者所说的轻微 pitch automation。IMP Spring 03 是本工程 IR，不是必须绑定的配方。
  - Edison / Fruity Delay 3: Edison 用于记录和扫描长结果，后续以切片、fade、delay 和自动 EQ探索鼓样、背景与 impact。视频未完成无缝 loop、final export、middleware 或 in-game test。
- Design principles learned:
  - 液体身份来自受控的频带时间错位与持续运动，不来自单纯加 reverb。先保证 source envelope 和双共振事件可读，再增加 delay-bank 复杂度。
  - 两级移动 EQ 要分工：一个较慢、带限地移动主体，一个更快地产生短频谱 burst；两者都是正向 resonant peak，不把字幕错误写成 notch。
  - bank 设计先于 LFO 数量。先让每个 bank 单独成立，再测试 Morph-only、+Scale、+Feedback，出现未命名 artifacts 时才调 Smoothing 和 bank 差异。
  - 瞬态与尾部是不同职责。Transient Processor 管事件边缘，second delay/frequency shift 管 variation，spring send 只管 wet 尾部；任何一级都不应掩盖主脉冲。
  - 参数必须绑定证据。-52.7 Hz、约 40% Mix、作者口述频率范围与 transient 百分比都属于本例状态，不是 stock-liquid preset。
  - 标题/产品主张与验证结论分开。any sound 仅展示 noise 与 Cardboard Break；perfect phase alignment 未经相位测量、null 或群延迟测试。
  - 长 render 只是素材池起点。21 个命名切片不等于已批准交付物，还需手势筛选、fade、统一电平、mono、loop、variation 和游戏上下文验收。
  - 发布音轨的 -16.83 LUFS / +0.15 dBTP 只描述 YouTube 成片，不能当作游戏资产或总线目标；背景和 impact 分支也没有证明最终 render 或实现完成。
- Use when: liquid sound design; water texture; bubbly material; FL Studio; stock plugins; 3x Osc; noise envelope; Fruity Parametric EQ 2; positive resonant peak; Multiband Delay; Linear Phase; delay banks; Morph; Delay Scale; Delay Feedback; Transient Processor; Frequency Shifter; Fruity Convolver; wet-only send; spring reverb; Pitch Shifter; Edison; sample harvest; environment; creature; magic; 插件技巧; 需要把噪声或单个物理输入转成可切片液体纹理; 需要严格区分作者主张、画面纠错、瞬时参数与后续交付任务

## 2026-08-08 - Phase Plant 白噪声合成暴雨、水滴与开窗声
- Source: `https://www.youtube.com/watch?v=wWms0-ad6fw`
- Domain: environment, workflow, scifi, 插件技巧, SadowickProduction, Kilohearts Phase Plant, Phase Plant Beta 1.5.8, white noise, heavy rain, indoor rain, open-window acoustic portal, water drops, parallel lanes, Random, Custom LFO
- Reusable pattern: 在 Phase Plant 中把白噪声按场景职责拆成三条并行层。Group 1 的同一 Noise 通过两个 Output 分送 Lane 1/2：Lane 1 用较暗的带限与空间形成墙体后的连续雨床，Lane 2 用更开放的频谱、Stereo、Haas 与不同 Reverb形成开窗后的透入状态。Group 2 的独立 Noise 把基础 Level 设为 0，由短 Custom LFO 以可见 100% 深度控制 Level，并由 Random 扰动某个不可读的 LFO 输入/参数，形成离散屋顶/天窗水滴。核心是角色化共享源、独立频谱/空间/包络控制与受约束随机化；不是机械开窗拟音，也不是完成的物理模型、循环或游戏实现。
- Step / event map:
  - 建立倾斜噪声母材: frame_000149 显示 Noise 与 Slope 3.8 dB/oct。这是画面状态；作者称加 Stereo 后更 rainy/typhoon，属于作者听感评价，不是静帧可证明的客观结论。
  - 写墙后暗雨: frame_000399 显示 Lane 1 的 Slice EQ 两端衰减并带中频起伏。作者以墙体吸收高频和室内反射解释方向；它是艺术化遮挡近似，不是墙体传输函数测量。
  - 锁定共享源拓扑: frame_000452 明确显示同一 Group 1 Noise 通过两个 Output 分送 Lane 1/2。不得改写为两段独立雨声录音或两个 Noise 发生器。
  - 建立开窗透入层: frame_000640 显示 Lane 2 的 Slice EQ -> Carve EQ -> Stereo -> Haas -> Reverb。这里的 open window 是开启窗洞后的雨声状态，不是窗把手、滑轨、窗扇或玻璃动作。
  - 建立独立水滴组: frame_000836 显示 Group 2 Noise Level 接收 LFO | 100%。这只证明 Custom LFO -> Noise Level；Random 的目标标签不可读，不能命名为 Phase、Rate 或 Retrigger。
  - 缩短单滴包络: frame_000910 显示开头快速下落、之后保持低位的自定义曲线。作者要求事件更短，但画面没有可读毫秒值，不补 attack/decay/hold/release。
  - 约束水滴高频: frame_001000 显示 Lane 3 Carve EQ 的高频深凹口与当前选中点 8.98 kHz。数值只绑定当帧；tin roof/skylight 是作者场景设定，不证明严格金属或玻璃模态建模。
  - 复核终局结构: frame_001152 同屏显示两个 Noise Group、三条 Lane、Random 8.45 Hz、LFO 1.63 Hz、Unison 8、Polyphony 20。这些都是探索稿帧状态，不是事件率公式、固定 preset 或运行时预算。
- Plugin and processing notes:
  - Kilohearts Phase Plant: 画面为 Beta 1.5.8 / Test version，作者明确是第一次探索这类 patch。可靠部分是路由与角色分工，不是所有默认值或精确参数。
  - Noise / Slope / Output: Group 1 的持续 Noise 共享给 Lane 1/2；Slope 只控制母材总体频谱倾向。Group 2 Noise 独立承担随机短滴。
  - Slice EQ / Filter / Reverb: Lane 1 用于墙后暗雨，Lane 3 用于水滴带宽与空间。节点、斜率、Cutoff、Decay、Mix 和宽度不可从指定帧补写。
  - Carve EQ / Stereo / Haas: Lane 2 用于相对更亮、更宽的开窗透入层；Lane 3 用 Carve EQ控制水滴局部频谱。Haas 毫秒不可读，必须另做 mono 检查。
  - Random / Custom LFO: Custom LFO 控制 Noise Level 的 100% 映射可见；Random 只可记录为扰动某个 LFO 输入/参数。8.45 Hz 与 1.63 Hz 不能直接换算成每秒滴数。
- Design principles learned:
  - 场景身份来自三个角色的相对差，而不是单个噪声层“像雨”。墙后床提供暗色连续基准，开窗层提供亮度和方向差，水滴层提供可数瞬态。
  - 两个持续层共享母源可保持统一质地，但需要独立 EQ、空间与适量去相关。第三水滴层必须是独立 Noise Group，便于单独控制密度与材质。
  - “开窗”是声学门户状态。真正的开/关窗事件还需机械 foley，并用状态宏联动开窗层电平、高频、方向和空间；视频没有完成这一步。
  - 微观包络与宏观随机是不同职责。Custom LFO 定义单滴形状，Random 打破重复；目标未确认前不能凭动画猜映射。
  - 参数必须绑定证据。Slope 3.8 dB/oct、Carve EQ 8.98 kHz、Random 8.45 Hz、LFO 1.63 Hz、Unison 8 与 Polyphony 20 都只属于对应帧。
  - 本地音频事实只支持结构对比：连续床段的 50 ms event95-med 约 0.89 dB，早期随机滴段约 35.06 dB，说明连续纹理与稀疏脉冲角色不同；它不证明金属/玻璃材质或主观真实度。
  - 作者在结尾提出未来结合实地录音；本 patch 内没有真实雨声采样。若后续加入，应明确采样层与合成层各自承担的纹理、状态和随机细节。
  - 视频没有严格响度匹配 A/B、mono 检查、真实参考并排、无缝 loop、final render/export、middleware 或 in-game test，不能把教程探索写成已交付工作流。
- Use when: procedural rain; indoor rain ambience; open-window acoustic portal; white-noise environment design; Kilohearts Phase Plant; Noise Group; parallel lanes; Slice EQ; Carve EQ; Stereo; Haas; Reverb; Random; Custom LFO; level modulation; water-drop envelope; role-based layering; constrained randomization; environment; workflow; scifi; 插件技巧; 需要用共享噪声母源建立墙后与开窗状态差; 需要把连续雨床和离散水滴拆成可独立控制的程序化层; 需要严格区分静态参数、作者评价、音频测量与后续实现建议

## 2026-08-08 - TRANSFORCE 瞬态塑形器：后期制作应用
- Source: `https://www.youtube.com/watch?v=xCorcGCP218`
- Domain: workflow, impact, 插件技巧, BOOM Library, TRANSFORCE, manufacturer demo, Pro Tools, transient detection, Attack/Sustain split, Spectral, delta audition, three-band EQ, Saturation, Distortion, Stylize, Clipper, Limiter, oversampling, matched-loudness A/B, creature rasp, Gun Shot Distant
- Reusable pattern: 先校准 detector 再塑形。用耳机监听处理器识别出的瞬态，依次调整 Sensitivity、Hold、Decay，必要时以 BP/LP/HP 或 external SC 聚焦检测；确认 Attack-only、Sustain-only 与合并状态后，才为两路分别选择 Tone/Spectral 或三段 EQ，并分配 Saturation/Distortion。最后使用作用于汇总信号的 Stylize、Clipper、Limiter 和 I/O，并在真实项目中补做匹配响度/峰值旁路、伪影、CPU 与延迟检查。视频来自厂商频道，只展示一条 Pro Tools 轨上的一个 TRANSFORCE 实例；冲击 A/B 未证明等响，oversampling 降低 aliasing 是讲者陈述，Gun Shot Distant 只是预设/风格标签，不是完整距离模型。
- Step / event map:
  - 限定单轨示例: frame_000075 显示 Pro Tools 单轨 Impact、完整波形、BOOM ONE 素材名和一个 TRANSFORCE insert。它不是多轨生产链，也没有素材分层、总线、渲染、交付或游戏实现证据。
  - 校准检测窗口: frame_000109 显示 detector 耳机监听、Sensitivity 41%、Hold 39.49 ms、filter Off。数值只绑定该金属冲击帧；Decay 被遮挡，不能补写。
  - 聚焦 detector 频段: frame_000124 显示 LP 4.0 kHz、Sensitivity 41% 与检测曲线。检测滤波只作用于 detector 的说法来自讲者；本例后续回到 Off，4.0 kHz 不是最终 preset。
  - 分开 Tone 与非线性职责: frame_000234 显示 Attack Spectral 51%、Sustain 100%、Sustain Distortion 70% 与黄色 delta。所有数值只属当前状态；delta 是讲者定义的处理前后差异显示，不是精确频响或品质测量。
  - 切换独立三段 EQ: frame_000264 显示 Attack/Sustain 各三段 EQ、Frequency/Gain/Q-Factor/Drive，以及 SHELF、PEAK、PASS 1、PASS 2 菜单。节点数值不可读；12/24 dB/oct 只保留讲者归属。
  - 管理汇总后级: frame_000344 显示 Stylize Hard、Clipper Drive 37%、Sym/Mix、Limiter、Lookahead 0.10 ms、Oversample Off、I/O +0.0 dB。后级同时影响两路；Sym/Mix/Limiter 精确值不可读。
  - 限定生物 rasp 案例: frame_000398 显示 Creature 的 Attack -73%、Sustain 78%、Sensitivity 30%、filter Off 与可见非线性模块。突出 breathy rasp 是讲者目标和厂商演示，不保证适用于所有生物素材或没有副作用。
  - 限定 Distant 预设: frame_000446 显示 Gun Shot Distant、EQ Mode、Attack -INF dB、Sustain +0.0 dB、filter Off、Lookahead 0.10 ms、Oversample Off 与 Limiter。预设名称不证明传播延迟、反射、空气吸收或物理距离准确性。
- Plugin and processing notes:
  - TRANSFORCE detector / split: 中央检测区驱动 Attack 与 Sustain 两路；Sensitivity、Hold、Decay、检测监听、BP/LP/HP 与 SC 都在演示中出现。可靠迁移是先修检测，不是复制 41% 或 39.49 ms。
  - Tone / Spectral / nonlinear: 两路各自用 Spectral 在 tonal resonance 与 broadband 方向间重配，并有独立 Saturation/Distortion。frame_000234 的 51%/100%/70% 是运行状态，不是厂商 preset 或建议范围。
  - EQ Mode: Attack 与 Sustain 各有三段 EQ；边缘形状菜单可见，但 Frequency/Gain/Q/Drive 不能从静态曲线反推。每次只改一段并做相近响度旁路。
  - Stylize / Clipper / Limiter: 位于两路汇总之后。讲者把 Stylize 描述为改变目标频率周围成分的时间关系，把 Drive/Sym 用于削波形状，把 Limiter 用于峰值控制；视频没有公开算法、相位、真峰或无伪影测量。
  - Lookahead / Oversample: Off、2x、4x 可选；讲者称 oversampling 可减少重失真/削波时 aliasing。片中没有隔离频谱测试，4x 仅短暂选中，最终冲击 A/B 前已回到 Off。
  - Pro Tools context: 三类示例都在单轨、单实例里完成。没有完整多轨 FX 链、对白/音乐/环境上下文、mix-fit 测试、AudioSuite/automation 验证、最终 render 或 middleware 接入。
- Design principles learned:
  - detector 决定处理器看到的事件边界。检测错时，后续 Tone、EQ 和非线性只会放大错误职责；先听 detector，再听 Attack-only、Sustain-only。
  - Attack 与 Sustain 应作为两种可独立诊断的素材角色。前沿管硬度和边缘，主体/尾部管共振与纹理；合并前先确认没有漏掉关键物理信息。
  - delta/分路试听用于回答“改变了什么”，不是“是否更好”。黄色曲线、产品演示与厂商口述都不能代替响度、峰值、频谱和盲听验证。
  - Tone/Spectral 和 EQ 是不同的塑形策略。先明确 tonal/broadband 或手术式频谱目标，再选择模块；不可读数值不补造。
  - 后级是收尾，不是救错。Stylize、Clipper、Limiter 会同时改变 Attack/Sustain 的时间、波形和峰值，应逐项旁通并检查峰均比、DC、mono、真峰和高频毛刺。
  - 冲击 before/after 没有已证明的等响校准，不能因处理版更响、更密就宣称客观更好、无伪影或更能坐进混音。匹配响度/峰值的盲 A/B 是后续建议。
  - oversampling/aliasing 只保留作者功能陈述，生产中需自己比较 Off/2x/4x 的高频、CPU 和 latency；4x 不是视频最终状态或恒优结论。
  - Gun Shot Distant 是快速风格起点。真实距离还需远距参考、直达声电平、传播时间、early reflections、reverb/pre-delay 与空气吸收；单一 EQ preset 不能独立完成。
- Use when: transient shaping; detector calibration; Attack/Sustain separation; metal impact; creature rasp; gun-tail design; TRANSFORCE; BOOM Library; Pro Tools; Spectral; delta audition; three-band EQ; Saturation; Distortion; Stylize; Clipper; Limiter; Lookahead; oversampling; aliasing verification; matched-loudness A/B; distance-style preset; workflow; impact; 插件技巧; 需要先修瞬态检测再分路塑形; 需要严格区分厂商陈述、产品演示、画面参数与独立分析; 需要避免把 Gun Shot Distant 或 oversampling 宣传语言写成物理或测量结论

## 2026-08-08 - 设计有冲击力的瞬态与碎屑层
- Source: `https://www.youtube.com/watch?v=v1IGAnVJylY`
- Domain: impact, workflow, 插件技巧, Alex Barnhart, REAPER, Soundminer, Radium, Rocks, Debris, Explosions, transient, body, tail, time carve, two-frame gap, Random Start, Random Semi, Random Delay, Pro-Q 3, MRatioMB, C1 comp-gate, MTransientMB, offline print, matched-loudness A/B
- Reusable pattern: 把作者工程保留为 Rocks、Debris、Explosions 三组，再用 transient、body、debris、tail 作为分析职责。先由 Radium 六槽和 start/semitone/trigger-delay 随机化生成可打印碎屑，离线把宽层、低沉 sweetener 与 rock/explosion 支撑塑造成单一角色；回到 REAPER 后在第一主击处把 Rocks 与 Debris 共同切出约两帧空隙，让爆炸瞬态独占，第二击再带回主体和碎屑。尾部来自较长 item 与 fade，而非已证实的 reverb。核心是时间让位、角色分离和瞬态/主体对比，不是继续加 bass 或加层。
- Step / event map:
  - 保留作者三组: frame_000027 显示 Rocks、Debris、Explosions 三个 folder。transient/body/debris/tail 是迁移分析标签，不是作者轨名，也不证明三组应该全程同起同落。
  - 管理碎屑与尾部: frame_000252 显示 Debris 高低层的错开起点、不同 item 长度和 fade。低频/低中频应较早结束；画面没有独立 reverb return，不能把素材尾改写为混响尾。
  - 给外缘层去低频: frame_000278 显示 Pro-Q 3 Low Shelf 183.14 Hz、-8.78 dB、Q 1.000。它只属于当前偏 stereo 支撑层，不能推广为通用 impact preset 或具体宽度结论。
  - 生成随机碎屑: frame_000323 显示 Radium 六槽与 Random Start、Random Semi、Random Delay。精确随机范围、ADSHR 和 velocity 未显示；pitch-bend +12/-12 也不等于 Random Semi 范围。
  - 分离 noise/tonal: frame_000654 显示 MRatioMB Noise Ratio 72.8%、Noise Gain -6.72 dB、Tonal Ratio 50.0%、Tonal Gain 0.00 dB。低沉 sweetener 用来托重量后快速淡出，不单独承担识别。
  - 保留瞬态并清理间隙: frame_000829 显示 C1 compressor/gate 与主 rack。较慢 comp attack 让前沿穿过，gate 减少击点间细节；当前数值只绑定该帧，不是所有 rock/explosion stem 的配方。
  - 分频塑造攻强尾短: frame_000875 显示 MTransientMB 三段 transient +6.34/+13.63/+9.79 dB、Sustain -20.6%、200/2000 Hz、24 dB/oct、Analog。参数只属当前帧，需等响旁通验证。
  - 切出主击窗口: frame_001033 显示 Rocks 与 Debris 在 2:00-2:02 共同空出约两帧；第一爆炸瞬态独占，第二击后 body/debris 重开。30 fps 下约 66.7 ms，迁移到新画面必须重测。
- Plugin and processing notes:
  - Soundminer Radium: 六槽随机多采样器用于演奏和打印碎屑 burst/roll。Random Start、Random Semi、Random Delay 的精确范围不可见；Random Delay 只改变颗粒到达时间，不是 spatial delay。
  - FabFilter Pro-Q 3: 一处为偏 stereo 支撑层 low shelf 去低频，另一处在 rock/explosion 链前端清理超低和低中频。只有选定帧的 183.14 Hz、-8.78 dB、Q 1.000 可直接引用。
  - FilterFreak / MRatioMB: 先限制高频，再压低 noisy 分量，形成低噪、低频聚焦、能快速淡出的 debris sweetener。轻微降调半音数与 FilterFreak 频率/共振不可见。
  - C1 comp-gate: frame_000829 的 Compressor 为 -23.4 dB、3.99:1、35.0 ms、50 ms、Makeup 2.0 dB；Gate 为 Floor -Inf、Open/Close -10.0 dB、2.00 ms、300 ms、Hold 0.01 s。只证明本例动态方向。
  - 近似 Processing Rack: Pro-Q 3 -> C1 comp-gate -> MBassador -> Oxford TransMod -> MTransientMB -> Neutron 3 Transient Shaper -> 可选第二 C1 / FilterFreak -> L3-LL。作者说 roughly what I used，不能宣称每个最终 stem 都逐项同设。
  - MTransientMB / L3-LL: 多段 transient 同时抬 attack 与收 sustain；末端 L3-LL 只作抓峰。视频没有 threshold、ceiling、衰减、LUFS、true-peak 或母带交付目标。
  - Offline print / REAPER: 复杂源先在 Processing Rack 打印，减少实时 CPU 并保留可复用音频；最终冲击来自 item 级时间剪辑，不是 Mix Bus ducking。总线、render、middleware 和 in-game validation 均未展示。
- Design principles learned:
  - 冲击力首先来自“短时间内谁不响”。第一主击让 Rocks/Debris 退出，谱面和声像空间留给 Explosions；这比不加区分地继续叠低频更可控。
  - 第一击与第二击必须有不同职责。第一击确认事件并独占，第二击释放 body/debris；复制同一堆叠只会增加噪声而不建立结构。
  - 角色标签要和作者轨名分开。Rocks/Debris/Explosions 是可见事实，transient/body/debris/tail 是分析工具；后者帮助检查时间、频段和尾长，不应改写原工程。
  - Debris 的自然感来自不同素材、起点、触发偏移和尾长。随机触发范围需在自己的素材上记录；随机越多不等于越好，核心瞬态仍应保持确定性。
  - Tail 可以由素材本身和 item fade 形成。没有独立 reverb 证据时，先管理高频颗粒延续和低频早退，避免把空间算法当作必需条件。
  - 插件链是功能顺序而不是品牌处方：频段清理 -> 动态取舍 -> 包络重量 -> 瞬态/谐波 -> 运动 -> 峰值保护。作者的近似链不能外推到每个 stem。
  - 所有画面数值都是帧绑定状态。复刻时先做 matched-loudness bypass，检查 peak、true peak、DC、mono、尾部 click 与相位风险；视频没有严格等响 A/B。
  - 本片止于素材设计与可复用打印。Mix Bus、响度、精确 export/render、middleware 和 in-game test 都是后续验收项，不能写成教程已经完成。
- Use when: impactful transient design; rock impact; destruction debris; double-hit structure; time carve; two-frame gap; Rocks; Debris; Explosions; Soundminer Radium; random multisampling; Random Start; Random Semi; trigger delay; stereo support EQ; noise/tonal separation; comp-gate; multiband transient; sustain reduction; offline print; REAPER item editing; tail management; matched-loudness A/B; workflow; impact; 插件技巧; 需要先通过时间让位而非继续叠低频增强冲击; 需要区分作者轨名与 transient/body/debris/tail 分析标签; 需要避免把触发延迟写成空间 delay 或把长碎屑 fade 写成 reverb tail

## 2026-08-08 - Valorant Clove 死亡状态音效设计
- Source: `https://www.youtube.com/watch?v=LyNsYzCN5_A`
- Domain: scifi, magic, workflow, 插件技巧, Nathan_SFX, Valorant, Clove, death state, Res Available, Res End, UI alert, Enter/Active/End, REAPER, Wwise, RTPC, flat loops, bell, glass, Tibetan Bowl, Crystallizer, PhaseMistress, Tremolator, EchoBoy Jr, crossfade, HUD expiry
- Reusable pattern: 先把“死亡后大招仍可用、但玩家没有按 X”画成 `Dead_ResAvailable_Enter -> Active -> EndExpired` 信息链。Enter 是系统主动告知的高优先级 alert，不是按键 click；Active 由 voice、chime、digital flutter 等 flat loops 持续承载机会窗口，并在 Wwise 中通过 RTPC 做实际 volume automation；End 先结束 loops，再用 breath/synth ramp 接到 expired alert，并与 HUD 图形消失同步。bell/glass 可跨阶段复现，ringing metal、voice/chime 与 breath/synth ramp 则分阶段延续 Clove 身份。REAPER 负责源素材编辑、分层和单层处理，Wwise 负责运行时生命周期。完整音轨未完成本地审听，作者的 clicky/glassy/wobbly/ghostly/harsh/calm/wider 等听感词不能改写为本地结论。
- Step / event map:
  - 界定死亡分支: `12:12.000` 的正文明确选择死亡后不按 X 的分支；它只界定 Dead/self 语境，不重复前 12 分钟的 Smoke Select、Alive/Dead 烟雾变体或既有 smoke 插件链。
  - 定义必要信息 alert: `13:49.760` 的字幕说明该声音发生是 because you died and you need to know something；同屏可见 `Kill states` 与截断的 `Clove_Res_Avail...` 分组。轨名后缀、正式 event scope 与 Wwise 容器不可补猜。
  - 先做 item 编辑: `15:27.040` 显示素材从中间切开并 crossfade。作者保留 lead-up 和 tail、删除过忙中段，再处理淡入/裁尾/淡出；画面没有可抄的精确剪切或淡变数值。
  - 单层颗粒塑色: `18:40.400` 的字幕为 Adding some crystallizer；画面显示低颤动层 FX 列表，当前打开 ReaPitch。作者说明顺序为 low cut -> pitch up -> Crystallizer -> PhaseMistress 变体 -> transient -> delay -> EQ -> mono control；这不是整个 Dead 父组链。
  - 物理金属身份: `20:09.640` 的字幕和 item 标签指向 `Tibetan Bowl`。作者说它可能是 bowed metal scrape、曾 reverse，再经 high roll-off、Tremolator 和 reverb 形成 ringy 层；bowed 来源和所有参数均未确认。
  - 绑定 Res End 与 UI 撤销: `23:30.600` 同屏显示倒地画面、中央状态图形与结束段，作者说明末尾对应 on-screen UI going away，并加入 bird flaps。End 要同时停止循环、撤销权限和关闭 HUD 承诺。
  - 交付 Active flat loops: `25:11.880` 的字幕明确提到 RTPC，REAPER 可见多条持续 loop。作者说这些层在游戏内分别受 RTPC 控制，actual volume automation 在 Wwise 完成；RTPC 名称、曲线、范围、倒计时长度和 pitch 实际值不可见。
  - 从循环进入 expired: `29:31.480` 的字幕说明 loops finish 后直接进入 you've run out of time UI；同屏可见 Active loops、两个 inhale/breath、synth ramp 与下方 Res End 分组。该顺序不包含按 X 后的 cast、reposition、revive timer、success/failure 或最终复活结果。
- Plugin and processing notes:
  - FabFilter Pro-Q 3 / Cockos ReaPitch: 低颤动层先做低频清理和 pitch up；其它 bell/chime/flutter 层也有减法 EQ。选定证据没有可靠参数，不能抄频点、斜率、Q 或半音值。
  - Soundtoys Crystallizer / PhaseMistress: 作者明确把 Crystallizer 与 spooky PhaseMistress 变体放在低颤动单层中，之后再接 transient、delay、EQ。不能把它写成 `Kill states` 或 `Clove_Res_Available` 父总线共享处理，也不能复述现有 Clove smoke 父链。
  - Mono control: 作者说效果把 mono 源变成 stereo，末端用 de-esser 让它回 mono，并明确认为这不是最佳方法。迁移时换明确的 mono fold-down/channel utility，并检查相位、相关度与等响旁路。
  - Soundtoys Tremolator: Tibetan Bowl/金属刮擦先滚高频，再用 tremolo/pulse 和 reverb 抽象为角色身份；rate、depth、shape、sync、算法和 wet 均未显示。
  - Bells/chimes: classic bells 主要使用少量 reverb/delay，chimes 使用 EQ、reverb、delay。具体 wet、decay、delay time、feedback、EQ 频点和实际宽度未知。
  - Soundtoys EchoBoy Jr: digital flutter 先滚高频，再用作者所说的 subtle/slap delay、reverb 与 limiter。更宽、更 encompassing、稍显推远是作者听感，未做本地声像或响度验证。
  - Audiokinetic Wwise: 可证事实只有多个 flat loops 分别受 RTPC 控制，以及实际 volume envelopes/automation 在 Wwise 完成；Wwise event graph、bus、priority、voice limit、attenuation、spatialization、RTPC 正式名称/数值均未展示。
- Design principles learned:
  - UI 声音先按信息职责分类。动作确认告诉玩家“输入被接收”，必要信息 alert 告诉玩家“状态改变且必须做决定”；死亡后 ult 可用属于后者。
  - 状态窗口不能只有一条漂亮提示。Enter、Active、End 分别建立进入、持续和撤销，缺一段就会让玩家误判机会是否仍有效。
  - 角色身份材料可以跨阶段复用，但每段的时间行为必须不同：Enter 有明确入口，Active 能循环且不抢前景，End 有决定性关闭和视觉撤销。
  - 先通过切割、删除和 crossfade 修正信息轮廓，再加插件。插件只负责身份、运动、空间或动态；已无明确贡献的处理应旁路。
  - Flat loops 不应烘入固定生命周期。离线 DAW 交付可循环资产，运行时按真实状态驱动 volume/pitch；本视频明确证实的实际项是 volume automation。
  - End 要共同关闭声音循环、操作权限和 HUD 元素。验收顺序应是 loops 退出 -> 过渡层 -> expired alert -> UI 消失，而不是只检查尾音是否悦耳。
  - REAPER 文件夹、颜色和缩进只能证明编辑组织，不能证明父轨 FX、Wwise bus、self/other/near/far、第三人称、衰减、遮挡或 listener 规则。
  - 本片只覆盖未按 X 的到期路径。按 X 后的施法、位移、复活计时、成功/失败和最终结果必须由独立证据与模块处理。
- Use when: death-state UI; limited revive window; Res Available; timer active loop; timer expired; Enter Active End; Valorant Clove; Nathan_SFX; REAPER; Wwise RTPC; flat loop lifecycle; bell and glass identity; Tibetan Bowl; bowed metal uncertainty; Crystallizer; PhaseMistress; Tremolator; EchoBoy Jr; item crossfade; HUD expiry sync; scifi; magic; workflow; 插件技巧; 需要区分玩家按键反馈与系统主动必要信息; 需要把持续状态拆成入口循环结束; 需要把离线 flat loop 与 Wwise 运行时自动化分工; 需要避免把轨道缩进猜成父总线或空间实现; 需要严格排除按 X 后的施法位移复活成功失败分支

## 2026-08-08 - ARC Raiders 风格爆炸：浴帘变低沉冲击
- Source: `https://www.youtube.com/watch?v=FuFfkk7dxcY`
- Domain: impact, workflow, scifi, 插件技巧, Dietrich Dice Sound, ARC Raiders, explosion, household Foley, shower curtain, Udu, cardboard, low boom, transient, body, tail, debris, convolution IR, RBass, Saturn 2, OTT, Slapper ST, master automation
- Reusable pattern: 把参考爆炸拆成 `electronic beeper -> low boom -> bright transient -> Body -> Tail -> Debris`，再从日用品中寻找功能等价源。浴帘只承担 boomy impact 与 early body 的一部分，Udu、纸板、吹麦、真实 ambience、米粒、白噪声、塑料袋和其它碎屑共同完成结构。可迁移的是功能分工、源选择和时域组织，不是 ARC Raiders 官方资产或固定插件处方。先找原始频段与包络已经接近职责的素材，再用 EQ、饱和、瞬态、卷积和包络放大已有性格；插件越多越需要 matched-loudness A/B。
- Step / event map:
  - 建立素材清单: `01:10.000` 同屏列出 Udu、毛巾、吹麦、土、米、工具、游戏盒、金属盘/门、纸板、塑料袋、方便面、洗衣容器、浴帘和雨棍，以及 F8n Pro、MKH 416、Rode M5。作者还使用阳台 ambience、沙土和石子；目标是不调用真实爆炸或现成爆炸尾声，不是拒绝白噪声、插件或 IR。
  - 推纸板瞬态: `05:33.000` 显示 cardboard rip 及 Transient、OTT、双 Saturn、Haas、Pro-Q、第二级 Transient、Clipper、Slapper、末端 Pro-Q。列表只证明功能链，不证明 drive、mix、阈值、preset 或 hidden bypass。
  - 放大浴帘 boomy 性格: `06:44.000` 同屏显示 Shower curtain 轨、波形与 Saturn 2。作者明确说继续堆插件不如重新录一个本身位于正确频率范围的源；Saturn 频段、style、drive 和 mix 未显示。
  - 预滚 Udu low boom: `09:20.000` 显示 Bass udu item 早于若干主冲击 item，当前 RBass 实例为 `Freq 79 / Intensity 13.6`。这是项目编排和实例数值，不证明最终低频声学峰必然先到，也不是通用 RBass 预设。
  - 建立浴帘 Body: `13:04.000` 显示 Decapitator、deactivated Flanger、Pro-Q 3、Saturn 2、Convolver、Fresh Air、RX De-click；当前 Convolver 可读 `Fade In 0.00% / Stretch 100% / Fade Out 0.00% / Delay 0.00 ms`，IR 标签以 Urban 开头。完整 IR 名和 mix 未知。
  - 建立米粒 Tail: `16:10.000` 显示 Rice 轨 Slapper ST；当前实例可读 `Gain -7.4 dB / Delay 371.5 ms / Feedback 37% / Damp 77% / HPF 93.0 Hz / LPF 1.9 kHz / Mix 100%`。这些数值不得推广到其它 Slapper 实例。
  - 映射 Debris: `21:15.000` 把塑料袋现场录音与 REAPER 中降速、错开并带 fade 的 debris items 同屏。塑料袋降调为 rock-like debris 是作者口述；精确半音、rate 和样本偏移未知。
  - 局部 Master 动作: `22:45.000` 显示 `Wet / kHs Transient Shaper` 包络大部分为 0，仅在 bass 后、主瞬态附近形成窄脉冲。它是目标时刻的自动化，不是常开母线 preset；宽度、偏移、阈值和 loudness target 均未给出。
- Plugin and processing notes:
  - Kilohearts Transient Shaper / Xfer OTT / Kilohearts Clipper: 纸板主瞬态用多级动态与限幅建立亮、短、可读的峰；Master transient wet 只在目标命中短暂抬起。每级必须等响旁通，避免把更响误判为更有 punch。
  - FabFilter Saturn 2: 明确参与浴帘 boomy impact、纸板瞬态和 Body 塑形。作者强调 ARC 参考式卷积爆炸应保持失真克制；频段、style、drive、mix 与未明确说明的 bypass 保持 unknown。
  - Waves Renaissance Bass: 只确认 Bass udu 当前实例的 `Freq 79 / Intensity 13.6`。作者还口述先 EQ 只留 bass、再以鼓压缩和 clipper 管理响度/峰值；截止、阈值和提前毫秒未知。
  - Kilohearts Convolver: 浴帘 Body 当前实例为 `Delay 0.00 ms / Stretch 100%`，Fade In/Out 均 `0.00%`，IR 标签只可靠读到 `Urban, ...`。这些帧绑定值不能外推到 Tail 或其它卷积。
  - The Cargo Cult Slapper ST: Rice Tail 当前实例为 `Delay 371.5 ms / Feedback 37% / Damp 77% / HPF 93.0 Hz / LPF 1.9 kHz / Mix 100%`。画面参数只服务该米粒尾层，不能成为全局空间设置。
  - FabFilter Pro-Q 3 / Haas: 作者按角色清理频段并对部分 mono Foley 加宽。Udu 留低频、Debris 去低并削刺耳高频、风层留高端；具体频点/Q 与低频是否强制 mono未展示，Haas 还需补 mono 和相位测试。
- Design principles learned:
  - 先按目标频段与包络选源，再加工。柔软塑料、纸板、陶鼓、食材与日用品可以跨语义重映射，但不能因为标题突出浴帘就忽略其它层。
  - 低频 item 的时间线起点、输出低频包络起点和低频峰值是三个不同事实。作者把 Udu 前置是编排策略，最终信号仍需分频测量。
  - Body、Tail、Debris 应分别承担初始反射、地点尺度和末端落物。用单一大混响替代三段会失去清楚的事件叙事。
  - 环境 IR 是身份和地点层，不只是尾端装饰；过量 broadband distortion 会吞掉直达声到反射声的过渡。
  - Debris 用频段、密度、起点和 fade 让位。土、沙、石、袋子、米粒与方便面不应全频、同时、同宽度出现。
  - Master automation 只解决目标瞬间。分层内先完成角色，再用 transient wet 窄脉冲和 clipper/limiter 条件性收口。
  - ARC Raiders 只是作者的参考目标与功能结构；官方工程、官方素材、精确 pitch/EQ/饱和/IR mix、hidden bypass、独立爆炸 LUFS/true peak、低频 mono、导出、中间件和游戏内结果都未得到证明。
- Use when: ARC Raiders style explosion; household Foley explosion; shower curtain impact; Udu low boom; cardboard transient; impact body tail debris; convolution body; spatial tail; rice Slapper; plastic bag rock debris; bass pre-roll; transient wet automation; matched-loudness A/B; restrained saturation; functional source selection; impact; workflow; scifi; 插件技巧; 需要把参考风格拆成功能角色而非冒充官方资产; 需要避免把标题素材扩大成整颗爆炸; 需要严格限定 RBass Convolver Slapper 的帧绑定参数; 需要区分时间线前置与最终声学峰值; 需要把母线瞬态自动化限制为目标时刻

## 2026-08-08 - 用史莱姆气泡制作怪物声音
- Source: `https://www.youtube.com/watch?v=NdGNqhV8cpM`
- Domain: creature, environment, magic, 插件技巧, Juuso Tolonen, slime bubbles, Uši Pro, hydrophone, dual-perspective recording, snippet sequencing, playback-rate resampling, Vocal Doubler, ReEQ, Radiator, OTT, Decapitator, Traveler, Saike Transience, Digital Drum Compressor, RX De-crackle
- Reusable pattern: 先从吹入史莱姆、气泡鼓起和破裂的真实动作中挑选已经像发声的短片段，再把同一事件的两种录音视角分工：Uši Pro 外部录音保留高频边缘和 bite，浸入史莱姆的水听器录音提供中低频、粗砺与 throaty 主体。Uši 片段以不保留音高的低速重采样改变尺度，Hydro 先清理泥浊，再按 EQ -> Radiator -> OTT -> Decapitator -> Traveler -> transient -> compression -> EQ -> De-crackle 处理。短 item 之间的留白负责宏观发声包络。这个结构不是固定 wet-mouth/body/air 三层，也没有独立 formant 或 granular 证据。
- Step / event map:
  - 记录物理源动作: `00:05.000` 显示吸管插入绿色史莱姆并吹出气泡。它只证明材料与动作，不证明麦克风布置、前级、录音机或增益。
  - 双视角筛片与编排: `02:31.000` 同屏可见 CREATURE/Uši、Creature Voc Hydro、多条留缝短 item 与 Path Position/TRAVELER 轨。Uši 是普通外部录音，Hydro 浸在史莱姆中；两路按功能互补，不是固定三层模板。
  - 凝聚 Creature 文件夹: `03:04.000` 的 Vocal Doubler 当前为 Separation 100%、Variation 49%；ReEQ、Saturation Knob、MCompressor 启用，Kilohearts Chorus 条目可见但未启用。不能把 kind of like a chorus 口述改成 Chorus 已启用。
  - 降速 Uši item: `03:32.000` 当前实例为 Playback rate 0.330146、Volume +6.63 dB、Mono (left)、Preserve pitch 未勾选、RESAMPLED。数值只绑定这一条 item，不是全局设置。
  - Hydro 前级减法: `04:36.000` 的第一只 ReEQ 显示陡峭高通与宽低中频削减，位于 Radiator/OTT/Decapitator 之前。作者称水听器录音 very muddy；精确频率、Q 和增益不可安全读取。
  - Hydro 加厚与失真: `05:40.000` 的 Decapitator 显示 Punish 开启、Style A，列表确认 Radiator -> OTT -> Decapitator -> Traveler 顺序。Drive、Tone、Mix 和 Radiator 参数未知。
  - 驯服 rough transient: `05:50.000` 的 Saike Transience 显示 Attack 0.5、Decay 0.5、Attack -0.4872、Decay 0.0 等当前值。作者先压低粗糙起音，再由后续压缩带回主体；压缩参数未展示。
  - 链尾 De-crackle: `06:20.000` 的 RX 7 De-crackle 为 Quality Low、Strength 8.3、Amplitude skew 5.9，Output crackle only 未勾选。作者说它处理 clippy 感并凝聚声音；clippy 是听感描述，不等同已测数字削波。
- Plugin and processing notes:
  - iZotope Vocal Doubler / Creature folder: 当前可见 Separation 100%、Variation 49%；ReEQ、Softube Saturation Knob 与 MeldaProduction MCompressor 同时启用。Kilohearts Chorus 未启用，Amount 与其它插件参数未知。
  - Playback-rate resampling: Uši 当前 item 的 0.330146、+6.63 dB、Mono (left)、不保留音高是帧绑定值。视频显示普通 item rate 编辑，不是 formant shift，也不是 granular synthesis。
  - REAPER JS ReEQ / Soundtoys Radiator: Hydro 先减掉泥浊，再用 Radiator 加 low end 与 saturation。只确认曲线形态、功能和链序，不抄精确 EQ、Input、Bass、Treble 或 Mix。
  - Xfer OTT: Depth 100%、Time 100%、输入/输出 0.0 dB 是用于暴露 plasticky/aggressive 方向的极端演示；随后 Depth 被明显回退，最终精确值不可读。
  - Soundtoys Decapitator: 当前帧显示 Punish 和 Style A；Drive、Tone、Mix、输出与 oversampling 未确认，不能推广为全部 Hydro item 的 preset。
  - Tontum Traveler: 项目存在 Path Position 自动化，作者意图是跟随怪物并在跌落时做 Doppler；作者本人不确定最终 bounce 是否启用，因此只记录设计意图和工程步骤。
  - Saike Transience / Digital Drum Compressor: 先降低 rough attack，再压缩抬回主体。只有 Transience 当前数值可见；压缩 threshold、ratio、attack、release 与 makeup 均未知。
  - iZotope RX 7 De-crackle: 当前实例 Low / 8.3 / 5.9，位于后级 ReEQ 之后。它是修整也是音色取舍，过量可能清掉有用的湿润爆点。
- Design principles learned:
  - 材料行为先于怪物标签。压力积累、黏稠鼓起、气泡破裂和短脉冲天然具有发声运动，后期只需放大已有性格。
  - 同一事件的外部与内部/接触视角比按惯用名词堆层更可控。先按频段、拾音视角和动作职责分工，再决定轨名。
  - 片段间隔既是宏观包络也是混音空间。持续低吼会失去每次发声的起落，并遮挡法术、冲击与环境上下文。
  - 低速重采样把时长、音高和纹理绑定改变。听见体型变大不能反推独立 formant；看见短片段编排也不能改写成 granular。
  - 非线性前先减法，非线性后再结构性修整。Radiator、OTT 与 Decapitator 放大的是已清理的喉体，后级 EQ/De-crackle 处理累积副产物。
  - 极端参数用于辨认方向，不代表交付值。OTT 100% 明确被回退；任何换源复刻都必须从低量开始并做 matched-loudness bypass。
  - 动态处理要同时观察微观爆点和宏观脉冲。先削 attack 再抬主体，不等于把所有瞬态磨平。
  - 对作者自我质疑的链保留不确定性。Traveler 在工程中出现过，也有路径意图，但最终 bounce 状态、reverb send、响度、导出和游戏内结果均未证明。
- Use when: slime creature vocal; monster throat; organic creature source; hydrophone creature; Uši Pro; dual perspective recording; short vocal pulses; playback-rate resampling; no formant evidence; no granular evidence; Vocal Doubler; Hydro shared chain; muddy cleanup; Radiator; OTT exploration; Decapitator; transient reduction; De-crackle timbre cleanup; Traveler uncertainty; creature; environment; magic; 插件技巧; 需要从真实材料行为构造怪物发声而不是先堆插件; 需要按外部高频边缘与内部中低频喉体分工; 需要避免套用 wet-mouth body air 固定三层; 需要把帧绑定参数与最终通用 preset 分开; 需要保留最终 bounce 未确认的空间链不确定性

## 2026-08-08 - 暗黑魔法的基础声音构件
- Source: `https://www.youtube.com/watch?v=yYUB55kMMV8`
- Domain: magic, workflow, 插件技巧, Francisco Nascimento, dark magic, building blocks, source palette, visual evidence, Pro Tools, Cloth, Coffe Machine, Saw, Paper, Reversed Paper, Crickets Soundscape, Squeaky Door, Singing Bowl, unknown source, Reversed Glass
- Reusable pattern: 先把日常物理来源整理成异质 palette，再在另一个阶段按目标场景分配职责。画面按 Layer 1-10 列出 Cloth、`Coffe Machine`、Saw、Paper、Reversed Paper、Crickets Soundscape、Squeaky Door、Singing Bowl、`???` 和 Reversed Glass，并为每层展示 Pro Tools 轨道/波形与 Insert 列表区域。当前没有本地完整视频、完整音频或可用字幕，因此本条只学习来源目录、证据边界与 palette 工作法；不把 Insert 列表补成插件因果教程，不把标题补成听感，也不把十层写成已验证的最终暗黑魔法配方。
- Asset provenance: 八张正文图来自已认证浏览器帧；原始 `frame_000022/000077/000129/000151.png` 因抓取时播放器尺寸变化为 `1348×758`，其余四张原始帧为 `1920×1080`。站点高清资源均在不裁切画面的前提下规范为 `1920×1080`，预览图为 `960×540`。
- Step / event map:
  - 建立 Cloth 入口: `00:07.9` 显示 Layer 1、Source: Cloth、衣物图示、Pro Tools 轨道头、波形、clip 两端淡变线和 Insert 列表。迁移时可把柔性材料当作 gesture 候选，但这不是作者已公开的事件角色。
  - 记录机械来源: `00:21.8` 显示 Layer 2、长双通道波形、咖啡机图示和设备区域。画面原文为 `Source: Coffe Machine`；正文可规范化为 Coffee Machine，但证据注释必须保留拼写。
  - 记录 Saw 来源: `00:39.6` 显示 Layer 3、Source: Saw、圆锯图示、Pro Tools 轨道头、Varispeed 控件、双通道波形、播放头和 Insert 列表。锯型、动作与听感均未知。
  - 区分普通/反向纸: `01:17.3` 显示 Layer 5 / Reversed Paper；分析时间线另确认 Layer 4 / Paper。正文图有意只选反向纸，Reversed 只证明标签，不证明 clip reverse、离线 bounce、反向混响或 delay。
  - 纳入环境声景: `01:39.1` 显示 Layer 6 / Crickets Soundscape、长波形与多行设备区域。不能从电平活动和波形密度推断颗粒、虫群音色或持续职责。
  - 保留门的来源身份: `02:08.8` 显示 Layer 7 / Squeaky Door、门图示、长波形与设备区域。不能按门轴素材的常见用法补 pitch、formant、frequency shift 或 creature 角色。
  - 记录共振金属来源: `02:30.6` 显示 Layer 8 / Singing Bowl、颂钵图示、长波形与设备区域。音高、调性、敲击/摩擦方式、空间和结果均未证明。
  - 限定反向玻璃证据: `03:08.3` 显示 Layer 10 / Reversed Glass、Pro Tools 轨道头、波形、Insert 列表和覆盖波形区域的碎玻璃装饰图。装饰线条不是可识别的 automation lane、参数包络或节点证据；Layer 9 的 Source: `???` 继续保持未知。
- Plugin and processing notes:
  - 本条不把具体插件写成因果教程。八张已认证帧能确认 Pro Tools Insert 列表存在，但不能在当前证据契约下建立插件作用、参数、启用/旁路或听觉因果。
  - 波形、绿色电平活动、播放头和 Varispeed 控件都是视觉状态，不是可听音色、频谱、动态、空间或处理前后差异的证据。
  - Reversed Paper / Reversed Glass 只按来源标签记录；reverse 的技术位置、方法和处理顺序全部 unknown。
  - Layer 10 覆盖波形区域的碎玻璃线条属于装饰图，不把它记录为 envelope/automation 或参数证据。
  - 普通 Paper 与未知 Layer 9 没有进入八张正文图，但仍属于十层来源目录；未知层不得参与参数教学。
  - 结尾结果段没有可用音频证据，不能评价最终 blend、响度、频谱、动态、空间、层次或设计成败。
- Design principles learned:
  - 标题、来源标签和功能职责分开。Dark Magic 是发布语境，Cloth/Glass 是来源，cast/impact/tail 是后续场景功能，三者不能互相替代证据。
  - 先按物理行为扩充 palette：柔性、机械、摩擦、薄片、环境、共振和脆性材料提供不同入口；Layer 9 保留 unresolved。
  - 持续源与瞬态源分开打印。Coffee Machine、Crickets、Door、Singing Bowl 可先做长变体，Cloth、Paper、Glass 可先做短 gesture；这是迁移练习，不是作者轨道角色。
  - 反向素材先服务动作方向与时间终点。先把能量终点对齐视觉帧，再决定自己的音色处理，不把视频未公开的方法写成配方。
  - 每个源只设一个实验目标：scale、motion、tone、attack 或 tail；输出弱/中/强三版并做 matched-loudness A/B。
  - 设备名即使可读，也不等于作用与因果已被证明；参数和 A/B 证据缺失时留空，不从相邻记录借用链路结论。
  - palette 建好后再写视觉事件表。cast、movement、impact、sustain、release、tail 只能作为自己的 transfer hypothesis，并需由玩家信息职责验证。
  - 完整交付还需要 dry/intermediate render、fade、mono、响度、true peak、loop/variation、导出、中间件和游戏内遮蔽检查；本片没有提供这些结果。
- Use when: dark magic source palette; everyday object building blocks; visual-only tutorial evidence; Cloth; Coffee Machine; Coffe Machine spelling; Saw; Paper; Reversed Paper; Crickets Soundscape; Squeaky Door; Singing Bowl; unknown source boundary; Reversed Glass; physical-behavior classification; forward reverse timing; matched-loudness A/B; workflow; magic; 插件技巧; 需要在没有完整音频和字幕时诚实整理可见素材目录; 需要把素材来源与游戏事件角色分开; 需要避免从设备列表、波形或相邻教程补写插件与听感; 需要把 Layer 9 未知来源和 reverse 实现保持为 unknown

## 2026-08-08 - Valorant Clove 终极技能音效制作
- Source: `https://www.youtube.com/watch?v=cJ75ykkqV64`
- Domain: magic, scifi, workflow, 插件技巧, Nathan_SFX, Valorant, Clove, ultimate, Initial Cast, perspective cutoff, reverse suck bridge, Reposition Loop, Spawn, post-revive timer, RTPC, success failure, bell chime, bird riser, Soundtoys Crystallizer, Soundtoys PhaseMistress, FabFilter Pro-Q 3, Eventide SP2016 Reverb, REAPER, Wwise
- Reusable pattern: 从玩家按 X 激活大招后开始，先把交互链拆成 `Ult Cast -> Perspective Bridge -> Reposition Enter/Loop -> Spawn -> Post-Revive Timer -> Success / Failure`，再为每个状态决定一次性 marker、可被切断 tail、持续 loop 与独立结局。Bell/chime 和 butterfly/bird-flap 方向跨阶段维持 Clove 身份；作者当年的透视播放切断问题用独立 reverse-suck bridge 暂时规避。Timer 的 countdown loop 与 heartbeat 由游戏内 RTPC 临近失败时抬起，REAPER 绿色 Volume 包络只为讲解，作者明确说未随资产 bounce。本条严格排除第 16 条按 X 前的 Res Available/End 和 Clove smoke。
- Asset provenance: 八张正文图来自已认证浏览器帧 `frame_000058/000199/000578/001475/001833/002588/002840/002984.png`，截图均为 `1920×1080`；capture manifest 标记播放器内容为 `1280×720`。对应站点预览图为 `960×540`，无 motion。
- Evidence boundary: 当前没有本地完整视频或完整音频。画面事实只用于确认当前帧中的 REAPER 组织、插件窗口、数值和包络；作者意图、听感与 RTPC 只按中英 VTT 归因。视频没有展示 Wwise UI，不能填写 event、RTPC、curve、range、switch/state、bus、scope、priority、voice limit 或 3D 字段。Success 与 Failure 是两条独立路径；作者不确定留存条件究竟是 kill 还是 damaging assist，因此不将其写成已核实的当前游戏规则。
- Step / event map:
  - 建立按 X 后的事件地图: `00:58.040` 的认证帧显示绿色 `Clove_X_Cast_A...` 组、多段颜色区域、REAPER 全局时间线和游戏参考窗口。字幕说 Ult is split up into sections 并从 initial cast 开始；轨道缩进不等于 Wwise 事件树。
  - 标记 Initial Cast bell 变体: `03:18.900` 打开 Track 16 的 Crystallizer，当前 Pitch `-50 cents`、Splice `102.7 msec`、Delay `7.3 msec`；FX 列表可见 Pro-Q 3、Crystallizer、PhaseMistress 和另一只 Pro-Q 3。作者把 flutter 归因于 Crystallizer + PhaseMistress；参数只绑定该帧，没有本地听音结论。
  - 解耦透视切断桥接: `09:37.960` 显示绿色 Cast 与青色后继层分组错开，字幕正说明 crescendo/suck sound。作者让可被切断 tail 与 reverse-suck bridge、后继 marker 分开，使短空隙听成有意停顿；约 `0.1-0.2 s` 属口述近似值，且底层播放问题后来已修复。
  - 让 bird riser 逐步显形: `24:34.600` 显示 Pro-Q 3 低通形态、`Band 1 Frequency / Pro-Q 3` automation lane、Volume lane 和紫色 item。作者口述该 bird recording 同时使用 pitch、volume 与 EQ automation；截图没有可靠给出完整频率端点、Q、斜率、音量终值或 automation mode，也不证明 envelope 已烘焙。
  - 独立 Reposition Loop: `30:32.920` 在紫色阶段显示持续 item，其下方另有橙色 Spawn 组；字幕明确说 reposition loop 并进入 first layer。作者说明 Loop 与相邻声音由不同事件触发；loop point、crossfade、variation、voice limit 与 3D 属性未知。
  - 用 RTPC 处理 post-revive timer: `43:08.360` 显示 `X Active Loop`、重复短 item、长 loop、Volume lane 与下方结局分支，字幕明确提到 RTPC。作者说 loops 从状态开始运行、音量先保持近似不可闻，临近失败时才抬起；`-200 dB` 是口述近似，不是已读 Wwise 曲线值。后续字幕明确说 REAPER 包络只为 session 演示，资产未随它 bounce。
  - 独立 Success: `47:19.680` 显示绿色 success 分组和多层 item，字幕说达成条件后 fully come back to life。作者说明它与 kill banner 同时发生，允许自身退居 flavor；实际 bus priority、ducking 与响度未知。
  - 独立 Failure: `49:44.440` 显示蓝色 failure 分组和 Track 63 FX 列表，SP2016 Reverb、Pro-Q 3、Crystallizer 可见，当前 Crystallizer 预设标签为 `ShudderRoom`。作者说结果仍不够 spooky，于是加入 Crystallizer；spooky 是作者听感，完整参数、旁路和导出结果未知。画面下方既有 `Kill states` / `Clove_Res_Avail...` 不进入本条。
- Plugin and processing notes:
  - Soundtoys Crystallizer: Initial Cast 当前帧值为 `-50 cents / 102.7 msec / 7.3 msec`，只作单实例档案。Failure 帧显示 `ShudderRoom` 标签；Mix、其它参数、旁路和最终导出状态不补写。
  - Soundtoys PhaseMistress: 作者将其与 Crystallizer 配合，为 bell、reposition 与 timer 层增加适量 phase movement；03:18.900 只确认列表条目出现，rate、depth、feedback、mix、preset 和当帧启用状态不外推。
  - FabFilter Pro-Q 3: 多个事件使用减法整理；bird riser 帧能确认低通形态和 Band 1 Frequency automation lane。不同轨道上的 Pro-Q 3 不能拼成一条共享父链。
  - Eventide SP2016 Reverb: 49:44.440 的 Failure FX 列表可见；preset、decay、predelay、mix、旁路与是否属于父轨均未确认。
  - Ina-GRM GRM Reson Stereo: 作者口述自己很少使用，A/B 后只能辨认很小差异，并怀疑是复制链遗留。可迁移原则是逐颗 matched-loudness bypass、无明确职责则删除；本站不把它列成必用插件。
  - Audiokinetic Wwise: 可写事实只有作者所述的 post-revive RTPC volume 生命周期。没有 Wwise 界面证据，正式字段和值全部保持 unknown。
  - REAPER automation: bird 的 EQ/Volume lane 和 timer 的绿色 Volume 包络都是可见工程状态；作者明确说 timer 资产没有把演示 Volume 包络 bounce 进去，实际自动化发生在游戏中。
- Design principles learned:
  - 按玩家状态和触发边界交付资产。Cast、会被切断 tail、bridge、Loop、Spawn、Timer、Success 与 Failure 不应被一个长文件绑死。
  - 角色 motif 与状态时间行为分开。Bell/chime、flap 可以贯穿全链，但 Cast 要有入口、Loop 要低注意力、Spawn 要确认权限恢复、结局要明确分支。
  - 技术 workaround 要记录时代背景。先修 listener/ownership/voice-cut 根因；只有发布窗口受限时才用独立 bridge，底层修复后重新评估。
  - 运行时危险度优于离线固定包络。Timer 前段可以近似不可闻，临近失败再由真实剩余时间抬起 heartbeat/loop。
  - Success flavor 必须给更高优先级系统确认让位；Failure 则要与按 X 前的机会到期形成不同语义。
  - 包络服务状态叙事：pitch 表示回身体，filter 表示逐步显形，volume 表示危险临近；具体参数按素材和实机重定，不照抄模糊字幕。
  - Spooky 是角色标尺，不是越暗越好。作者明确不希望 Clove 变成纯 horror/necromancer 方向。
  - 插件是否保留只看独立贡献。复制链、preset 和可见 FX 条目都不等于有可听因果；必须旁路、匹配响度并检查角色职责。
  - 完整交付还需 loop seam、variation、fade、mono、true peak、约 250 Hz 累积、导出、Wwise/FMOD 生命周期和游戏内遮蔽测试；本片证据没有完成这些验收。
- Use when: interactive ultimate ability; post-activation state machine; temporary revive; ghost reposition; perspective voice cut; reverse suck bridge; independent enter loop spawn; post-revive kill timer; runtime RTPC volume; flat loop not baked; success failure branches; system banner priority; Clove identity motif; bell chime; butterfly bird flap; Crystallizer frame-bound values; Pro-Q 3 automation; PhaseMistress movement; SP2016 failure branch; remove ineffective copied plugins; REAPER Wwise evidence boundary; magic; scifi; workflow; 插件技巧; 需要严格区分按 X 前 Res Available/End 与按 X 后复活执行链; 需要把 REAPER 演示 envelope 与游戏运行时自动化分开; 需要避免从字幕听感或未显示 Wwise 字段补写工程事实
