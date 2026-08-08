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
