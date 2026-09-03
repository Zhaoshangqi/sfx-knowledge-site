const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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

const expectedGuideSignatures = [
  'Dawesome Love | bsadb7479:effect:love:2 | 刮擦声等单薄、缺少数量感的自然素材 | 把素材切成细小颗粒，并让颗粒成群扩散 | 单条刮擦变成密集、漂移的外星群体纹理',
  'FabFilter Pro-MB | upy3d1em:effect:fabfilter-pro-mb:9 | 中低频有盒感、但仍需保留低频延伸的 Boom | 只在盒感突出时动态压低对应中频 | 低频冲击更干净，主体不会被固定削空',
  'FabFilter Pro-Q 3 | yt-kv0yNg1CPAk:effect:fabfilter-pro-q-3:4 | 中频特征不明显、需要突出气泡感的 One-shot | 在 item 级抬出有用的中频区域 | 片段的气泡感与局部音色焦点更突出',
  'FabFilter Saturn 2 | yt-h1uYic59pf0:effect:fabfilter-saturn-2:4 | 保留大量动态、准备继续染色的长变形录音 | 按频段加入略有差异的涂抹失真 | 获得分频段的滤波、短延迟与随机运动',
  'iZotope RX De-click | d8ed0db4:effect:izotope-rx-de-click:7 | 效果链末端可被检测成点击的瞬态素材 | 启用仅输出点击，把检测结果单独取出 | 得到可独立叠加的尖锐点击新音色',
  'iZotope Stutter Edit 2 | bsa5b20e8:effect:izotope-stutter-edit-2:1 | 等待内置手势处理的持续底鸣 | 逐个触发内置手势并录下处理输出 | 得到可继续筛选的断续处理素材',
  'Kilohearts Phase Plant | yt-6oJUotZGz0k:effect:phase-plant:2 | 需要旋律提示、扫描与遥测细节的科技 UI | 让多振荡器互调，并随机改变音高与谐波运动 | 得到颤音、扫描和电子提示音等多种细节',
  'Kilohearts Snap Heap | bsa8465bc:effect:snap-heap:2 | 已经带乒乓运动的第一级延迟输出 | 开启弹跳并叠加第二级双重延迟 | 第二级回声形成弹跳运动与双延迟结构',
  'Melda MAutoPitch | yt-aKkZZ-XeSqs:effect:melda-mautopitch:3 | 音高漂移大、角色不够机械的 Vox 素材 | 把音高强制吸附到稳定的半音位置 | 声带变得刻意量化，机器身份更统一',
  'MeldaProduction MTremolo | yt-ir8d3PUj5JU:effect:meldaproduction-mtremolo:5 | 需要随动作结束继续加速的 Post-roar 尾部 | 让颤音速度跟随动作回落持续上升 | 低频脉冲逐渐收紧，尾巴与动作同步加速',
  'Minimal Audio Wave Shifter | yt-j4POSc1YeAo:effect:minimal-audio-wave-shifter:2 | 已有气泡节奏、但频谱运动不够明显的音色 | 用频移与反馈扩展原声周围的旁带 | 增加金属与液态摆动，同时保留原有节奏',
  'Morph EQ | bsadb7479:effect:morph-eq:1 | 共振变化不足、听起来仍像原录音的刮擦声 | 移动多个共振峰，让频谱形状持续变形 | 刮擦声出现流动共振和陌生的外星质感',
  'NI Transient Master | d8ed0db4:effect:ni-transient-master:6 | 整组起音、持续段和峰值关系不稳定的混合声 | 分别重塑攻击与持续段，并控制整体峰值 | 起音和尾部的比例更统一，主轨动态更可控',
  'Oeksound Soothe2 | upy3d1em:effect:oeksound-soothe2:16 | 主瞬态带刺耳 Crunch、但仍需保留亮度的 Boom | 只在扎耳共振出现时动态压低对应频段 | 冲击仍然明亮有力，高频 Crunch 不再刺耳',
  'Polyverse Manipulator | upy3d1em:polyverse-manipulator:1 | 已经变厚、但仍需要新体型的 Boom 主体 | 改变音高与共振峰，同时保留原始干声 | 获得大型怪异身份，并保留真实爆炸的重量',
  'Sonic Academy Kick 3 | yt-6oJUotZGz0k:effect:kick-3:1 | 需要极短起音来标记操作反馈的科技 UI | 合成干净、可独立剪切的 Click 与 Impulse | 得到可叠在机械和能量层前端的明确瞬态',
  'Soundtheory Gullfoss | upy3d1em:effect:soundtheory-gullfoss:15 | 多轮处理后整体过亮、部分频段又被遮住的成品 | 压住突出的亮频，同时找回被遮蔽的细节 | 亮度收敛，低层细节重新出现而不过分变暗',
  'Soundtoys Crystallizer | o4g1vdhg:effect:soundtoys-crystallizer:6 | 普通 Hum 或 Loop，缺少电子颗粒与延迟变化 | 把片段切成移调颗粒，并沿延迟路径重复 | 持续声变成颗粒跳动、带复古科技感的纹理',
  'Soundtoys Decapitator | upy3d1em:effect:soundtoys-decapitator:5 | 重量足够、但表面缺少粗粝颗粒的 Boom | 混入少量饱和失真，不覆盖原始瞬态 | 增加 Grit 与 Crunch，同时保留低频重量',
  'Soundtoys FilterFreak | upy3d1em:effect:soundtoys-filterfreak:3 | 尾部频谱静止、缺少机械开合感的 Boom | 用共振滤波扫过中高频并增强咬合 | 尾巴出现 Squelch、扫频和机械张合表情',
  'Soundtoys PhaseMistress | upy3d1em:effect:soundtoys-phasemistress:7 | 仍像原始爆炸 One-shot 的静态尾音 | 把脏相位运动作为轻量尾部纹理 | 尾部变得起泡、轻微晃动并带生命感',
  'Stepwise Morph | yt-Xl5u91oQv-k:effect:stepwise-morph:4 | 多重共振后仍缺少二次频谱形态的金属断奏 | 用多点曲线重新分配频谱的峰与谷 | 同一共振素材得到更明显的科幻频谱纹理',
  'Unfiltered Audio Indent 2 | upy3d1em:effect:unfiltered-audio-indent-2:8 | 峰值过尖、后级无法继续推密度的 Boom | 在输入与输出两端进行软削波 | 峰值被压平并腾出余量，素材可继续重处理',
  'UVI Shade | upy3d1em:effect:uvi-shade:13 | 需要批量生成不同节奏尾巴的同一条 Boom | 让颤音形状和深度跟随输入包络变化 | 攻击保持集中，尾部展开成不同节奏的运动版本',
  'Valhalla FreqEcho | yt-kv0yNg1CPAk:effect:valhallafreqecho:6 | 起音明确、但缺少局部气泡尾巴的 One-shot | 用短延迟、轻微频移和反馈塑造尾音 | 尾巴产生气泡式回声，并随轨道频移继续运动',
  'Waves Enigma | upy3d1em:effect:waves-enigma:6 | 尾音平直、缺少内部凹凸运动的 Boom | 用延迟反馈推动不同频段来回摆动 | 尾部出现类似 Flanger 的流动凹凸与空间错觉',
  'Waves Z-Noise | upy3d1em:effect:waves-z-noise:1 | 带底噪和细碎尾部、随后还要强调制的 Boom | 在效果链最前面清理噪声，同时保留轻微不稳定 | 后级不会放大脏噪，残留晃动可继续塑造成运动'
];

