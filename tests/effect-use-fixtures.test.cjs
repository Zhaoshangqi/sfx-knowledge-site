const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SfxKnowledgeModel = require('../src/knowledge-model.js');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const videoLearnings = fs.readFileSync(path.join(__dirname, '..', 'skills', 'sfx-knowledge', 'references', 'video-learnings.md'), 'utf8');

function records() {
  const prefix = '    const records = ';
  const start = indexHtml.indexOf(prefix);
  const end = indexHtml.indexOf('    const imageManifest', start);
  assert.notEqual(start, -1, 'missing records JSON');
  assert.notEqual(end, -1, 'missing records JSON boundary');
  return JSON.parse(indexHtml.slice(start + prefix.length, end).trim().replace(/;$/, ''));
}

function imageManifest() {
  const prefix = '    const imageManifest = ';
  const start = indexHtml.indexOf(prefix);
  const end = indexHtml.indexOf('    const pluginReferenceCatalog', start);
  assert.notEqual(start, -1, 'missing image manifest JSON');
  assert.notEqual(end, -1, 'missing image manifest JSON boundary');
  return JSON.parse(indexHtml.slice(start + prefix.length, end).trim().replace(/;$/, ''));
}

function pluginReferenceCatalog() {
  const prefix = '    const pluginReferenceCatalog = ';
  const start = indexHtml.indexOf(prefix);
  const end = indexHtml.indexOf('    const categoryById', start);
  assert.notEqual(start, -1, 'missing plugin reference catalog JSON');
  assert.notEqual(end, -1, 'missing plugin reference catalog JSON boundary');
  return JSON.parse(indexHtml.slice(start + prefix.length, end).trim().replace(/;$/, ''));
}

function recordById(id) {
  const record = records().find((item) => item.id === id);
  assert.ok(record, `missing record ${id}`);
  return record;
}

function videoLearningBlock(videoId) {
  const source = `- Source: \`https://www.youtube.com/watch?v=${videoId}\``;
  const sourceIndex = videoLearnings.indexOf(source);
  assert.notEqual(sourceIndex, -1, `missing video-learning source ${videoId}`);
  const start = videoLearnings.lastIndexOf('\n## ', sourceIndex);
  const end = videoLearnings.indexOf('\n## ', sourceIndex);
  return videoLearnings.slice(start === -1 ? 0 : start, end === -1 ? videoLearnings.length : end);
}

function assertUniqueIds(uses) {
  assert.equal(new Set(uses.map((use) => use.id)).size, uses.length, 'effect use IDs must be unique');
}

function assertScreenshotAsset(record, effectUse) {
  const step = record.steps[effectUse.stepIndex];
  assert.ok(step, `${effectUse.id} references a missing step`);
  assert.equal(step.imageKey, effectUse.screenshotKey);

  const manifestEntry = imageManifest()[effectUse.screenshotKey];
  assert.ok(manifestEntry, `${effectUse.id} references a missing manifest entry`);
  for (const assetPath of [manifestEntry.preview, manifestEntry.full]) {
    assert.ok(fs.existsSync(path.join(__dirname, '..', assetPath)), `${effectUse.id} asset is missing: ${assetPath}`);
  }
}

