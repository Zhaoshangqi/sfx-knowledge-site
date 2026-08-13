'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const {
  extractRecords,
  importVtt,
  buildCatalog,
  writeCatalog,
  fetchPublic,
  runCli
} = require('../tools/batch-site-subtitles.cjs');

const verifierPath = path.join(__dirname, '..', 'tools', 'verify-portable-kit.cjs');

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sfx-batch-subtitles-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function videoId(index) {
  return 'v' + String(index).padStart(10, '0');
}

function records(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: 'yt-' + videoId(index),
    title: 'Video ' + index,
    videoId: videoId(index)
  }));
}

function indexHtml(siteRecords) {
  return [
    '<!doctype html>',
    '<script>',
    '  const records = ' + JSON.stringify(siteRecords, null, 2) + ';',
    '',
    '  const imageManifest = {};',
    '</script>'
  ].join('\n');
}

function vtt(text = 'Caption') {
  return [
    'WEBVTT',
    '',
    '00:00:01.000 --> 00:00:03.000',
    text,
    ''
  ].join('\n');
}

function track(id, overrides = {}) {
  return {
    videoId: id,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-13',
    cues: [{ start: 1, end: 3, text: 'Caption' }],
    ...overrides
  };
}

function writeTrack(directory, value, filename = value.videoId + '.json') {
  fs.writeFileSync(path.join(directory, filename), JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function moduleFixture() {
  return [
    '(function () {',
    '  var before = true;',
    '  /* SUBTITLE_CATALOG_START */',
    '  var rawCatalog = [];',
    '  /* SUBTITLE_CATALOG_END */',
    '  var after = true;',
    '}());',
    ''
  ].join('\n');
}

function tracingFs(events) {
  const traced = Object.create(fs);
  traced.writeFileSync = function (filename, ...args) {
    events.push({ operation: 'write', filename: path.resolve(filename) });
    return fs.writeFileSync(filename, ...args);
  };
  traced.renameSync = function (from, to) {
    events.push({ operation: 'rename', from: path.resolve(from), to: path.resolve(to) });
    return fs.renameSync(from, to);
  };
  return traced;
}

function argumentAfter(args, name) {
  const index = args.indexOf(name);
  assert.notEqual(index, -1, 'missing argument ' + name);
  return args[index + 1];
}

function writeFixtureFile(root, relative, content = '') {
  const filename = path.join(root, ...relative.split('/'));
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, content, 'utf8');
  return filename;
}

function portableVerifierFixture(t, siteRecords, catalog) {
  const root = temporaryDirectory(t);
  const placeholders = [
    'AGENTS.md',
    'README.md',
    'docs/learning-workflow.md',
    'requirements.txt',
    'skills/sfx-knowledge/references/sfx-knowledge.md',
    'skills/sfx-knowledge/references/video-learnings.md',
    'tools/prepare-sfx-video.py',
    'tools/extract-video-context.cjs',
    'tools/export-site-memory.cjs',
    'tools/build-site-subtitles.cjs',
    'tools/batch-site-subtitles.cjs',
    'tools/install-sfx-skill.ps1'
  ];
  placeholders.forEach((relative) => writeFixtureFile(root, relative));
  writeFixtureFile(root, 'index.html', indexHtml(siteRecords));
  writeFixtureFile(root, 'src/video-subtitles.js', [
    '/* SUBTITLE_CATALOG_START */',
    'var rawCatalog = ' + JSON.stringify(catalog, null, 2) + ';',
    '/* SUBTITLE_CATALOG_END */',
    ''
  ].join('\n'));
  writeFixtureFile(root, 'skills/sfx-knowledge/SKILL.md', [
    '---',
    'name: sfx-knowledge',
    'description: Portable verifier fixture',
    '---',
    '',
    'Uses site-video-memory.md.',
    ''
  ].join('\n'));
  const validIds = siteRecords
    .map((record) => record.videoId)
    .filter((id) => typeof id === 'string' && /^[A-Za-z0-9_-]{11}$/.test(id));
  writeFixtureFile(
    root,
    'skills/sfx-knowledge/references/site-video-memory.md',
    validIds.map((id) => '## ' + id + ' - Fixture').join('\n') + '\n'
  );
  writeFixtureFile(root, 'tools/data/subtitle-status-overrides.json', '{}\n');
  writeFixtureFile(root, '.gitignore', '.venv/\n.work/\ncookies*.txt\n.env\n');
  fs.mkdirSync(path.join(root, 'assets', 'subtitles'), { recursive: true });
  const fixtureVerifier = path.join(root, 'tools', 'verify-portable-kit.cjs');
  fs.copyFileSync(verifierPath, fixtureVerifier);

  const git = spawnSync('git', ['init', '--quiet'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true
  });
  assert.equal(git.status, 0, git.stderr);
  return { root, verifierPath: fixtureVerifier };
}

test('extractRecords parses all 82 records in source order', () => {
  const expected = records(82);
  const actual = extractRecords(indexHtml(expected));

  assert.equal(actual.length, 82);
  assert.deepEqual(actual.map((record) => record.videoId), expected.map((record) => record.videoId));
});

test('extractRecords rejects duplicate record video IDs', () => {
  const duplicated = records(2);
  duplicated[1].videoId = duplicated[0].videoId;

  assert.throws(() => extractRecords(indexHtml(duplicated)), /duplicate.*videoId/i);
});

test('portable verifier rejects 82 records when only 81 have valid video IDs', (t) => {
  const siteRecords = records(82);
  delete siteRecords[81].videoId;
  const catalog = siteRecords.slice(0, 81).map((record) => ({
    videoId: record.videoId,
    contentStatus: 'missing'
  }));
  const fixture = portableVerifierFixture(t, siteRecords, catalog);

  const result = spawnSync(process.execPath, [fixture.verifierPath], {
    cwd: fixture.root,
    encoding: 'utf8',
    windowsHide: true
  });

  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.records, 82);
  assert.equal(report.uniqueVideoIds, 81);
  assert.equal(report.subtitleCatalogCoverage, '81/82');
  assert.ok(report.failures.some((failure) => /invalid.*videoId.*index 81/i.test(failure)));
  assert.ok(report.failures.some((failure) => /expected 82 valid unique video IDs/i.test(failure)));
});

