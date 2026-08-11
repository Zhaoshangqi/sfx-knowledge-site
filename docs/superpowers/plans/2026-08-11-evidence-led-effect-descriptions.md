# Evidence-Led Effect Descriptions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generated effect-category summaries with 27 manually curated, video-evidenced effect guides that state the input material, processing action, and audible result without parameter instructions.

**Architecture:** Add a small UMD data module keyed by normalized canonical plugin name. `EffectIndexData` remains responsible for canonical identity, screenshot matching, grouping, and route projection, but it may build a public profile only when the curated guide, its exact `evidenceUseId`, and a strict video screenshot for that use all resolve. Cards, effect details, and video-detail summaries read the same three fields from that profile; effects that fail the gate remain in the video library but disappear from the effect index.

**Tech Stack:** Static HTML/CSS/JavaScript, UMD browser/CommonJS modules, `SfxKnowledgeModel`, Node.js built-in test runner and `node:vm`, Python pytest, and Playwright browser validation.

---

## Scope And Guardrails

- Keep all 82 video records and their existing notes, routes, source links, and screenshots unchanged.
- Publish exactly the 27 effects listed in the content matrix below for the initial release.
- Treat the private mindnote titled `音效设计效果器与Reaper脚本使用技巧` as a writing-style reference only. Do not store its URL, authorization state, or unrelated effects in the repository.
- Do not derive public copy from category rules, official product marketing, parameters, presets, or inferred effect-chain behavior.
- Do not show an official-only profile. An official image may be a secondary gallery image only after the selected evidence use has a strict video screenshot.
- Keep one canonical plugin identity per profile and one owner per video screenshot.
- Keep the public fields parameter-free: no numeric values, units, knob names, ranges, or step-by-step recipes.
- Prefer 12-44 Unicode characters per field. Every approved field below must pass that hard limit before release.

## Approved Content Matrix

Use these values verbatim unless a failing evidence check proves that the referenced use or screenshot no longer exists. If that happens, hide the profile and document the mismatch instead of selecting a weaker use automatically.

