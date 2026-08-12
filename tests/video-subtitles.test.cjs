'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SfxVideoSubtitles = require('../src/video-subtitles.js');

const apiKeys = [
  'trackFor',
  'cueAt',
  'formatTime',
  'statusFor',
  'coverageFor'
];

function sampleTrack() {
  return {
    cues: [
      { start: 0, end: 1.5, text: 'cue-0' },
      { start: 2, end: 4, text: 'cue-1' },
      { start: 4, end: 5.25, text: 'cue-2' },
      { start: 8, end: 10, text: 'cue-3' }
    ]
  };
}

function browserApiWithTracks(rawTracks) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'video-subtitles.js'),
    'utf8'
  );
  const injected = source.replace(
    /\/\* TRACK_DATA_START \*\/[\s\S]*?\/\* TRACK_DATA_END \*\//,
    '/* TRACK_DATA_START */\n  var rawTracks = ' + JSON.stringify(rawTracks) + ';\n  /* TRACK_DATA_END */'
  );
  const context = {};
  vm.runInNewContext(injected, context);
  return context.SfxVideoSubtitles;
}

test('publishes the CommonJS subtitle API without placeholder tracks', () => {
  assert.deepEqual(Object.keys(SfxVideoSubtitles), apiKeys);
  assert.ok(Object.isFrozen(SfxVideoSubtitles));

  assert.equal(SfxVideoSubtitles.trackFor(), null);
  assert.equal(SfxVideoSubtitles.trackFor(null), null);
  assert.equal(SfxVideoSubtitles.trackFor(''), null);
  assert.equal(SfxVideoSubtitles.trackFor('unknown-video'), null);
});

test('returns an explicit frozen missing status instead of inventing a track', () => {
  const status = SfxVideoSubtitles.statusFor('unknown-video');

  assert.deepEqual(status, {
    status: 'missing',
    label: '中文字幕整理中'
  });
  assert.ok(Object.isFrozen(status));
  assert.strictEqual(SfxVideoSubtitles.statusFor(), status);
  assert.strictEqual(SfxVideoSubtitles.statusFor('another-video'), status);
});

test('finds cues at start-inclusive and end-exclusive boundaries', () => {
  const track = sampleTrack();

  assert.deepEqual(SfxVideoSubtitles.cueAt(track, 0), {
    start: 0,
    end: 1.5,
    text: 'cue-0'
  });
  assert.equal(SfxVideoSubtitles.cueAt(track, 1.5), null);
  assert.equal(SfxVideoSubtitles.cueAt(track, 1.999), null);
  assert.equal(SfxVideoSubtitles.cueAt(track, 5.25), null);
  assert.equal(SfxVideoSubtitles.cueAt(track, 7.999), null);
  assert.deepEqual(SfxVideoSubtitles.cueAt(track, 2), {
    start: 2,
    end: 4,
    text: 'cue-1'
  });
  assert.deepEqual(SfxVideoSubtitles.cueAt(track, 4), {
    start: 4,
    end: 5.25,
    text: 'cue-2'
  });
  assert.deepEqual(SfxVideoSubtitles.cueAt(track, 9.999), {
    start: 8,
    end: 10,
    text: 'cue-3'
  });
  assert.equal(SfxVideoSubtitles.cueAt(track, 10), null);
});

test('returns immutable cue values', () => {
  const inputTrack = sampleTrack();
  const cue = SfxVideoSubtitles.cueAt(inputTrack, 2.5);

  assert.ok(Object.isFrozen(cue));
  assert.notStrictEqual(cue, inputTrack.cues[1]);
  assert.throws(() => {
    cue.text = 'changed';
  }, TypeError);
});

test('reuses validated immutable cues during playback polling', () => {
  const cue = Object.freeze({ start: 0, end: 2, text: 'stable' });
  const track = Object.freeze({ cues: Object.freeze([cue]) });

  const first = SfxVideoSubtitles.cueAt(track, 1);
  const second = SfxVideoSubtitles.cueAt(track, 1.5);

  assert.strictEqual(first, second);
});

