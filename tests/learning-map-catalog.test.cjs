'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const catalogPath = require.resolve('../tools/learning-map-catalog.cjs');
const builderPath = require.resolve('../tools/build-learning-maps.cjs');
const learningMapPath = require.resolve('../src/learning-map.js');
const siteData = require('../tools/site-data.cjs');
const catalog = require(catalogPath);
const builder = require(builderPath);

const VIDEO_A = 'aaaaaaaaaaa';
const VIDEO_B = 'bbbbbbbbbbb';
const VIDEO_C = 'ccccccccccc';

function temporaryDirectory(t, prefix = 'learning-map-catalog-') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function recordFixture(videoId = VIDEO_A, category = 'workflow', orders = [20, 10]) {
  return {
    id: `yt-${videoId}`,
    videoId,
    category,
    title: `Video ${videoId}`,
    detail: { keep: ['all', 'detail', 'data'] },
    params: ['record-param'],
    timeline: { durationSeconds: 120 },
    subtitle: { status: 'track' },
    images: { hero: `${videoId}-hero` },
    plugins: [{ name: 'Plugin', settings: ['unchanged'] }],
    effectUses: [{ id: `${videoId}:effect:1`, purpose: 'unchanged' }],
    steps: orders.map((order, index) => ({
      order,
      name: `Step ${order}`,
      detail: `Detail ${order}`,
      params: [`Param ${index + 1}`],
      timeline: { startSeconds: order },
      subtitle: `Subtitle ${order}`,
      images: [`Image ${order}`],
      plugins: [`Plugin ${order}`],
      effectUses: [`Effect ${order}`]
    }))
  };
}

function learningFor(order) {
  return {
    input: `Input ${order}`,
    problem: `Problem ${order}`,
    action: `Action ${order}`,
    result: `Result ${order}`
  };
}

