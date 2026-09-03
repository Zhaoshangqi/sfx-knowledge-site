const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteData = require('../tools/site-data.cjs');
const SfxLearningMap = require('../src/learning-map.js');
const subtitles = require('../src/video-subtitles.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { records, imageManifest } = siteData.parse(html);
const videoId = '3JjAK2uhxM4';
const expectedStarts = [55, 248, 448, 468, 478, 574, 596, 606, 650, 718, 764, 870, 1175, 1372, 1488, 1888, 1970];
const expectedEffects = [
  'Soundtoys PhaseMistress',
  'Waves S1 Imager Stereo',
  'Soundtoys EchoBoy Jr',
  'Kilohearts kHs Pitch Shifter',
  'Kilohearts kHs Reverb',
  'Soundtoys PanMan',
  'FabFilter Pro-Q 3',
  'Waves Z-Noise'
];
const expectedLearningMap = {
  version: 1,
  goal: '让可见动作、角色材质和力量幻想同时清楚，并用调性与尾音区分己方和敌方版本。',
  roles: [
    { name: '动作提示', description: '布料、手镯和拉臂动作对齐画面节拍。' },
    { name: '主体材质', description: '黏液、甲壳和水感解释 Veto 身体的触感。' },
    { name: '重量冲击', description: '非写实重击补足画面本身没有的力量反馈。' },
    { name: '能量身份', description: '固定调性的合成器统一角色的力量来源。' },
    { name: '高频细节', description: 'Ear Candy 提供穿透、节拍和爽感。' },
    { name: '空间与尾音', description: '回声、运动和 Growl 延续方向与威胁。' }
  ],
  decisions: [
    '先用画面可见的动作与材质建立可信主体，再加入非写实力量层。',
    '每颗效果器只解决频段、运动、定位、连续性或清洁度中的一个职责。',
    '己方与敌方版本共用身份材料，只改变调性、点击细节和尾音语义。'
  ],
  sequence: '初始命中 → 吸入式转场 → 手臂拉回 → 材质与尾音收束 → 敌我变体',
  chapters: [
    {
      id: 'action-map',
      title: '先定动作骨架',
      question: '画面发生了什么，时间结构如何分拍？',
      summary: '先把完整动作拆成可命名的声音事件，后续每层才能有明确职责。',
      stepOrders: [1]
    },
    {
      id: 'action-power',
      title: '建立动作与力量',
      question: '怎样让可见动作可信，同时让力量反馈足够？',
      summary: '拟音负责可信来源，非写实重击负责力量，两者不能互相替代。',
      stepOrders: [2]
    },
    {
      id: 'liquid-highs',
      title: '塑造液态高频',
      question: '怎样让高频亮点既像 Veto，又不抢主体定位？',
      summary: '依次处理运动、前向定位、连续性、重量、融合、方向、频段职责和刺耳残留。',
      stepOrders: [3, 4, 5, 6, 7, 8, 9, 10]
    },
    {
      id: 'identity-transition',
      title: '建立角色身份与转场',
      question: '怎样统一力量来源，并连接命中和拉臂两拍？',
      summary: '固定调性定义角色，吸入转场分开动作阶段，旧材料按新节奏重组。',
      stepOrders: [11, 12, 13]
    },
    {
      id: 'material-variants',
      title: '完成材质、尾音与敌我版本',
      question: '怎样补全身体材质、威胁感和游戏辨识？',
      summary: '用材质层解释身体，用尾音延续攻击性，再以少量语义差异区分敌我。',
      stepOrders: [14, 15, 16, 17]
    }
  ]
};
const expectedStepLearning = [
  {
    input: '完整大招画面与已有声音草稿。',
    problem: '动作事件很多，直接堆素材会失去先后关系。',
    action: '拆成命中、手镯低频、高频亮点、吸入转场、拉臂、材质和尾音职责。',
    result: '整段获得可继续分层的时间骨架。'
  },
  {
    input: '布料、手镯拟音与一层额外重击。',
    problem: '拟音能解释动作，但单独使用时力量反馈不足。',
    action: '保留真实动作层，再加入画面没有直接来源的非写实重击。',
    result: '动作仍可信，同时获得更明确的力量反馈。'
  },
  {
    input: '频率合适但偏干、偏数码的高频亮点。',
    problem: '高频能穿透，却不像 Veto 的液态能量。',
    action: '用 PhaseMistress 只增加周期性的液态起伏。',
    result: '穿透力保留，运动质感更符合角色。'
  },
  {
    input: '经过液态运动处理但过宽的高频层。',
    problem: '声音像从玩家四周出现，脱离手臂正前方。',
    action: '用 S1 收窄声像，把辅助层拉回画面中心。',
    result: '空间感仍在，定位重新贴合手臂动作。'
  },
  {
    input: '尾部很短的液态高频亮点。',
    problem: '进入完整混音后出现一下就消失，支撑不足。',
    action: '用 EchoBoy Jr 增加短回声，只延续亮点尾部。',
    result: '高频更连贯，同时保留清楚的攻击起点。'
  },
  {
    input: '节拍清楚但过亮、过薄的硬币感高频。',
    problem: '原音有亮点，却缺少与力量层连接的重量。',
    action: '将复制层降调后与原始音高混合。',
    result: '同一瞬态同时保留亮点和低层重量。'
  },
  {
    input: '降调后仍显得孤立的高频层。',
    problem: '处理层像贴在主体表面，没有共同尾部。',
    action: '加入短混响补齐尾部，并控制攻击不后退。',
    result: '亮点自然并入动作组，不再显得突兀。'
  },
  {
    input: '较静态的水感高频纹理。',
    problem: '材质方向正确，但持续段缺少流体运动。',
    action: '用 PanMan 让辅助纹理产生可控的声像变化。',
    result: '流动感增强，主体定位仍留在正前方。'
  },
  {
    input: '只有高频部分有用的黏液素材。',
    problem: '全频加入会让低中频与主体层拥挤。',
    action: '用 Pro-Q 3 只提取该层承担职责的高频部分。',
    result: '目标纹理留下，无关能量退出整组。'
  },
  {
    input: '频段已确定但仍有尖锐噪点的高频层。',
    problem: '刺耳残留会抢过材质细节和主体动作。',
    action: '用 Z-Noise 清理目标频段内部的尖锐残留。',
    result: '亮度和细节保留，刺耳感退到背景。'
  },
  {
    input: '一组固定调性的合成器声音。',
    problem: '材质层能解释身体，却不能独立定义力量来源。',
    action: '把固定调性合成器作为跨技能复用的能量构件。',
    result: '不同动作共享同一个 Veto 力量身份。'
  },
  {
    input: '初始命中、吸入转场和多层频段内容。',
    problem: '命中与拉臂容易连成一团，无效频率还会占用余量。',
    action: '用吸入声建立下一拍方向，并逐层移除不承担职责的频率。',
    result: '两段动作分开，整组为后续力量层保留空间。'
  },
  {
    input: '已经建立的黏液、前向定位和力量材料。',
    problem: '直接复制第一次组合会与拉臂的新节奏不匹配。',
    action: '保留角色身份材料，但按手臂拉回的时间轮廓重新排列。',
    result: '同一角色身份服务新的动作节奏。'
  },
  {
    input: '脆壳、橡胶黏液和水下纹理。',
    problem: '单一能量声无法解释手臂的硬壳、湿度和拉扯。',
    action: '让三类素材分别承担硬边、弹性和持续湿润运动。',
    result: '手臂获得可辨认的复合身体材质。'
  },
  {
    input: '动作完成后的 Growl 尾音。',
    problem: '主体材质已经完整，但威胁感结束得太早。',
    action: '把 Growl 放在动作尾部，只延续攻击性。',
    result: '动作结束后仍保留危险和生命感。'
  },
  {
    input: '画面主体层与高频 Ear Candy。',
    problem: '只有主体会清楚但不够爽，只有强化层又会失去来源。',
    action: '主体负责材质和动作，高频层只补穿透、节拍与力量幻想。',
    result: '可读性与满足感同时成立。'
  },
  {
    input: '己方版本主体材料、调性、点击与尾音。',
    problem: '完全重做会破坏技能身份，完全复用又无法提示敌我危险。',
    action: '共用主体材料，只把敌方调性改得更负面并调整点击和尾音。',
    result: '技能身份一致，玩家仍能仅凭声音判断敌我。'
  }
];

test('publishes the Veto ult breakdown within the complete 85-record learning catalog', () => {
  const matches = records.filter((record) => record.videoId === videoId);
  assert.equal(matches.length, 1);
  assert.equal(records.length, 85);
  assert.equal(new Set(records.map((record) => record.videoId)).size, 85);
  assert.equal(records.filter((record) => record.learningMap !== undefined).length, records.length);
  assert.equal(records.every((record) => (
    record.steps.every((step) => step.learning !== undefined)
  )), true);

  const record = matches[0];
  assert.equal(record.id, 'yt-3JjAK2uhxM4');
  assert.equal(record.title, 'Valorant Veto 终极技能音效拆解');
  assert.equal(record.url, 'https://www.youtube.com/watch?v=3JjAK2uhxM4');
  assert.deepEqual(record.timeline, {
    durationSeconds: 2070,
    reviewedAt: '2026-09-01',
    source: 'youtube-player'
  });
  assert.deepEqual(record.steps.map((step) => step.startSeconds), expectedStarts);
  assert.equal(record.steps.length, expectedStarts.length);
  assert.doesNotMatch(JSON.stringify(record), /practiceChecklist|练习|作业|打卡/);

  const imageKeys = new Set(record.steps.map((step) => step.imageKey));
  assert.equal(imageKeys.size, record.steps.length);
  for (const step of record.steps) {
    assert.equal(typeof step.name, 'string');
    assert.ok(step.name.trim());
    assert.equal(typeof step.detail, 'string');
    assert.ok(step.detail.trim().length >= 30, step.name);
    assert.ok(Array.isArray(step.params), step.name);
    const asset = imageManifest[step.imageKey];
    assert.ok(asset, step.imageKey);
    assert.ok(fs.existsSync(path.join(root, asset.preview)), asset.preview);
    assert.ok(fs.existsSync(path.join(root, asset.full)), asset.full);
  }

  assert.deepEqual(record.learningMap, expectedLearningMap);
  assert.equal(record.learningMap.version, SfxLearningMap.limits().version);
  assert.ok(SfxLearningMap.project(record, { steps: record.steps }));
  assert.deepEqual(record.steps.map((step) => step.learning), expectedStepLearning);
  const chapterStepOrders = record.learningMap.chapters.flatMap((chapter) => chapter.stepOrders);
  assert.deepEqual(chapterStepOrders, record.steps.map((step) => step.order));
  assert.equal(new Set(chapterStepOrders).size, record.steps.length);

  for (const step of record.steps) {
    assert.deepEqual(Object.keys(step.learning), ['input', 'problem', 'action', 'result'], step.name);
    for (const value of Object.values(step.learning)) {
      assert.equal(typeof value, 'string', step.name);
      assert.ok(value.trim().length >= 8, step.name);
    }
  }

  assert.deepEqual(record.effectUses.map((use) => use.name), expectedEffects);
  for (const use of record.effectUses) {
    assert.equal(use.screenshotReviewed, true, use.id);
    assert.equal(record.steps[use.stepIndex].imageKey, use.screenshotKey, use.id);
    assert.match(use.purpose, /。$/u, use.id);
    assert.match(use.result, /。$/u, use.id);
    assert.ok(use.purpose.length <= 46, use.id);
    assert.ok(use.result.length <= 46, use.id);
  }
});

test('publishes the site-owned Chinese subtitle track and searchable learning entry', () => {
  const trackPath = path.join(root, 'assets', 'subtitles', `${videoId}.json`);
  assert.ok(fs.existsSync(trackPath));
  const track = JSON.parse(fs.readFileSync(trackPath, 'utf8'));
  assert.equal(track.videoId, videoId);
  assert.equal(track.language, 'zh-CN');
  assert.equal(track.source, 'site-owned-from-public-captions');
  assert.equal(track.reviewStatus, 'draft');
  assert.equal(track.updatedAt, '2026-09-01');
  assert.ok(track.cues.length > 700);
  assert.deepEqual(subtitles.entryFor(videoId), {
    videoId,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-09-01',
    contentStatus: 'track',
    asset: `assets/subtitles/${videoId}.json`
  });

  const learning = fs.readFileSync(
    path.join(root, 'skills', 'sfx-knowledge', 'references', 'video-learnings.md'),
    'utf8'
  );
  assert.match(learning, /https:\/\/www\.youtube\.com\/watch\?v=3JjAK2uhxM4/);
});