test('buildCatalog emits exactly one ordered entry per site record and exact coverage counts', (t) => {
  const directory = temporaryDirectory(t);
  const tracksRoot = path.join(directory, 'tracks');
  fs.mkdirSync(tracksRoot);
  const siteRecords = records(82);
  writeTrack(tracksRoot, track(siteRecords[4].videoId, {
    cues: [
      { start: 1, end: 2, text: 'One' },
      { start: 2, end: 3, text: 'Two' }
    ]
  }));
  writeTrack(tracksRoot, track(siteRecords[70].videoId, {
    source: 'site-owned-from-local-transcription'
  }));

  const { catalog, report } = buildCatalog({
    records: siteRecords,
    tracksRoot,
    overrides: {
      [siteRecords[10].videoId]: {
        contentStatus: 'no-speech',
        updatedAt: '2026-08-13',
        auditNote: 'Visual-only demonstration confirmed by reviewer.'
      },
      [siteRecords[11].videoId]: {
        contentStatus: 'missing',
        updatedAt: '2026-08-13',
        reason: 'Public captions unavailable; transcription is pending.'
      }
    }
  });

  assert.equal(catalog.length, 82);
  assert.equal(new Set(catalog.map((entry) => entry.videoId)).size, 82);
  assert.deepEqual(catalog.map((entry) => entry.videoId), siteRecords.map((record) => record.videoId));
  assert.deepEqual(report, {
    total: 82,
    tracks: 2,
    publicCaptions: 1,
    localTranscriptions: 1,
    noSpeech: 1,
    missing: 79,
    cues: 3
  });

  const publicEntry = catalog[4];
  assert.deepEqual(publicEntry, {
    videoId: siteRecords[4].videoId,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-13',
    contentStatus: 'track',
    asset: 'assets/subtitles/' + siteRecords[4].videoId + '.json'
  });
  assert.equal(Object.hasOwn(catalog[10], 'asset'), false);
  assert.equal(Object.hasOwn(catalog[11], 'asset'), false);
  assert.equal(catalog[12].contentStatus, 'missing');
  assert.equal(catalog[12].reason, 'no-subtitle-track-or-approved-override');
});

test('buildCatalog rejects orphan subtitle JSON', (t) => {
  const directory = temporaryDirectory(t);
  const tracksRoot = path.join(directory, 'tracks');
  fs.mkdirSync(tracksRoot);
  writeTrack(tracksRoot, track(videoId(99)));

  assert.throws(() => buildCatalog({
    records: records(2),
    tracksRoot,
    overrides: {}
  }), /orphan.*subtitle/i);
});

