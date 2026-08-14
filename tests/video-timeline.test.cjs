'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'src', 'video-timeline.js');
const SfxVideoTimeline = fs.existsSync(modulePath) ? require(modulePath) : null;
const apiKeys = [
  'validRecord',
  'stepStart',
  'screenshotStart',
  'effectStart',
  'formatTime',
  'coverage'
];

function timelineApi() {
  assert.ok(SfxVideoTimeline, 'video timeline module must exist');
  return SfxVideoTimeline;
}

function reviewedRecord(overrides = {}) {
  return {
    id: 'record-a',
    timeline: {
      durationSeconds: 90,
      reviewedAt: '2026-08-14',
      source: 'youtube-player'
    },
    steps: [
      { order: 1, name: 'Source', startSeconds: 4, imageKey: 'shot-a' },
      { order: 2, name: 'Effect', startSeconds: 25, imageKey: 'shot-b' },
      { order: 3, name: 'Tail', startSeconds: 89.75, imageKey: 'shot-c' }
    ],
    ...overrides
  };
}

function withTimeline(record, overrides) {
  return { ...record, timeline: { ...record.timeline, ...overrides } };
}

test('publishes the exact frozen CommonJS API', () => {
  const api = timelineApi();

  assert.deepEqual(Object.keys(api), apiKeys);
  assert.ok(Object.isFrozen(api));
});

test('accepts only records with the reviewed YouTube timeline contract', () => {
  const api = timelineApi();
  const record = reviewedRecord();

  assert.equal(api.validRecord(record), true);
  [
    null,
    [],
    {},
    { timeline: null },
    withTimeline(record, { durationSeconds: 0 }),
    withTimeline(record, { durationSeconds: -1 }),
    withTimeline(record, { durationSeconds: NaN }),
    withTimeline(record, { durationSeconds: Infinity }),
    withTimeline(record, { durationSeconds: '90' }),
    withTimeline(record, { reviewedAt: '' }),
    withTimeline(record, { reviewedAt: '2026-8-14' }),
    withTimeline(record, { reviewedAt: ' 2026-08-14 ' }),
    withTimeline(record, { source: 'manual-review' })
  ].forEach((candidate) => assert.equal(api.validRecord(candidate), false));
});

test('inherits reviewed step times for steps, screenshots, and effects', () => {
  const api = timelineApi();
  const record = reviewedRecord();

  assert.equal(api.stepStart(record, 0), 4);
  assert.equal(api.stepStart(record, 2), 89.75);
  assert.equal(api.screenshotStart(record, 'shot-b'), 25);
  assert.equal(api.effectStart(record, { stepIndex: 1 }), 25);
  assert.equal(api.effectStart(record, { stepIndex: 1, startSeconds: null }), 25);
});

test('uses valid explicit effect times and inherits from invalid overrides', () => {
  const api = timelineApi();
  const record = reviewedRecord();

  assert.equal(api.effectStart(record, { stepIndex: 1, startSeconds: 31 }), 31);
  assert.equal(api.effectStart(record, { stepIndex: 1, startSeconds: 0 }), 0);
  [-1, NaN, Infinity, '31', 90, 91].forEach((startSeconds) => {
    assert.equal(api.effectStart(record, { stepIndex: 1, startSeconds }), 25);
  });
  assert.equal(api.effectStart(record, { stepIndex: 99, startSeconds: '31' }), null);
});

test('rejects unreviewed records, invalid indexes, and invalid step times', () => {
  const api = timelineApi();
  const record = reviewedRecord();
  const unreviewed = withTimeline(record, { reviewedAt: '' });

  assert.equal(api.stepStart(unreviewed, 0), null);
  assert.equal(api.screenshotStart(unreviewed, 'shot-a'), null);
  assert.equal(api.effectStart(unreviewed, { stepIndex: 0 }), null);

  [-1, 0.5, '0', NaN, Infinity, 3].forEach((stepIndex) => {
    assert.equal(api.stepStart(record, stepIndex), null);
  });
  assert.equal(api.stepStart(reviewedRecord({ steps: null }), 0), null);

  [-1, NaN, Infinity, '4', 90, 91].forEach((startSeconds) => {
    assert.equal(
      api.stepStart(reviewedRecord({ steps: [{ startSeconds }] }), 0),
      null
    );
  });
});