test('d8ed0db4 exposes the dual Ableton Vocoder use and replaces its legacy row', () => {
  const record = recordById('d8ed0db4');
  assert.ok(Array.isArray(record.effectUses), 'd8ed0db4 effectUses do not yet exist');
  const expected = {
    id: 'd8ed0db4:izotope-vocoder:1',
    name: 'Ableton Vocoder',
    vendor: 'Ableton',
    category: '音高与频率',
    target: 'Serum 合成音色的双路调制层',
    chainPosition: 'SampHold 之后、OTT 多频段动态之前；两个 Vocoder 实例并行组合',
    purpose: '用双实例并联建立复合谐波层；较少频段通常更粗糙，较多频段通常更平滑，但本条关联截图只确认两路均为 40 Bands，具体 8 / 40 变体需回原视频复核。',
    parameters: [
      { name: 'Bands', value: '40 / 40（关联截图）', direction: '既有视频整理记录为 8 / 40；当前关联截图未支持该差异，需回原视频复核', evidence: '画面确认' },
      { name: 'Level', value: '7.9 dB / 7.9 dB（关联截图）', direction: '既有视频整理记录为 7.9 dB / 14 dB；当前关联截图未支持该差异，需回原视频复核', evidence: '画面确认' },
      { name: 'Carrier source', value: 'Modulator / Modulator', direction: '两路 Carrier 下拉菜单均显示 Modulator', evidence: '画面确认' },
      { name: 'Enhance', value: 'Enabled / Enabled', direction: '两路均启用；这是独立开关，不是 Carrier mode', evidence: '画面确认' },
      { name: 'Range', value: '20 Hz - 18 kHz / 20 Hz - 18 kHz', direction: '两路共用', evidence: '画面确认' },
      { name: 'BW', value: '100% / 100%', direction: '两路共用', evidence: '画面确认' },
      { name: 'Gate', value: '-inf dB / -inf dB', direction: '两路共用', evidence: '画面确认' },
      { name: 'Sens.', value: '50.0% / 50.0%', direction: '两路共用', evidence: '画面确认' },
      { name: 'Fast', value: 'Enabled / Enabled', direction: '两路均启用', evidence: '画面确认' },
      { name: 'Precise', value: 'Enabled / Enabled', direction: '两路均启用', evidence: '画面确认' },
      { name: 'Depth', value: '120% / 105%', direction: '分别调整两路调制深度', evidence: '画面确认' },
      { name: 'Attack', value: '1 ms', direction: '快速跟随', evidence: '画面确认' },
      { name: 'Release', value: '10 ms', direction: '两路共用', evidence: '画面确认' },
      { name: 'Dry/Wet', value: '100% / 100%', direction: '两路共用', evidence: '画面确认' },
      { name: 'Formant', value: '-15.8 / -8.40（界面未标单位）', direction: '分别调整两路音色', evidence: '画面确认' }
    ],
    result: '双路通过不同 Formant 和 Depth 提供互补调制细节；既有笔记记录的 8 / 40 Bands 对比需回原视频复核。',
    interactions: '后级 OTT 再平衡高、中、低频能量；Vocoder 本身先决定颗粒密度和调制身份。',
    limitations: '关联截图只确认两路均为 40 Bands、7.9 dB；既有视频整理中的 8 / 40 与 7.9 dB / 14 dB 未由该帧支持，复核前不得作为画面确认值或通用预设。',
    timestamp: '',
    stepIndex: 3,
    screenshotKey: 'img_d43e4e82e77fb756',
    replacesPluginIndexes: [1],
    evidence: ['画面确认', '视频未展示', '分析推断']
  };
  const explicit = record.effectUses.find((use) => use.id === expected.id);

  assert.deepEqual(explicit, expected);
  assert.ok(explicit.purpose);
  assert.ok(explicit.parameters.length);
  assert.ok(explicit.evidence.length);
  assert.ok(explicit.limitations);
  assertScreenshotAsset(record, explicit);

  const visibleStrings = [];
  function collectVisibleStrings(value) {
    if (typeof value === 'string') {
      visibleStrings.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(collectVisibleStrings);
      return;
    }
    if (value && typeof value === 'object') {
      Object.values(value).forEach(collectVisibleStrings);
    }
  }
  [record.steps, record.coreIdeas, record.plugins, record.tips, record.chainFocus, record.parameterLogic].forEach(collectVisibleStrings);
  const visibleArchive = visibleStrings.join('\n');
  assert.doesNotMatch(visibleArchive, /是游戏音效(?:的)?安全范围|延迟时间5-30ms能创建自然步进感|灵敏度8\.6对游戏音效通常足够|0\.5-2Hz不会明显改变音高/);
  assert.match(visibleArchive, /不能解释为游戏音效的通用安全范围/);
  assert.match(visibleArchive, /其余 legacy plugins 尚未逐条迁移为 effectUses/);
  assert.equal(record.parameterLogic.length, 3);
  const learningBlock = videoLearningBlock(record.videoId);
  assert.doesNotMatch(learningBlock, /左实例设置8频段|Mono深度|Formant参数至-15\.8\/-8\.40dB|8频段\(粗糙感\)与40频段|游戏音效(?:的)?安全范围|延迟时间5-30ms能创建自然步进感/);
  assert.match(learningBlock, /关联截图确认两路均为 40 Bands/);
  assert.match(learningBlock, /不能解释为游戏音效的通用安全范围/);
  const disputedStrings = visibleStrings.filter((value) => /8频段|14dB|8 \/ 40|7\.9 dB \/ 14 dB/.test(value));
  assert.ok(disputedStrings.length, 'expected the visible record text to retain qualified historical notes');
  for (const value of disputedStrings) {
    assert.match(value, /既有整理待复核|需回原视频复核|一般规律/);
  }
  assert.ok(!visibleStrings.some((value) => value.includes('Mono深度')));
  assert.ok(!visibleStrings.some((value) => /Formant[^，。;；]*dB/.test(value)));
  const formantParameter = explicit.parameters.find((parameter) => parameter.name === 'Formant');
  assert.ok(formantParameter);
  assert.doesNotMatch(formantParameter.value, /dB/);
  assert.ok(!explicit.parameters.some((parameter) => ['Gain', 'Carrier mode', 'Bandwidth'].includes(parameter.name)));

  const vocoderStep = record.steps[3];
  assert.match(vocoderStep.detail, /关联截图确认两路均为 40 Bands、Level 7\.9 dB/);
  assert.match(vocoderStep.detail, /Carrier.*Modulator/);
  assert.match(vocoderStep.detail, /Enhance.*Fast.*Precise/);
  assert.match(vocoderStep.detail, /Depth.*Formant.*不同/);
  assert.ok(vocoderStep.params.includes('关联截图 Bands: 40 / 40'));
  assert.ok(vocoderStep.params.includes('关联截图 Level: 7.9 dB / 7.9 dB'));
  assert.ok(vocoderStep.params.includes('既有整理待复核: 8 / 40 Bands, 7.9 dB / 14 dB'));

  const vocoderCoreStep = record.steps[4];
  assert.match(vocoderCoreStep.detail, /Stereo Depth.*120% \/ 105%/);
  assert.ok(vocoderCoreStep.params.includes('Stereo Depth: 120% / 105%'));
  assert.ok(vocoderCoreStep.params.includes('Formant: -15.8 / -8.40（界面未标单位）'));

  const vocoderPlugin = record.plugins.find((plugin) => plugin.name === 'Ableton Vocoder');
  assert.ok(vocoderPlugin);
  assert.ok(vocoderPlugin.settings.includes('关联截图：两路均为 40 Bands、Level 7.9 dB，Carrier source 为 Modulator；Enhance、Fast、Precise 均启用，Depth 与 Formant 不同。'));
  assert.ok(vocoderPlugin.settings.includes('既有整理待复核：8 / 40 Bands 与 7.9 dB / 14 dB；需回原视频复核。'));

  const uses = SfxKnowledgeModel.buildEffectUses([record]);
  const normalized = uses.find((use) => use.id === expected.id);
  assert.ok(normalized);
  assert.equal(normalized.legacy, false);
  assert.deepEqual(normalized.sourcePluginIndexes, [1]);
  assert.equal(uses.filter((use) => use.legacy && use.sourcePluginIndexes.includes(1)).length, 0);
  assert.equal(SfxKnowledgeModel.canonicalEffectName(explicit.name, pluginReferenceCatalog()), 'Ableton Vocoder');
  assert.ok(!pluginReferenceCatalog().some((reference) => /plugin-shots\/(?:preview|full)\/(?:izotope-|ableton-vocoder)/.test([reference.preview, reference.full].join(' '))));
  assertUniqueIds(uses);
});