test('buildCatalog rejects malformed JSON and malformed production tracks', (t) => {
  const directory = temporaryDirectory(t);
  const tracksRoot = path.join(directory, 'tracks');
  fs.mkdirSync(tracksRoot);
  const id = videoId(0);
  const filename = path.join(tracksRoot, id + '.json');
  fs.writeFileSync(filename, '{"videoId":', 'utf8');

  assert.throws(() => buildCatalog({
    records: records(1),
    tracksRoot,
    overrides: {}
  }), /malformed subtitle JSON/i);

  fs.writeFileSync(filename, JSON.stringify(track(id, {
    cues: [{ start: 3, end: 1, text: 'Backwards' }]
  })), 'utf8');
  assert.throws(() => buildCatalog({
    records: records(1),
    tracksRoot,
    overrides: {}
  }), /invalid subtitle track/i);
});

test('buildCatalog rejects a filename video ID that differs from track videoId', (t) => {
  const directory = temporaryDirectory(t);
  const tracksRoot = path.join(directory, 'tracks');
  fs.mkdirSync(tracksRoot);
  writeTrack(tracksRoot, track(videoId(0)), videoId(1) + '.json');

  assert.throws(() => buildCatalog({
    records: records(2),
    tracksRoot,
    overrides: {}
  }), /filename.*videoId/i);
});

test('override schema allows only evidence-bearing no-speech and missing entries', (t) => {
  const directory = temporaryDirectory(t);
  const tracksRoot = path.join(directory, 'tracks');
  fs.mkdirSync(tracksRoot);
  const siteRecords = records(2);

  assert.doesNotThrow(() => buildCatalog({
    records: siteRecords,
    tracksRoot,
    overrides: {
      [siteRecords[0].videoId]: {
        contentStatus: 'no-speech',
        updatedAt: '2026-08-13',
        auditNote: 'Reviewed from start to finish.'
      },
      [siteRecords[1].videoId]: {
        contentStatus: 'missing',
        updatedAt: '2026-08-13',
        reason: 'Source has no usable captions.'
      }
    }
  }));

  const invalidEntries = [
    { contentStatus: 'track', updatedAt: '2026-08-13', reason: 'Not allowed.' },
    { contentStatus: 'missing', reason: 'No audit date.' },
    { contentStatus: 'no-speech', updatedAt: '2026-08-13' },
    { contentStatus: 'missing', updatedAt: '2026-02-30', reason: 'Bad date.' },
    { contentStatus: 'missing', updatedAt: '2026-08-13', reason: '   ' },
    { contentStatus: 'missing', updatedAt: '2026-08-13', reason: 'Valid', extra: true }
  ];

  invalidEntries.forEach((entry) => {
    assert.throws(() => buildCatalog({
      records: siteRecords,
      tracksRoot,
      overrides: { [siteRecords[0].videoId]: entry }
    }), /override/i);
  });
});

test('overrides cannot shadow tracks or refer to non-record IDs', (t) => {
  const directory = temporaryDirectory(t);
  const tracksRoot = path.join(directory, 'tracks');
  fs.mkdirSync(tracksRoot);
  const siteRecords = records(1);
  writeTrack(tracksRoot, track(siteRecords[0].videoId));
  const evidence = {
    contentStatus: 'missing',
    updatedAt: '2026-08-13',
    reason: 'Pending.'
  };

  assert.throws(() => buildCatalog({
    records: siteRecords,
    tracksRoot,
    overrides: { [siteRecords[0].videoId]: evidence }
  }), /override.*shadow/i);
  assert.throws(() => buildCatalog({
    records: siteRecords,
    tracksRoot,
    overrides: { [videoId(9)]: evidence }
  }), /orphan.*override/i);
});

test('importVtt preserves existing output unless force is set', (t) => {
  const directory = temporaryDirectory(t);
  const inputRoot = path.join(directory, 'input');
  const outputRoot = path.join(directory, 'output');
  fs.mkdirSync(inputRoot);
  fs.mkdirSync(outputRoot);
  const id = videoId(0);
  const inputPath = path.join(inputRoot, id + '.zh-Hans.vtt');
  const outputPath = path.join(outputRoot, id + '.json');
  fs.writeFileSync(inputPath, vtt('New caption'), 'utf8');
  fs.writeFileSync(outputPath, 'existing output\n', 'utf8');

  const options = {
    inputRoot,
    outputRoot,
    inputPath,
    videoId: id,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-13'
  };
  assert.throws(() => importVtt(options), /already exists.*--force/i);
  assert.equal(fs.readFileSync(outputPath, 'utf8'), 'existing output\n');

  const result = importVtt({ ...options, force: true });
  assert.equal(result.outputPath, outputPath);
  assert.equal(JSON.parse(fs.readFileSync(outputPath, 'utf8')).cues[0].text, 'New caption');
});