| canonicalName | evidenceUseId | input | action | result |
| --- | --- | --- | --- | --- |
| Dawesome Love | `bsadb7479:effect:love:2` | 刮擦声等单薄、缺少数量感的自然素材 | 把素材切成细小颗粒，并让颗粒成群扩散 | 单条刮擦变成密集、漂移的外星群体纹理 |
| FabFilter Pro-MB | `upy3d1em:effect:fabfilter-pro-mb:9` | 中低频有盒感、但仍需保留低频延伸的 Boom | 只在盒感突出时动态压低对应中频 | 低频冲击更干净，主体不会被固定削空 |
| FabFilter Pro-Q 3 | `yt-kv0yNg1CPAk:effect:fabfilter-pro-q-3:4` | 中频特征不明显、同时带刺耳峰的 One-shot | 抬出有用中频，并削减狭窄的刺耳峰 | 气泡感和运动焦点更突出，高频不扎耳 |
| FabFilter Saturn 2 | `yt-h1uYic59pf0:effect:fabfilter-saturn-2:4` | 已经清理过、但仍显干硬的长变形纹理 | 用多段失真、滤波和短延迟制造粘稠运动 | 纹理变得脏亮、黏连，并在频段间流动 |
| iZotope RX De-click | `d8ed0db4:effect:izotope-rx-de-click:7` | 带点击与细碎杂音、还要继续重处理的素材 | 先检测并修复短促点击与爆裂杂音 | 底层更干净，后续调制不会把瑕疵一起放大 |
| iZotope Stutter Edit 2 | `bsa5b20e8:effect:izotope-stutter-edit-2:1` | 需要快速生成断续、扫动变体的持续素材 | 用可触发预设切断、重复并重排时间片段 | 一条素材变成可表演的 Glitch 与 Sweep 变化 |
| Kilohearts Phase Plant | `yt-6oJUotZGz0k:effect:phase-plant:2` | 需要旋律提示、扫描与遥测细节的科技 UI | 让多振荡器互调，并随机改变音高与谐波运动 | 得到颤音、扫描和电子提示音等多种细节 |
| Kilohearts Snap Heap | `bsa8465bc:effect:snap-heap:2` | 尾音太平直、空间变化不足的低沉 Drone | 叠加弹跳与双重延迟，扩展回声路径 | 尾音变宽并产生层层折返的低调科幻运动 |
| Melda MAutoPitch | `yt-aKkZZ-XeSqs:effect:melda-mautopitch:3` | 音高漂移大、角色不够机械的 Vox 素材 | 把音高强制吸附到稳定的半音位置 | 声带变得刻意量化，机器身份更统一 |
| MeldaProduction MTremolo | `yt-ir8d3PUj5JU:effect:meldaproduction-mtremolo:5` | 需要随动作结束继续加速的 Post-roar 尾部 | 让颤音速度跟随动作回落持续上升 | 低频脉冲逐渐收紧，尾巴与动作同步加速 |
| Minimal Audio Wave Shifter | `yt-j4POSc1YeAo:effect:minimal-audio-wave-shifter:2` | 已有气泡节奏、但频谱运动不够明显的音色 | 用频移与反馈扩展原声周围的旁带 | 增加金属与液态摆动，同时保留原有节奏 |
| Morph EQ | `bsadb7479:effect:morph-eq:1` | 共振变化不足、听起来仍像原录音的刮擦声 | 移动多个共振峰，让频谱形状持续变形 | 刮擦声出现流动共振和陌生的外星质感 |
| NI Transient Master | `d8ed0db4:effect:ni-transient-master:6` | 整组起音、持续段和峰值关系不稳定的混合声 | 分别重塑攻击与持续段，并控制整体峰值 | 起音和尾部的比例更统一，主轨动态更可控 |
| Oeksound Soothe2 | `upy3d1em:effect:oeksound-soothe2:16` | 主瞬态带刺耳 Crunch、但仍需保留亮度的 Boom | 只在扎耳共振出现时动态压低对应频段 | 冲击仍然明亮有力，高频 Crunch 不再刺耳 |
| Polyverse Manipulator | `upy3d1em:polyverse-manipulator:1` | 已经变厚、但仍需要新体型的 Boom 主体 | 改变音高与共振峰，同时混回原始干声 | 获得大型怪异身份，并保留真实爆炸的重量 |
| Sonic Academy Kick 3 | `yt-6oJUotZGz0k:effect:kick-3:1` | 需要极短起音来标记操作反馈的科技 UI | 合成干净、可独立剪切的 Click 与 Impulse | 得到可叠在机械和能量层前端的明确瞬态 |
| Soundtheory Gullfoss | `upy3d1em:effect:soundtheory-gullfoss:15` | 多轮处理后整体过亮、部分频段又被遮住的成品 | 压住突出的亮频，同时找回被遮蔽的细节 | 亮度收敛，低层细节重新出现而不过分变暗 |
| Soundtoys Crystallizer | `o4g1vdhg:effect:soundtoys-crystallizer:6` | 普通 Hum 或 Loop，缺少电子颗粒与延迟变化 | 把片段切成移调颗粒，并沿延迟路径重复 | 持续声变成颗粒跳动、带复古科技感的纹理 |
| Soundtoys Decapitator | `upy3d1em:effect:soundtoys-decapitator:5` | 重量足够、但表面缺少粗粝颗粒的 Boom | 混入少量饱和失真，不覆盖原始瞬态 | 增加 Grit 与 Crunch，同时保留低频重量 |
| Soundtoys FilterFreak | `upy3d1em:effect:soundtoys-filterfreak:3` | 尾部频谱静止、缺少机械开合感的 Boom | 用共振滤波扫过中高频并增强咬合 | 尾巴出现 Squelch、扫频和机械张合表情 |
| Soundtoys PhaseMistress | `upy3d1em:effect:soundtoys-phasemistress:7` | 仍像原始爆炸 One-shot 的静态尾音 | 少量混入脏相位运动，避免全湿覆盖 | 尾部变得起泡、轻微晃动并带生命感 |
| Stepwise Morph | `yt-Xl5u91oQv-k:effect:stepwise-morph:4` | 多重共振后仍缺少二次频谱形态的金属断奏 | 用多点曲线重新分配频谱的峰与谷 | 同一共振素材得到更明显的科幻频谱纹理 |
| Unfiltered Audio Indent 2 | `upy3d1em:effect:unfiltered-audio-indent-2:8` | 峰值过尖、后级无法继续推密度的 Boom | 在输入与输出两端进行软削波 | 峰值被压平并腾出余量，素材可继续重处理 |
| UVI Shade | `upy3d1em:effect:uvi-shade:13` | 需要批量生成不同节奏尾巴的同一条 Boom | 让颤音形状和深度跟随输入包络变化 | 攻击保持集中，尾部展开成不同节奏的运动版本 |
| Valhalla FreqEcho | `yt-kv0yNg1CPAk:effect:valhallafreqecho:6` | 起音明确、但缺少局部气泡尾巴的 One-shot | 用短延迟、轻微频移和反馈塑造尾音 | 尾巴产生气泡式回声，并随轨道频移继续运动 |
| Waves Enigma | `upy3d1em:effect:waves-enigma:6` | 尾音平直、缺少内部凹凸运动的 Boom | 用延迟反馈推动不同频段来回摆动 | 尾部出现类似 Flanger 的流动凹凸与空间错觉 |
| Waves Z-Noise | `upy3d1em:effect:waves-z-noise:1` | 带底噪和细碎尾部、随后还要强调制的 Boom | 在效果链最前面清理噪声，同时保留轻微不稳定 | 后级不会放大脏噪，残留晃动可继续塑造成运动 |

## Baseline

Run these before starting implementation and preserve their behavior unless a task explicitly changes an assertion:

```powershell
node --test tests\*.test.cjs
python -m pytest tests\test_prepare_sfx_video.py -q
node tools\verify-portable-kit.cjs
git status --short
```

Expected baseline at plan approval:

- Node: 56 tests passed, 0 failed.
- Python: 11 tests passed, 0 failed.
- Portable kit: 82 records, 82 unique IDs, 82/82 memory entries, empty failure list.
- Worktree is clean at commit `ada86c2`.

### Task 1: Add The Curated Effect Guide Module

**Files:**
- Create: `src/effect-guides.js`
- Create: `tests/effect-guides.test.cjs`

- [ ] **Step 1: Write the data-contract tests first**

Create `tests/effect-guides.test.cjs`. Require `../src/effect-guides.js` and assert all of the following independently:

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const SfxEffectGuides = require('../src/effect-guides.js');

const expectedNames = [
  'Dawesome Love',
  'FabFilter Pro-MB',
  'FabFilter Pro-Q 3',
  'FabFilter Saturn 2',
  'iZotope RX De-click',
  'iZotope Stutter Edit 2',
  'Kilohearts Phase Plant',
  'Kilohearts Snap Heap',
  'Melda MAutoPitch',
  'MeldaProduction MTremolo',
  'Minimal Audio Wave Shifter',
  'Morph EQ',
  'NI Transient Master',
  'Oeksound Soothe2',
  'Polyverse Manipulator',
  'Sonic Academy Kick 3',
  'Soundtheory Gullfoss',
  'Soundtoys Crystallizer',
  'Soundtoys Decapitator',
  'Soundtoys FilterFreak',
  'Soundtoys PhaseMistress',
  'Stepwise Morph',
  'Unfiltered Audio Indent 2',
  'UVI Shade',
  'Valhalla FreqEcho',
  'Waves Enigma',
  'Waves Z-Noise'
];

