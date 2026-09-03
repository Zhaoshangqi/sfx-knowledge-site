'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const prepare = require('../tools/prepare-learning-map-review.cjs');
const verify = require('../tools/verify-learning-content.cjs');
const catalog = require('../tools/learning-map-catalog.cjs');
const siteData = require('../tools/site-data.cjs');

const repoRoot = path.join(__dirname, '..');
const VIDEO_A = 'aaaaaaaaaaa';
const VIDEO_B = 'bbbbbbbbbbb';
const VETO_VIDEO_ID = '3JjAK2uhxM4';
const PROBLEM_PREFIX = '视频未单独说明处理前问题';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stripLearning(value) {
  const result = clone(value);
  delete result.learningMap;
  for (const step of result.steps) delete step.learning;
  return result;
}

function temporaryDirectory(t, prefix = 'learning-content-') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function recordFixture(videoId = VIDEO_A, category = 'workflow') {
  return {
    id: `yt-${videoId}`,
    videoId,
    category,
    title: `Video ${videoId}`,
    source: 'Public tutorial',
    url: `https://www.youtube.com/watch?v=${videoId}`,
    summary: '先建立可辨认的主体。再根据画面节拍完成尾音。',
    coreIdeas: [
      '每一层只承担一个明确职责。',
      '先核对动作，再判断空间。',
      '在整组声音里判断处理结果。',
      '这一条不应进入最多三条的草稿决策。'
    ],
    materials: ['布料与金属层', '短回声尾音', '高频运动纹理'],
    steps: [
      {
        order: 1,
        name: '建立布料主体',
        detail: '用布料瞬态对齐画面中的抬手动作。',
        params: ['只保留清楚的起点。'],
        materials: ['布料瞬态'],
        imageKey: `${videoId}-cloth`,
        startSeconds: 10,
        customEvidence: { keep: true }
      },
      {
        order: 2,
        name: '补齐短尾',
        detail: '在动作结束后保留短回声，让尾音连续。',
        params: ['不覆盖主体攻击。'],
        imageKey: `${videoId}-tail`,
        startSeconds: 30
      }
    ],
    effectUses: [
      {
        id: `yt-${videoId}:effect:echo:1`,
        name: 'Echo Product',
        vendor: 'Public Vendor',
        category: '延迟',
        target: '动作后的短尾',
        chainPosition: '主体之后',
        purpose: '保留短回声尾音。',
        parameters: [],
        result: '尾音连续。',
        interactions: '不覆盖布料主体。',
        limitations: '只服务尾音。',
        timestamp: '00:30',
        startSeconds: 30,
        stepIndex: 1,
        screenshotKey: `${videoId}-tail`,
        screenshotReviewed: true,
        replacesPluginIndexes: [],
        evidence: ['插件画面确认', '作者口述']
      }
    ]
  };
}

function imageManifestFor(records) {
  const manifest = {};
  for (const record of records) {
    for (const step of record.steps) {
      manifest[step.imageKey] = {
        preview: `assets/shots/preview/${step.imageKey}.webp`,
        full: `assets/shots/full/${step.imageKey}.png`
      };
    }
  }
  return manifest;
}

function htmlFixture(records, imageManifest = imageManifestFor(records)) {
  return [
    '<!doctype html>',
    '<script>',
    `    const records = ${JSON.stringify(records, null, 2)};`,
    `    const imageManifest = ${JSON.stringify(imageManifest, null, 2)};`,
    '    const pluginReferenceCatalog = {};',
    '</script>',
    ''
  ].join('\n');
}

function subtitleEntry(videoId, status = 'track') {
  if (status !== 'track') {
    return {
      videoId,
      contentStatus: status,
      updatedAt: '2026-09-01',
      reason: status === 'missing' ? '本地字幕尚未取得。' : '画面和人工复核确认无语音。'
    };
  }
  return {
    videoId,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'reviewed',
    updatedAt: '2026-09-01',
    contentStatus: 'track',
    asset: `assets/subtitles/${videoId}.json`
  };
}

function subtitleTrack(videoId) {
  return {
    videoId,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'reviewed',
    updatedAt: '2026-09-01',
    cues: [
      { start: 8, end: 12, text: '布料瞬态对齐抬手动作。' },
      { start: 28, end: 33, text: '动作后保留短回声尾音。' }
    ]
  };
}

function writeSiteFixture(root, records, subtitleStatuses = {}) {
  fs.writeFileSync(path.join(root, 'index.html'), htmlFixture(records), 'utf8');
  for (const record of records) {
    const status = subtitleStatuses[record.videoId] || 'track';
    if (status !== 'track') continue;
    const directory = path.join(root, 'assets', 'subtitles');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(directory, `${record.videoId}.json`),
      JSON.stringify(subtitleTrack(record.videoId), null, 2) + '\n',
      'utf8'
    );
  }
}

function subtitleApiFor(statuses = {}) {
  return Object.freeze({
    entryFor(videoId) {
      return subtitleEntry(videoId, statuses[videoId] || 'track');
    }
  });
}

function runPreparedCli(root, args, options = {}) {
  let stdout = '';
  const execution = prepare.runCli(args, {
    root,
    fsImpl: options.fsImpl || fs,
    subtitleApi: options.subtitleApi || subtitleApiFor(options.subtitleStatuses),
    stdout: { write(chunk) { stdout += String(chunk); } }
  });
  assert.equal(stdout.endsWith('\n'), true);
  assert.deepEqual(JSON.parse(stdout), execution.report);
  return execution;
}