test('importVtt writes a temporary sibling and atomically renames it', (t) => {
  const directory = temporaryDirectory(t);
  const inputRoot = path.join(directory, 'input');
  const outputRoot = path.join(directory, 'output');
  fs.mkdirSync(inputRoot);
  fs.mkdirSync(outputRoot);
  const id = videoId(0);
  const inputPath = path.join(inputRoot, id + '.zh-Hans.vtt');
  const outputPath = path.join(outputRoot, id + '.json');
  fs.writeFileSync(inputPath, vtt(), 'utf8');
  const events = [];

  importVtt({
    inputRoot,
    outputRoot,
    inputPath,
    videoId: id,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-13',
    fsImpl: tracingFs(events)
  });

  const rename = events.find((event) => event.operation === 'rename');
  assert.ok(rename);
  assert.equal(rename.to, outputPath);
  assert.equal(path.dirname(rename.from), outputRoot);
  assert.notEqual(rename.from, outputPath);
  assert.ok(events.some((event) => event.operation === 'write' && event.filename === rename.from));
  assert.equal(fs.existsSync(rename.from), false);
});

test('importVtt preserves an unowned colliding temp and the target when exclusive create fails', (t) => {
  const directory = temporaryDirectory(t);
  const inputRoot = path.join(directory, 'input');
  const outputRoot = path.join(directory, 'output');
  fs.mkdirSync(inputRoot);
  fs.mkdirSync(outputRoot);
  const id = videoId(0);
  const inputPath = path.join(inputRoot, id + '.zh-Hans.vtt');
  const outputPath = path.join(outputRoot, id + '.json');
  fs.writeFileSync(inputPath, vtt(), 'utf8');
  fs.writeFileSync(outputPath, 'previous target\n', 'utf8');
  let collisionPath = null;
  const collisionFs = Object.create(fs);
  collisionFs.writeFileSync = function (filename, content, options) {
    if (options && options.flag === 'wx') {
      collisionPath = filename;
      fs.writeFileSync(filename, 'foreign temp\n', 'utf8');
    }
    return fs.writeFileSync(filename, content, options);
  };

  assert.throws(() => importVtt({
    inputRoot,
    outputRoot,
    inputPath,
    videoId: id,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-13',
    force: true,
    fsImpl: collisionFs
  }), (error) => error && error.code === 'EEXIST');

  assert.ok(collisionPath);
  assert.equal(fs.existsSync(collisionPath), true);
  assert.equal(fs.readFileSync(collisionPath, 'utf8'), 'foreign temp\n');
  assert.equal(fs.readFileSync(outputPath, 'utf8'), 'previous target\n');
});

test('importVtt rejects traversal, symlink escapes, and filename identity mismatches', (t) => {
  const directory = temporaryDirectory(t);
  const inputRoot = path.join(directory, 'input');
  const outputRoot = path.join(directory, 'output');
  const outside = path.join(directory, 'outside');
  fs.mkdirSync(inputRoot);
  fs.mkdirSync(outputRoot);
  fs.mkdirSync(outside);
  const id = videoId(0);
  const otherId = videoId(1);
  const outsideInput = path.join(outside, id + '.zh-Hans.vtt');
  fs.writeFileSync(outsideInput, vtt(), 'utf8');

  const base = {
    inputRoot,
    outputRoot,
    inputPath: outsideInput,
    videoId: id,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-13'
  };
  assert.throws(() => importVtt(base), /outside input root/i);

  const insideInput = path.join(inputRoot, id + '.zh-Hans.vtt');
  fs.writeFileSync(insideInput, vtt(), 'utf8');
  assert.throws(() => importVtt({
    ...base,
    inputPath: insideInput,
    outputPath: path.join(outside, id + '.json')
  }), /outside output root/i);
  assert.throws(() => importVtt({
    ...base,
    inputPath: insideInput,
    videoId: otherId
  }), /filename.*videoId/i);

  const linkPath = path.join(inputRoot, id + '.local.vtt');
  try {
    fs.symlinkSync(outsideInput, linkPath, 'file');
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') return;
    throw error;
  }
  assert.throws(() => importVtt({ ...base, inputPath: linkPath }), /symlink|outside input root/i);
});