test('publishes exactly the approved effect guides', () => {
  const guides = SfxEffectGuides.all();
  assert.equal(guides.length, 27);
  assert.deepEqual(guides.map((guide) => guide.canonicalName), expectedNames);
  assert.equal(new Set(guides.map((guide) => guide.evidenceUseId)).size, 27);
});

test('keeps every public field concrete, concise, and parameter-free', () => {
  const forbiddenFallback = /进一步塑形|强化身份|完成这一处理点|声音角色更清楚|更有层次|更有质感/;
  const parameterInstruction = /\b\d+(?:\.\d+)?\s*(?:hz|khz|db|ms|s|%|bands?|octaves?)\b|参数|阈值|旋钮|预设值/i;
  SfxEffectGuides.all().forEach((guide) => {
    ['canonicalName', 'evidenceUseId', 'input', 'action', 'result'].forEach((key) => {
      assert.equal(typeof guide[key], 'string', `${guide.canonicalName}.${key}`);
      assert.equal(guide[key], guide[key].trim(), `${guide.canonicalName}.${key}`);
      assert.ok(guide[key], `${guide.canonicalName}.${key}`);
    });
    ['input', 'action', 'result'].forEach((key) => {
      const length = Array.from(guide[key]).length;
      assert.ok(length >= 12 && length <= 44, `${guide.canonicalName}.${key}: ${length}`);
      assert.doesNotMatch(guide[key], forbiddenFallback);
      assert.doesNotMatch(guide[key], parameterInstruction);
    });
  });
});

