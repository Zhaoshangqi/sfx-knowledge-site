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
  validateTrack,
  runCli
} = require('../tools/batch-site-subtitles.cjs');

const verifierPath = path.join(__dirname, '..', 'tools', 'verify-portable-kit.cjs');
const batchToolPath = path.join(__dirname, '..', 'tools', 'batch-site-subtitles.cjs');
const buildToolPath = path.join(__dirname, '..', 'tools', 'build-site-subtitles.cjs');

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
  const descriptorPaths = new Map();
  traced.openSync = function (filename, ...args) {
    const resolved = path.resolve(filename);
    const descriptor = fs.openSync(filename, ...args);
    descriptorPaths.set(descriptor, resolved);
    events.push({ operation: 'open', filename: resolved, descriptor });
    return descriptor;
  };
  traced.writeFileSync = function (filename, ...args) {
    const resolved = typeof filename === 'number'
      ? descriptorPaths.get(filename)
      : path.resolve(filename);
    events.push({ operation: 'write', filename: resolved });
    return fs.writeFileSync(filename, ...args);
  };
  traced.closeSync = function (descriptor) {
    events.push({
      operation: 'close',
      filename: descriptorPaths.get(descriptor),
      descriptor
    });
    try {
      return fs.closeSync(descriptor);
    } finally {
      descriptorPaths.delete(descriptor);
    }
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

function stagedCaptionPath(args, videoIdValue, language) {
  const output = argumentAfter(args, '--output');
  return path.join(path.dirname(output), videoIdValue + '.' + language + '.vtt');
}

function writeFixtureFile(root, relative, content = '') {
  const filename = path.join(root, ...relative.split('/'));
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, content, 'utf8');
  return filename;
}

function portableVerifierFixture(t, siteRecords, catalog, options = {}) {
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
  const subtitleRoot = path.join(root, 'assets', 'subtitles');
  fs.mkdirSync(subtitleRoot, { recursive: true });
  Object.entries(options.subtitleTracks || {}).forEach(([filename, subtitleTrack]) => {
    writeFixtureFile(
      root,
      'assets/subtitles/' + filename,
      JSON.stringify(subtitleTrack, null, 2) + '\n'
    );
  });
  const fixtureVerifier = path.join(root, 'tools', 'verify-portable-kit.cjs');
  fs.copyFileSync(verifierPath, fixtureVerifier);
  fs.copyFileSync(batchToolPath, path.join(root, 'tools', 'batch-site-subtitles.cjs'));
  fs.copyFileSync(buildToolPath, path.join(root, 'tools', 'build-site-subtitles.cjs'));

  const git = spawnSync('git', ['init', '--quiet'], {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true
  });
  assert.equal(git.status, 0, git.stderr);
  if (options.trackedSubtitleFiles && options.trackedSubtitleFiles.length) {
    const add = spawnSync('git', [
      'add',
      '--',
      ...options.trackedSubtitleFiles.map((filename) => 'assets/subtitles/' + filename)
    ], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true
    });
    assert.equal(add.status, 0, add.stderr);
  }
  return { root, subtitleRoot, verifierPath: fixtureVerifier };
}

function runPortableVerifier(fixture) {
  return spawnSync(process.execPath, [fixture.verifierPath], {
    cwd: fixture.root,
    encoding: 'utf8',
    windowsHide: true
  });
}

function catalogForRecords(siteRecords) {
  return siteRecords.map((record) => ({
    videoId: record.videoId,
    contentStatus: 'missing'
  }));
}

function trackCatalogEntry(subtitleTrack, overrides = {}) {
  return {
    videoId: subtitleTrack.videoId,
    language: subtitleTrack.language,
    source: subtitleTrack.source,
    reviewStatus: subtitleTrack.reviewStatus,
    updatedAt: subtitleTrack.updatedAt,
    contentStatus: 'track',
    asset: 'assets/subtitles/' + subtitleTrack.videoId + '.json',
    ...overrides
  };
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

  const result = runPortableVerifier(fixture);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.records, 82);
  assert.equal(report.uniqueVideoIds, 81);
  assert.equal(report.subtitleCatalogCoverage, '81/82');
  assert.ok(report.failures.some((failure) => /invalid.*videoId.*index 81/i.test(failure)));
  assert.ok(report.failures.some((failure) => /expected 82 valid unique video IDs/i.test(failure)));
});