function realSite() {
  const parsed = siteData.parse(fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8'));
  const record = parsed.records.find((candidate) => candidate.videoId === VETO_VIDEO_ID);
  const entry = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'content', 'learning-maps', 'scifi', `${VETO_VIDEO_ID}.json`),
    'utf8'
  ));
  const track = JSON.parse(fs.readFileSync(
    path.join(repoRoot, 'assets', 'subtitles', `${VETO_VIDEO_ID}.json`),
    'utf8'
  ));
  return { ...parsed, record, entry, track };
}

function verifyVeto(entry, contextOverrides = {}) {
  const site = realSite();
  return verify.verifyEntry(entry, {
    record: contextOverrides.record || site.record,
    records: contextOverrides.records || site.records,
    imageManifest: contextOverrides.imageManifest || site.imageManifest,
    subtitleTrack: Object.hasOwn(contextOverrides, 'subtitleTrack')
      ? contextOverrides.subtitleTrack
      : site.track,
    path: `content/learning-maps/scifi/${VETO_VIDEO_ID}.json`
  });
}

test('exports frozen review preparation and verification APIs', () => {
  assert.ok(Object.isFrozen(prepare));
  assert.deepEqual(Object.keys(prepare), [
    'parseArguments',
    'buildPacket',
    'serializePacket',
    'atomicWriteFile',
    'runCli'
  ]);
  assert.ok(Object.isFrozen(verify));
  assert.deepEqual(Object.keys(verify), [
    'parseArguments',
    'normalizeTokens',
    'evidenceTokensForStep',
    'verifyEntry',
    'runCli'
  ]);
  for (const api of [prepare, verify]) {
    for (const name of Object.keys(api)) assert.equal(typeof api[name], 'function', name);
  }
});

test('packet preserves deterministic evidence order, complete step evidence, and an unreviewed draft', () => {
  const record = recordFixture();
  const manifest = imageManifestFor([record]);
  const packet = prepare.buildPacket({
    record,
    records: [record],
    imageManifest: manifest,
    subtitle: { status: 'track', catalog: subtitleEntry(record.videoId), track: subtitleTrack(record.videoId) }
  });

  assert.deepEqual(Object.keys(packet), ['videoId', 'recordId', 'category', 'evidence', 'draft']);
  assert.deepEqual(Object.keys(packet.evidence), [
    'identity', 'summary', 'coreIdeas', 'materials', 'steps', 'effectUses', 'images', 'subtitles'
  ]);
  assert.deepEqual(Object.keys(packet.evidence.identity), [
    'id', 'videoId', 'title', 'source', 'url'
  ]);
  assert.deepEqual(packet.evidence.identity, {
    id: record.id,
    videoId: record.videoId,
    title: record.title,
    source: record.source,
    url: record.url
  });
  assert.equal(packet.evidence.summary, record.summary);
  assert.equal(Object.hasOwn(packet.evidence, 'record'), false);
  assert.deepEqual(packet.evidence.coreIdeas, record.coreIdeas);
  assert.deepEqual(packet.evidence.materials, record.materials);
  assert.equal(packet.evidence.steps.length, record.steps.length);

  packet.evidence.steps.forEach((step, index) => {
    for (const key of Object.keys(record.steps[index])) {
      assert.deepEqual(step[key], record.steps[index][key], `step ${index + 1} keeps ${key}`);
    }
    assert.ok(Object.hasOwn(step, 'effectUses'));
    assert.ok(Object.hasOwn(step, 'subtitle'));
    assert.ok(Object.hasOwn(step, 'image'));
  });
  assert.deepEqual(packet.evidence.steps[0].customEvidence, { keep: true });
  assert.deepEqual(packet.evidence.steps[0].subtitle.cues, [
    { start: 8, end: 12, text: '布料瞬态对齐抬手动作。' }
  ]);
  assert.deepEqual(packet.evidence.steps[1].subtitle.cues, [
    { start: 28, end: 33, text: '动作后保留短回声尾音。' }
  ]);

  const effect = packet.evidence.effectUses[0];
  assert.equal(effect.id, record.effectUses[0].id);
  assert.equal(effect.recordId, record.id);
  assert.equal(effect.videoId, record.videoId);
  assert.equal(effect.stepIndex, 1);
  assert.equal(effect.stepOrder, 2);
  assert.equal(effect.screenshotKey, record.steps[1].imageKey);
  assert.equal(effect.timestamp, '00:30');
  assert.equal(effect.startSeconds, 30);
  assert.deepEqual(effect.evidence, ['插件画面确认', '作者口述']);
  assert.deepEqual(packet.evidence.steps[1].effectUses, [effect]);

  assert.deepEqual(packet.evidence.images[1], {
    key: record.steps[1].imageKey,
    owners: [{
      recordId: record.id,
      videoId: record.videoId,
      stepIndex: 1,
      stepOrder: 2
    }],
    manifest: manifest[record.steps[1].imageKey]
  });
  assert.equal(packet.draft.reviewed, false);
  assert.equal(packet.draft.reviewedAt, null);
  assert.equal(packet.draft.learningMap.goal, '先建立可辨认的主体。');
  assert.deepEqual(packet.draft.learningMap.decisions, record.coreIdeas.slice(0, 3));
  assert.ok(packet.draft.learningMap.chapters.length >= 2);
  assert.ok(packet.draft.learningMap.chapters.length <= 5);
  assert.deepEqual(
    packet.draft.learningMap.chapters.flatMap((chapter) => chapter.stepOrders),
    record.steps.map((step) => step.order)
  );
  for (const step of packet.draft.steps) {
    assert.equal(step.learning.problem, PROBLEM_PREFIX);
  }
  assert.throws(
    () => catalog.validateEntry(packet.draft, {
      record,
      category: record.category,
      path: `.work/learning-review/${record.category}/${record.videoId}.json`
    }),
    /reviewed.*strictly true/i
  );

  const serialized = prepare.serializePacket(packet);
  assert.equal(serialized, prepare.serializePacket(packet));
  assert.equal(
    crypto.createHash('sha256').update(serialized).digest('hex'),
    'e01ec7714ee51669644fcc96bfffc73c81b689d555b8bbda56ed192bb76e3743'
  );
  assert.equal(serialized.endsWith('\n'), true);
  assert.equal(serialized.endsWith('\n\n'), false);
  assert.match(serialized, /\n  "recordId":/);
});