test('looks up guides only by normalized exact canonical name', () => {
  assert.equal(SfxEffectGuides.guideFor('  FABFILTER   PRO-Q 3  ').canonicalName, 'FabFilter Pro-Q 3');
  assert.equal(SfxEffectGuides.guideFor('ＦａｂＦｉｌｔｅｒ　Ｐｒｏ－Ｑ　３').canonicalName, 'FabFilter Pro-Q 3');
  assert.equal(SfxEffectGuides.guideFor('Pro-Q 3'), null);
  assert.equal(SfxEffectGuides.guideFor('Unknown Effect'), null);
});
```

- [ ] **Step 2: Run the focused test and confirm the expected failure**

```powershell
node --test tests\effect-guides.test.cjs
```

Expected: failure with `Cannot find module '../src/effect-guides.js'`.

- [ ] **Step 3: Implement the UMD data module**

Create `src/effect-guides.js` with the same browser/CommonJS wrapper style as `src/knowledge-model.js`:

```js
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SfxEffectGuides = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalize(value) {
    return String(value == null ? '' : value)
      .normalize('NFKC')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  var guides = Object.freeze([
    {
      canonicalName: 'Dawesome Love',
      evidenceUseId: 'bsadb7479:effect:love:2',
      input: '刮擦声等单薄、缺少数量感的自然素材',
      action: '把素材切成细小颗粒，并让颗粒成群扩散',
      result: '单条刮擦变成密集、漂移的外星群体纹理'
    },
    {
      canonicalName: 'FabFilter Pro-MB',
      evidenceUseId: 'upy3d1em:effect:fabfilter-pro-mb:9',
      input: '中低频有盒感、但仍需保留低频延伸的 Boom',
      action: '只在盒感突出时动态压低对应中频',
      result: '低频冲击更干净，主体不会被固定削空'
    },
    {
      canonicalName: 'FabFilter Pro-Q 3',
      evidenceUseId: 'yt-kv0yNg1CPAk:effect:fabfilter-pro-q-3:4',
      input: '中频特征不明显、同时带刺耳峰的 One-shot',
      action: '抬出有用中频，并削减狭窄的刺耳峰',
      result: '气泡感和运动焦点更突出，高频不扎耳'
    },
    {
      canonicalName: 'FabFilter Saturn 2',
      evidenceUseId: 'yt-h1uYic59pf0:effect:fabfilter-saturn-2:4',
      input: '已经清理过、但仍显干硬的长变形纹理',
      action: '用多段失真、滤波和短延迟制造粘稠运动',
      result: '纹理变得脏亮、黏连，并在频段间流动'
    },
    {
      canonicalName: 'iZotope RX De-click',
      evidenceUseId: 'd8ed0db4:effect:izotope-rx-de-click:7',
      input: '带点击与细碎杂音、还要继续重处理的素材',
      action: '先检测并修复短促点击与爆裂杂音',
      result: '底层更干净，后续调制不会把瑕疵一起放大'
    },
    {
      canonicalName: 'iZotope Stutter Edit 2',
      evidenceUseId: 'bsa5b20e8:effect:izotope-stutter-edit-2:1',
      input: '需要快速生成断续、扫动变体的持续素材',
      action: '用可触发预设切断、重复并重排时间片段',
      result: '一条素材变成可表演的 Glitch 与 Sweep 变化'
    },
    {
      canonicalName: 'Kilohearts Phase Plant',
      evidenceUseId: 'yt-6oJUotZGz0k:effect:phase-plant:2',
      input: '需要旋律提示、扫描与遥测细节的科技 UI',
      action: '让多振荡器互调，并随机改变音高与谐波运动',
      result: '得到颤音、扫描和电子提示音等多种细节'
    },
    {
      canonicalName: 'Kilohearts Snap Heap',
      evidenceUseId: 'bsa8465bc:effect:snap-heap:2',
      input: '尾音太平直、空间变化不足的低沉 Drone',
      action: '叠加弹跳与双重延迟，扩展回声路径',
      result: '尾音变宽并产生层层折返的低调科幻运动'
    },
    {
      canonicalName: 'Melda MAutoPitch',
      evidenceUseId: 'yt-aKkZZ-XeSqs:effect:melda-mautopitch:3',
      input: '音高漂移大、角色不够机械的 Vox 素材',
      action: '把音高强制吸附到稳定的半音位置',
      result: '声带变得刻意量化，机器身份更统一'
    },
    {
      canonicalName: 'MeldaProduction MTremolo',
      evidenceUseId: 'yt-ir8d3PUj5JU:effect:meldaproduction-mtremolo:5',
      input: '需要随动作结束继续加速的 Post-roar 尾部',
      action: '让颤音速度跟随动作回落持续上升',
      result: '低频脉冲逐渐收紧，尾巴与动作同步加速'
    },
    {
      canonicalName: 'Minimal Audio Wave Shifter',
      evidenceUseId: 'yt-j4POSc1YeAo:effect:minimal-audio-wave-shifter:2',
      input: '已有气泡节奏、但频谱运动不够明显的音色',
      action: '用频移与反馈扩展原声周围的旁带',
      result: '增加金属与液态摆动，同时保留原有节奏'
    },
    {
      canonicalName: 'Morph EQ',
      evidenceUseId: 'bsadb7479:effect:morph-eq:1',
      input: '共振变化不足、听起来仍像原录音的刮擦声',
      action: '移动多个共振峰，让频谱形状持续变形',
      result: '刮擦声出现流动共振和陌生的外星质感'
    },
    {
      canonicalName: 'NI Transient Master',
      evidenceUseId: 'd8ed0db4:effect:ni-transient-master:6',
      input: '整组起音、持续段和峰值关系不稳定的混合声',
      action: '分别重塑攻击与持续段，并控制整体峰值',
      result: '起音和尾部的比例更统一，主轨动态更可控'
    },
    {
      canonicalName: 'Oeksound Soothe2',
      evidenceUseId: 'upy3d1em:effect:oeksound-soothe2:16',
      input: '主瞬态带刺耳 Crunch、但仍需保留亮度的 Boom',
      action: '只在扎耳共振出现时动态压低对应频段',
      result: '冲击仍然明亮有力，高频 Crunch 不再刺耳'
    },
    {
      canonicalName: 'Polyverse Manipulator',
      evidenceUseId: 'upy3d1em:polyverse-manipulator:1',
      input: '已经变厚、但仍需要新体型的 Boom 主体',
      action: '改变音高与共振峰，同时混回原始干声',
      result: '获得大型怪异身份，并保留真实爆炸的重量'
    },
    {
      canonicalName: 'Sonic Academy Kick 3',
      evidenceUseId: 'yt-6oJUotZGz0k:effect:kick-3:1',
      input: '需要极短起音来标记操作反馈的科技 UI',
      action: '合成干净、可独立剪切的 Click 与 Impulse',
      result: '得到可叠在机械和能量层前端的明确瞬态'
    },
    {
      canonicalName: 'Soundtheory Gullfoss',
      evidenceUseId: 'upy3d1em:effect:soundtheory-gullfoss:15',
      input: '多轮处理后整体过亮、部分频段又被遮住的成品',
      action: '压住突出的亮频，同时找回被遮蔽的细节',
      result: '亮度收敛，低层细节重新出现而不过分变暗'
    },
    {
      canonicalName: 'Soundtoys Crystallizer',
      evidenceUseId: 'o4g1vdhg:effect:soundtoys-crystallizer:6',
      input: '普通 Hum 或 Loop，缺少电子颗粒与延迟变化',
      action: '把片段切成移调颗粒，并沿延迟路径重复',
      result: '持续声变成颗粒跳动、带复古科技感的纹理'
    },
    {
      canonicalName: 'Soundtoys Decapitator',
      evidenceUseId: 'upy3d1em:effect:soundtoys-decapitator:5',
      input: '重量足够、但表面缺少粗粝颗粒的 Boom',
      action: '混入少量饱和失真，不覆盖原始瞬态',
      result: '增加 Grit 与 Crunch，同时保留低频重量'
    },
    {
      canonicalName: 'Soundtoys FilterFreak',
      evidenceUseId: 'upy3d1em:effect:soundtoys-filterfreak:3',
      input: '尾部频谱静止、缺少机械开合感的 Boom',
      action: '用共振滤波扫过中高频并增强咬合',
      result: '尾巴出现 Squelch、扫频和机械张合表情'
    },
    {
      canonicalName: 'Soundtoys PhaseMistress',
      evidenceUseId: 'upy3d1em:effect:soundtoys-phasemistress:7',
      input: '仍像原始爆炸 One-shot 的静态尾音',
      action: '少量混入脏相位运动，避免全湿覆盖',
      result: '尾部变得起泡、轻微晃动并带生命感'
    },
    {
      canonicalName: 'Stepwise Morph',
      evidenceUseId: 'yt-Xl5u91oQv-k:effect:stepwise-morph:4',
      input: '多重共振后仍缺少二次频谱形态的金属断奏',
      action: '用多点曲线重新分配频谱的峰与谷',
      result: '同一共振素材得到更明显的科幻频谱纹理'
    },
    {
      canonicalName: 'Unfiltered Audio Indent 2',
      evidenceUseId: 'upy3d1em:effect:unfiltered-audio-indent-2:8',
      input: '峰值过尖、后级无法继续推密度的 Boom',
      action: '在输入与输出两端进行软削波',
      result: '峰值被压平并腾出余量，素材可继续重处理'
    },
    {
      canonicalName: 'UVI Shade',
      evidenceUseId: 'upy3d1em:effect:uvi-shade:13',
      input: '需要批量生成不同节奏尾巴的同一条 Boom',
      action: '让颤音形状和深度跟随输入包络变化',
      result: '攻击保持集中，尾部展开成不同节奏的运动版本'
    },
    {
      canonicalName: 'Valhalla FreqEcho',
      evidenceUseId: 'yt-kv0yNg1CPAk:effect:valhallafreqecho:6',
      input: '起音明确、但缺少局部气泡尾巴的 One-shot',
      action: '用短延迟、轻微频移和反馈塑造尾音',
      result: '尾巴产生气泡式回声，并随轨道频移继续运动'
    },
    {
      canonicalName: 'Waves Enigma',
      evidenceUseId: 'upy3d1em:effect:waves-enigma:6',
      input: '尾音平直、缺少内部凹凸运动的 Boom',
      action: '用延迟反馈推动不同频段来回摆动',
      result: '尾部出现类似 Flanger 的流动凹凸与空间错觉'
    },
    {
      canonicalName: 'Waves Z-Noise',
      evidenceUseId: 'upy3d1em:effect:waves-z-noise:1',
      input: '带底噪和细碎尾部、随后还要强调制的 Boom',
      action: '在效果链最前面清理噪声，同时保留轻微不稳定',
      result: '后级不会放大脏噪，残留晃动可继续塑造成运动'
    }
  ].map(function (guide) {
    return Object.freeze(guide);
  }));

  var guidesByName = new Map(guides.map(function (guide) {
    return [normalize(guide.canonicalName), guide];
  }));

  function all() {
    return guides;
  }

  function guideFor(name) {
    return guidesByName.get(normalize(name)) || null;
  }

  return Object.freeze({ all: all, guideFor: guideFor });
}));
```

Do not add aliases to this module. Canonicalization remains owned by `EffectIndexData`; this lookup deliberately accepts only whitespace/case/NFKC normalization so near-name collisions cannot silently select a guide.

- [ ] **Step 4: Cross-check the source literals against the approved matrix**

Confirm that all 27 objects use exactly the five keys shown in the module, remain in approved display order, and contain no aliases or generated fallback function.

- [ ] **Step 5: Run focused tests and inspect the diff**

```powershell
node --test tests\effect-guides.test.cjs
git diff -- src\effect-guides.js tests\effect-guides.test.cjs
git diff --check
```

Expected: 3 tests passed, 0 failed; no whitespace errors; all 27 names and evidence IDs visible in the diff.

- [ ] **Step 6: Commit the data contract**

```powershell
git add src\effect-guides.js tests\effect-guides.test.cjs
git commit -m "Add evidence-led effect guide data"
```

### Task 2: Gate Profiles On Guide, Evidence Use, And Video Screenshot

**Files:**
- Modify: `index.html:1138`
- Modify: `index.html:31767-32298`
- Modify: `tests/dual-index-site.test.cjs:1-430`

- [ ] **Step 1: Load the guide module in production and in VM tests**

In `index.html`, add a cache-versioned module tag immediately after the knowledge-model tag and before inline application data:

```html
<script src="src/knowledge-model.js?v=20260811-dry-goods-7"></script>
<script src="src/effect-guides.js?v=20260811-evidence-led-1"></script>
```

At the top of `tests/dual-index-site.test.cjs`, add:

```js
const SfxEffectGuides = require('../src/effect-guides.js');
```

Change the VM helper so strict screenshot-unit fixtures can opt into a small synthetic guide without weakening production integration tests:

```js
const permissiveEffectGuides = {
  guideFor(name, uses) {
    const evidenceUse = uses && uses[0];
    return evidenceUse ? {
      canonicalName: name,
      evidenceUseId: evidenceUse.id,
      input: '明确的输入素材',
      action: '明确的处理动作',
      result: '明确的听感变化'
    } : null;
  }
};

