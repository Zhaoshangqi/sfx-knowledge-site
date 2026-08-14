(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SfxGlossary = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function freezeEntry(definition) {
    return Object.freeze({
      id: definition.id,
      english: definition.english,
      chinese: definition.chinese,
      meaning: definition.meaning,
      use: definition.use,
      aliases: Object.freeze(definition.aliases.slice())
    });
  }

  var ENTRIES = Object.freeze([
    freezeEntry({
      id: 'eq', english: 'EQ / Equalization', chinese: '均衡',
      meaning: '按频段增减声音能量。',
      use: '用于清理遮挡、突出主体，或给其他声音留空间。',
      aliases: ['EQ', 'Equalization', 'equalizer', '均衡', '均衡器', '均衡处理']
    }),
    freezeEntry({
      id: 'filter', english: 'Filter', chinese: '滤波',
      meaning: '保留或衰减一部分频率。',
      use: '用于控制明暗、距离感和连续运动。',
      aliases: ['Filter', 'filtering', 'HPF', 'LPF', 'high-pass', 'low-pass', '滤波', '滤波器', '高通', '低通']
    }),
    freezeEntry({
      id: 'compression', english: 'Compression', chinese: '压缩',
      meaning: '缩小强弱差异并重塑动态轮廓。',
      use: '用于稳定层级、增加密度或控制峰值。',
      aliases: ['Compression', 'compressor', '压缩', '压缩器', '动态压缩']
    }),
    freezeEntry({
      id: 'limiting', english: 'Limiting', chinese: '限制',
      meaning: '阻止峰值继续超过设定上限。',
      use: '用于保护总线余量或约束最终峰值。',
      aliases: ['Limiting', 'limiter', '限制', '限制器', '限幅', '限幅器']
    }),
    freezeEntry({
      id: 'saturation', english: 'Saturation', chinese: '饱和',
      meaning: '加入较柔和的谐波与非线性染色。',
      use: '用于增加厚度、存在感或轻微粘合感。',
      aliases: ['Saturation', 'saturator', '饱和', '饱和器', '磁带饱和']
    }),
    freezeEntry({
      id: 'distortion', english: 'Distortion', chinese: '失真',
      meaning: '明显改变波形和谐波结构。',
      use: '用于增加攻击性、粗糙感或新的音色身份。',
      aliases: ['Distortion', 'distort', '失真', '失真器', '过载']
    }),
    freezeEntry({
      id: 'transient', english: 'Transient', chinese: '瞬态',
      meaning: '声音开头决定轮廓和冲击感的短暂部分。',
      use: '用于判断打击感、清晰度和前后层次。',
      aliases: ['Transient', 'transients', '瞬态', '瞬态起音', '瞬态塑形']
    }),
    freezeEntry({
      id: 'attack', english: 'Attack', chinese: '起音',
      meaning: '声音从开始到主要能量建立的过程。',
      use: '用于区分硬、软、快、慢的声音动作。',
      aliases: ['Attack', '起音', '起始段', '瞬态起音']
    }),
    freezeEntry({
      id: 'body', english: 'Body', chinese: '主体',
      meaning: '承载重量和主要识别信息的中段。',
      use: '用于补足过薄或只有尖锐起音的素材。',
      aliases: ['Body', '主体', '声音主体', '主体层']
    }),
    freezeEntry({
      id: 'texture', english: 'Texture', chinese: '纹理',
      meaning: '赋予表面质感和细节变化的声音层。',
      use: '用于增加材质、复杂度和重复播放的差异。',
      aliases: ['Texture', 'textural', '纹理', '声音纹理', '质感层']
    }),
    freezeEntry({
      id: 'tail', english: 'Tail', chinese: '尾音',
      meaning: '主体动作之后继续衰减或扩散的部分。',
      use: '用于表达空间、规模和动作结束方式。',
      aliases: ['Tail', '尾音', '尾部', '衰减尾音']
    }),
    freezeEntry({
      id: 'layer', english: 'Layer', chinese: '分层',
      meaning: '让多份素材分别承担不同声音角色。',
      use: '用于组合瞬态、主体、纹理和尾音。',
      aliases: ['Layer', 'layering', 'layered', '分层', '叠层', '声音层', '层次']
    }),
    freezeEntry({
      id: 'bus', english: 'Bus', chinese: '总线',
      meaning: '汇集多个轨道并统一处理或路由的通道。',
      use: '用于整体控制一组相关声音。',
      aliases: ['Bus', 'buses', 'busses', '总线', '母线']
    }),
    freezeEntry({
      id: 'send', english: 'Send', chinese: '发送',
      meaning: '把信号副本送往另一个处理通道。',
      use: '用于共享混响、延迟或并行处理。',
      aliases: ['Send', 'sends', '发送', '发送轨', '发送通道']
    }),
    freezeEntry({
      id: 'return', english: 'Return', chinese: '返回',
      meaning: '接收发送信号并承载共享效果的通道。',
      use: '用于独立控制共享效果量。',
      aliases: ['Return', 'returns', '返回', '返回轨', '返回通道', '效果返回']
    }),
    freezeEntry({
      id: 'sidechain', english: 'Sidechain', chinese: '侧链',
      meaning: '用另一条信号控制当前处理器的动作。',
      use: '用于在关键声音出现时自动让出空间。',
      aliases: ['Sidechain', 'side-chain', 'side chain', '侧链', '侧链压缩']
    }),
    freezeEntry({
      id: 'dry-wet', english: 'Dry / Wet', chinese: '干湿比',
      meaning: '原始信号与处理后信号的混合比例。',
      use: '用于控制效果存在感并保留原始轮廓。',
      aliases: ['Dry / Wet', 'Dry/Wet', 'dry wet', 'wet/dry', '干湿比', '干湿', '湿干比']
    }),
    freezeEntry({
      id: 'formant', english: 'Formant', chinese: '共振峰',
      meaning: '决定口腔感、体型感或元音身份的频谱峰。',
      use: '用于改变角色体型，而不只是整体升降调。',
      aliases: ['Formant', 'formants', '共振峰', '共振峰移位']
    }),
    freezeEntry({
      id: 'convolution', english: 'Convolution', chinese: '卷积',
      meaning: '把一个空间或系统的响应特征施加到声音上。',
      use: '用于真实空间、物体共振或特殊滤波。',
      aliases: ['Convolution', 'convolver', '卷积', '卷积混响']
    }),
    freezeEntry({
      id: 'granular', english: 'Granular', chinese: '粒子处理',
      meaning: '把声音切成短小颗粒后重排、拉伸或散布。',
      use: '用于持续纹理、冻结感和非线性运动。',
      aliases: ['Granular', 'granulation', 'granular synthesis', '粒子处理', '颗粒处理', '颗粒合成', '颗粒化', '粒子化']
    }),
    freezeEntry({
      id: 'resonance', english: 'Resonance', chinese: '共振',
      meaning: '某些频率因系统反馈或结构特性被强调。',
      use: '用于寻找刺耳峰值或塑造有调性的滤波运动。',
      aliases: ['Resonance', 'resonant', '共振', '谐振', '共鸣']
    }),
    freezeEntry({
      id: 'automation', english: 'Automation', chinese: '自动化',
      meaning: '让参数随时间按预设轨迹变化。',
      use: '用于明确的运动、演化和动作同步。',
      aliases: ['Automation', 'automate', 'automated', '自动化', '自动化曲线']
    }),
    freezeEntry({
      id: 'pitch', english: 'Pitch', chinese: '音高',
      meaning: '人耳感知到的声音高低位置。',
      use: '用于改变重量、体型、旋律或层间关系。',
      aliases: ['Pitch', 'pitching', 'pitch shift', 'pitch-shift', '音高', '移调', '变调']
    }),
    freezeEntry({
      id: 'stereo-width', english: 'Stereo Width', chinese: '立体声宽度',
      meaning: '左右声道差异形成的横向展开程度。',
      use: '用于控制中心稳定性、规模和包围感。',
      aliases: ['Stereo Width', 'stereo image', 'stereo imaging', 'stereo spread', '立体声宽度', '声像宽度', '立体声像']
    }),
    freezeEntry({
      id: 'headroom', english: 'Headroom', chinese: '动态余量',
      meaning: '当前峰值到系统上限之间的可用空间。',
      use: '用于多层叠加、总线处理和最终输出前检查。',
      aliases: ['Headroom', '动态余量', '余量', '峰值余量']
    }),
    freezeEntry({
      id: 'envelope', english: 'Envelope', chinese: '包络',
      meaning: '声音能量随时间起落的整体轮廓。',
      use: '用于调整起音、保持和衰减关系。',
      aliases: ['Envelope', 'ADSR', '包络', '包络线']
    }),
    freezeEntry({
      id: 'one-shot', english: 'One-shot', chinese: '单次素材',
      meaning: '触发一次后播放完整过程的声音文件。',
      use: '用于撞击、按钮、枪声等离散事件。',
      aliases: ['One-shot', 'one shot', 'oneshot', '单次素材', '单次触发', '一次性素材']
    }),
    freezeEntry({
      id: 'loop', english: 'Loop', chinese: '循环',
      meaning: '首尾可衔接并持续播放的声音片段。',
      use: '用于引擎、环境和魔法持续体等连续状态。',
      aliases: ['Loop', 'looping', 'looped', '循环', '循环素材', '循环段']
    }),
    freezeEntry({
      id: 'stem', english: 'Stem', chinese: '分轨组',
      meaning: '按角色导出的可独立混合声音子组。',
      use: '用于在游戏或后期中动态重组层级。',
      aliases: ['Stem', 'stems', '分轨组', '分轨', '音频分轨']
    }),
    freezeEntry({
      id: 'impulse-response', english: 'Impulse Response', chinese: '脉冲响应',
      meaning: '记录空间或系统对短脉冲反应的声音文件。',
      use: '用于给卷积混响或物体共振提供特征。',
      aliases: ['Impulse Response', 'IR', 'impulse-response', '脉冲响应', '脉冲响应文件']
    }),
    freezeEntry({
      id: 'modulation', english: 'Modulation', chinese: '调制',
      meaning: '用持续变化的信号控制另一个参数。',
      use: '用于颤动、旋转、活性和周期运动。',
      aliases: ['Modulation', 'modulate', 'modulator', '调制', '参数调制']
    }),
    freezeEntry({
      id: 'spectral', english: 'Spectral Processing', chinese: '频谱处理',
      meaning: '在频率随时间的表示中分析或改变声音。',
      use: '用于精细修复、分离、冻结或复杂变形。',
      aliases: ['Spectral Processing', 'spectral', 'spectrum processing', '频谱处理', '频谱编辑', '频域处理']
    })
  ]);

  var ENTRY_BY_ID = Object.create(null);
  ENTRIES.forEach(function (entry) {
    ENTRY_BY_ID[entry.id] = entry;
  });
  Object.freeze(ENTRY_BY_ID);

  function termForId(id) {
    if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(ENTRY_BY_ID, id)) return null;
    return ENTRY_BY_ID[id];
  }

  function isPlainObject(value) {
    if (!value || Object.prototype.toString.call(value) !== '[object Object]') return false;
    var prototype = Object.getPrototypeOf(value);
    return prototype === null || prototype === Object.prototype;
  }

  function collectStrings(value, result, seen) {
    if (typeof value === 'string') {
      result.push(value);
      return;
    }
    if (!Array.isArray(value) && !isPlainObject(value)) return;
    if (seen.indexOf(value) !== -1) return;
    seen.push(value);

    if (Array.isArray(value)) {
      value.forEach(function (item) { collectStrings(item, result, seen); });
      return;
    }
    Object.keys(value).forEach(function (key) {
      collectStrings(value[key], result, seen);
    });
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function containsCjk(value) {
    return /[\u3400-\u9fff\uf900-\ufaff]/.test(value);
  }

  function matchesAlias(text, alias) {
    if (containsCjk(alias)) return text.indexOf(alias) !== -1;
    var expression = new RegExp('(^|[^A-Za-z0-9])' + escapeRegExp(alias) + '(?=$|[^A-Za-z0-9])', 'i');
    return expression.test(text);
  }

  function termsFor(value) {
    var strings = [];
    collectStrings(value, strings, []);
    if (strings.length === 0) return Object.freeze([]);

    var matched = ENTRIES.filter(function (entry) {
      return entry.aliases.some(function (alias) {
        return strings.some(function (text) { return matchesAlias(text, alias); });
      });
    });

    matched.sort(function (left, right) {
      return left.chinese.localeCompare(right.chinese, 'zh-CN') || left.id.localeCompare(right.id);
    });
    return Object.freeze(matched);
  }

  return Object.freeze({
    entries: function () { return ENTRIES; },
    termForId: termForId,
    termsFor: termsFor
  });
}));
