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
