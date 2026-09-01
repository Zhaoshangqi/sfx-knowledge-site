const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteData = require('../tools/site-data.cjs');
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

test('publishes the Veto ult breakdown as the unique 85th complete record', () => {
  const matches = records.filter((record) => record.videoId === videoId);
  assert.equal(matches.length, 1);
  assert.equal(records.length, 85);
  assert.equal(new Set(records.map((record) => record.videoId)).size, 85);

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

  assert.equal(typeof record.learningMap, 'object', 'Veto record must define learningMap');
  assert.equal(
    record.learningMap.goal,
    '让可见动作、角色材质和力量幻想同时清楚，并用调性与尾音区分己方和敌方版本。'
  );
  assert.deepEqual(
    record.learningMap.roles.map((role) => role.name),
    ['动作提示', '主体材质', '重量冲击', '能量身份', '高频细节', '空间与尾音']
  );
  assert.equal(record.learningMap.decisions.length, 3);
  assert.equal(
    record.learningMap.sequence,
    '初始命中 → 吸入式转场 → 手臂拉回 → 材质与尾音收束 → 敌我变体'
  );
  assert.deepEqual(
    record.learningMap.chapters.map((chapter) => chapter.id),
    ['action-map', 'action-power', 'liquid-highs', 'identity-transition', 'material-variants']
  );
  assert.deepEqual(
    record.learningMap.chapters.map((chapter) => chapter.stepOrders),
    [[1], [2], [3, 4, 5, 6, 7, 8, 9, 10], [11, 12, 13], [14, 15, 16, 17]]
  );
  const chapterStepOrders = record.learningMap.chapters.flatMap((chapter) => chapter.stepOrders);
  assert.deepEqual(chapterStepOrders, Array.from({ length: 17 }, (_, index) => index + 1));
  assert.equal(new Set(chapterStepOrders).size, 17);

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