test('writeCatalog preserves module surroundings and atomically writes module and report', (t) => {
  const directory = temporaryDirectory(t);
  const modulePath = path.join(directory, 'video-subtitles.js');
  const reportPath = path.join(directory, 'coverage-report.json');
  fs.writeFileSync(modulePath, moduleFixture(), 'utf8');
  const siteRecords = records(2);
  const catalog = siteRecords.map((record) => ({
    videoId: record.videoId,
    contentStatus: 'missing',
    reason: 'no-subtitle-track-or-approved-override'
  }));
  const report = {
    total: 2,
    tracks: 0,
    publicCaptions: 0,
    localTranscriptions: 0,
    noSpeech: 0,
    missing: 2,
    cues: 0
  };
  const events = [];

  writeCatalog({
    modulePath,
    reportPath,
    moduleRoot: directory,
    reportRoot: directory,
    catalog,
    report,
    fsImpl: tracingFs(events)
  });

  const updated = fs.readFileSync(modulePath, 'utf8');
  assert.match(updated, /var before = true;/);
  assert.match(updated, /var after = true;/);
  const rawCatalog = JSON.parse(updated.match(/var rawCatalog = ([\s\S]*?);\r?\n\s*\/\* SUBTITLE_CATALOG_END \*\//)[1]);
  assert.deepEqual(rawCatalog, catalog);
  assert.deepEqual(JSON.parse(fs.readFileSync(reportPath, 'utf8')), report);

  const renames = events.filter((event) => event.operation === 'rename');
  assert.equal(renames.length, 2);
  renames.forEach((event) => {
    assert.equal(path.dirname(event.from), path.dirname(event.to));
    assert.notEqual(event.from, event.to);
    assert.ok(events.some((candidate) => candidate.operation === 'write' && candidate.filename === event.from));
    assert.equal(fs.existsSync(event.from), false);
  });
});

test('fetchPublic uses canonical URLs, skips complete videos, and inventories partial failures', (t) => {
  const directory = temporaryDirectory(t);
  const workRoot = path.join(directory, 'work');
  fs.mkdirSync(workRoot);
  const siteRecords = records(3);
  const completeId = siteRecords[0].videoId;
  const partialId = siteRecords[1].videoId;
  const failedId = siteRecords[2].videoId;
  fs.writeFileSync(path.join(workRoot, completeId + '.zh-Hans.vtt'), vtt(), 'utf8');
  fs.writeFileSync(path.join(workRoot, completeId + '.en-orig.vtt'), vtt(), 'utf8');
  const calls = [];

  const runner = (command, args, options) => {
    calls.push({ command, args: [...args], options });
    const url = new URL(args.at(-1));
    const id = url.searchParams.get('v');
    if (id === partialId) {
      fs.writeFileSync(path.join(workRoot, id + '.zh-Hans.vtt'), vtt(), 'utf8');
      return { status: 0, stdout: '', stderr: '' };
    }
    fs.writeFileSync(path.join(workRoot, id + '.en-orig.vtt'), vtt(), 'utf8');
    return {
      status: 0,
      stdout: '',
      stderr: "ERROR: Unable to download video subtitles for 'zh-Hans': HTTP Error 429"
    };
  };

  const inventory = fetchPublic({ records: siteRecords, workRoot, runner });

  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map((call) => call.args.at(-1)), [
    'https://www.youtube.com/watch?v=' + partialId,
    'https://www.youtube.com/watch?v=' + failedId
  ]);
  calls.forEach(({ command, args, options }) => {
    assert.equal(command, 'yt-dlp');
    assert.equal(options.shell, false);
    assert.ok(args.includes('--skip-download'));
    assert.ok(args.includes('--write-auto-subs'));
    assert.ok(args.includes('--ignore-errors'));
    assert.ok(args.includes('--no-overwrites'));
    assert.equal(argumentAfter(args, '--sub-langs'), 'zh-Hans,en-orig');
    assert.equal(argumentAfter(args, '--sub-format'), 'vtt');
    assert.ok(Number(argumentAfter(args, '--sleep-requests')) > 0);
    assert.ok(Number(argumentAfter(args, '--sleep-subtitles')) > 0);
    assert.ok(Number(argumentAfter(args, '--retries')) > 0);
    assert.match(argumentAfter(args, '--retry-sleep'), /exp/i);
    assert.equal(args.some((argument) => /cookie|login/i.test(argument)), false);
  });

  assert.equal(inventory.total, 3);
  assert.equal(inventory.attempted, 2);
  assert.equal(inventory.skipped, 1);
  assert.deepEqual(inventory.summary, {
    'zh-Hans': { found: 2, missing: 0, failed: 1 },
    'en-orig': { found: 2, missing: 1, failed: 0 }
  });
  assert.equal(inventory.videos[1].languages['en-orig'].status, 'missing');
  assert.equal(inventory.videos[1].languages['en-orig'].reason, 'not-produced');
  assert.equal(inventory.videos[2].languages['zh-Hans'].status, 'failed');
  assert.equal(inventory.videos[2].languages['zh-Hans'].reason, 'http-429');
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(workRoot, 'public-caption-inventory.json'), 'utf8')),
    inventory
  );
});