function loadEffectIndexData(effectGuides = permissiveEffectGuides) {
  const start = indexHtml.indexOf('    const EffectIndexData = (() => {');
  const end = indexHtml.indexOf('    })();', start);
  assert.notEqual(start, -1, 'missing EffectIndexData helpers');
  assert.notEqual(end, -1, 'unterminated EffectIndexData helpers');
  const source = indexHtml.slice(start, end + '    })();'.length) + '\nthis.EffectIndexData = EffectIndexData;';
  const context = { SfxKnowledgeModel, SfxEffectGuides: effectGuides };
  vm.runInNewContext(source, context);
  return context.EffectIndexData;
}
```

Pass `ordered` into `guideFor(name, ordered)` inside `EffectIndexData`. The production module ignores the second argument; the test double uses it to bind synthetic fixtures to their first use.

- [ ] **Step 2: Add failing gate tests**

Replace the two copy-generation tests currently asserting `profile.suitable`, `profile.purpose`, and `profile.outcome`. Add focused tests covering:

1. A missing guide returns `null`, even when an exact official image exists.
2. A guide missing `input`, `action`, or `result` returns `null`.
3. A guide whose `evidenceUseId` is absent from the grouped uses returns `null`.
4. An evidence use with only an exact official image returns `null`.
5. A complete guide plus an exact video screenshot returns a profile whose `input`, `action`, `result`, and `evidenceUseId` equal the guide and whose first visual is that evidence-use video image.

Use injected guide doubles so each failure isolates one gate. For the passing fixture, use this shape:

```js
const guides = {
  guideFor() {
    return {
      canonicalName: 'Test Effect',
      evidenceUseId: 'use-1',
      input: '单薄的测试冲击素材',
      action: '重塑起音并收紧持续段',
      result: '起音更集中，尾部更短'
    };
  }
};
```

Update the following existing expectations to reflect the approved gate:

- Rename `official fallbacks require one exact product identity` to assert that official-only profiles are hidden.
- In `one inferred video screenshot cannot belong to two effect identities`, expect both profiles to disappear when neither retains its evidence video.
- In `one video asset cannot belong to two products through different step titles`, expect both profiles to disappear instead of falling back to official images.
- Keep all generated-scaffolding, generic-name, composite-name, version-isolation, and strict-title tests. They should use the permissive guide double and continue testing screenshot identity only.

- [ ] **Step 3: Run the focused test and confirm failures describe the old behavior**

```powershell
node --test tests\dual-index-site.test.cjs
```

Expected before projection changes: failures show profiles still use `suitable/purpose/outcome`, official-only profiles remain visible, and `SfxEffectGuides` is not consulted.

- [ ] **Step 4: Remove generated public copy from `EffectIndexData`**

Delete these production-only copy paths from the IIFE:

- `fallbackRules`
- `technicalDetailPattern`
- `ruleFor`
- `conciseCopy`
- `suitableText`
- `purposeText`
- `outcomeText`

Keep the identity and visual functions: normalization, canonical-name pairs, blocked/generic/composite checks, alias matching, strict video-step matching, official references, grouping, cache behavior, and unique video ownership.

- [ ] **Step 5: Build each profile from one exact curated evidence use**

Inside `buildProfile`, after validating the name and ordering grouped uses:

```js
const guide = SfxEffectGuides.guideFor(name, ordered);
if (
  !guide
  || !text(guide.evidenceUseId)
  || !text(guide.input)
  || !text(guide.action)
  || !text(guide.result)
) return null;