test('fails closed for malformed tracks, cues, and times', () => {
  const validCue = { start: 0, end: 1, text: 'valid' };
  const malformedTracks = [
    null,
    {},
    { cues: null },
    { cues: 'not-an-array' },
    Object.freeze({ cues: null }),
    Object.freeze({ cues: Object.freeze('not-an-array') }),
    { cues: [] },
    { cues: [null] },
    { cues: [{ start: NaN, end: 1, text: 'nonfinite-start' }] },
    { cues: [{ start: '0', end: 1, text: 'bad-start' }] },
    { cues: [{ start: 0, end: Infinity, text: 'bad-end' }] },
    { cues: [{ start: -1, end: 1, text: 'negative-start' }] },
    { cues: [{ start: 0, end: -1, text: 'negative-end' }] },
    { cues: [{ start: 1, end: 1, text: 'zero-duration' }] },
    { cues: [{ start: 2, end: 1, text: 'backwards' }] },
    { cues: [{ start: 0, end: 1, text: '' }] },
    { cues: [{ start: 0, end: 1, text: '   ' }] },
    { cues: [{ start: 0, end: 1, text: 42 }] },
    {
      cues: [
        { start: 2, end: 3, text: 'later' },
        { start: 0, end: 1, text: 'earlier' }
      ]
    },
    {
      cues: [
        { start: 0, end: 2, text: 'first' },
        { start: 1.5, end: 3, text: 'overlap' }
      ]
    },
    { cues: [validCue, { start: 2, end: 3, text: '' }] }
  ];

  malformedTracks.forEach((track) => {
    assert.equal(SfxVideoSubtitles.cueAt(track, 0.5), null);
  });

  [undefined, null, '', '1', NaN, Infinity, -Infinity, -0.001].forEach((seconds) => {
    assert.equal(SfxVideoSubtitles.cueAt({ cues: [validCue] }, seconds), null);
  });
});

test('formats compact timestamps and clamps invalid values to zero', () => {
  assert.equal(SfxVideoSubtitles.formatTime(0), '00:00');
  assert.equal(SfxVideoSubtitles.formatTime(5), '00:05');
  assert.equal(SfxVideoSubtitles.formatTime(65), '01:05');
  assert.equal(SfxVideoSubtitles.formatTime(65.99), '01:05');
  assert.equal(SfxVideoSubtitles.formatTime(3599), '59:59');
  assert.equal(SfxVideoSubtitles.formatTime(3600), '1:00:00');
  assert.equal(SfxVideoSubtitles.formatTime(3661), '1:01:01');
  assert.equal(SfxVideoSubtitles.formatTime(-1), '00:00');
  assert.equal(SfxVideoSubtitles.formatTime(NaN), '00:00');
  assert.equal(SfxVideoSubtitles.formatTime(Infinity), '00:00');
  assert.equal(SfxVideoSubtitles.formatTime('65'), '00:00');
  assert.equal(SfxVideoSubtitles.formatTime(), '00:00');
});

test('counts unique valid records once and reports empty-table coverage', () => {
  const summary = SfxVideoSubtitles.coverageFor([
    { videoId: 'video-a' },
    { videoId: ' video-a ' },
    { videoId: 'video-b' },
    { videoId: '' },
    { videoId: '   ' },
    { videoId: 42 },
    {},
    null,
    'video-c'
  ]);

  assert.deepEqual(summary, {
    total: 2,
    reviewed: 0,
    draft: 0,
    missing: 2
  });
  assert.deepEqual(Object.keys(summary), ['total', 'reviewed', 'draft', 'missing']);
  assert.ok(Object.isFrozen(summary));
});

test('handles malformed coverage input with a frozen empty summary', () => {
  [undefined, null, {}, 'records'].forEach((records) => {
    const summary = SfxVideoSubtitles.coverageFor(records);

    assert.deepEqual(summary, {
      total: 0,
      reviewed: 0,
      draft: 0,
      missing: 0
    });
    assert.ok(Object.isFrozen(summary));
  });
});

