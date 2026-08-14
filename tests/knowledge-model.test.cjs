const test = require('node:test');
const assert = require('node:assert/strict');

const model = require('../src/knowledge-model.js');

test('stripCourseScaffolding removes all known suffixes and preserves factual narration', () => {
  const suffixCases = [
    '复习时先看每一步负责的声音角色，再看插件名称。',
    '复习这条时先看每一步负责的声音角色，再看插件名称。',
    '学习时给每颗插件标注“清理、塑形、运动、空间、动态、响度或导出”之一。',
    '复习时先听它改变的是素材身份、频谱、运动、空间、动态还是响度，再决定是否保留。',
    '复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。',
    '复刻时不要机械抄数值，先听这些参数改变的是攻击、频段、空间、运动还是响度。',
    '视频未显示完整参数页：按插件承担的角色做 A/B 微调。',
    '具体数值未完整显示：重点听运动速度、频段位置、湿度和瞬态变化。'
  ];
  suffixCases.forEach((suffix) => assert.equal(model.stripCourseScaffolding(`事实。${suffix}`), '事实。'));
  assert.equal(
    model.stripCourseScaffolding('事实；视频未显示完整参数页：按插件承担的角色做 A/B 微调。；具体数值未完整显示：重点听运动速度、频段位置、湿度和瞬态变化。。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。'),
    '事实'
  );
  assert.equal(model.stripCourseScaffolding('事实描述。 视频证据：truncated transcript fragment'), '事实描述。');
  assert.equal(model.stripCourseScaffolding('字幕/画面线索：hello this is raw transcript'), '');
  assert.equal(model.stripCourseScaffolding('可确认的数值/范围：2024；2'), '');
  assert.equal(
    model.stripCourseScaffolding('可确认的数值/范围：2024；2；参数逻辑：包络跟随滤波运动。'),
    '参数逻辑：包络跟随滤波运动。'
  );
  assert.equal(model.stripCourseScaffolding('Pro-Q 3 参数逻辑：字幕/画面线索：raw transcript'), '');
  assert.equal(model.stripCourseScaffolding('A/B：旁路本步骤，听它是否只增加响度。'), '');
  assert.equal(model.stripCourseScaffolding('具体数值未完整显示：用耳朵确认速度、频点、湿度或攻击是否服务画面。'), '');
  assert.equal(
    model.stripCourseScaffolding('Snap Heap 参数逻辑：具体数值未完整显示：重点听运动速度、频段位置、湿度和瞬态变化。；参数逻辑：用包络跟随建立运动。'),
    'Snap Heap 参数逻辑：用包络跟随建立运动。'
  );
  assert.equal(model.stripCourseScaffolding('复刻时只动一个核心参数并渲染 3 个强度版本，避免同时改太多导致无法判断贡献。'), '');
  assert.equal(
    model.stripCourseScaffolding('通用模板。本条的主要链路可以按 EQ -> Reverb 来读：先判断角色。视频证据：raw transcript'),
    ''
  );
  assert.equal(
    model.stripCourseScaffolding('画面确认：作者先做减法 EQ。 本条的主要链路可以按 EQ -> Reverb 来读：先判断角色。 若画面没有显示具体数值，只把它当作可复用的调参判断点。'),
    '画面确认：作者先做减法 EQ。'
  );
  [
    '分析推断练习：旁路插件并写下听感。',
    '迁移练习假设：把这一层改成 UI 反馈。',
    '练习优先使用非发声物、低压力口腔动作或受控表演。',
    '此分类是练习假设。',
    '后续迁移练习只作为候选角色。',
    '练习：导出三版并比较。',
    '每次只改一个维度并输出弱/中/强三版，做 matched-loudness A/B。',
    '复用检查：把本条链路抽象成源素材选择、第一层处理、二次采样、最终混音四个阶段。',
    '第一步参数优先级：原始录音。这通常决定整条链后面的尺度、速度或素材质量。'
  ].forEach((value) => assert.equal(model.stripCourseScaffolding(value), ''));
  assert.equal(
    model.stripCourseScaffolding('作者提醒 scream 表演可能伤嗓；应优先使用非发声物、低压力口腔动作或受控表演。'),
    '作者提醒 scream 表演可能伤嗓；应优先使用非发声物、低压力口腔动作或受控表演。'
  );
  assert.equal(model.stripCourseScaffolding('事实   文本。'), '事实   文本。');
  assert.equal(model.stripCourseScaffolding('复刻时保留原始噪声。'), '复刻时保留原始噪声。');
  assert.equal(model.stripCourseScaffolding('作者把工程中的按钮命名为“练习模式”。'), '作者把工程中的按钮命名为“练习模式”。');
});