test('packet states missing and no-speech subtitle evidence without fabricating cues', () => {
  const record = recordFixture();
  const manifest = imageManifestFor([record]);
  for (const status of ['missing', 'no-speech']) {
    const packet = prepare.buildPacket({
      record,
      records: [record],
      imageManifest: manifest,
      subtitle: { status, catalog: subtitleEntry(record.videoId, status), track: null }
    });
    assert.equal(packet.evidence.subtitles.status, status);
    for (const step of packet.evidence.steps) {
      assert.equal(step.subtitle.status, status);
      assert.deepEqual(step.subtitle.cues, []);
    }
  }
});

test('preparation CLI filters by category and video intersection and writes only fixed ignored packet paths', (t) => {
  const root = temporaryDirectory(t, 'learning-review-cli-');
  const workflow = recordFixture(VIDEO_A, 'workflow');
  const scifi = recordFixture(VIDEO_B, 'scifi');
  writeSiteFixture(root, [workflow, scifi]);
  const indexBefore = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  const first = runPreparedCli(root, ['--category', 'workflow']);
  assert.equal(first.exitCode, 0);
  assert.deepEqual(first.report, {
    mode: 'prepare',
    filter: { category: 'workflow', videos: null },
    records: 1,
    steps: 2,
    packets: ['.work/learning-review/workflow/aaaaaaaaaaa.json'],
    failures: []
  });

  const packetPath = path.join(root, '.work', 'learning-review', 'workflow', `${VIDEO_A}.json`);
  const firstBytes = fs.readFileSync(packetPath, 'utf8');
  const second = runPreparedCli(root, ['--videos', VIDEO_A]);
  const secondBytes = fs.readFileSync(packetPath, 'utf8');
  assert.equal(second.exitCode, 0);
  assert.equal(firstBytes, secondBytes);
  assert.equal(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), indexBefore);
  assert.equal(fs.existsSync(path.join(root, 'content')), false);

  const empty = runPreparedCli(root, ['--category', 'workflow', '--videos', VIDEO_B]);
  assert.equal(empty.exitCode, 1);
  assert.equal(empty.report.records, 0);
  assert.match(empty.report.failures[0], /no records.*selection/i);

  const unknown = runPreparedCli(root, ['--videos', 'ccccccccccc']);
  assert.equal(unknown.exitCode, 1);
  assert.match(unknown.report.failures[0], /unknown.*videoId.*ccccccccccc/i);
});

test('both CLIs reject repeated, malformed, missing-value, and unknown arguments', () => {
  const parsers = [prepare.parseArguments, verify.parseArguments];
  const invalidCases = [
    [['--category', 'workflow', '--category', 'scifi'], /duplicate.*--category/i],
    [['--videos', VIDEO_A, '--videos', VIDEO_B], /duplicate.*--videos/i],
    [['--videos', `${VIDEO_A},${VIDEO_A}`], /duplicate.*videoId/i],
    [['--videos', 'short'], /invalid.*videos/i],
    [['--category'], /missing.*--category/i],
    [['--category', '../escape'], /invalid.*category/i],
    [['--unknown'], /unknown.*--unknown/i]
  ];
  for (const parseArguments of parsers) {
    for (const [args, pattern] of invalidCases) {
      assert.throws(() => parseArguments(args), pattern);
    }
  }
});

test('atomic writer uses a unique sibling with wx and cleans only its own failed temporary file', (t) => {
  const root = temporaryDirectory(t, 'learning-review-atomic-');
  const target = path.join(root, 'packet.json');
  const events = [];
  const temporaryPaths = [];
  const traced = Object.create(fs);
  traced.openSync = function (filename, flags, ...args) {
    events.push(['open', path.resolve(filename), flags]);
    temporaryPaths.push(path.resolve(filename));
    return fs.openSync(filename, flags, ...args);
  };
  traced.writeFileSync = function (descriptor, content, options) {
    events.push(['write', descriptor]);
    return fs.writeFileSync(descriptor, content, options);
  };
  traced.fsyncSync = function (descriptor) {
    events.push(['fsync', descriptor]);
    return fs.fsyncSync(descriptor);
  };
  traced.closeSync = function (descriptor) {
    events.push(['close', descriptor]);
    return fs.closeSync(descriptor);
  };
  traced.renameSync = function (from, to) {
    events.push(['rename', path.resolve(from), path.resolve(to)]);
    return fs.renameSync(from, to);
  };

  prepare.atomicWriteFile({ fsImpl: traced, target, content: 'first\n' });
  prepare.atomicWriteFile({ fsImpl: traced, target, content: 'second\n' });
  assert.equal(fs.readFileSync(target, 'utf8'), 'second\n');
  assert.equal(new Set(temporaryPaths).size, 2);
  assert.deepEqual(events.filter((event) => event[0] === 'open').map((event) => event[2]), ['wx', 'wx']);
  for (const temporary of temporaryPaths) {
    assert.equal(path.dirname(temporary), path.dirname(path.resolve(target)));
    assert.match(path.basename(temporary), /^\.packet\.json\..+\.tmp$/);
    assert.equal(fs.existsSync(temporary), false);
  }

  const failing = Object.create(fs);
  let failedTemporary;
  let descriptor;
  failing.openSync = function (filename, flags, ...args) {
    failedTemporary = filename;
    descriptor = fs.openSync(filename, flags, ...args);
    return descriptor;
  };
  failing.writeFileSync = function (candidate) {
    if (candidate === descriptor) throw new Error('injected packet write failure');
    return fs.writeFileSync.apply(fs, arguments);
  };
  assert.throws(
    () => prepare.atomicWriteFile({ fsImpl: failing, target, content: 'failed\n' }),
    /injected packet write failure/
  );
  assert.equal(fs.existsSync(failedTemporary), false);
  assert.equal(fs.readFileSync(target, 'utf8'), 'second\n');
});