test('upy3d1em exposes the Polyverse Manipulator use and replaces its legacy row', () => {
  const record = recordById('upy3d1em');
  assert.ok(Array.isArray(record.effectUses), 'upy3d1em effectUses do not yet exist');
  const expected = {
    id: 'upy3d1em:polyverse-manipulator:1',
    name: 'Polyverse Manipulator',
    vendor: 'Polyverse Music',
    category: '音高与频率',
    target: '已完成密度、失真和多段动态塑形的 boom 主体',
    chainPosition: '长串联塑形之后、Shade 变体和批量打印之前',
    purpose: '改变 pitch 与 formant 制造新的大型怪异身份，同时保留部分干声，让素材仍然具有真实 boom 的重量。',
    parameters: [
      { name: 'Pitch', value: '1.44', direction: '向上改变音高身份', evidence: '画面确认' },
      { name: 'Formant', value: '-4.41', direction: '向下改变共振峰', evidence: '画面确认' },
      { name: 'Dry/Wet', value: '63%', direction: '保留干声主体', evidence: '画面确认' }
    ],
    result: '获得非自然的大型怪异感，但不会只剩刺耳的高频共振或明显插件音色。',
    interactions: '与 Shade 的开关、playback rate 和 pitch 变化一起用于批量打印可挑选的身份变体。',
    limitations: '视频明确指出 100% wet 会锁到刺耳高频共振；63% 只适用于当前 boom，不应机械照抄。',
    timestamp: '',
    stepIndex: 13,
    screenshotKey: 'noah-boom-manipulator-pitch-formant',
    replacesPluginIndexes: [11],
    evidence: ['画面确认']
  };
  const explicit = record.effectUses.find((use) => use.id === expected.id);

  assert.deepEqual(explicit, expected);
  assert.ok(explicit.purpose);
  assert.ok(explicit.parameters.length);
  assert.ok(explicit.evidence.length);
  assert.ok(explicit.limitations);
  assertScreenshotAsset(record, explicit);

  const uses = SfxKnowledgeModel.buildEffectUses([record]);
  const normalized = uses.find((use) => use.id === expected.id);
  assert.ok(normalized);
  assert.equal(normalized.legacy, false);
  assert.deepEqual(normalized.sourcePluginIndexes, [11]);
  assert.equal(uses.filter((use) => use.legacy && use.sourcePluginIndexes.includes(11)).length, 0);
  assertUniqueIds(uses);
});