const evidenceUse = ordered.find((use) => use?.id === guide.evidenceUseId);
if (!evidenceUse) return null;

const primaryVisual = explicitVisual(
  evidenceUse,
  name,
  records,
  catalog,
  manifest,
  identityContext
) || matchedStepVisual(
  evidenceUse,
  name,
  records,
  catalog,
  manifest,
  identityContext
);
if (!primaryVisual) return null;
```

Add `primaryVisual` first. Then add deduplicated video visuals from the other grouped uses, followed by at most the remaining exact-product official visual slots. Preserve the three-image gallery cap.

Return direct curated fields, not transformed source prose:

```js
return {
  id: guide.evidenceUseId,
  evidenceUseId: guide.evidenceUseId,
  name,
  uses: ordered,
  useCount: ordered.length,
  sourceCount,
  category,
  input: guide.input,
  action: guide.action,
  result: guide.result,
  visuals
};
```

Do not return `suitable`, `purpose`, `outcome`, or `limitation`.

- [ ] **Step 6: Enforce the evidence screenshot after global ownership resolution**

In `keepUniquelyOwnedVideoVisuals`, keep the current global duplicate-owner calculation. After filtering a profile's visuals, retain the profile only when this remains true:

```js
const hasEvidenceVisual = visuals.some((visual) => (
  visual.kind === 'video' && visual.useId === profile.evidenceUseId
));
if (!hasEvidenceVisual) return null;
return { ...profile, visuals };
```

This check prevents a shared screenshot from being removed and then silently replaced by an official-only gallery.

- [ ] **Step 7: Narrow the exported API and run the identity tests**

Return only the functions still used outside the IIFE:

```js
return { profileForUse, profiles, referenceCandidates };
```

Run:

```powershell
node --test tests\dual-index-site.test.cjs
node --test tests\effect-guides.test.cjs
git diff --check
```

Expected: all focused tests pass, including the existing strict screenshot-matching cases; no official-only profile survives.

- [ ] **Step 8: Commit the evidence gate**

```powershell
git add index.html tests\dual-index-site.test.cjs
git commit -m "Require video evidence for effect profiles"
```

### Task 3: Prove The Real Dataset Resolves To The Approved 27 Profiles

**Files:**
- Modify: `tests/dual-index-site.test.cjs:62-80`
- Modify: `tests/dual-index-site.test.cjs` after the focused profile-gate tests

- [ ] **Step 1: Add reusable inline-data extraction helpers**

Replace the one-off `records()` parser with a generic literal extractor that uses `node:vm` instead of string rewriting:

```js
function inlineLiteral(name, nextName) {
  const prefix = `    const ${name} = `;
  const start = indexHtml.indexOf(prefix);
  const end = indexHtml.indexOf(`    const ${nextName}`, start);
  assert.notEqual(start, -1, `missing ${name}`);
  assert.notEqual(end, -1, `missing ${name} boundary`);
  const source = indexHtml.slice(start + prefix.length, end).trim().replace(/;$/, '');
  return vm.runInNewContext(`(${source})`);
}

function records() {
  return inlineLiteral('records', 'imageManifest');
}

function imageManifest() {
  return inlineLiteral('imageManifest', 'pluginReferenceCatalog');
}