const expectedProblemAndLimitations = [
  '视频未单独说明处理前问题 | 只验证纸板刮擦层的群体颗粒处理',
  '中低频盒感遮住冲击，也会压住内部细节 | 只适用于仍需保留低频延伸的盒感 Boom',
  '作者想让中频更明显，以强化气泡感 | 只验证当前 One-shot 的中频聚焦',
  '作者希望增强这条材质主体的动态变化 | 只验证当前长变形主体的多频段染色',
  '点击成分混在主体里，无法直接作为细节层 | 这是反向提取点击，不是常规去点击修复',
  '视频未单独说明处理前问题 | 只验证内置手势的录制输出，不代表固定编排',
  '视频未单独说明处理前问题 | 只说明科技 UI 细节层，不承担主体冲击与尾音',
  '视频未单独说明处理前问题 | 只验证当前低沉 Drone 的第二级回声扩展',
  '两层声带音高漂移，机器身份难保持一致 | 只验证当前机器 Vox 的刻意量化处理',
  '前一版结尾缺少与动作同步的加速和高频变化 | 只说明 Post-roar 尾部，不替代咆哮主体',
  '视频未单独说明处理前问题 | 只说明当前气泡音色的旁带扩展，不替代原有节奏',
  '视频未单独说明处理前问题 | 只验证纸板刮擦的移动共振处理',
  '声码器削弱细小点击，也破坏持续动态 | 只说明整组混合声的瞬态平衡，不替代分层编辑',
  '主瞬态过脆，并带有刺耳共振 | 只说明主瞬态的动态去刺，不等于整体削暗',
  '处理过重会锁住刺耳的高频共振 | 只验证当前 Boom 的混合处理，必须保留主体重量',
  '视频未单独说明处理前问题 | 只说明科技 UI 的前端瞬态，不承担后续能量与空间',
  '多轮处理后成品过亮，低层细节又被遮住 | 只说明过亮成品的频谱重平衡，不用于继续增亮',
  '视频未单独说明处理前问题 | 只说明当前 Hum 或 Loop 的颗粒尾音，不替代主体层',
  '视频未单独说明处理前问题 | 只验证把失真作为表面层，不能覆盖原始瞬态与重量',
  '视频未单独说明处理前问题 | 只说明 Boom 尾部的滤波表情，不作为低频主体',
  '相位运动过重会显得滑稽而明显 | 只验证相位作为尾音纹理，不承担低频主体',
  '视频未单独说明处理前问题 | 只说明四级共振后的二次频谱塑形',
  '尖峰占用动态余量，后级难继续推密度 | 只说明为当前后级链路腾出余量，不等于最终响度处理',
  '视频未单独说明处理前问题 | 只说明同一 Boom 的尾部变体，不替代攻击层',
  '短音起点明确，但尾部不足以承接轨道运动 | 只验证当前片段的局部尾音处理',
  '视频未单独说明处理前问题 | 只说明 Boom 尾部的延迟式运动，不承担低频重量',
  '视频未单独说明处理前问题 | 只说明强处理前的前置清理，需保留可用运动质感'
];