test('validateTrack and buildCatalog reject non-Chinese or lookalike track metadata', () => {
  const id = videoId(0);
  const invalidTracks = [
    track(id, { language: 'en-US' }),
    track(id, { source: 'site-owned-from-public-captions-copy' })
  ];

  invalidTracks.forEach((subtitleTrack) => {
    assert.throws(
      () => validateTrack(subtitleTrack, id + '.json'),
      /invalid subtitle track/i
    );
    assert.throws(() => buildCatalog({
      records: records(1),
      tracks: [{ filename: id + '.json', track: subtitleTrack }],
      overrides: {}
    }), /invalid subtitle track/i);
  });
});

test('portable verifier rejects track metadata that differs from the catalog', (t) => {
  const siteRecords = records(82);
  const subtitleTrack = track(siteRecords[0].videoId);
  const catalog = catalogForRecords(siteRecords);
  catalog[0] = trackCatalogEntry(subtitleTrack, { updatedAt: '2026-08-12' });
  const filename = subtitleTrack.videoId + '.json';
  const fixture = portableVerifierFixture(t, siteRecords, catalog, {
    subtitleTracks: { [filename]: subtitleTrack },
    trackedSubtitleFiles: [filename]
  });

  const result = runPortableVerifier(fixture);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.failures.some((failure) => (
    /subtitle asset metadata mismatch/i.test(failure) && /updatedAt/.test(failure)
  )));
});

test('portable verifier rejects a referenced subtitle JSON missing from git ls-files', (t) => {
  const siteRecords = records(82);
  const subtitleTrack = track(siteRecords[0].videoId);
  const catalog = catalogForRecords(siteRecords);
  catalog[0] = trackCatalogEntry(subtitleTrack);
  const filename = subtitleTrack.videoId + '.json';
  const fixture = portableVerifierFixture(t, siteRecords, catalog, {
    subtitleTracks: { [filename]: subtitleTrack }
  });

  const result = runPortableVerifier(fixture);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.failures.some((failure) => /referenced subtitle JSON is not tracked/i.test(failure)));
});

