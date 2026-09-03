(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SfxEffectGuides = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeName(value) {
    return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  var guides = Object.freeze([
    {
      canonicalName: 'Dawesome Love',
      evidenceUseId: 'bsadb7479:effect:love:2',
      input: '刮擦声等单薄、缺少数量感的自然素材',
      problem: '视频未单独说明处理前问题',
      action: '把素材切成细小颗粒，并让颗粒成群扩散',
      result: '单条刮擦变成密集、漂移的外星群体纹理',
      limitations: '只验证纸板刮擦层的群体颗粒处理'
    },
    {
      canonicalName: 'FabFilter Pro-MB',
      evidenceUseId: 'upy3d1em:effect:fabfilter-pro-mb:9',
      input: '中低频有盒感、但仍需保留低频延伸的 Boom',
      problem: '中低频盒感遮住冲击，也会压住内部细节',
      action: '只在盒感突出时动态压低对应中频',
      result: '低频冲击更干净，主体不会被固定削空',
      limitations: '只适用于仍需保留低频延伸的盒感 Boom'
    },
    {
      canonicalName: 'FabFilter Pro-Q 3',
      evidenceUseId: 'yt-kv0yNg1CPAk:effect:fabfilter-pro-q-3:4',
      input: '中频特征不明显、需要突出气泡感的 One-shot',
      problem: '作者想让中频更明显，以强化气泡感',
      action: '在 item 级抬出有用的中频区域',
      result: '片段的气泡感与局部音色焦点更突出',
      limitations: '只验证当前 One-shot 的中频聚焦'
    },
    {
      canonicalName: 'FabFilter Saturn 2',
      evidenceUseId: 'yt-h1uYic59pf0:effect:fabfilter-saturn-2:4',
      input: '保留大量动态、准备继续染色的长变形录音',
      problem: '作者希望增强这条材质主体的动态变化',
      action: '按频段加入略有差异的涂抹失真',
      result: '获得分频段的滤波、短延迟与随机运动',
      limitations: '只验证当前长变形主体的多频段染色'
    },
    {
      canonicalName: 'iZotope RX De-click',
      evidenceUseId: 'd8ed0db4:effect:izotope-rx-de-click:7',
      input: '效果链末端可被检测成点击的瞬态素材',
      problem: '点击成分混在主体里，无法直接作为细节层',
      action: '启用仅输出点击，把检测结果单独取出',
      result: '得到可独立叠加的尖锐点击新音色',
      limitations: '这是反向提取点击，不是常规去点击修复'
    },
    {
      canonicalName: 'iZotope Stutter Edit 2',
      evidenceUseId: 'bsa5b20e8:effect:izotope-stutter-edit-2:1',
      input: '等待内置手势处理的持续底鸣',
      problem: '视频未单独说明处理前问题',
      action: '逐个触发内置手势并录下处理输出',
      result: '得到可继续筛选的断续处理素材',
      limitations: '只验证内置手势的录制输出，不代表固定编排'
    },
    {
      canonicalName: 'Kilohearts Phase Plant',
      evidenceUseId: 'yt-6oJUotZGz0k:effect:phase-plant:2',
      input: '需要旋律提示、扫描与遥测细节的科技 UI',
      problem: '视频未单独说明处理前问题',
      action: '让多振荡器互调，并随机改变音高与谐波运动',
      result: '得到颤音、扫描和电子提示音等多种细节',
      limitations: '只说明科技 UI 细节层，不承担主体冲击与尾音'
    },
    {
      canonicalName: 'Kilohearts Snap Heap',
      evidenceUseId: 'bsa8465bc:effect:snap-heap:2',
      input: '已经带乒乓运动的第一级延迟输出',
      problem: '视频未单独说明处理前问题',
      action: '开启弹跳并叠加第二级双重延迟',
      result: '第二级回声形成弹跳运动与双延迟结构',
      limitations: '只验证当前低沉 Drone 的第二级回声扩展'
    },
    {
      canonicalName: 'Melda MAutoPitch',
      evidenceUseId: 'yt-aKkZZ-XeSqs:effect:melda-mautopitch:3',
      input: '音高漂移大、角色不够机械的 Vox 素材',
      problem: '两层声带音高漂移，机器身份难保持一致',
      action: '把音高强制吸附到稳定的半音位置',
      result: '声带变得刻意量化，机器身份更统一',
      limitations: '只验证当前机器 Vox 的刻意量化处理'
    },
    {
      canonicalName: 'MeldaProduction MTremolo',
      evidenceUseId: 'yt-ir8d3PUj5JU:effect:meldaproduction-mtremolo:5',
      input: '需要随动作结束继续加速的 Post-roar 尾部',
      problem: '前一版结尾缺少与动作同步的加速和高频变化',
      action: '让颤音速度跟随动作回落持续上升',
      result: '低频脉冲逐渐收紧，尾巴与动作同步加速',
      limitations: '只说明 Post-roar 尾部，不替代咆哮主体'
    },
    {
      canonicalName: 'Minimal Audio Wave Shifter',
      evidenceUseId: 'yt-j4POSc1YeAo:effect:minimal-audio-wave-shifter:2',
      input: '已有气泡节奏、但频谱运动不够明显的音色',
      problem: '视频未单独说明处理前问题',
      action: '用频移与反馈扩展原声周围的旁带',
      result: '增加金属与液态摆动，同时保留原有节奏',
      limitations: '只说明当前气泡音色的旁带扩展，不替代原有节奏'
    },
    {
      canonicalName: 'Morph EQ',
      evidenceUseId: 'bsadb7479:effect:morph-eq:1',
      input: '共振变化不足、听起来仍像原录音的刮擦声',
      problem: '视频未单独说明处理前问题',
      action: '移动多个共振峰，让频谱形状持续变形',
      result: '刮擦声出现流动共振和陌生的外星质感',
      limitations: '只验证纸板刮擦的移动共振处理'
    },
    {
      canonicalName: 'NI Transient Master',
      evidenceUseId: 'd8ed0db4:effect:ni-transient-master:6',
      input: '整组起音、持续段和峰值关系不稳定的混合声',
      problem: '声码器削弱细小点击，也破坏持续动态',
      action: '分别重塑攻击与持续段，并控制整体峰值',
      result: '起音和尾部的比例更统一，主轨动态更可控',
      limitations: '只说明整组混合声的瞬态平衡，不替代分层编辑'
    },
    {
      canonicalName: 'Oeksound Soothe2',
      evidenceUseId: 'upy3d1em:effect:oeksound-soothe2:16',
      input: '主瞬态带刺耳 Crunch、但仍需保留亮度的 Boom',
      problem: '主瞬态过脆，并带有刺耳共振',
      action: '只在扎耳共振出现时动态压低对应频段',
      result: '冲击仍然明亮有力，高频 Crunch 不再刺耳',
      limitations: '只说明主瞬态的动态去刺，不等于整体削暗'
    },
    {
      canonicalName: 'Polyverse Manipulator',
      evidenceUseId: 'upy3d1em:polyverse-manipulator:1',
      input: '已经变厚、但仍需要新体型的 Boom 主体',
      problem: '处理过重会锁住刺耳的高频共振',
      action: '改变音高与共振峰，同时保留原始干声',
      result: '获得大型怪异身份，并保留真实爆炸的重量',
      limitations: '只验证当前 Boom 的混合处理，必须保留主体重量'
    },
    {
      canonicalName: 'Sonic Academy Kick 3',
      evidenceUseId: 'yt-6oJUotZGz0k:effect:kick-3:1',
      input: '需要极短起音来标记操作反馈的科技 UI',
      problem: '视频未单独说明处理前问题',
      action: '合成干净、可独立剪切的 Click 与 Impulse',
      result: '得到可叠在机械和能量层前端的明确瞬态',
      limitations: '只说明科技 UI 的前端瞬态，不承担后续能量与空间'
    },
    {
      canonicalName: 'Soundtheory Gullfoss',
      evidenceUseId: 'upy3d1em:effect:soundtheory-gullfoss:15',
      input: '多轮处理后整体过亮、部分频段又被遮住的成品',
      problem: '多轮处理后成品过亮，低层细节又被遮住',
      action: '压住突出的亮频，同时找回被遮蔽的细节',
      result: '亮度收敛，低层细节重新出现而不过分变暗',
      limitations: '只说明过亮成品的频谱重平衡，不用于继续增亮'
    },
    {
      canonicalName: 'Soundtoys Crystallizer',
      evidenceUseId: 'o4g1vdhg:effect:soundtoys-crystallizer:6',
      input: '普通 Hum 或 Loop，缺少电子颗粒与延迟变化',
      problem: '视频未单独说明处理前问题',
      action: '把片段切成移调颗粒，并沿延迟路径重复',
      result: '持续声变成颗粒跳动、带复古科技感的纹理',
      limitations: '只说明当前 Hum 或 Loop 的颗粒尾音，不替代主体层'
    },
    {
      canonicalName: 'Soundtoys Decapitator',
      evidenceUseId: 'upy3d1em:effect:soundtoys-decapitator:5',
      input: '重量足够、但表面缺少粗粝颗粒的 Boom',
      problem: '视频未单独说明处理前问题',
      action: '混入少量饱和失真，不覆盖原始瞬态',
      result: '增加 Grit 与 Crunch，同时保留低频重量',
      limitations: '只验证把失真作为表面层，不能覆盖原始瞬态与重量'
    },
    {
      canonicalName: 'Soundtoys FilterFreak',
      evidenceUseId: 'upy3d1em:effect:soundtoys-filterfreak:3',
      input: '尾部频谱静止、缺少机械开合感的 Boom',
      problem: '视频未单独说明处理前问题',
      action: '用共振滤波扫过中高频并增强咬合',
      result: '尾巴出现 Squelch、扫频和机械张合表情',
      limitations: '只说明 Boom 尾部的滤波表情，不作为低频主体'
    },
    {
      canonicalName: 'Soundtoys PhaseMistress',
      evidenceUseId: 'upy3d1em:effect:soundtoys-phasemistress:7',
      input: '仍像原始爆炸 One-shot 的静态尾音',
      problem: '相位运动过重会显得滑稽而明显',
      action: '把脏相位运动作为轻量尾部纹理',
      result: '尾部变得起泡、轻微晃动并带生命感',
      limitations: '只验证相位作为尾音纹理，不承担低频主体'
    },
    {
      canonicalName: 'Stepwise Morph',
      evidenceUseId: 'yt-Xl5u91oQv-k:effect:stepwise-morph:4',
      input: '多重共振后仍缺少二次频谱形态的金属断奏',
      problem: '视频未单独说明处理前问题',
      action: '用多点曲线重新分配频谱的峰与谷',
      result: '同一共振素材得到更明显的科幻频谱纹理',
      limitations: '只说明四级共振后的二次频谱塑形'
    },
    {
      canonicalName: 'Unfiltered Audio Indent 2',
      evidenceUseId: 'upy3d1em:effect:unfiltered-audio-indent-2:8',
      input: '峰值过尖、后级无法继续推密度的 Boom',
      problem: '尖峰占用动态余量，后级难继续推密度',
      action: '在输入与输出两端进行软削波',
      result: '峰值被压平并腾出余量，素材可继续重处理',
      limitations: '只说明为当前后级链路腾出余量，不等于最终响度处理'
    },
    {
      canonicalName: 'UVI Shade',
      evidenceUseId: 'upy3d1em:effect:uvi-shade:13',
      input: '需要批量生成不同节奏尾巴的同一条 Boom',
      problem: '视频未单独说明处理前问题',
      action: '让颤音形状和深度跟随输入包络变化',
      result: '攻击保持集中，尾部展开成不同节奏的运动版本',
      limitations: '只说明同一 Boom 的尾部变体，不替代攻击层'
    },
    {
      canonicalName: 'Valhalla FreqEcho',
      evidenceUseId: 'yt-kv0yNg1CPAk:effect:valhallafreqecho:6',
      input: '起音明确、但缺少局部气泡尾巴的 One-shot',
      problem: '短音起点明确，但尾部不足以承接轨道运动',
      action: '用短延迟、轻微频移和反馈塑造尾音',
      result: '尾巴产生气泡式回声，并随轨道频移继续运动',
      limitations: '只验证当前片段的局部尾音处理'
    },
    {
      canonicalName: 'Waves Enigma',
      evidenceUseId: 'upy3d1em:effect:waves-enigma:6',
      input: '尾音平直、缺少内部凹凸运动的 Boom',
      problem: '视频未单独说明处理前问题',
      action: '用延迟反馈推动不同频段来回摆动',
      result: '尾部出现类似 Flanger 的流动凹凸与空间错觉',
      limitations: '只说明 Boom 尾部的延迟式运动，不承担低频重量'
    },
    {
      canonicalName: 'Waves Z-Noise',
      evidenceUseId: 'upy3d1em:effect:waves-z-noise:1',
      input: '带底噪和细碎尾部、随后还要强调制的 Boom',
      problem: '视频未单独说明处理前问题',
      action: '在效果链最前面清理噪声，同时保留轻微不稳定',
      result: '后级不会放大脏噪，残留晃动可继续塑造成运动',
      limitations: '只说明强处理前的前置清理，需保留可用运动质感'
    }
  ].map(function (guide) {
    return Object.freeze(guide);
  }));

  var guidesByName = Object.create(null);
  guides.forEach(function (guide) {
    guidesByName[normalizeName(guide.canonicalName)] = guide;
  });
  Object.freeze(guidesByName);

  function all() {
    return guides;
  }

  function guideFor(name) {
    return guidesByName[normalizeName(name)] || null;
  }

  return Object.freeze({
    all: all,
    guideFor: guideFor
  });
}));