const guideKeys = ['canonicalName', 'evidenceUseId', 'input', 'problem', 'action', 'result', 'limitations'];
const signatureKeys = ['canonicalName', 'evidenceUseId', 'input', 'action', 'result'];
const proseKeys = ['input', 'problem', 'action', 'result', 'limitations'];

test('publishes exactly the approved effect guides', () => {
  const guides = SfxEffectGuides.all();

  assert.equal(guides.length, 27);
  assert.deepEqual(guides.map((guide) => guide.canonicalName), expectedNames);
  assert.equal(new Set(guides.map((guide) => guide.evidenceUseId)).size, 27);
});

test('binds every approved guide to its exact evidence and prose', () => {
  const signatures = SfxEffectGuides.all().map((guide) => (
    signatureKeys.map((key) => guide[key]).join(' | ')
  ));

  assert.deepEqual(signatures, expectedGuideSignatures);
  assert.deepEqual(
    SfxEffectGuides.all().map((guide) => `${guide.problem} | ${guide.limitations}`),
    expectedProblemAndLimitations
  );
});

test('uses exactly seven concrete fields with concise guide prose', () => {
  SfxEffectGuides.all().forEach((guide) => {
    assert.deepEqual(Object.keys(guide), guideKeys, guide.canonicalName);

    guideKeys.forEach((key) => {
      assert.equal(typeof guide[key], 'string', `${guide.canonicalName}.${key}`);
      assert.equal(guide[key], guide[key].trim(), `${guide.canonicalName}.${key}`);
      assert.ok(guide[key], `${guide.canonicalName}.${key}`);
    });

    proseKeys.forEach((key) => {
      const length = Array.from(guide[key]).length;
      assert.ok(length >= 12 && length <= 44, `${guide.canonicalName}.${key}: ${length}`);
    });
  });
});

test('rejects fallback wording and parameter instructions in guide prose', () => {
  const forbiddenFallback = /进一步塑形|强化身份|完成这一处理点|声音角色更清楚|更有层次|更有质感/;
  const parameterInstruction = /\b\d+(?:\.\d+)?\s*(?:hz|khz|db|ms|s|%|bands?|octaves?)\b|参数|阈值|旋钮|预设值|全湿|设为(?:一半|最大|最小)|(?:反馈|湿度|干湿比).{0,4}(?:调高|调低|开到|设为)|调(?:到|至)[^，。；]+/i;

  ['设为一半', '反馈开到最大', '湿度调高', '全湿处理'].forEach((example) => {
    assert.match(example, parameterInstruction, example);
  });

  SfxEffectGuides.all().forEach((guide) => {
    proseKeys.forEach((key) => {
      assert.doesNotMatch(guide[key], forbiddenFallback, `${guide.canonicalName}.${key}`);
      assert.doesNotMatch(guide[key], parameterInstruction, `${guide.canonicalName}.${key}`);
    });
  });
});

test('looks up a canonical name after case and whitespace normalization', () => {
  const expected = SfxEffectGuides.all()[2];

  assert.strictEqual(SfxEffectGuides.guideFor('  FABFILTER   PRO-Q 3  '), expected);
});

test('looks up a canonical name after NFKC normalization', () => {
  const expected = SfxEffectGuides.all()[2];

  assert.strictEqual(SfxEffectGuides.guideFor('ＦａｂＦｉｌｔｅｒ　Ｐｒｏ－Ｑ　３'), expected);
});

test('rejects near and unknown effect names', () => {
  assert.equal(SfxEffectGuides.guideFor('Pro-Q 3'), null);
  assert.equal(SfxEffectGuides.guideFor('Unknown Effect'), null);
});

test('freezes the API, shared guide array, and every guide', () => {
  const guides = SfxEffectGuides.all();

  assert.ok(Object.isFrozen(SfxEffectGuides));
  assert.ok(Object.isFrozen(guides));
  assert.strictEqual(SfxEffectGuides.all(), guides);
  guides.forEach((guide) => assert.ok(Object.isFrozen(guide), guide.canonicalName));
});

test('attaches the API to the browser global', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'effect-guides.js'), 'utf8');
  const context = {};

  vm.runInNewContext(source, context);

  assert.ok(context.SfxEffectGuides);
  assert.deepEqual(Object.keys(context.SfxEffectGuides), ['all', 'guideFor']);
  assert.equal(context.SfxEffectGuides.all().length, 27);
  assert.equal(
    context.SfxEffectGuides.guideFor('  FABFILTER   PRO-Q 3  ').canonicalName,
    'FabFilter Pro-Q 3'
  );
  assert.ok(Object.isFrozen(context.SfxEffectGuides));
});