test('portable verifier rejects assets/subtitles when the root is a symlink or junction', (t) => {
  const siteRecords = records(82);
  const fixture = portableVerifierFixture(t, siteRecords, catalogForRecords(siteRecords));
  const linkedTarget = path.join(fixture.root, 'linked-subtitles');
  fs.rmdirSync(fixture.subtitleRoot);
  fs.mkdirSync(linkedTarget);
  try {
    fs.symlinkSync(
      linkedTarget,
      fixture.subtitleRoot,
      process.platform === 'win32' ? 'junction' : 'dir'
    );
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES' || error.code === 'ENOTSUP') {
      t.skip('OS forbids directory symlink creation');
      return;
    }
    throw error;
  }

  const result = runPortableVerifier(fixture);

  assert.equal(result.status, 1, result.stdout + result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(report.failures.some((failure) => /assets\/subtitles.*symlink|junction/i.test(failure)));
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
  collisionFs.openSync = function (filename, flags, ...args) {
    if (flags === 'wx') {
      collisionPath = filename;
      fs.writeFileSync(filename, 'foreign temp\n', 'utf8');
    }
    return fs.openSync(filename, flags, ...args);
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

test('importVtt removes an owned partial temp and closes its descriptor after ENOSPC', (t) => {
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
  let temporaryPath = null;
  let ownedDescriptor = null;
  let closeCount = 0;
  const failingFs = Object.create(fs);
  failingFs.openSync = function (filename, flags, ...args) {
    temporaryPath = filename;
    ownedDescriptor = fs.openSync(filename, flags, ...args);
    return ownedDescriptor;
  };
  failingFs.writeFileSync = function (filename, content, options) {
    if (filename === ownedDescriptor) {
      fs.writeSync(filename, 'partial subtitle JSON');
      const error = new Error('No space left on device');
      error.code = 'ENOSPC';
      throw error;
    }
    return fs.writeFileSync(filename, content, options);
  };
  failingFs.closeSync = function (descriptor) {
    closeCount += 1;
    return fs.closeSync(descriptor);
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
    fsImpl: failingFs
  }), (error) => error && error.code === 'ENOSPC');

  assert.ok(temporaryPath);
  assert.equal(closeCount, 1);
  assert.throws(
    () => fs.fstatSync(ownedDescriptor),
    (error) => error && error.code === 'EBADF'
  );
  assert.equal(fs.existsSync(temporaryPath), false);
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
      fs.writeFileSync(stagedCaptionPath(args, id, 'zh-Hans'), vtt(), 'utf8');
      return { status: 0, stdout: '', stderr: '' };
    }
    fs.writeFileSync(stagedCaptionPath(args, id, 'en-orig'), vtt(), 'utf8');
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
    assert.equal(args[0], '--ignore-config');
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
    const prohibitedFlags = [
      '--cookies',
      '--cookies-from-browser',
      '--username',
      '--password',
      '--twofactor',
      '--netrc',
      '--format',
      '-f',
      '--extract-audio',
      '--write-thumbnail',
      '--write-all-thumbnails'
    ];
    assert.deepEqual(args.filter((argument) => prohibitedFlags.includes(argument)), []);
    const output = argumentAfter(args, '--output');
    assert.equal(path.dirname(output), options.cwd);
    assert.ok(path.dirname(output).startsWith(workRoot + path.sep));
    assert.notEqual(path.dirname(output), workRoot);
  });
  assert.equal(new Set(calls.map((call) => path.dirname(argumentAfter(call.args, '--output')))).size, 2);

  assert.equal(inventory.total, 3);
  assert.equal(inventory.attempted, 2);
  assert.equal(inventory.skipped, 1);
  assert.deepEqual(inventory.summary, {
    'zh-Hans': { valid: 2, missing: 0, invalid: 0, failed: 1 },
    'en-orig': { valid: 2, missing: 1, invalid: 0, failed: 0 }
  });
  assert.equal(inventory.videos[1].languages['en-orig'].status, 'missing');
  assert.equal(inventory.videos[1].languages['en-orig'].reason, 'not-produced');
  assert.equal(inventory.videos[2].languages['zh-Hans'].status, 'failed');
  assert.equal(inventory.videos[2].languages['zh-Hans'].reason, 'http-429');
  assert.equal(fs.readFileSync(path.join(workRoot, partialId + '.zh-Hans.vtt'), 'utf8'), vtt());
  assert.equal(fs.readFileSync(path.join(workRoot, failedId + '.en-orig.vtt'), 'utf8'), vtt());
  assert.deepEqual(
    fs.readdirSync(workRoot).filter((entry) => entry.startsWith('.subtitle-fetch-')),
    []
  );
  assert.deepEqual(
    JSON.parse(fs.readFileSync(path.join(workRoot, 'public-caption-inventory.json'), 'utf8')),
    inventory
  );
});