test('requires an exact nonblank screenshot image key and a timed matching step', () => {
  const api = timelineApi();
  const record = reviewedRecord();

  ['', '   ', 'SHOT-A', ' shot-a ', 'missing'].forEach((imageKey) => {
    assert.equal(api.screenshotStart(record, imageKey), null);
  });
  assert.equal(api.screenshotStart(record, 42), null);
  assert.equal(api.screenshotStart(record), null);
  assert.equal(
    api.screenshotStart(reviewedRecord({ steps: [{ imageKey: 'shot-a', startSeconds: '4' }] }), 'shot-a'),
    null
  );
  assert.equal(
    api.screenshotStart(reviewedRecord({ steps: [{ imageKey: '   ', startSeconds: 4 }] }), '   '),
    null
  );
});

test('formats floored nonnegative numeric seconds with compact hour handling', () => {
  const api = timelineApi();

  assert.equal(api.formatTime(0), '00:00');
  assert.equal(api.formatTime(5), '00:05');
  assert.equal(api.formatTime(65.99), '01:05');
  assert.equal(api.formatTime(3599), '59:59');
  assert.equal(api.formatTime(3600), '1:00:00');
  assert.equal(api.formatTime(3661.9), '1:01:01');
  [-1, NaN, Infinity, -Infinity, '65', null, undefined].forEach((seconds) => {
    assert.equal(api.formatTime(seconds), '00:00');
  });
});

test('returns exact frozen timeline coverage counts', () => {
  const api = timelineApi();
  const reviewed = reviewedRecord({
    steps: [
      { startSeconds: 4 },
      { startSeconds: '25' },
      { startSeconds: 89.75 }
    ]
  });
  const unreviewed = reviewedRecord({
    id: 'record-b',
    timeline: { durationSeconds: 20, reviewedAt: '', source: 'youtube-player' },
    steps: [{ startSeconds: 2 }, { startSeconds: 8 }]
  });
  const publicUses = [
    { sourceRecordId: 'record-a', stepIndex: 0, screenshotReviewed: true },
    { sourceRecordId: 'record-a', stepIndex: 1, screenshotReviewed: 1 },
    { sourceRecordId: 'record-a', stepIndex: 2, startSeconds: 30, screenshotReviewed: true },
    { sourceRecordId: 'record-b', stepIndex: 0, screenshotReviewed: true },
    { sourceRecordId: 'missing', stepIndex: 0, screenshotReviewed: false }
  ];

  const result = api.coverage([reviewed, unreviewed], publicUses);

  assert.deepEqual(result, {
    records: 2,
    reviewedRecords: 1,
    steps: 5,
    timedSteps: 2,
    publicCases: 5,
    timedPublicCases: 2,
    screenshotCasesReviewed: 3
  });
  assert.ok(Object.isFrozen(result));
});

test('returns frozen zero coverage for missing or malformed collections', () => {
  const api = timelineApi();
  const expected = {
    records: 0,
    reviewedRecords: 0,
    steps: 0,
    timedSteps: 0,
    publicCases: 0,
    timedPublicCases: 0,
    screenshotCasesReviewed: 0
  };

  [api.coverage(), api.coverage(null, {}), api.coverage({}, null)].forEach((result) => {
    assert.deepEqual(result, expected);
    assert.ok(Object.isFrozen(result));
  });
});

test('attaches the same frozen API contract to the browser global', () => {
  assert.ok(fs.existsSync(modulePath), 'video timeline module must exist');
  const source = fs.readFileSync(modulePath, 'utf8');
  const context = {};

  vm.runInNewContext(source, context);

  const browserApi = context.SfxVideoTimeline;
  assert.ok(browserApi);
  assert.deepEqual(Object.keys(browserApi), apiKeys);
  assert.ok(Object.isFrozen(browserApi));
  assert.equal(browserApi.validRecord(reviewedRecord()), true);
  assert.equal(browserApi.effectStart(reviewedRecord(), { stepIndex: 1 }), 25);
  assert.equal(browserApi.formatTime(3661), '1:01:01');
  assert.ok(Object.isFrozen(browserApi.coverage([], [])));
});
