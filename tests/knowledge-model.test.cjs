const test = require('node:test');
const assert = require('node:assert/strict');

const model = require('../src/knowledge-model.js');

test('stripCourseScaffolding removes only known generated suffixes and preserves factual narration', () => {
  assert.equal(
    model.stripCourseScaffolding('用 EQ 削掉 3kHz。复习时先听它改变的是素材身份、频谱、运动、空间、动态还是响度，再决定是否保留。'),
    '用 EQ 削掉 3kHz。'
  );
  assert.equal(
    model.stripCourseScaffolding('复刻这个声音时，先保留原始噪声。'),
    '复刻这个声音时，先保留原始噪声。'
  );
  assert.equal(model.stripCourseScaffolding('  事实   文本。  '), '事实 文本。');
});

test('uniqueFacts deduplicates whitespace-normalized facts but keeps punctuation differences', () => {
  assert.deepEqual(
    model.uniqueFacts(['  用滤波器   清理。', '用滤波器\t清理。', '用滤波器清理', '保留瞬态']),
    ['用滤波器 清理。', '用滤波器清理', '保留瞬态']
  );
});

test('buildEffectUses deterministically merges explicit and legacy plugin uses', () => {
  const record = {
    id: 'rec-7', sourceVideoId: 'vid-2', title: '脚步', keywords: ['脚步', '空间'],
    steps: [{ index: 2, screenshotKey: 'shot-2' }],
    plugins: [
      { name: 'EQ', vendor: 'FabFilter', purpose: '削低频', settings: { gain: '-3 dB' } },
      { name: 'Reverb', vendor: 'Valhalla' },
      { name: 'Limiter', vendor: 'FabFilter' }
    ],
    effectUses: [{ id: 'explicit-1', name: 'EQ', replacesPluginIndexes: [0], stepIndex: 2, result: '更干净', parameters: { frequency: '3kHz' } }]
  };
  const first = model.buildEffectUses(record);
  assert.deepEqual(first, model.buildEffectUses(record));
  assert.equal(first.length, 3);
  assert.equal(first[0].id, 'explicit-1');
  assert.deepEqual(first[0].sourcePluginIndexes, [0]);
  assert.equal(first[0].screenshotKey, 'shot-2');
  assert.deepEqual(first[0].sourceKeywords, ['脚步', '空间']);
  assert.equal(first[0].sourceRecordId, 'rec-7');
  assert.deepEqual(first.map((use) => use.name), ['EQ', 'Reverb', 'Limiter']);
  assert.deepEqual(first[1].sourcePluginIndexes, [1]);
  assert.match(first[1].id, /^rec-7-reverb-2$/);
  assert.deepEqual(first[1].parameters, [{ name: '参数线索', value: '', direction: '', evidence: '' }]);
  assert.deepEqual(model.buildEffectUses({ id: 'empty' }), []);
});

test('classifyEffectUse selects one high-confidence category and falls back for mixed chains', () => {
  assert.equal(model.classifyEffectUse({ name: 'FabFilter Pro-Q 3', purpose: '滤波共振控制' }), '频谱与音色');
  assert.equal(model.classifyEffectUse({ name: 'Compressor', purpose: '控制响度' }), '动态与响度');
  assert.equal(model.classifyEffectUse({ name: 'EQ + Reverb', purpose: '同时改变频谱和空间' }), '未分类');
  assert.equal(model.classifyEffectUse({ name: 'Mystery Box', purpose: '处理声音' }), '未分类');
});

test('searchableRecordText includes factual fields but excludes practiceChecklist', () => {
  const text = model.searchableRecordText({
    title: '脚步设计', source: '视频课', date: '2025-01-02', updateNote: '已复核',
    categoryLabel: '空间', summary: '用混响拉开距离', keywords: ['脚步'], materials: ['干声'],
    coreIdeas: ['先定素材'], chainFocus: '空间层次', parameterLogic: '预延迟控制清晰度', tips: ['少量使用'],
    plugins: [{ name: 'Reverb' }], steps: [{ narration: '听尾音' }], effectUses: [{ name: 'Delay', purpose: '回声' }],
    practiceChecklist: ['这段练习不应被检索']
  });
  assert.match(text, /脚步设计/);
  assert.match(text, /预延迟控制清晰度/);
  assert.doesNotMatch(text, /这段练习不应被检索/);
});

test('groupEffectUses normalizes aliases, preserves uses, and sorts groups', () => {
  const eq = { id: 'a', name: '  pro-Q 3 ', vendor: 'FabFilter' };
  const delay = { id: 'b', name: 'Delay', vendor: 'X' };
  const groups = model.groupEffectUses([delay, eq, { id: 'c', name: 'PRO-Q 3', vendor: 'FabFilter' }], [
    { title: 'FabFilter Pro-Q 3', aliases: ['Pro-Q 3'] },
    { title: 'Delay', aliases: ['Echo'] }
  ]);
  assert.deepEqual(groups.map((group) => group.name), ['Delay', 'FabFilter Pro-Q 3']);
  assert.deepEqual(groups[1].uses, [eq, groups[1].uses[1]]);
  assert.equal(model.canonicalEffectName(' PRO-Q 3 ', [{ title: 'FabFilter Pro-Q 3', aliases: ['Pro-Q 3'] }]), 'FabFilter Pro-Q 3');
});