test('fetchPublic validates cached and staged VTT before atomic promotion', (t) => {
  const directory = temporaryDirectory(t);
  const workRoot = path.join(directory, 'work');
  fs.mkdirSync(workRoot);
  const siteRecords = records(4);
  const replaceId = siteRecords[0].videoId;
  const preserveId = siteRecords[1].videoId;
  const invalidUtf8Id = siteRecords[2].videoId;
  const stagedOnlyId = siteRecords[3].videoId;
  const truncated = 'WEBVTT\n\n00:00:01.000 -->';
  const html = '<html>rate limited</html>\n';
  const invalidUtf8 = Buffer.from([0xff, 0xfe, 0x00]);
  const musicOnly = vtt('[Music]');
  const neighboringEvidence = path.join(workRoot, '.subtitle-fetch-evidence');
  fs.mkdirSync(neighboringEvidence);
  fs.writeFileSync(path.join(neighboringEvidence, 'keep.txt'), 'keep\n', 'utf8');

  fs.writeFileSync(path.join(workRoot, replaceId + '.zh-Hans.vtt'), truncated, 'utf8');
  fs.writeFileSync(path.join(workRoot, preserveId + '.zh-Hans.vtt'), html, 'utf8');
  fs.writeFileSync(path.join(workRoot, invalidUtf8Id + '.zh-Hans.vtt'), invalidUtf8);
  siteRecords.forEach((record) => {
    fs.writeFileSync(path.join(workRoot, record.videoId + '.en-orig.vtt'), vtt('English'), 'utf8');
  });

  const runner = (command, args) => {
    const id = new URL(args.at(-1)).searchParams.get('v');
    if (id === replaceId) {
      fs.writeFileSync(stagedCaptionPath(args, id, 'zh-Hans'), vtt('Replacement'), 'utf8');
      fs.writeFileSync(stagedCaptionPath(args, id, 'en-orig'), vtt('Changed English'), 'utf8');
    } else if (id === preserveId) {
      fs.writeFileSync(stagedCaptionPath(args, id, 'zh-Hans'), musicOnly, 'utf8');
    } else if (id === stagedOnlyId) {
      fs.writeFileSync(stagedCaptionPath(args, id, 'zh-Hans'), html, 'utf8');
    }
    return { status: 0, stdout: '', stderr: '' };
  };

  const inventory = fetchPublic({ records: siteRecords, workRoot, runner });

  assert.equal(
    fs.readFileSync(path.join(workRoot, replaceId + '.zh-Hans.vtt'), 'utf8'),
    vtt('Replacement')
  );
  assert.equal(fs.readFileSync(path.join(workRoot, preserveId + '.zh-Hans.vtt'), 'utf8'), html);
  assert.deepEqual(fs.readFileSync(path.join(workRoot, invalidUtf8Id + '.zh-Hans.vtt')), invalidUtf8);
  assert.equal(fs.existsSync(path.join(workRoot, stagedOnlyId + '.zh-Hans.vtt')), false);
  assert.equal(
    fs.readFileSync(path.join(workRoot, replaceId + '.en-orig.vtt'), 'utf8'),
    vtt('English')
  );

  const replacement = inventory.videos[0].languages['zh-Hans'];
  assert.equal(replacement.status, 'valid');
  assert.equal(replacement.cacheStatus, 'invalid');
  assert.equal(replacement.stagedStatus, 'valid');
  assert.equal(replacement.promoted, true);

  const preserved = inventory.videos[1].languages['zh-Hans'];
  assert.equal(preserved.status, 'invalid');
  assert.equal(preserved.reason, 'invalid-webvtt');
  assert.equal(preserved.cacheStatus, 'invalid');
  assert.equal(preserved.stagedStatus, 'invalid');

  const invalidEncoding = inventory.videos[2].languages['zh-Hans'];
  assert.equal(invalidEncoding.status, 'invalid');
  assert.equal(invalidEncoding.reason, 'invalid-utf8');
  assert.equal(invalidEncoding.stagedStatus, 'missing');

  const rejectedStage = inventory.videos[3].languages['zh-Hans'];
  assert.equal(rejectedStage.status, 'invalid');
  assert.equal(rejectedStage.reason, 'invalid-webvtt');
  assert.equal(rejectedStage.cacheStatus, 'missing');
  assert.equal(rejectedStage.stagedStatus, 'invalid');
  assert.deepEqual(inventory.summary, {
    'zh-Hans': { valid: 1, missing: 0, invalid: 3, failed: 0 },
    'en-orig': { valid: 4, missing: 0, invalid: 0, failed: 0 }
  });
  assert.deepEqual(
    fs.readdirSync(workRoot).filter((entry) => (
      entry.startsWith('.subtitle-fetch-') && entry !== '.subtitle-fetch-evidence'
    )),
    []
  );
  assert.equal(fs.readFileSync(path.join(neighboringEvidence, 'keep.txt'), 'utf8'), 'keep\n');
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
    'zh-Hans': { valid: 0, missing: 0, invalid: 0, failed: 1 },
    'en-orig': { valid: 0, missing: 0, invalid: 0, failed: 1 }
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