function entryFixture(record = recordFixture(), options = {}) {
  const orders = options.orders || record.steps.map((step) => step.order).slice().reverse();
  return {
    videoId: record.videoId,
    reviewed: true,
    reviewedAt: '2026-09-01',
    learningMap: {
      version: 1,
      goal: `Goal for ${record.videoId}`,
      roles: [
        { name: 'Source', description: 'Provides the source material.' },
        { name: 'Body', description: 'Provides the readable body.' },
        { name: 'Tail', description: 'Provides the ending and space.' }
      ],
      decisions: [
        'Keep every layer responsible for one job.',
        'Judge processing in the context of the whole sound.'
      ],
      sequence: 'Source -> body -> tail',
      chapters: [
        {
          id: 'source',
          title: 'Choose the source',
          question: 'What should the source explain?',
          summary: 'Choose material with a clear responsibility.',
          stepOrders: [orders[0]]
        },
        {
          id: 'finish',
          title: 'Finish the sound',
          question: 'What makes the result read clearly?',
          summary: 'Process and finish the remaining responsibilities.',
          stepOrders: orders.slice(1)
        }
      ]
    },
    steps: orders.map((order) => ({ order, learning: learningFor(order) }))
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function withoutLearning(value) {
  const result = clone(value);
  delete result.learningMap;
  for (const step of result.steps) delete step.learning;
  return result;
}

function catalogRoot(root) {
  return path.join(root, 'content', 'learning-maps');
}

function writeEntry(root, category, entry, filename = `${entry.videoId}.json`, nested = '') {
  const directory = path.join(catalogRoot(root), category, nested);
  fs.mkdirSync(directory, { recursive: true });
  const filenamePath = path.join(directory, filename);
  fs.writeFileSync(filenamePath, JSON.stringify(entry, null, 2) + '\n', 'utf8');
  return filenamePath;
}

function htmlFixture(records) {
  return [
    '<!doctype html>',
    '<script>',
    `    const records = ${JSON.stringify(records, null, 2)};`,
    '    const imageManifest = {};',
    '    const pluginReferenceCatalog = {};',
    '</script>',
    ''
  ].join('\n');
}

function writeSite(root, records) {
  const indexPath = path.join(root, 'index.html');
  fs.writeFileSync(indexPath, htmlFixture(records), 'utf8');
  return indexPath;
}

function runCli(root, args, options = {}) {
  let stdout = '';
  const execution = builder.runCli(args, {
    root,
    fsImpl: options.fsImpl || fs,
    stdout: { write(chunk) { stdout += String(chunk); } }
  });
  assert.equal(stdout.endsWith('\n'), true);
  assert.deepEqual(JSON.parse(stdout), execution.report);
  return execution;
}

test('exports frozen catalog and builder APIs', () => {
  assert.ok(Object.isFrozen(catalog));
  assert.deepEqual(Object.keys(catalog), [
    'discover',
    'load',
    'validateEntry',
    'mergeEntry',
    'validateCoverage',
    'build'
  ]);
  for (const name of Object.keys(catalog)) assert.equal(typeof catalog[name], 'function', name);

  assert.ok(Object.isFrozen(builder));
  assert.deepEqual(Object.keys(builder), ['parseArguments', 'atomicWriteFile', 'runCli']);
});

test('discover recursively finds only JSON files in deterministic relative-path order', (t) => {
  const root = temporaryDirectory(t);
  const contentRoot = catalogRoot(root);
  fs.mkdirSync(path.join(contentRoot, 'zeta'), { recursive: true });
  fs.mkdirSync(path.join(contentRoot, 'alpha', 'nested'), { recursive: true });
  fs.writeFileSync(path.join(contentRoot, 'zeta', 'z.json'), '{}\n');
  fs.writeFileSync(path.join(contentRoot, 'alpha', 'nested', 'a.json'), '{}\n');
  fs.writeFileSync(path.join(contentRoot, 'alpha', 'ignore.txt'), '{}\n');

  const discovered = catalog.discover(contentRoot);
  assert.deepEqual(discovered.map((item) => item.relativePath), [
    'alpha/nested/a.json',
    'zeta/z.json'
  ]);
  assert.deepEqual(discovered.map((item) => item.category), ['alpha', 'zeta']);
  assert.deepEqual(discovered.map((item) => item.path), [
    path.join(contentRoot, 'alpha', 'nested', 'a.json'),
    path.join(contentRoot, 'zeta', 'z.json')
  ]);
  assert.deepEqual(catalog.discover(contentRoot), discovered);
});

test('load requires each filename to equal entry.videoId plus .json', (t) => {
  const root = temporaryDirectory(t);
  const record = recordFixture();
  const filenamePath = writeEntry(root, record.category, entryFixture(record), `${VIDEO_B}.json`);

  assert.throws(
    () => catalog.load({ root: catalogRoot(root), records: [record] }),
    (error) => error instanceof Error &&
      error.message.includes(filenamePath) &&
      /videoId.*filename|filename.*videoId/i.test(error.message)
  );
});

test('load rejects duplicate catalog videoIds', (t) => {
  const root = temporaryDirectory(t);
  const record = recordFixture();
  const entry = entryFixture(record);
  const firstPath = writeEntry(root, record.category, entry, undefined, 'first');
  const secondPath = writeEntry(root, record.category, entry, undefined, 'second');

  assert.throws(
    () => catalog.load({ root: catalogRoot(root), records: [record] }),
    (error) => error instanceof Error && error.message.includes(VIDEO_A) &&
      error.message.includes(firstPath) && error.message.includes(secondPath) && /duplicate/i.test(error.message)
  );
});

test('load rejects catalog videoIds unknown to the site', (t) => {
  const root = temporaryDirectory(t);
  const known = recordFixture(VIDEO_A);
  const unknown = recordFixture(VIDEO_B);
  const filenamePath = writeEntry(root, unknown.category, entryFixture(unknown));

  assert.throws(
    () => catalog.load({ root: catalogRoot(root), records: [known] }),
    (error) => error instanceof Error && error.message.includes(VIDEO_B) &&
      error.message.includes(filenamePath) && /unknown.*videoId|videoId.*unknown/i.test(error.message)
  );
});

test('load derives category from the first directory and requires an exact site category match', (t) => {
  const root = temporaryDirectory(t);
  const record = recordFixture(VIDEO_A, 'workflow');
  const filenamePath = writeEntry(root, 'work', entryFixture(record), undefined, 'nested');

  assert.throws(
    () => catalog.load({ root: catalogRoot(root), records: [record] }),
    (error) => error instanceof Error && error.message.includes(VIDEO_A) &&
      error.message.includes(filenamePath) && /category.*work.*workflow/i.test(error.message)
  );
});

test('load reports malformed JSON with its catalog path', (t) => {
  const root = temporaryDirectory(t);
  const record = recordFixture();
  const directory = path.join(catalogRoot(root), record.category);
  fs.mkdirSync(directory, { recursive: true });
  const filenamePath = path.join(directory, `${record.videoId}.json`);
  fs.writeFileSync(filenamePath, '{"videoId":', 'utf8');

  assert.throws(
    () => catalog.load({ root: catalogRoot(root), records: [record] }),
    (error) => error instanceof Error && error.message.includes(filenamePath) && /JSON/i.test(error.message)
  );
});

test('validateEntry requires reviewed to be strictly true and reviewedAt to be a real date', () => {
  const record = recordFixture();
  const filenamePath = path.join('catalog', `${record.videoId}.json`);

  for (const reviewed of [false, 1, 'true', null]) {
    const entry = entryFixture(record);
    entry.reviewed = reviewed;
    assert.throws(
      () => catalog.validateEntry(entry, { record, path: filenamePath, category: record.category }),
      (error) => error.message.includes(record.videoId) && error.message.includes(filenamePath) &&
        /reviewed/.test(error.message)
    );
  }

  for (const reviewedAt of ['2026-02-29', '2026-04-31', '2026-13-01', '2026-9-1', 'not-a-date']) {
    const entry = entryFixture(record);
    entry.reviewedAt = reviewedAt;
    assert.throws(
      () => catalog.validateEntry(entry, { record, path: filenamePath, category: record.category }),
      (error) => error.message.includes(record.videoId) && error.message.includes(filenamePath) &&
        /reviewedAt/.test(error.message)
    );
  }
});

test('validateEntry enforces the exact catalog shape without extra top-level keys', () => {
  const record = recordFixture();
  const entry = entryFixture(record);
  entry.notes = 'not allowed';

  assert.throws(
    () => catalog.validateEntry(entry, {
      record,
      path: `content/learning-maps/workflow/${record.videoId}.json`,
      category: record.category
    }),
    (error) => error.message.includes(record.videoId) && /entry.*notes|notes.*top-level/i.test(error.message)
  );
});

test('validateEntry rejects accessors without invoking them', () => {
  const record = recordFixture();
  const entry = entryFixture(record);
  let getterCalls = 0;
  Object.defineProperty(entry.learningMap, 'goal', {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error('getter must not run');
    }
  });

  assert.throws(
    () => catalog.validateEntry(entry, { record, path: 'accessor.json', category: record.category }),
    (error) => error.message.includes(record.videoId) && /learningMap\.goal.*accessor/i.test(error.message)
  );
  assert.equal(getterCalls, 0);
});

test('validateEntry rejects custom prototypes at nested data levels', () => {
  const record = recordFixture();
  const entry = entryFixture(record);
  Object.setPrototypeOf(entry.steps[0].learning, { inherited: true });

  assert.throws(
    () => catalog.validateEntry(entry, { record, path: 'prototype.json', category: record.category }),
    (error) => error.message.includes(record.videoId) && /steps\[0\]\.learning.*plain data/i.test(error.message)
  );
});

test('validateEntry rejects sparse arrays', () => {
  const record = recordFixture();
  const entry = entryFixture(record);
  delete entry.steps[0];

  assert.throws(
    () => catalog.validateEntry(entry, { record, path: 'sparse.json', category: record.category }),
    (error) => error.message.includes(record.videoId) && /steps.*dense|steps.*holes/i.test(error.message)
  );
});

test('validateEntry merges a clone and calls require(../src/learning-map.js).project', () => {
  const source = fs.readFileSync(catalogPath, 'utf8');
  assert.match(source, /require\(['"]\.\.\/src\/learning-map\.js['"]\)\.project/);

  const record = recordFixture();
  const entry = entryFixture(record);
  const originalRecord = clone(record);
  const originalEntry = clone(entry);
  let projectedRecord;
  let projectedDetail;
  const learningModule = require.cache[learningMapPath];
  const originalLearningExports = learningModule.exports;
  const originalCatalogModule = require.cache[catalogPath];

  try {
    learningModule.exports = Object.freeze({
      project(candidateRecord, candidateDetail) {
        projectedRecord = candidateRecord;
        projectedDetail = candidateDetail;
        return { version: 1 };
      }
    });
    delete require.cache[catalogPath];
    const instrumentedCatalog = require(catalogPath);
    instrumentedCatalog.validateEntry(entry, {
      record,
      path: `${record.videoId}.json`,
      category: record.category
    });
  } finally {
    learningModule.exports = originalLearningExports;
    delete require.cache[catalogPath];
    require.cache[catalogPath] = originalCatalogModule;
  }

  assert.notStrictEqual(projectedRecord, record);
  assert.notStrictEqual(projectedRecord.steps, record.steps);
  assert.notStrictEqual(projectedRecord.learningMap, entry.learningMap);
  assert.deepEqual(projectedRecord.learningMap, entry.learningMap);
  assert.strictEqual(projectedDetail.steps, projectedRecord.steps);
  assert.deepEqual(record, originalRecord);
  assert.deepEqual(entry, originalEntry);
});

test('validateEntry rejects entries that the learning-map projection cannot project', () => {
  const record = recordFixture();
  const entry = entryFixture(record);
  entry.learningMap.roles = entry.learningMap.roles.slice(0, 2);

  assert.throws(
    () => catalog.validateEntry(entry, {
      record,
      path: `${record.videoId}.json`,
      category: record.category
    }),
    (error) => error.message.includes(record.videoId) && /learningMap.*project|project.*learningMap/i.test(error.message)
  );
});

test('mergeEntry aligns learning by explicit step.order and preserves every other field deeply', () => {
  const record = recordFixture(VIDEO_A, 'workflow', [20, 10]);
  const entry = entryFixture(record, { orders: [10, 20] });
  const originalRecord = clone(record);
  const originalEntry = clone(entry);

  const merged = catalog.mergeEntry(record, entry, { path: `${record.videoId}.json` });

  assert.deepEqual(record, originalRecord);
  assert.deepEqual(entry, originalEntry);
  assert.deepEqual(withoutLearning(merged), withoutLearning(record));
  assert.deepEqual(merged.learningMap, entry.learningMap);
  assert.deepEqual(merged.steps.map((step) => [step.order, step.learning]), [
    [20, learningFor(20)],
    [10, learningFor(10)]
  ]);
  assert.notStrictEqual(merged, record);
  assert.notStrictEqual(merged.detail, record.detail);
  assert.notStrictEqual(merged.steps[0], record.steps[0]);
  assert.notStrictEqual(merged.learningMap, entry.learningMap);
  assert.notStrictEqual(merged.steps[0].learning, entry.steps[1].learning);
});

test('mergeEntry preserves own __proto__ data properties and plain object prototype semantics', () => {
  const record = recordFixture();
  const plainData = JSON.parse('{"kind":"plain","__proto__":{"polluted":"plain-prototype"}}');
  const nullPrototypeData = Object.create(null);
  nullPrototypeData.kind = 'null-prototype';
  Object.defineProperty(nullPrototypeData, '__proto__', {
    value: { polluted: 'null-prototype' },
    enumerable: true,
    writable: true,
    configurable: true
  });
  record.detail = plainData;
  record.nullPrototypeData = nullPrototypeData;

  const merged = catalog.mergeEntry(record, entryFixture(record), { path: `${record.videoId}.json` });

  for (const [source, copied] of [
    [plainData, merged.detail],
    [nullPrototypeData, merged.nullPrototypeData]
  ]) {
    assert.strictEqual(Object.getPrototypeOf(copied), Object.getPrototypeOf(source));
    assert.equal(Object.hasOwn(copied, '__proto__'), true);
    const descriptor = Object.getOwnPropertyDescriptor(copied, '__proto__');
    assert.ok(Object.hasOwn(descriptor, 'value'));
    assert.deepEqual(descriptor.value, Object.getOwnPropertyDescriptor(source, '__proto__').value);
    assert.deepEqual(
      {
        enumerable: descriptor.enumerable,
        writable: descriptor.writable,
        configurable: descriptor.configurable
      },
      { enumerable: true, writable: true, configurable: true }
    );
    assert.equal(copied.polluted, undefined);
  }
  assert.equal(Object.prototype.polluted, undefined);
});

test('mergeEntry still rejects an extra own __proto__ array key', () => {
  const record = recordFixture();
  Object.defineProperty(record.params, '__proto__', {
    value: { polluted: true },
    enumerable: true,
    writable: true,
    configurable: true
  });

  assert.throws(
    () => catalog.mergeEntry(record, entryFixture(record), { path: `${record.videoId}.json` }),
    (error) => error.message.includes(record.videoId) && /extra array key.*__proto__/i.test(error.message)
  );
  assert.equal(Object.prototype.polluted, undefined);
});

test('mergeEntry rejects unknown, duplicate, and missing step orders', () => {
  const cases = [
    ['unknown entry order', (record, entry) => { entry.steps[0].order = 99; }, /unknown.*order|order.*99/i],
    ['duplicate entry order', (record, entry) => { entry.steps[1].order = entry.steps[0].order; }, /duplicate.*order/i],
    ['missing entry order', (record, entry) => { entry.steps.pop(); }, /missing.*order/i],
    ['missing record order', (record) => { delete record.steps[0].order; }, /record.*(?:missing.*order|order.*missing)/i],
    ['duplicate record order', (record) => { record.steps[1].order = record.steps[0].order; }, /record.*duplicate.*order/i]
  ];

  for (const [name, mutate, pattern] of cases) {
    const record = recordFixture();
    const entry = entryFixture(record);
    mutate(record, entry);
    assert.throws(
      () => catalog.mergeEntry(record, entry, { path: `${record.videoId}.json` }),
      (error) => error.message.includes(record.videoId) && pattern.test(error.message),
      name
    );
  }
});

test('validateCoverage supports allowed partial checks and rejects strict incomplete coverage', () => {
  const first = recordFixture(VIDEO_A, 'workflow');
  const second = recordFixture(VIDEO_B, 'scifi');
  const entries = [{
    path: `${VIDEO_A}.json`,
    relativePath: `workflow/${VIDEO_A}.json`,
    category: first.category,
    entry: entryFixture(first)
  }];

  assert.deepEqual(catalog.validateCoverage({
    records: [first, second],
    entries,
    allowIncomplete: true
  }), {
    coverage: 'incomplete-allowed',
    records: { covered: 1, total: 2 },
    steps: { covered: 2, total: 4 },
    missingVideoIds: [VIDEO_B]
  });

  assert.throws(
    () => catalog.validateCoverage({ records: [first, second], entries, allowIncomplete: false }),
    (error) => error.message.includes(VIDEO_B) && /coverage.*incomplete|missing.*catalog/i.test(error.message)
  );
});

test('build is deterministic and only merges cataloged records in partial mode', () => {
  const first = recordFixture(VIDEO_A, 'workflow');
  const second = recordFixture(VIDEO_B, 'scifi');
  const descriptor = {
    path: `${VIDEO_A}.json`,
    relativePath: `workflow/${VIDEO_A}.json`,
    category: first.category,
    entry: entryFixture(first)
  };
  const options = { records: [first, second], entries: [descriptor], allowIncomplete: true };

  const firstBuild = catalog.build(options);
  const secondBuild = catalog.build(options);

  assert.deepEqual(firstBuild, secondBuild);
  assert.equal(JSON.stringify(firstBuild), JSON.stringify(secondBuild));
  assert.deepEqual(firstBuild.coverage, {
    coverage: 'incomplete-allowed',
    records: { covered: 1, total: 2 },
    steps: { covered: 2, total: 4 },
    missingVideoIds: [VIDEO_B]
  });
  assert.deepEqual(withoutLearning(firstBuild.records[1]), withoutLearning(second));
  assert.equal(firstBuild.records[1].learningMap, undefined);
  assert.notStrictEqual(firstBuild.records[1], second);
});

test('parseArguments requires exactly one mode and constrains incomplete and write filters', () => {
  assert.deepEqual(builder.parseArguments(['--check', '--allow-incomplete']), {
    mode: 'check',
    allowIncomplete: true,
    category: null,
    videos: null
  });
  assert.deepEqual(builder.parseArguments(['--check', '--category', 'workflow']), {
    mode: 'check',
    allowIncomplete: false,
    category: 'workflow',
    videos: null
  });
  assert.deepEqual(builder.parseArguments(['--check', '--videos', `${VIDEO_A},${VIDEO_C}`]), {
    mode: 'check',
    allowIncomplete: false,
    category: null,
    videos: [VIDEO_A, VIDEO_C]
  });
  assert.deepEqual(builder.parseArguments(['--write']), {
    mode: 'write',
    allowIncomplete: false,
    category: null,
    videos: null
  });

  for (const args of [
    [],
    ['--check', '--write'],
    ['--write', '--allow-incomplete'],
    ['--write', '--category', 'workflow'],
    ['--write', '--videos', VIDEO_A],
    ['--check', '--videos', `${VIDEO_A},${VIDEO_A}`],
    ['--check', '--unknown']
  ]) {
    assert.throws(() => builder.parseArguments(args), /mode|mutually exclusive|allow-incomplete|filter|duplicate|unknown/i);
  }
});

test('check allow-incomplete reports partial coverage without changing index.html', (t) => {
  const root = temporaryDirectory(t, 'learning-map-partial-');
  const first = recordFixture(VIDEO_A, 'workflow');
  const second = recordFixture(VIDEO_B, 'scifi');
  const indexPath = writeSite(root, [first, second]);
  const before = fs.readFileSync(indexPath, 'utf8');
  writeEntry(root, first.category, entryFixture(first));

  const { exitCode, report } = runCli(root, ['--check', '--allow-incomplete']);

  assert.equal(exitCode, 0);
  assert.deepEqual(report, {
    mode: 'check',
    coverage: 'incomplete-allowed',
    records: { covered: 1, total: 2 },
    steps: { covered: 2, total: 4 },
    warnings: [`Incomplete learning-map coverage: 1/2 records, 2/4 steps; missing videoIds: ${VIDEO_B}`],
    failures: []
  });
  assert.equal(fs.readFileSync(indexPath, 'utf8'), before);
});

test('write rejects incomplete coverage and preserves the original index.html', (t) => {
  const root = temporaryDirectory(t, 'learning-map-write-incomplete-');
  const first = recordFixture(VIDEO_A, 'workflow');
  const second = recordFixture(VIDEO_B, 'scifi');
  const indexPath = writeSite(root, [first, second]);
  const before = fs.readFileSync(indexPath, 'utf8');
  writeEntry(root, first.category, entryFixture(first));

  const { exitCode, report } = runCli(root, ['--write']);

  assert.equal(exitCode, 1);
  assert.equal(report.mode, 'write');
  assert.equal(report.coverage, 'incomplete');
  assert.deepEqual(report.records, { covered: 1, total: 2 });
  assert.deepEqual(report.steps, { covered: 2, total: 4 });
  assert.deepEqual(report.warnings, []);
  assert.equal(report.failures.length, 1);
  assert.match(report.failures[0], new RegExp(`missing.*${VIDEO_B}|${VIDEO_B}.*missing`, 'i'));
  assert.equal(fs.readFileSync(indexPath, 'utf8'), before);
});

test('category and videos checks select exact site records and catalog entries', (t) => {
  const root = temporaryDirectory(t, 'learning-map-filters-');
  const workflowA = recordFixture(VIDEO_A, 'workflow');
  const workflowB = recordFixture(VIDEO_B, 'workflow');
  const scifiC = recordFixture(VIDEO_C, 'scifi');
  writeSite(root, [workflowA, workflowB, scifiC]);
  writeEntry(root, workflowA.category, entryFixture(workflowA));
  writeEntry(root, workflowB.category, entryFixture(workflowB));
  writeEntry(root, scifiC.category, entryFixture(scifiC));

  const categoryRun = runCli(root, ['--check', '--category', 'workflow']);
  assert.equal(categoryRun.exitCode, 0);
  assert.equal(categoryRun.report.coverage, 'complete');
  assert.deepEqual(categoryRun.report.records, { covered: 2, total: 2 });
  assert.deepEqual(categoryRun.report.steps, { covered: 4, total: 4 });

  const videosRun = runCli(root, ['--check', '--videos', `${VIDEO_C},${VIDEO_A}`]);
  assert.equal(videosRun.exitCode, 0);
  assert.equal(videosRun.report.coverage, 'complete');
  assert.deepEqual(videosRun.report.records, { covered: 2, total: 2 });
  assert.deepEqual(videosRun.report.steps, { covered: 4, total: 4 });

  const unknownRun = runCli(root, ['--check', '--videos', 'ddddddddddd']);
  assert.equal(unknownRun.exitCode, 1);
  assert.match(unknownRun.report.failures[0], /unknown.*videoId.*ddddddddddd/i);
});

test('check rejects category and combined filters that select no records', (t) => {
  const root = temporaryDirectory(t, 'learning-map-empty-filters-');
  const workflow = recordFixture(VIDEO_A, 'workflow');
  const veto = recordFixture('3JjAK2uhxM4', 'scifi');
  writeSite(root, [workflow, veto]);
  writeEntry(root, workflow.category, entryFixture(workflow));
  writeEntry(root, veto.category, entryFixture(veto));

  const missingCategory = runCli(root, ['--check', '--category', 'does-not-exist']);
  assert.equal(missingCategory.exitCode, 1);
  assert.equal(missingCategory.report.coverage, 'invalid');
  assert.match(missingCategory.report.failures[0], /no records.*category|category.*no records/i);

  const emptyIntersection = runCli(root, [
    '--check',
    '--category',
    'workflow',
    '--videos',
    '3JjAK2uhxM4'
  ]);
  assert.equal(emptyIntersection.exitCode, 1);
  assert.equal(emptyIntersection.report.coverage, 'invalid');
  assert.match(
    emptyIntersection.report.failures[0],
    /no records.*(?:category|videos)|(?:category|videos).*no records/i
  );
});

test('complete write uses siteData.replaceRecords and produces deterministic merged records', (t) => {
  const root = temporaryDirectory(t, 'learning-map-complete-');
  const first = recordFixture(VIDEO_A, 'workflow');
  const second = recordFixture(VIDEO_B, 'scifi');
  const indexPath = writeSite(root, [first, second]);
  const firstEntry = entryFixture(first);
  const secondEntry = entryFixture(second);
  writeEntry(root, first.category, firstEntry);
  writeEntry(root, second.category, secondEntry);

  const { exitCode, report } = runCli(root, ['--write']);
  const written = siteData.parse(fs.readFileSync(indexPath, 'utf8')).records;

  assert.equal(exitCode, 0);
  assert.deepEqual(report, {
    mode: 'write',
    coverage: 'complete',
    records: { covered: 2, total: 2 },
    steps: { covered: 4, total: 4 },
    warnings: [],
    failures: []
  });
  assert.deepEqual(written[0], catalog.mergeEntry(first, firstEntry, { path: `${VIDEO_A}.json` }));
  assert.deepEqual(written[1], catalog.mergeEntry(second, secondEntry, { path: `${VIDEO_B}.json` }));
});

test('atomicWriteFile exclusively creates a unique sibling, fsyncs when available, closes, then renames', (t) => {
  const root = temporaryDirectory(t, 'learning-map-atomic-');
  const target = path.join(root, 'index.html');
  fs.writeFileSync(target, 'before\n', 'utf8');
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

  builder.atomicWriteFile({ fsImpl: traced, target, content: 'first\n' });
  builder.atomicWriteFile({ fsImpl: traced, target, content: 'second\n' });

  assert.equal(fs.readFileSync(target, 'utf8'), 'second\n');
  assert.equal(new Set(temporaryPaths).size, 2);
  for (const temporary of temporaryPaths) {
    assert.equal(path.dirname(temporary), path.dirname(target));
    assert.match(path.basename(temporary), /^\.index\.html\..+\.tmp$/);
    assert.notEqual(temporary, path.resolve(target));
  }
  assert.deepEqual(events.filter((event) => event[0] === 'open').map((event) => event[2]), ['wx', 'wx']);
  for (let offset = 0; offset < events.length; offset += 5) {
    assert.deepEqual(events.slice(offset, offset + 5).map((event) => event[0]), [
      'open', 'write', 'fsync', 'close', 'rename'
    ]);
    assert.equal(events[offset + 4][1], events[offset][1]);
    assert.equal(events[offset + 4][2], path.resolve(target));
  }
});

test('atomicWriteFile closes the descriptor, cleans its temp, and preserves the target after write failure', (t) => {
  const root = temporaryDirectory(t, 'learning-map-write-failure-');
  const target = path.join(root, 'index.html');
  fs.writeFileSync(target, 'original\n', 'utf8');
  const failing = Object.create(fs);
  let temporaryPath;
  let descriptor;
  let closeCount = 0;

  failing.openSync = function (filename, flags, ...args) {
    temporaryPath = filename;
    descriptor = fs.openSync(filename, flags, ...args);
    return descriptor;
  };
  failing.writeFileSync = function (candidate) {
    if (candidate === descriptor) throw new Error('injected write failure');
    return fs.writeFileSync.apply(fs, arguments);
  };
  failing.closeSync = function (candidate) {
    closeCount += 1;
    return fs.closeSync(candidate);
  };

  assert.throws(
    () => builder.atomicWriteFile({ fsImpl: failing, target, content: 'after\n' }),
    /injected write failure/
  );
  assert.equal(closeCount, 1);
  assert.equal(fs.existsSync(temporaryPath), false);
  assert.equal(fs.readFileSync(target, 'utf8'), 'original\n');
});

test('atomicWriteFile never removes a colliding temp it did not create', (t) => {
  const root = temporaryDirectory(t, 'learning-map-temp-collision-');
  const target = path.join(root, 'index.html');
  fs.writeFileSync(target, 'original\n', 'utf8');
  const collision = Object.create(fs);
  let collisionPath;

  collision.openSync = function (filename, flags) {
    collisionPath = filename;
    fs.writeFileSync(filename, 'foreign temp\n', 'utf8');
    const error = new Error('injected EEXIST collision');
    error.code = 'EEXIST';
    throw error;
  };

  assert.throws(
    () => builder.atomicWriteFile({ fsImpl: collision, target, content: 'after\n' }),
    /EEXIST collision/
  );
  assert.equal(fs.readFileSync(collisionPath, 'utf8'), 'foreign temp\n');
  assert.equal(fs.readFileSync(target, 'utf8'), 'original\n');
});