test('preparation refuses an output directory reached through a symlink or junction', (t) => {
  const root = temporaryDirectory(t, 'learning-review-link-root-');
  const outside = temporaryDirectory(t, 'learning-review-link-outside-');
  const record = recordFixture(VIDEO_A, 'workflow');
  writeSiteFixture(root, [record]);
  const reviewRoot = path.join(root, '.work', 'learning-review');
  fs.mkdirSync(reviewRoot, { recursive: true });
  try {
    fs.symlinkSync(outside, path.join(reviewRoot, 'workflow'), process.platform === 'win32' ? 'junction' : 'dir');
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') {
      t.skip(`symlink/junction creation unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const execution = runPreparedCli(root, ['--videos', VIDEO_A]);
  assert.equal(execution.exitCode, 1);
  assert.match(execution.report.failures[0], /symlink|junction|reparse/i);
  assert.deepEqual(fs.readdirSync(outside), []);
});

test('token helpers are deterministic, content-focused, and step-local', () => {
  const site = realSite();
  const first = verify.normalizeTokens('PhaseMistress 液态高频，进行处理。');
  const second = verify.normalizeTokens('PhaseMistress 液态高频，进行处理。');
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.ok(first.includes('phasemistress'));
  assert.equal(first.includes('进行'), false);
  assert.equal(first.includes('处理'), false);

  const stepTokens = verify.evidenceTokensForStep(site.record.steps[2], {
    record: site.record,
    records: site.records,
    imageManifest: site.imageManifest,
    subtitleTrack: site.track
  });
  assert.ok(Object.isFrozen(stepTokens));
  assert.ok(stepTokens.includes('phasemistress'));
  assert.equal(stepTokens.includes('pro-q'), false);

  const compactProduct = verify.normalizeTokens('Pro-Q3');
  const spacedProduct = verify.normalizeTokens('Pro-Q 3');
  assert.deepEqual(compactProduct, spacedProduct);
  assert.notDeepEqual(compactProduct, verify.normalizeTokens('Pro-Q4'));
});

test('nearby subtitle wording alone cannot support a step action', () => {
  const site = realSite();
  const step = site.record.steps[3];
  const effectUses = site.record.effectUses.filter((effectUse) => effectUse.stepIndex === 3);
  assert.equal(site.track.cues.some((cue) => cue.text.includes('不是在你周围')), true);
  assert.equal(JSON.stringify({
    name: step.name,
    detail: step.detail,
    materials: step.materials,
    effectUses
  }).includes('不是在你周围'), false);
  const entry = clone(site.entry);
  entry.steps[3].learning.action = '不是在你周围。';
  const result = verifyVeto(entry);
  assert.ok(result.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('[step order 4]') &&
    failure.includes('learning.action') &&
    /unsupported/i.test(failure)
  )));
});

test('subtitle wording alone cannot support a map authored field', () => {
  const site = realSite();
  assert.equal(site.track.cues.some((cue) => cue.text.includes('自动驾驶模式')), true);
  assert.equal(JSON.stringify(site.record).includes('自动驾驶模式'), false);
  const entry = clone(site.entry);
  entry.learningMap.goal = '自动驾驶模式。';
  const result = verifyVeto(entry);
  assert.ok(result.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('learningMap.goal') &&
    /unsupported/i.test(failure)
  )));
});

test('Veto catalog entry passes content lint with 17 supported steps', () => {
  const site = realSite();
  const expected = {
    videoId: VETO_VIDEO_ID,
    steps: 17,
    warnings: [],
    failures: []
  };
  assert.deepEqual(verifyVeto(site.entry), expected);
  assert.deepEqual(verifyVeto(site.entry, { subtitleTrack: null }), expected);
});

test('production catalog covers every reviewed record and preserves all non-learning data', () => {
  const site = realSite();
  const descriptors = catalog.load({
    root: path.join(repoRoot, 'content', 'learning-maps'),
    records: site.records
  });
  const entries = descriptors.map((descriptor) => descriptor.entry);
  const byVideoId = new Map(entries.map((entry) => [entry.videoId, entry]));

  assert.equal(entries.length, site.records.length);
  assert.equal(entries.length, 85);
  assert.equal(entries.reduce((sum, entry) => sum + entry.steps.length, 0), 964);
  assert.equal(entries.every((entry) => entry.reviewed === true), true);
  assert.equal(entries.every((entry) => entry.reviewedAt === '2026-09-01'), true);

  for (const record of site.records) {
    const entry = byVideoId.get(record.videoId);
    assert.ok(entry, record.videoId);
    const merged = catalog.mergeEntry(record, entry);
    assert.deepEqual(stripLearning(merged), stripLearning(record), record.videoId);
    assert.deepEqual(record.learningMap, merged.learningMap, record.videoId);
    assert.deepEqual(
      record.steps.map((step) => step.learning),
      merged.steps.map((step) => step.learning),
      record.videoId
    );
  }
});

test('content lint rejects empty, course-like, parameter-table, placeholder, and boilerplate text', () => {
  const site = realSite();
  const cases = [
    ['empty', (entry) => { entry.learningMap.goal = '   '; }, /learningMap\.goal.*empty|empty.*learningMap\.goal/i],
    ['course', (entry) => { entry.steps[0].learning.action = '建议你完成练习并打卡。'; }, /练习|打卡|建议你/],
    ['parameter phrase', (entry) => { entry.steps[0].learning.action = '参数设置为 80 Hz。'; }, /参数设置|设置为|80\s*Hz/i],
    ['ratio', (entry) => { entry.steps[0].learning.action = '压缩比 2:1。'; }, /2:1|parameter/i],
    ['placeholder', (entry) => { entry.steps[0].learning.action = '自动生成，待补充。'; }, /自动生成|待补充/],
    ['boilerplate', (entry) => { entry.steps[0].learning.action = '进行处理，得到更好效果。'; }, /进行处理|得到更好效果/]
  ];
  for (const [label, mutate, pattern] of cases) {
    const entry = clone(site.entry);
    mutate(entry);
    const result = verifyVeto(entry);
    assert.ok(result.failures.some((failure) => pattern.test(failure)), label);
  }
});

test('content lint rejects duplicate normalized chapter summaries', () => {
  const site = realSite();
  const entry = clone(site.entry);
  entry.learningMap.chapters[1].summary = `  ${entry.learningMap.chapters[0].summary}  `;
  const result = verifyVeto(entry);
  assert.ok(result.failures.some((failure) => /chapter.*summary.*duplicate|duplicate.*chapter.*summary/i.test(failure)));
});

test('content lint rejects unsupported high-level learning text', () => {
  const site = realSite();
  const entry = clone(site.entry);
  entry.learningMap.goal = '星云折叠协议与量子花园容器。';
  const result = verifyVeto(entry);
  assert.ok(result.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('learningMap.goal') &&
    /unsupported/i.test(failure)
  )));
});

test('a supported map goal cannot hide an appended unsupported clause', () => {
  const site = realSite();
  const entry = clone(site.entry);
  entry.learningMap.goal = `${entry.learningMap.goal}同时打开量子花园。`;
  const result = verifyVeto(entry);
  assert.ok(result.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('learningMap.goal') &&
    /unsupported/i.test(failure)
  )));
});

test('content lint rejects effect-product wording drift and strict screenshot ownership drift', () => {
  const site = realSite();
  const productDrift = clone(site.entry);
  productDrift.steps[2].learning.action = '用 Pro-Q 3 只增加周期性的液态起伏。';
  const productResult = verifyVeto(productDrift);
  assert.ok(productResult.failures.some((failure) => (
    /videoId 3JjAK2uhxM4/.test(failure) &&
    /step order 3/.test(failure) &&
    /learning\.action/.test(failure) &&
    /Pro-Q|identity|product/i.test(failure)
  )));

  const record = clone(site.record);
  record.effectUses[0].screenshotKey = record.steps[3].imageKey;
  const screenshotResult = verifyVeto(site.entry, { record });
  assert.ok(screenshotResult.failures.some((failure) => (
    /effectUses\[0\]\.screenshotKey/.test(failure) && /step|owner|identity/i.test(failure)
  )));

  const duplicateOwnerRecord = clone(site.record);
  duplicateOwnerRecord.steps[3].imageKey = duplicateOwnerRecord.steps[2].imageKey;
  const duplicateOwnerRecords = site.records.map((candidate) => (
    candidate.videoId === duplicateOwnerRecord.videoId ? duplicateOwnerRecord : candidate
  ));
  const duplicateOwnerResult = verifyVeto(site.entry, {
    record: duplicateOwnerRecord,
    records: duplicateOwnerRecords
  });
  assert.ok(duplicateOwnerResult.failures.some((failure) => (
    /effectUses\[0\]\.screenshotKey/.test(failure) && /exactly one.*owner/i.test(failure)
  )));

  const imageManifest = clone(site.imageManifest);
  delete imageManifest[site.record.steps[2].imageKey];
  const manifestResult = verifyVeto(site.entry, { imageManifest });
  assert.ok(manifestResult.failures.some((failure) => (
    /step order 3/.test(failure) && /imageKey|manifest/i.test(failure)
  )));
});

test('a real missing step image is valid and an explicit null stays null in the packet', () => {
  const site = realSite();
  const source = site.records.find((record) => record.videoId === 'ChlEY5CCv-A');
  const stepIndex = source.steps.findIndex((step) => step.imageKey == null);
  assert.equal(stepIndex, 9);

  const actual = verify.verifyEntry({ videoId: source.videoId }, {
    record: source,
    records: site.records,
    imageManifest: site.imageManifest,
    path: `production-fixture/${source.videoId}.json`
  });
  assert.equal(actual.failures.some((failure) => (
    failure.includes(`[step order ${source.steps[stepIndex].order}]`) &&
    /imageKey|manifest|owner/i.test(failure)
  )), false);

  const record = clone(source);
  record.steps[stepIndex].imageKey = null;
  const records = site.records.map((candidate) => (
    candidate.videoId === record.videoId ? record : candidate
  ));
  const explicitNull = verify.verifyEntry({ videoId: record.videoId }, {
    record,
    records,
    imageManifest: site.imageManifest,
    path: `production-fixture/${record.videoId}-explicit-null.json`
  });
  assert.equal(explicitNull.failures.some((failure) => (
    failure.includes(`[step order ${record.steps[stepIndex].order}]`) &&
    /imageKey|manifest|owner/i.test(failure)
  )), false);

  const packet = prepare.buildPacket({
    record,
    records,
    imageManifest: site.imageManifest,
    subtitle: { status: 'missing', catalog: null, track: null, reason: 'fixture' }
  });
  assert.equal(packet.evidence.steps[stepIndex].imageKey, null);
  assert.deepEqual(packet.evidence.steps[stepIndex].image, {
    key: null,
    owners: [],
    manifest: null
  });
});

test('legacy production effect ids remain valid, unique, and unchanged in packets', () => {
  const site = realSite();
  const expected = new Map([
    ['zxfbE0exXKk', 'd8ed0db4:izotope-vocoder:1'],
    ['tj5Sn_rZhnk', 'upy3d1em:polyverse-manipulator:1'],
    ['f9OrpDtedSI', 'yt-f9OrpDtedSI:h3000-factory:1']
  ]);

  for (const [videoId, effectId] of expected) {
    const record = site.records.find((candidate) => candidate.videoId === videoId);
    assert.equal(record.effectUses[0].id, effectId);
    const result = verify.verifyEntry({ videoId }, {
      record,
      records: site.records,
      imageManifest: site.imageManifest,
      path: `production-fixture/${videoId}.json`
    });
    assert.equal(result.failures.some((failure) => failure.includes('effectUses[0].id')), false);

    const packet = prepare.buildPacket({
      record,
      records: site.records,
      imageManifest: site.imageManifest,
      subtitle: { status: 'missing', catalog: null, track: null, reason: 'fixture' }
    });
    assert.equal(packet.evidence.effectUses[0].id, effectId);
  }

  const rewritten = clone(site.records.find((record) => record.videoId === 'zxfbE0exXKk'));
  rewritten.effectUses[0].id = `${rewritten.id}:effect:rewritten`;
  const rewrittenResult = verify.verifyEntry({ videoId: rewritten.videoId }, {
    record: rewritten,
    records: site.records,
    imageManifest: site.imageManifest,
    path: `production-fixture/${rewritten.videoId}-rewritten.json`
  });
  assert.ok(rewrittenResult.failures.some((failure) => (
    failure.includes('effectUses[0].id') && /original|source|existing|changed/i.test(failure)
  )));

  const duplicate = clone(site.record);
  duplicate.effectUses[1].id = duplicate.effectUses[0].id;
  const duplicateRecords = site.records.map((record) => (
    record.videoId === duplicate.videoId ? duplicate : record
  ));
  const duplicateResult = verify.verifyEntry({ videoId: duplicate.videoId }, {
    record: duplicate,
    records: duplicateRecords,
    imageManifest: site.imageManifest,
    path: `production-fixture/${duplicate.videoId}-duplicate.json`
  });
  assert.ok(duplicateResult.failures.some((failure) => (
    /effectUses\[1\]\.id/.test(failure) && /unique|duplicate/i.test(failure)
  )));
});

test('all production step image and effect identities are structurally compatible', () => {
  const site = realSite();
  let missingRecords = 0;
  let missingSteps = 0;
  let legacyEffectIds = 0;
  const structuralFailures = [];

  for (const record of site.records) {
    const missing = record.steps.filter((step) => step.imageKey == null).length;
    if (missing > 0) missingRecords += 1;
    missingSteps += missing;
    legacyEffectIds += (record.effectUses || []).filter((effectUse) => (
      !effectUse.id.startsWith(`${record.id}:effect:`)
    )).length;

    const result = verify.verifyEntry({ videoId: record.videoId }, {
      record,
      records: site.records,
      imageManifest: site.imageManifest,
      path: `production-scan/${record.videoId}.json`
    });
    structuralFailures.push(...result.failures.filter((failure) => (
      /\] imageKey |\[field effectUses\[\d+\]\.(?:id|name|stepIndex|stepOrder|screenshotKey)\]/.test(failure)
    )));
  }

  assert.equal(site.records.length, 85);
  assert.equal(missingRecords, 20);
  assert.equal(missingSteps, 77);
  assert.equal(legacyEffectIds, 3);
  assert.deepEqual(structuralFailures, []);

  const mismatch = clone(site.record);
  mismatch.effectUses[0].screenshotKey = mismatch.steps[3].imageKey;
  const mismatchResult = verify.verifyEntry({ videoId: mismatch.videoId }, {
    record: mismatch,
    records: site.records,
    imageManifest: site.imageManifest,
    path: `production-scan/${mismatch.videoId}-mismatch.json`
  });
  assert.ok(mismatchResult.failures.some((failure) => (
    failure.includes('effectUses[0].screenshotKey') && /step|owner|identity/i.test(failure)
  )));
});

test('a real reviewed-missing screenshot can lint text and stays null in the packet', () => {
  const site = realSite();
  const record = clone(site.records.find((candidate) => candidate.videoId === '1uFMVg7TrGU'));
  const effectIndex = record.effectUses.findIndex((effectUse) => effectUse.name === 'Decapitator');
  const effectUse = record.effectUses[effectIndex];
  assert.equal(effectUse.screenshotReviewed, true);
  assert.equal(effectUse.screenshotKey, null);
  const step = record.steps[effectUse.stepIndex];
  const entry = {
    videoId: record.videoId,
    steps: [{
      order: step.order,
      learning: {
        input: step.name,
        problem: PROBLEM_PREFIX,
        action: step.name,
        result: step.name
      }
    }]
  };
  const result = verify.verifyEntry(entry, {
    record,
    records: site.records,
    imageManifest: site.imageManifest,
    subtitleTrack: null,
    path: 'production-fixture/1uFMVg7TrGU.json'
  });
  assert.equal(
    result.failures.some((failure) => /effectUses\[\d+\]\.screenshotKey/.test(failure)),
    false
  );
  assert.equal(
    result.failures.some((failure) => /learning\.(?:input|problem|action|result).*unsupported/i.test(failure)),
    false
  );

  const packet = prepare.buildPacket({
    record,
    records: site.records,
    imageManifest: site.imageManifest,
    subtitle: { status: 'missing', catalog: null, track: null, reason: 'fixture' }
  });
  assert.equal(packet.evidence.effectUses[effectIndex].screenshotKey, null);
  assert.equal(packet.evidence.effectUses[effectIndex].screenshot.key, null);
  assert.equal(packet.evidence.steps[effectUse.stepIndex].effectUses[0].screenshotKey, null);
  assert.notEqual(packet.evidence.effectUses[effectIndex].screenshotKey, step.imageKey);
});

test('reviewed null is valid while absent, blank, and non-null non-string keys are invalid', () => {
  const site = realSite();
  const source = site.records.find((candidate) => candidate.videoId === 'Ns8e5612fUw');
  assert.equal(source.effectUses[0].screenshotReviewed, true);
  assert.equal(source.effectUses[0].screenshotKey, null);
  const reviewed = verify.verifyEntry({ videoId: source.videoId }, {
    record: source,
    records: site.records,
    imageManifest: site.imageManifest,
    path: 'production-fixture/Ns8e5612fUw.json'
  });
  assert.equal(
    reviewed.failures.some((failure) => failure.includes('effectUses[0].screenshotKey')),
    false
  );

  for (const missingKey of ['absent', undefined, '   ']) {
    const missingRecord = clone(source);
    if (missingKey === 'absent') delete missingRecord.effectUses[0].screenshotKey;
    else missingRecord.effectUses[0].screenshotKey = missingKey;
    const missing = verify.verifyEntry({ videoId: missingRecord.videoId }, {
      record: missingRecord,
      records: site.records,
      imageManifest: site.imageManifest,
      path: 'production-fixture/Ns8e5612fUw.json'
    });
    assert.ok(missing.failures.some((failure) => (
      failure.includes('effectUses[0].screenshotKey') && /present|null|non-empty|string/i.test(failure)
    )), String(missingKey));
  }

  const invalidRecord = clone(source);
  invalidRecord.effectUses[0].screenshotKey = 42;
  const invalid = verify.verifyEntry({ videoId: invalidRecord.videoId }, {
    record: invalidRecord,
    records: site.records,
    imageManifest: site.imageManifest,
    path: 'production-fixture/Ns8e5612fUw.json'
  });
  assert.ok(invalid.failures.some((failure) => (
    failure.includes('effectUses[0].screenshotKey') && /string/i.test(failure)
  )));
});

test('production missing screenshot states avoid ownership errors while real mismatches still fail', () => {
  const site = realSite();
  let missingCount = 0;
  for (const source of site.records) {
    const missingIndexes = (source.effectUses || [])
      .map((effectUse, index) => ({ effectUse, index }))
      .filter(({ effectUse }) => (
        effectUse.screenshotKey === null ||
        typeof effectUse.screenshotKey === 'undefined' ||
        (typeof effectUse.screenshotKey === 'string' && !effectUse.screenshotKey.trim())
      ))
      .map(({ index }) => index);
    if (missingIndexes.length === 0) continue;
    missingCount += missingIndexes.length;

    const actual = verify.verifyEntry({ videoId: source.videoId }, {
      record: source,
      records: site.records,
      imageManifest: site.imageManifest,
      path: `production-scan/${source.videoId}.json`
    });
    for (const index of missingIndexes) {
      const fieldFailures = actual.failures.filter((failure) => (
        failure.includes(`effectUses[${index}].screenshotKey`)
      ));
      assert.equal(source.effectUses[index].screenshotReviewed, true);
      assert.deepEqual(fieldFailures, [], `${source.videoId} effectUses[${index}]`);
    }
  }
  assert.equal(missingCount, 63);

  const mismatchRecord = clone(site.record);
  mismatchRecord.effectUses[0].screenshotKey = mismatchRecord.steps[3].imageKey;
  const mismatch = verify.verifyEntry({ videoId: mismatchRecord.videoId }, {
    record: mismatchRecord,
    records: site.records,
    imageManifest: site.imageManifest,
    path: `production-scan/${mismatchRecord.videoId}.json`
  });
  assert.ok(mismatch.failures.some((failure) => (
    failure.includes('effectUses[0].screenshotKey') && /step|owner|identity/i.test(failure)
  )));
});

test('unsupported learning text is checked against only the matching step evidence and names every field', () => {
  const site = realSite();
  const entry = clone(site.entry);
  entry.steps[2].learning.input = '己方与敌方版本。';
  entry.steps[2].learning.action = '改成负面调性并加入点击尾音。';
  entry.steps[2].learning.result = '玩家可以判断敌我。';
  const result = verifyVeto(entry);
  for (const field of ['input', 'action', 'result']) {
    assert.ok(result.failures.some((failure) => (
      failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
      failure.includes('[step order 3]') &&
      failure.includes(`learning.${field}`) &&
      /unsupported/i.test(failure)
    )), field);
  }
});

test('step-local support is required independently for input, action, and result', () => {
  const site = realSite();
  const entry = clone(site.entry);
  entry.steps[2].learning.input = '星云折叠协议。';
  const result = verifyVeto(entry);
  assert.ok(result.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('[step order 3]') &&
    failure.includes('learning.input') &&
    /unsupported/i.test(failure)
  )));
  assert.equal(result.failures.some((failure) => (
    failure.includes('[step order 3]') &&
    /learning\.(?:action|result).*unsupported/i.test(failure)
  )), false);
});

test('plugin action verbs stay attached to a supported Veto step action', () => {
  const site = realSite();
  const actions = [
    '选择打开 PhaseMistress，只改变运动质感。',
    '使用插件 PhaseMistress，只改变运动质感。',
    '启用插件 PhaseMistress，只改变运动质感。',
    '打开插件 PhaseMistress，只改变运动质感。'
  ];
  for (const action of actions) {
    const entry = clone(site.entry);
    entry.steps[2].learning.action = action;
    assert.deepEqual(verifyVeto(entry).failures, [], action);
  }
});

test('selecting a supported Pro-Q 3 replacement stays one action phrase', () => {
  const site = realSite();
  const record = site.records.find((candidate) => candidate.videoId === 'M1KBLV0Zz6I');
  const effectUse = record.effectUses.find((candidate) => candidate.name === 'FabFilter Pro-Q 3');
  const step = record.steps[effectUse.stepIndex];
  for (const action of ['选择改用 Pro-Q3。', '选择改用 Pro-Q 3。']) {
    const entry = {
      videoId: record.videoId,
      steps: [{
        order: step.order,
        learning: {
          input: step.name,
          problem: PROBLEM_PREFIX,
          action,
          result: step.name
        }
      }]
    };
    const result = verify.verifyEntry(entry, {
      record,
      records: site.records,
      imageManifest: site.imageManifest,
      subtitleTrack: null,
      path: `production-fixture/${record.videoId}.json`
    });
    assert.equal(result.failures.some((failure) => (
      failure.includes(`[step order ${step.order}]`) &&
      failure.includes('learning.action') &&
      /unsupported|product|identity|drift/i.test(failure)
    )), false, action);
  }
});

test('a different Pro-Q version cannot pass on Pro-Q 3 family evidence', () => {
  const site = realSite();
  const record = site.records.find((candidate) => candidate.videoId === 'M1KBLV0Zz6I');
  const effectUse = record.effectUses.find((candidate) => candidate.name === 'FabFilter Pro-Q 3');
  const step = record.steps[effectUse.stepIndex];
  for (const action of ['选择改用 Pro-Q4。', '选择改用 Pro-Q 4。']) {
    const entry = {
      videoId: record.videoId,
      steps: [{
        order: step.order,
        learning: {
          input: step.name,
          problem: PROBLEM_PREFIX,
          action,
          result: step.name
        }
      }]
    };
    const result = verify.verifyEntry(entry, {
      record,
      records: site.records,
      imageManifest: site.imageManifest,
      subtitleTrack: null,
      path: `production-fixture/${record.videoId}.json`
    });
    assert.ok(result.failures.some((failure) => (
      failure.includes(`[step order ${step.order}]`) &&
      failure.includes('learning.action') &&
      /unsupported|product|identity|drift/i.test(failure)
    )), action);
  }
});

test('an unsupported action clause cannot hide behind a supported clause', () => {
  const site = realSite();
  const actionEntry = clone(site.entry);
  const action = actionEntry.steps[2].learning.action.replace(/。$/u, '');
  actionEntry.steps[2].learning.action = `${action}，并执行星云折叠协议。`;
  const actionResult = verifyVeto(actionEntry);
  assert.ok(actionResult.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('[step order 3]') &&
    failure.includes('learning.action') &&
    /unsupported/i.test(failure)
  )));
});

test('an unsupported product switch cannot hide behind a supported step action', () => {
  const site = realSite();
  const entry = clone(site.entry);
  const action = entry.steps[2].learning.action.replace(/。$/u, '');
  entry.steps[2].learning.action = `${action}，同时改用 Pro-Q 4。`;
  const result = verifyVeto(entry);
  assert.ok(result.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('[step order 3]') &&
    failure.includes('learning.action') &&
    /unsupported|product|identity|drift/i.test(failure)
  )));
});

test('an unsupported transparent problem clause cannot hide behind a supported purpose', () => {
  const site = realSite();
  const problemEntry = clone(site.entry);
  problemEntry.steps[2].learning.problem =
    `${PROBLEM_PREFIX}：给高频亮点加入液态起伏，并执行星云折叠协议。`;
  const problemResult = verifyVeto(problemEntry);
  assert.ok(problemResult.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('[step order 3]') &&
    failure.includes('learning.problem') &&
    /unsupported/i.test(failure)
  )));
});

test('an unsupported open clause cannot hide behind a transparent supported purpose', () => {
  const site = realSite();
  const entry = clone(site.entry);
  entry.steps[2].learning.problem =
    `${PROBLEM_PREFIX}：给高频亮点加入液态起伏，同时打开量子花园。`;
  const result = verifyVeto(entry);
  assert.ok(result.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('[step order 3]') &&
    failure.includes('learning.problem') &&
    /unsupported/i.test(failure)
  )));
});

test('transparent problem prefix is exact and any suffix must use the step processing purpose', () => {
  const site = realSite();
  const transparent = clone(site.entry);
  transparent.steps[2].learning.problem = PROBLEM_PREFIX;
  assert.deepEqual(verifyVeto(transparent).failures, []);

  const supportedSuffix = clone(site.entry);
  supportedSuffix.steps[2].learning.problem = `${PROBLEM_PREFIX}：给高频亮点加入液态起伏`;
  assert.deepEqual(verifyVeto(supportedSuffix).failures, []);

  const inventedSuffix = clone(site.entry);
  inventedSuffix.steps[2].learning.problem = `${PROBLEM_PREFIX}：星云折叠协议`;
  const result = verifyVeto(inventedSuffix);
  assert.ok(result.failures.some((failure) => (
    failure.includes(`[videoId ${VETO_VIDEO_ID}]`) &&
    failure.includes('[step order 3]') &&
    failure.includes('learning.problem') &&
    /unsupported|purpose/i.test(failure)
  )));
});

test('verification CLI reports exact Veto record, step, warning, and failure counts', () => {
  let stdout = '';
  const execution = verify.runCli(['--videos', VETO_VIDEO_ID], {
    root: repoRoot,
    stdout: { write(chunk) { stdout += String(chunk); } }
  });
  assert.equal(execution.exitCode, 0);
  assert.deepEqual(execution.report, {
    mode: 'verify',
    filter: { category: null, videos: [VETO_VIDEO_ID] },
    records: 1,
    steps: 17,
    warnings: 0,
    failures: 0,
    details: []
  });
  assert.equal(stdout, JSON.stringify(execution.report, null, 2) + '\n');
});