test('uniqueFacts strips facts once and deduplicates only whitespace-normalized keys', () => {
  assert.deepEqual(
    model.uniqueFacts(['  用滤波器   清理。  ', '用滤波器\t清理。', '用滤波器清理', 'Noise', 'noise', 'Ａ', 'A']),
    ['用滤波器   清理。', '用滤波器清理', 'Noise', 'noise', 'Ａ', 'A']
  );
});

test('buildEffectUses accepts arrays and normalizes explicit and legacy sources', () => {
  const records = [{
    id: '  rec-7  ', source: '  视频作者  ', sourceVideoId: 'vid-2', title: '脚步',
    keywords: ['  脚步  ', '脚步', '空间'],
    steps: [{ screenshotKey: 'wrong', imageKey: 'right' }],
    plugins: [
      { name: 'EQ', vendor: 'FabFilter', settings: { gain: '-3 dB' } },
      { id: 'plugin-id', name: 'Reverb', vendor: 'Valhalla', settings: ['作者口述', '  画面确认  '] },
      { name: 'Limiter', settings: { gain: '-1 dB' } }
    ],
    effectUses: [null, undefined, 'malformed', {
      id: '  explicit-id  ', name: 'EQ', replacesPluginIndexes: [0], stepIndex: 0,
      target: '目标。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。',
      chainPosition: 1, purpose: '削低频，作者口述。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。',
      result: '更干净。复习时先看每一步负责的声音角色，再看插件名称。', interactions: '  与混响   叠加 ',
      limitations: ' 不能过量 ', evidence: '画面确认', notes: '分析推断', settings: ['视频未展示'],
      parameters: [{ name: '频率', value: '3kHz', evidence: '作者口述' }, { name: '空值' }, { name: '方向', direction: '向上' }]
    }]
  }, { id: 'empty' }];
  const uses = model.buildEffectUses(records);
  assert.deepEqual(model.buildEffectUses({ id: 'wrong-shape' }), []);
  assert.equal(uses.length, 3);
  assert.equal(uses[0].id, '  explicit-id  ');
  assert.equal(uses[0].source, '  视频作者  ');
  assert.equal(uses[0].sourceRecordId, '  rec-7  ');
  assert.equal(uses[0].screenshotKey, 'right');
  assert.equal(uses[0].stepIndex, 0);
  assert.deepEqual(uses[0].evidence, ['画面确认', '作者口述', '分析推断', '视频未展示']);
  assert.deepEqual(uses[0].sourceKeywords, ['脚步', '空间']);
  assert.deepEqual(uses[0].sourcePluginIndexes, [0]);
  assert.equal(uses[0].target, '目标。');
  assert.equal(uses[0].chainPosition, '1');
  assert.equal(uses[0].purpose, '削低频，作者口述。');
  assert.equal(uses[0].result, '更干净。');
  assert.equal(uses[0].interactions, '与混响   叠加');
  assert.equal(uses[0].limitations, '不能过量');
  assert.equal(uses[0].parameters.length, 2);
  assert.deepEqual(uses[1].sourcePluginIndexes, [1]);
  assert.equal(uses[1].id, '  rec-7  :effect:reverb:2');
  assert.deepEqual(uses[1].parameters, [
    { name: '参数线索', value: '作者口述', direction: '', evidence: '作者口述' },
    { name: '参数线索', value: '画面确认', direction: '', evidence: '画面确认' }
  ]);
  assert.deepEqual(uses[1].evidence, ['画面确认', '作者口述']);
  assert.equal(uses[2].id, '  rec-7  :effect:limiter:3');
  assert.deepEqual(uses[2].parameters, []);
  assert.deepEqual(model.buildEffectUses([{ id: 'empty-array-record' }]), []);
  assert.equal(model.buildEffectUses([{ id: 'bad-source', source: 42, plugins: [{ name: 'EQ' }] }])[0].source, '');
  const collisionUses = model.buildEffectUses([{
    id: 'collision', effectUses: [{ name: 'Delay' }], plugins: [{ id: 'plugin-id', name: 'Delay' }]
  }]);
  assert.equal(collisionUses[0].id, 'collision:effect:delay:explicit-1');
  assert.equal(collisionUses[1].id, 'collision:effect:delay:1');
});

test('buildEffectUses preserves numeric timeline fields without coercing strings', () => {
  const uses = model.buildEffectUses([{
    id: 'timed-record',
    effectUses: [
      { name: 'Timed', startSeconds: 12.5, screenshotReviewed: 1 },
      { name: 'String time', startSeconds: '12.5', screenshotReviewed: '' },
      { name: 'Untimed', screenshotReviewed: 'reviewed' }
    ],
    plugins: [{ name: 'Legacy' }]
  }]);

  assert.equal(uses[0].startSeconds, 12.5);
  assert.equal(uses[0].screenshotReviewed, true);
  assert.equal(uses[1].startSeconds, null);
  assert.equal(uses[1].screenshotReviewed, false);
  assert.equal(uses[2].startSeconds, null);
  assert.equal(uses[2].screenshotReviewed, true);
  assert.equal(uses[3].startSeconds, null);
  assert.equal(uses[3].screenshotReviewed, false);
});