test('fetchPublic never invokes yt-dlp for zero URLs', (t) => {
  const directory = temporaryDirectory(t);
  let calls = 0;
  const inventory = fetchPublic({
    records: [],
    workRoot: directory,
    runner: () => {
      calls += 1;
      return { status: 0, stdout: '', stderr: '' };
    }
  });

  assert.equal(calls, 0);
  assert.equal(inventory.total, 0);
  assert.deepEqual(inventory.videos, []);
});

test('fetchPublic records thrown runner errors instead of losing the inventory', (t) => {
  const directory = temporaryDirectory(t);
  const siteRecords = records(1);

  const inventory = fetchPublic({
    records: siteRecords,
    workRoot: directory,
    runner: () => {
      throw new Error('yt-dlp could not start');
    }
  });

  assert.deepEqual(inventory.summary, {
    'zh-Hans': { found: 0, missing: 0, failed: 1 },
    'en-orig': { found: 0, missing: 0, failed: 1 }
  });
  assert.equal(
    fs.existsSync(path.join(directory, 'public-caption-inventory.json')),
    true
  );
});

test('CLI import and catalog commands use the documented argument surface', (t) => {
  const directory = temporaryDirectory(t);
  const inputRoot = path.join(directory, 'input');
  const tracksRoot = path.join(directory, 'tracks');
  const indexPath = path.join(directory, 'index.html');
  const overridesPath = path.join(directory, 'overrides.json');
  const modulePath = path.join(directory, 'video-subtitles.js');
  const reportPath = path.join(directory, 'report.json');
  fs.mkdirSync(inputRoot);
  fs.mkdirSync(tracksRoot);
  const id = videoId(0);
  fs.writeFileSync(path.join(inputRoot, id + '.zh-Hans.vtt'), vtt(), 'utf8');
  fs.writeFileSync(indexPath, indexHtml(records(1)), 'utf8');
  fs.writeFileSync(overridesPath, '{}\n', 'utf8');
  fs.writeFileSync(modulePath, moduleFixture(), 'utf8');

  assert.equal(runCli([
    'import',
    '--input', inputRoot,
    '--output', tracksRoot,
    '--updated-at', '2026-08-13'
  ]), 0);
  assert.equal(runCli([
    'catalog',
    '--index', indexPath,
    '--tracks', tracksRoot,
    '--overrides', overridesPath,
    '--module', modulePath,
    '--report', reportPath
  ]), 0);

  assert.equal(fs.existsSync(path.join(tracksRoot, id + '.json')), true);
  assert.equal(JSON.parse(fs.readFileSync(reportPath, 'utf8')).tracks, 1);
});

test('CLI import skips protected outputs and continues importing new tracks', (t) => {
  const directory = temporaryDirectory(t);
  const inputRoot = path.join(directory, 'input');
  const outputRoot = path.join(directory, 'output');
  fs.mkdirSync(inputRoot);
  fs.mkdirSync(outputRoot);
  const protectedId = videoId(0);
  const newId = videoId(1);
  fs.writeFileSync(path.join(inputRoot, protectedId + '.zh-Hans.vtt'), vtt('Protected'), 'utf8');
  fs.writeFileSync(path.join(inputRoot, newId + '.zh-Hans.vtt'), vtt('New'), 'utf8');
  fs.writeFileSync(path.join(outputRoot, protectedId + '.json'), 'protected\n', 'utf8');

  assert.equal(runCli([
    'import',
    '--input', inputRoot,
    '--output', outputRoot,
    '--updated-at', '2026-08-13'
  ]), 0);

  assert.equal(fs.readFileSync(path.join(outputRoot, protectedId + '.json'), 'utf8'), 'protected\n');
  assert.equal(
    JSON.parse(fs.readFileSync(path.join(outputRoot, newId + '.json'), 'utf8')).videoId,
    newId
  );
});