test('yt-f9OrpDtedSI exposes H3000 Factory without replacing the composite plastic tube chain', () => {
  const record = recordById('yt-f9OrpDtedSI');
  assert.ok(Array.isArray(record.effectUses), 'yt-f9OrpDtedSI effectUses do not yet exist');
  const expected = {
    id: 'yt-f9OrpDtedSI:h3000-factory:1',
    name: 'H3000 Factory',
    vendor: 'Eventide',
    category: '音高与频率',
    target: '塑料管 tonal launcher thump 背景层',
    chainPosition: 'Decapitator 与 Saturn 2 之后、Oxford Inflator 与 FilterFreak 之前',
    purpose: '把塑料管层下移一个八度，扩大体型并隐藏日常物件身份，使其成为低沉的发射器音调支撑。',
    parameters: [
      { name: 'Pitch shift', value: '-1 octave', direction: '向下扩大尺度', evidence: '作者口述' }
    ],
    result: '塑料管从轻小物件变成低沉而带音调的 launcher thump，并保持为不抢主瞬态的第三背景层。',
    interactions: '前级失真建立谐波，H3000 下移体型，Inflator 增厚，FilterFreak 再增加运动和隐藏原始身份。',
    limitations: '画面只确认 H3000 是链成员；下移一个八度来自作者口述，其余 H3000 参数未公开。',
    timestamp: '',
    stepIndex: 4,
    screenshotKey: 'f9OrpDtedSI-plastic-tube-tonal-chain',
    replacesPluginIndexes: [],
    evidence: ['画面确认', '作者口述', '视频未展示']
  };
  const explicit = record.effectUses.find((use) => use.id === expected.id);

  assert.deepEqual(explicit, expected);
  assert.ok(explicit.purpose);
  assert.ok(explicit.parameters.length);
  assert.ok(explicit.evidence.length);
  assert.ok(explicit.limitations);
  assertScreenshotAsset(record, explicit);

  const uses = SfxKnowledgeModel.buildEffectUses([record]);
  const normalized = uses.find((use) => use.id === expected.id);
  const compositeLegacy = uses.find((use) => use.legacy && use.name === 'Plastic tube chain: Decapitator / FabFilter Saturn 2 / H3000 Factory / Oxford Inflator / FilterFreak');
  assert.ok(normalized);
  assert.equal(normalized.legacy, false);
  assert.deepEqual(normalized.sourcePluginIndexes, []);
  assert.ok(compositeLegacy);
  assert.deepEqual(compositeLegacy.sourcePluginIndexes, [6]);
  assertUniqueIds(uses);
});
