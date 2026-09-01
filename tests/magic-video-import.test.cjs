const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const siteData = require('../tools/site-data.cjs');
const subtitles = require('../src/video-subtitles.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const { records, imageManifest } = siteData.parse(html);

function isNonblankString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const specs = [{
  videoId: 'lLTbxhK_QLU',
  id: 'yt-lLTbxhK_QLU',
  title: '《守望先锋》风格水系法术音效拆解',
  url: 'https://www.youtube.com/watch?v=lLTbxhK_QLU',
  durationSeconds: 986,
  starts: [0, 45, 120, 255, 332, 461, 582, 686, 726]
}, {
  videoId: 'Oo3SRd_94VE',
  id: 'yt-Oo3SRd_94VE',
  title: '零素材库制作圣光魔法音效：录音、合成与画面对位',
  url: 'https://www.youtube.com/watch?v=Oo3SRd_94VE',
  durationSeconds: 1517,
  starts: [0, 46, 167, 304, 562, 656, 779, 930, 982, 1134, 1242, 1273, 1385, 1462]
}];

test('publishes both magic videos as unique complete records', () => {
  const matchesByVideoId = new Map(specs.map((spec) => [
    spec.videoId,
    records.filter((record) => record.videoId === spec.videoId)
  ]));

  for (const spec of specs) {
    assert.equal(
      matchesByVideoId.get(spec.videoId).length,
      1,
      `${spec.videoId}: expected exactly one record`
    );
  }

  assert.equal(records.length, 85);
  assert.equal(new Set(records.map((record) => record.videoId)).size, 85);

  for (const spec of specs) {
    const record = matchesByVideoId.get(spec.videoId)[0];
    assert.equal(record.id, spec.id);
    assert.equal(record.title, spec.title);
    assert.equal(record.url, spec.url);
    assert.deepEqual(record.timeline, {
      durationSeconds: spec.durationSeconds,
      reviewedAt: '2026-08-17',
      source: 'youtube-player'
    });
    assert.deepEqual(record.steps.map((step) => step.startSeconds), spec.starts);
    assert.equal(record.steps.length, spec.starts.length);
    assert.ok(
      typeof record.summary === 'string' && record.summary.trim().length >= 40,
      `${spec.videoId}: summary`
    );
    assert.ok(
      Array.isArray(record.coreIdeas) && record.coreIdeas.length >= 3,
      `${spec.videoId}: coreIdeas`
    );
    assert.ok(
      Array.isArray(record.materials) && record.materials.length >= 4,
      `${spec.videoId}: materials`
    );
    assert.doesNotMatch(JSON.stringify(record), /practiceChecklist|练习|作业|打卡/);

    const imageKeys = new Set(record.steps.map((step) => step.imageKey));
    assert.equal(imageKeys.size, record.steps.length, `${spec.videoId}: unique screenshots`);
    for (const step of record.steps) {
      assert.ok(
        isNonblankString(step.name) && isNonblankString(step.detail),
        `${spec.videoId}: complete step`
      );
      assert.ok(Array.isArray(step.params), `${spec.videoId}: evidence notes`);
      const asset = imageManifest[step.imageKey];
      assert.ok(asset, `${spec.videoId}: manifest ${step.imageKey}`);
      assert.ok(fs.existsSync(path.join(root, asset.preview)), asset.preview);
      assert.ok(fs.existsSync(path.join(root, asset.full)), asset.full);
    }

    for (const use of record.effectUses || []) {
      assert.equal(use.screenshotReviewed, true, use.id);
      assert.ok(imageKeys.has(use.screenshotKey), `${use.id}: exact screenshot owner`);
      assert.ok(Number.isInteger(use.stepIndex), `${use.id}: stepIndex`);
      assert.ok(
        use.stepIndex >= 0 && use.stepIndex < record.steps.length,
        `${use.id}: stepIndex in range`
      );
      assert.equal(
        record.steps[use.stepIndex].imageKey,
        use.screenshotKey,
        `${use.id}: screenshot matches indexed step`
      );
      assert.ok(
        isNonblankString(use.name) && isNonblankString(use.purpose),
        `${use.id}: identified effect and purpose`
      );
    }
  }
});

test('publishes lazy Chinese caption tracks and complete Skill references', () => {
  const learning = fs.readFileSync(
    path.join(root, 'skills', 'sfx-knowledge', 'references', 'video-learnings.md'),
    'utf8'
  );

  for (const spec of specs) {
    const assetPath = path.join(root, 'assets', 'subtitles', `${spec.videoId}.json`);
    assert.ok(fs.existsSync(assetPath), `${spec.videoId}: missing subtitle asset`);
    const track = JSON.parse(fs.readFileSync(assetPath, 'utf8'));
    assert.equal(track.videoId, spec.videoId);
    assert.equal(track.language, 'zh-CN');
    assert.equal(track.source, 'site-owned-from-public-captions');
    assert.equal(track.reviewStatus, 'draft');
    assert.equal(track.updatedAt, '2026-08-17');
    assert.ok(Array.isArray(track.cues) && track.cues.length > 20, `${spec.videoId}: cues`);
    assert.deepEqual(subtitles.entryFor(spec.videoId), {
      videoId: track.videoId,
      language: track.language,
      source: track.source,
      reviewStatus: track.reviewStatus,
      updatedAt: track.updatedAt,
      contentStatus: 'track',
      asset: `assets/subtitles/${spec.videoId}.json`
    });
    assert.match(learning, new RegExp(`https://www\\.youtube\\.com/watch\\?v=${spec.videoId}`));
  }
});