test('legacy effect projection omits generated transcript and pseudo-parameter scaffolding', () => {
  const [use] = model.buildEffectUses([{
    id: 'legacy-cleanup',
    plugins: [{
      name: 'Filter',
      settings: [
        '视频未显示完整参数页：按插件承担的角色做 A/B 微调。',
        '字幕/画面线索：hello this is an unstructured transcript fragment',
        '可确认的数值/范围：42；2',
        '可确认的数值/范围：42；2；参数逻辑：跟随输入包络控制滤波运动。',
        'Motion-following filter；视频未显示完整参数页：按插件承担的角色做 A/B 微调。',
        'Cutoff 250 Hz，画面确认',
        'Dry/Wet 63%，作者口述'
      ]
    }]
  }]);

  assert.deepEqual(use.parameters, [
    { name: '参数线索', value: '参数逻辑：跟随输入包络控制滤波运动。', direction: '', evidence: '' },
    { name: '参数线索', value: 'Motion-following filter', direction: '', evidence: '' },
    { name: '参数线索', value: 'Cutoff 250 Hz，画面确认', direction: '', evidence: '画面确认' },
    { name: '参数线索', value: 'Dry/Wet 63%，作者口述', direction: '', evidence: '作者口述' }
  ]);
  assert.doesNotMatch(JSON.stringify(use), /A\/B 微调|字幕\/画面线索|可确认的数值\/范围/);
});

test('classifyEffectUse excludes vendor and inferEvidence returns all labels', () => {
  assert.equal(model.classifyEffectUse({ name: 'Mystery', vendor: 'Compressor', purpose: '处理声音' }), '未分类');
  assert.equal(model.classifyEffectUse({ name: 'EQ', purpose: '滤波共振控制' }), '频谱与音色');
  assert.equal(model.classifyEffectUse({ name: 'EQ + Reverb', purpose: '同时改变频谱和空间' }), '未分类');
  assert.deepEqual(model.inferEvidence('画面确认，作者口述；音频可辨，分析推断，视频未展示'), ['画面确认', '作者口述', '音频可辨', '分析推断', '视频未展示']);
  assert.deepEqual(model.inferEvidence('字幕定位线索（需画面确认）'), []);
  assert.deepEqual(model.inferEvidence('尚待画面确认；作者口述'), ['作者口述']);
  assert.deepEqual(model.inferEvidence('没有证据标签'), []);
});

test('searchableRecordText uses supplied category label and factual fields only', () => {
  const text = model.searchableRecordText({
    title: '脚步设计', source: '视频课', date: '不要收录', addedAt: '2025-01-02', updatedAt: '2025-02-03',
    updateNote: '已复核', categoryLabel: '记录分类', summary: '用混响拉开距离', keywords: ['脚步'],
    materials: ['干声'], coreIdeas: ['先定素材'], chainFocus: '空间层次', parameterLogic: '预延迟控制清晰度',
    tips: ['少量使用'], plugins: [{ name: 'Reverb' }], steps: [{ narration: '听尾音' }],
    effectUses: [{ name: 'Delay', purpose: '回声' }], practiceChecklist: ['不可检索']
  }, '传入分类');
  assert.match(text, /传入分类/);
  assert.match(text, /2025-01-02/);
  assert.match(text, /2025-02-03/);
  assert.match(text, /已复核/);
  assert.doesNotMatch(text, /记录分类|不要收录|不可检索/);
});

test('groupEffectUses preserves uses and canonicalizes exact aliases to reference titles', () => {
  const eq = { id: 'a', name: '  pro-Q 3 ' };
  const delay = { id: 'b', name: 'Delay' };
  const groups = model.groupEffectUses([delay, eq, { id: 'c', name: 'PRO-Q 3' }], [
    { title: 'FabFilter Pro-Q 3', aliases: ['Pro-Q 3'] },
    { title: 'Delay', aliases: ['Echo'] }
  ]);
  assert.deepEqual(groups.map((group) => group.name), ['Delay', 'FabFilter Pro-Q 3']);
  assert.strictEqual(groups[1].uses[0], eq);
  assert.equal(groups[1].uses[1].id, 'c');
  assert.equal(model.canonicalEffectName(' PRO-Q 3 ', [{ title: 'FabFilter Pro-Q 3', aliases: ['Pro-Q 3'] }]), 'FabFilter Pro-Q 3');
});
