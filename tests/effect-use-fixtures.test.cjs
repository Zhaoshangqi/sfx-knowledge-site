const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SfxKnowledgeModel = require('../src/knowledge-model.js');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

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

function recordById(id) {
  const record = records().find((item) => item.id === id);
  assert.ok(record, `missing record ${id}`);
  return record;
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

test('d8ed0db4 exposes the dual iZotope Vocoder use and replaces its legacy row', () => {
  const record = recordById('d8ed0db4');
  assert.ok(Array.isArray(record.effectUses), 'd8ed0db4 effectUses do not yet exist');
  const expected = {
    id: 'd8ed0db4:izotope-vocoder:1',
    name: 'iZotope Vocoder',
    vendor: 'iZotope',
    category: '音高与频率',
    target: 'Serum 合成音色的双路调制层',
    chainPosition: 'SampHold 之后、OTT 多频段动态之前；两个 Vocoder 实例并行组合',
    purpose: '用较少频段制造粗糙颗粒，用较多频段保留平滑连续度，再把两种质感组合成复杂谐波层。',
    parameters: [
      { name: 'Bands', value: '8 / 40', direction: '8 段更粗糙，40 段更平滑', evidence: '画面确认' },
      { name: 'Gain', value: '7.9 dB / 14 dB', direction: '分别平衡两路调制输出', evidence: '画面确认' },
      { name: 'Carrier mode', value: 'Enhance', direction: '两路均启用以增加谐波内容', evidence: '画面确认' },
      { name: 'Bandwidth', value: '18 kHz', direction: '两路共用', evidence: '画面确认' },
      { name: 'Attack', value: '1 ms', direction: '快速跟随', evidence: '画面确认' },
      { name: 'Formant', value: '-15.8 / -8.40 dB', direction: '分别调整两路音色', evidence: '画面确认' }
    ],
    result: '两路分别提供粗糙与平滑的调制细节，组合后得到更丰富的谐波层次。',
    interactions: '后级 OTT 再平衡高、中、低频能量；Vocoder 本身先决定颗粒密度和调制身份。',
    limitations: '这些数值只属于视频当前 Serum 素材与双路增益关系，不作为其他素材的通用预设。',
    timestamp: '',
    stepIndex: 3,
    screenshotKey: 'img_d43e4e82e77fb756',
    replacesPluginIndexes: [1],
    evidence: ['画面确认', '分析推断']
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
  assert.deepEqual(normalized.sourcePluginIndexes, [1]);
  assert.equal(uses.filter((use) => use.legacy && use.sourcePluginIndexes.includes(1)).length, 0);
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