test('loads real draft and reviewed tracks with deep immutability', () => {
  const api = browserApiWithTracks([
    {
      videoId: 'draft-video',
      language: 'zh-CN',
      source: 'site-owned',
      reviewStatus: 'draft',
      updatedAt: '2026-08-12',
      cues: [{ start: 0, end: 2, text: '初稿字幕' }]
    },
    {
      videoId: 'reviewed-video',
      language: 'zh-CN',
      source: 'site-owned',
      reviewStatus: 'reviewed',
      updatedAt: '2026-08-12',
      cues: [{ start: 1, end: 3, text: '已校对字幕' }]
    }
  ]);

  const draftTrack = api.trackFor('draft-video');
  assert.ok(Object.isFrozen(draftTrack));
  assert.ok(Object.isFrozen(draftTrack.cues));
  assert.ok(Object.isFrozen(draftTrack.cues[0]));
  assert.strictEqual(api.cueAt(draftTrack, 1), draftTrack.cues[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(api.statusFor('draft-video'))), {
    status: 'draft',
    label: '机器初稿，术语已初步校正'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(api.statusFor('reviewed-video'))), {
    status: 'reviewed',
    label: '中文字幕已校对'
  });
  assert.deepEqual(JSON.parse(JSON.stringify(api.coverageFor([
    { videoId: 'draft-video' },
    { videoId: 'reviewed-video' },
    { videoId: 'missing-video' }
  ]))), {
    total: 3,
    reviewed: 1,
    draft: 1,
    missing: 1
  });
});

test('rejects invalid and duplicate raw tracks during initialization', () => {
  const validTrack = {
    videoId: 'video-a',
    language: 'zh-CN',
    source: 'site-owned',
    reviewStatus: 'draft',
    updatedAt: '2026-08-12',
    cues: [{ start: 0, end: 1, text: '字幕' }]
  };

  assert.throws(() => browserApiWithTracks([{ ...validTrack, cues: [] }]), /Invalid subtitle track at index 0/);
  assert.throws(() => browserApiWithTracks([
    validTrack,
    { ...validTrack, videoId: ' video-a ' }
  ]), /Duplicate subtitle track for videoId: video-a/);
});

test('publishes the real Xl5u91oQv-k Chinese draft as site-owned cues', () => {
  const track = SfxVideoSubtitles.trackFor('Xl5u91oQv-k');

  assert.ok(track);
  assert.equal(track.language, 'zh-CN');
  assert.equal(track.source, 'site-owned-from-public-captions');
  assert.equal(track.reviewStatus, 'draft');
  assert.equal(track.updatedAt, '2026-08-12');
  assert.ok(track.cues.length >= 20);
  assert.ok(track.cues[0].start >= 40 && track.cues[0].start < 41);
  assert.ok(track.cues.at(-1).end >= 382);
  assert.ok(Object.isFrozen(track));
  assert.ok(Object.isFrozen(track.cues));
  track.cues.forEach((cue, index) => {
    assert.ok(Object.isFrozen(cue));
    assert.ok(cue.end > cue.start);
    if (index > 0) assert.ok(cue.start >= track.cues[index - 1].end);
  });

  const text = track.cues.map((cue) => cue.text).join(' ');
  ['Stepwise Morph', 'Serum', 'Analog 4088', 'PWM', 'GRM Reson', '瞬态塑形', '采样保持速率', 'FFT Size'].forEach((term) => {
    assert.match(text, new RegExp(term, 'i'), 'missing corrected term: ' + term);
  });
  assert.doesNotMatch(text, /F50|\[音乐]|\[掌声]|机器翻译/);
  assert.equal(SfxVideoSubtitles.statusFor('Xl5u91oQv-k').status, 'draft');
  assert.deepEqual(SfxVideoSubtitles.coverageFor([
    { videoId: 'Xl5u91oQv-k' },
    { videoId: 'missing-video' }
  ]), {
    total: 2,
    reviewed: 0,
    draft: 1,
    missing: 1
  });
});

test('attaches the same frozen API contract to the browser global', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'video-subtitles.js'),
    'utf8'
  );
  const context = {};

  vm.runInNewContext(source, context);

  const browserApi = context.SfxVideoSubtitles;
  assert.ok(browserApi);
  assert.deepEqual(Object.keys(browserApi), apiKeys);
  assert.ok(Object.isFrozen(browserApi));
  assert.equal(browserApi.trackFor('unknown-video'), null);
  assert.equal(browserApi.formatTime(3661), '1:01:01');
  assert.equal(browserApi.statusFor('unknown-video').status, 'missing');
  assert.equal(browserApi.statusFor('unknown-video').label, '中文字幕整理中');
  assert.ok(Object.isFrozen(browserApi.statusFor('unknown-video')));
  assert.ok(Object.isFrozen(browserApi.coverageFor([{ videoId: 'video-a' }])));
  assert.ok(Object.isFrozen(browserApi.cueAt(sampleTrack(), 0)));
});