function pluginReferenceCatalog() {
  return inlineLiteral('pluginReferenceCatalog', 'categoryById');
}
```

- [ ] **Step 2: Add a production-data integration test**

Build real effect uses from the embedded records and run the real guide module through the production projection:

```js
test('publishes only the 27 curated profiles with their evidence screenshots', () => {
  const siteRecords = records();
  const uses = SfxKnowledgeModel.buildEffectUses(siteRecords);
  const profiles = plainValue(loadEffectIndexData(SfxEffectGuides).profiles(
    uses,
    siteRecords,
    pluginReferenceCatalog(),
    imageManifest()
  ));
  const guides = SfxEffectGuides.all();

  assert.equal(profiles.length, 27);
  assert.deepEqual(
    new Set(profiles.map((profile) => profile.name)),
    new Set(guides.map((guide) => guide.canonicalName))
  );

  profiles.forEach((profile) => {
    const guide = SfxEffectGuides.guideFor(profile.name);
    assert.ok(guide, profile.name);
    assert.equal(profile.evidenceUseId, guide.evidenceUseId);
    assert.equal(profile.input, guide.input);
    assert.equal(profile.action, guide.action);
    assert.equal(profile.result, guide.result);
    assert.equal(profile.uses.filter((use) => use.id === profile.evidenceUseId).length, 1);
    assert.ok(profile.visuals.some((visual) => (
      visual.kind === 'video' && visual.useId === profile.evidenceUseId
    )), `${profile.name} evidence screenshot`);
  });
});
```

If this test finds fewer than 27 profiles, inspect the failing canonical name, evidence ID, source step title, and image key. Correct a transcription mismatch only when the video record proves the intended identity. Do not relax alias matching or substitute an official image.

- [ ] **Step 3: Add a negative integration assertion for the former 39 official-only profiles**

Assert that every production profile has at least one `kind === 'video'` visual and that no profile's complete gallery consists of `kind === 'official'`. Also assert that profile names are unique and video image assets are uniquely owned globally.

- [ ] **Step 4: Run the production-data tests**

```powershell
node --test tests\effect-guides.test.cjs tests\dual-index-site.test.cjs
```

Expected: exactly 27 real profiles, 27 unique guide IDs, 27 resolvable evidence uses, and 27 surviving evidence-use video screenshots.

- [ ] **Step 5: Commit the production-data contract**

```powershell
git add tests\dual-index-site.test.cjs
git commit -m "Verify curated effect profile coverage"
```

### Task 4: Use The Three Evidence Fields Everywhere In The UI

**Files:**
- Modify: `index.html:32385-32477`
- Modify: `index.html:32780-32910`
- Modify: `tests/dual-index-site.test.cjs:850-1030`

- [ ] **Step 1: Update UI source assertions first**

Change the existing effect-card and detail assertions so they require the new labels:

```js
['输入素材', '处理动作', '听感变化'].forEach((label) => {
  assert.match(effectCardSource, new RegExp(label));
  assert.match(effectDetailSource, new RegExp(label));
});
```

Add assertions that the card, video-detail effect summary, and effect detail read `profile.input`, `profile.action`, and `profile.result`. In those render-function source slices, reject:

- `profile.suitable`
- `profile.purpose`
- `profile.outcome`
- `profile.limitation`
- `一句话结论`
- `适合用在`
- `主要作用`
- `能带来什么`
- `听感结果`

Keep the existing route, back-navigation, gallery, keyboard, and `data-open-video` assertions.

- [ ] **Step 2: Run the UI tests and confirm they fail on the old labels**

```powershell
node --test tests\dual-index-site.test.cjs
```

Expected before markup changes: failures reference the old labels and old profile property names.

- [ ] **Step 3: Update search projection and empty-state copy**

Change `effectProfileSearchable(profile)` to include:

```js
profile.name,
profile.input,
profile.action,
profile.result
```

Keep source-title and case text that already help users find the supporting video, but remove `profile.suitable`, `profile.purpose`, and `profile.outcome`.

Update the effect-mode placeholder to:

```text
搜索效果器、输入素材、处理动作或来源...
```

Use this empty state when the filtered list is empty:

```text
没有找到同时具备明确视频用法和准确截图的效果器档案。
```

- [ ] **Step 4: Update card markup without changing layout dimensions**

Keep the existing image, title, case count, and click target. Replace the three facts with:

```html
<span class="effect-profile-fact"><strong>输入素材</strong><span>...</span></span>
<span class="effect-profile-fact"><strong>处理动作</strong><span>...</span></span>
<span class="effect-profile-fact"><strong>听感变化</strong><span>...</span></span>
```

Populate them from `profile.input`, `profile.action`, and `profile.result`. Do not add parameter chips, explanatory callouts, or extra teaching text.

- [ ] **Step 5: Make video-detail summaries use the same profile fields**

In the effect-use summary renderer, remove the local `purpose` projection and render the same three profile fields with the same labels. Keep the source video link and per-use case navigation. If `EffectIndexData.profileForUse(...)` returns `null`, omit the public effect summary while leaving the surrounding video note intact.

- [ ] **Step 6: Simplify the effect detail header and guide**

Remove the duplicated `一句话结论` kicker and `profile.purpose` summary. Render one unframed three-item guide using:

```html
<div class="effect-guide-item"><h3>输入素材</h3><p>...</p></div>
<div class="effect-guide-item"><h3>处理动作</h3><p>...</p></div>
<div class="effect-guide-item"><h3>听感变化</h3><p>...</p></div>
```

Keep the verified screenshot gallery and all linked video cases. Do not add a limitation section because the approved public model has only the three evidence fields.

- [ ] **Step 7: Count only profiles that passed the publication gate**

In `renderEffectLibrary()`:

1. Build `allProfiles` from all effect uses once so screenshot ownership remains global.
2. Apply the active source filter to create `sourceProfiles`.
3. Apply the text query to create `profiles`.
4. Render the counter as `当前显示 X / Y 个效果器档案`, where `X` is `profiles.length` and `Y` is `sourceProfiles.length`.

Do not display the count of hidden raw effect uses. With source `all` and no query, both values must be 27.

- [ ] **Step 8: Run focused tests and commit the interface update**

```powershell
node --test tests\effect-guides.test.cjs tests\dual-index-site.test.cjs
git diff --check
git add index.html tests\dual-index-site.test.cjs
git commit -m "Show concise evidence-led effect guidance"
```

Expected: all focused tests pass; the public render paths contain only `input/action/result` and the three approved Chinese labels.

### Task 5: Full Regression, Portable-Kit, And Visual Verification

**Files:**
- Verify: `index.html`
- Verify: `src/effect-guides.js`
- Verify: `src/knowledge-model.js`
- Verify: `tests/*.test.cjs`
- Verify: `tests/test_prepare_sfx_video.py`
- Verify: `site-memory.json`

- [ ] **Step 1: Run the complete automated suite**

```powershell
node --test tests\*.test.cjs
python -m pytest tests\test_prepare_sfx_video.py -q
node tools\verify-portable-kit.cjs
git diff --check
```

Expected:

- Every Node test passes, including the new 27-profile production fixture.
- Python remains 11 passed.
- Portable verification remains 82 records, 82 unique IDs, 82/82 memory entries, and no failures.
- No whitespace errors.

- [ ] **Step 2: Regenerate the portable memory only through the repository tool**

```powershell
node tools\export-site-memory.cjs
git status --short
git diff -- site-memory.json
```

The guide module does not change video records, so `site-memory.json` should have no content diff. If it changes, inspect the generator and records before continuing; do not accept unrelated generated churn.

- [ ] **Step 3: Parse all production JavaScript**

Run the existing Node tests that compile extracted inline helpers with `node:vm`, then syntax-check both source modules:

```powershell
node --check src\knowledge-model.js
node --check src\effect-guides.js
node --test tests\dual-index-site.test.cjs
```

Expected: no syntax errors and no missing browser globals in the extracted projection.

- [ ] **Step 4: Start or reuse a local server**

Check `http://127.0.0.1:8891/`. If it is not already serving this worktree, start a hidden local server from the worktree:

```powershell
python -m http.server 8891 --bind 127.0.0.1
```

Use another free port if 8891 belongs to a different process. Keep the server running until browser verification finishes.

- [ ] **Step 5: Verify desktop behavior with Playwright**

At a 1440 x 1000 Chromium viewport:

1. Open the effect index.
2. Confirm the counter reads `当前显示 27 / 27 个效果器档案` with no query.
3. Eager-load every card image and assert every image has `naturalWidth > 0`.
4. Assert 27 cards, 27 unique effect IDs, and no card with more or fewer than three guide facts.
5. Open Dawesome Love, FabFilter Pro-Q 3, Oeksound Soothe2, and Waves Z-Noise.
6. Confirm each detail uses the same three strings as its card, the first screenshot is from the bound evidence video, and all video-case links still navigate.
7. Search `气泡`, `瞬态`, and `噪声`; verify matching reads the new fields and clearing search restores 27 profiles.
8. Capture one effect-index screenshot and one effect-detail screenshot for review; keep them outside the repository unless the project already tracks QA artifacts.

- [ ] **Step 6: Verify mobile layout with Playwright**

At a 390 x 844 Chromium viewport:

1. Confirm the longest guide lines wrap inside the card and detail containers.
2. Confirm labels, body copy, image, case count, and navigation do not overlap.
3. Open and close an effect detail and return to the effect index without losing the active source/query state.
4. Confirm no horizontal page overflow: `document.documentElement.scrollWidth <= window.innerWidth`.
5. Capture one mobile index screenshot for review outside the repository.

- [ ] **Step 7: Review the final diff against the approved specification**

```powershell
rg -n "fallbackRules|ruleFor|suitableText|purposeText|outcomeText|profile\.suitable|profile\.purpose|profile\.outcome|一句话结论|适合用在|主要作用|能带来什么|听感结果" index.html src tests
rg -n "T[O]DO|T[B]D|implement [l]ater|fill [i]n" src\effect-guides.js tests\effect-guides.test.cjs docs\superpowers\plans\2026-08-11-evidence-led-effect-descriptions.md
git status --short
git log -5 --oneline
```

Expected:

- The first search returns no production render or fallback-copy path. Historical fixture prose inside embedded video records may still contain ordinary words such as `purpose`; it must not feed the public three-line profile.
- The unfinished-work marker search returns no matches.
- Only intended source, test, HTML, and plan changes are present.
- The implementation consists of small, reviewable commits from Tasks 1-4.

- [ ] **Step 8: Run verification-before-completion**

Invoke `superpowers:verification-before-completion`, rerun any command it requires, and report concrete counts. Do not claim completion from static inspection or from an earlier test run.

## Acceptance Checklist

- [ ] The effect index shows exactly 27 profiles on the unfiltered production dataset.
- [ ] Every visible profile resolves one unique approved guide and one exact `evidenceUseId`.
- [ ] Every visible profile retains a strict video screenshot owned by that evidence use.
- [ ] The 39 former official-only profiles are hidden, while their underlying video notes remain available.
- [ ] Cards, effect details, and video-detail summaries use identical `输入素材 / 处理动作 / 听感变化` content.
- [ ] No generated category fallback, parameter instruction, or official-marketing copy appears in the public guide fields.
- [ ] Screenshot uniqueness, canonical identity, version isolation, hash routes, case links, and return navigation still pass.
- [ ] Desktop and mobile screenshots show complete readable copy with no overlap, broken images, or horizontal overflow.
- [ ] All Node, Python, portable-kit, syntax, and whitespace checks pass from fresh command output.
