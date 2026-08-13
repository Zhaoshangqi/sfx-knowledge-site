'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SfxVideoSubtitles = require('../src/video-subtitles.js');

const realVideoId = 'Xl5u91oQv-k';
const realAsset = 'assets/subtitles/' + realVideoId + '.json';
const apiKeys = [
  'entryFor',
  'loadTrack',
  'clearTrackCache',
  'cueAt',
  'formatTime',
  'statusFor',
  'coverageFor'
];

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function sampleTrack(videoId = 'video-a', overrides = {}) {
  return {
    videoId,
    language: 'zh-CN',
    source: 'site-owned',
    reviewStatus: 'draft',
    updatedAt: '2026-08-12',
    cues: [
      { start: 0, end: 1.5, text: 'cue-0' },
      { start: 2, end: 4, text: 'cue-1' },
      { start: 4, end: 5.25, text: 'cue-2' },
      { start: 8, end: 10, text: 'cue-3' }
    ],
    ...overrides
  };
}

function trackEntry(videoId = 'video-a', overrides = {}) {
  return {
    videoId,
    language: 'zh-CN',
    source: 'site-owned',
    reviewStatus: 'draft',
    updatedAt: '2026-08-12',
    contentStatus: 'track',
    asset: 'assets/subtitles/' + videoId + '.json',
    ...overrides
  };
}

function okJson(value) {
  return {
    ok: true,
    status: 200,
    json() {
      return Promise.resolve(value);
    }
  };
}

function browserApiWithCatalog(rawCatalog, extraContext = {}) {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'video-subtitles.js'),
    'utf8'
  );
  const injected = source.replace(
    /\/\* SUBTITLE_CATALOG_START \*\/[\s\S]*?\/\* SUBTITLE_CATALOG_END \*\//,
    '/* SUBTITLE_CATALOG_START */\n  var rawCatalog = ' +
      JSON.stringify(rawCatalog) +
      ';\n  /* SUBTITLE_CATALOG_END */'
  );
  assert.notEqual(injected, source, 'subtitle catalog marker block not found');

  const context = { ...extraContext };
  vm.runInNewContext(injected, context);
  return context.SfxVideoSubtitles;
}

test('publishes the validated lazy catalog API', () => {
  assert.deepEqual(Object.keys(SfxVideoSubtitles), apiKeys);
  assert.ok(Object.isFrozen(SfxVideoSubtitles));

  assert.equal(SfxVideoSubtitles.entryFor(), null);
  assert.equal(SfxVideoSubtitles.entryFor(null), null);
  assert.equal(SfxVideoSubtitles.entryFor(''), null);
  assert.equal(SfxVideoSubtitles.entryFor('unknown-video'), null);

  const entry = SfxVideoSubtitles.entryFor(realVideoId);
  assert.deepEqual(entry, {
    videoId: realVideoId,
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-12',
    contentStatus: 'track',
    asset: realAsset
  });
  assert.ok(Object.isFrozen(entry));
});

test('normalizes track, no-speech, and missing catalog statuses and coverage', () => {
  const api = browserApiWithCatalog([
    trackEntry('draft-video'),
    trackEntry('reviewed-video', { reviewStatus: 'reviewed' }),
    {
      videoId: 'silent-video',
      contentStatus: 'no-speech',
      updatedAt: '2026-08-12',
      auditNote: 'Full-duration human listening confirmed no speech.'
    },
    {
      videoId: 'pending-video',
      contentStatus: 'missing',
      updatedAt: '2026-08-13',
      reason: 'Human full-duration listening is still required.'
    }
  ]);

  assert.deepEqual(plain(api.statusFor('draft-video')), {
    status: 'draft',
    label: '机器初稿，术语已初步校正'
  });
  assert.deepEqual(plain(api.statusFor('reviewed-video')), {
    status: 'reviewed',
    label: '中文字幕已校对'
  });
  assert.deepEqual(plain(api.statusFor('silent-video')), {
    status: 'no-speech',
    label: '无语音，无需字幕'
  });
  assert.deepEqual(plain(api.statusFor('pending-video')), {
    status: 'missing',
    label: '中文字幕整理中'
  });
  assert.strictEqual(api.statusFor('unknown-video'), api.statusFor('pending-video'));

  const coverage = api.coverageFor([
    { videoId: 'draft-video' },
    { videoId: ' draft-video ' },
    { videoId: 'reviewed-video' },
    { videoId: 'silent-video' },
    { videoId: 'pending-video' },
    { videoId: 'unknown-video' },
    { videoId: '' },
    null
  ]);
  assert.deepEqual(plain(coverage), {
    total: 5,
    tracks: 2,
    reviewed: 1,
    draft: 1,
    noSpeech: 1,
    missing: 2
  });
  assert.deepEqual(Object.keys(coverage), [
    'total',
    'tracks',
    'reviewed',
    'draft',
    'noSpeech',
    'missing'
  ]);
  assert.ok(Object.isFrozen(coverage));
});

test('preserves validated evidence for missing and no-speech catalog entries', () => {
  const api = browserApiWithCatalog([
    {
      videoId: 'pending-video',
      contentStatus: 'missing',
      updatedAt: '2026-08-13',
      reason: '  Human listening is still required.  '
    },
    {
      videoId: 'silent-video',
      contentStatus: 'no-speech',
      updatedAt: '2026-08-12',
      auditNote: '  Full-duration human listening confirmed no speech.  ',
      reason: '  No intelligible speech was heard.  '
    }
  ]);

  assert.deepEqual(plain(api.entryFor('pending-video')), {
    videoId: 'pending-video',
    contentStatus: 'missing',
    updatedAt: '2026-08-13',
    reason: 'Human listening is still required.'
  });
  assert.deepEqual(plain(api.entryFor('silent-video')), {
    videoId: 'silent-video',
    contentStatus: 'no-speech',
    updatedAt: '2026-08-12',
    auditNote: 'Full-duration human listening confirmed no speech.',
    reason: 'No intelligible speech was heard.'
  });
  assert.ok(Object.isFrozen(api.entryFor('pending-video')));
  assert.ok(Object.isFrozen(api.entryFor('silent-video')));
});

test('returns frozen empty coverage for malformed record input', () => {
  [undefined, null, {}, 'records'].forEach((records) => {
    const coverage = SfxVideoSubtitles.coverageFor(records);

    assert.deepEqual(coverage, {
      total: 0,
      tracks: 0,
      reviewed: 0,
      draft: 0,
      noSpeech: 0,
      missing: 0
    });
    assert.ok(Object.isFrozen(coverage));
  });
});

test('rejects malformed catalog entries and unsafe subtitle asset paths', () => {
  const invalidCatalogs = [
    [{ videoId: 'video-a', contentStatus: 'unknown' }],
    [{ videoId: 'pending-video', contentStatus: 'missing', updatedAt: '2026-08-13' }],
    [{ videoId: 'pending-video', contentStatus: 'missing', updatedAt: '2026-02-30', reason: 'Evidence' }],
    [{ videoId: 'pending-video', contentStatus: 'missing', updatedAt: '2026-08-13', reason: '  ' }],
    [{ videoId: 'silent-video', contentStatus: 'no-speech', updatedAt: '2026-08-13' }],
    [{ videoId: 'silent-video', contentStatus: 'no-speech', updatedAt: 'not-a-date', auditNote: 'Evidence' }],
    [{ videoId: 'silent-video', contentStatus: 'no-speech', updatedAt: '2026-08-13', auditNote: '  ' }],
    [trackEntry('video-a', { asset: '../video-a.json' })],
    [trackEntry('video-a', { asset: '/assets/subtitles/video-a.json' })],
    [trackEntry('video-a', { asset: 'assets\\subtitles\\video-a.json' })],
    [trackEntry('video-a', { asset: 'assets/subtitles/other-video.json' })],
    [trackEntry('video-a', { asset: 'assets/subtitles/video-a.json?draft=1' })],
    [trackEntry('video-a', { asset: 'assets/subtitles/video-a.txt' })],
    [trackEntry('../video-a', { asset: 'assets/subtitles/../video-a.json' })],
    [trackEntry('video-a', { reviewStatus: 'machine' })],
    [trackEntry('video-a', { source: '' })]
  ];

  invalidCatalogs.forEach((catalog) => {
    assert.throws(
      () => browserApiWithCatalog(catalog),
      /Invalid subtitle catalog entry at index 0/
    );
  });

  assert.throws(
    () => browserApiWithCatalog([
      trackEntry('video-a'),
      trackEntry(' video-a ', { asset: 'assets/subtitles/video-a.json' })
    ]),
    /Duplicate subtitle catalog entry for videoId: video-a/
  );
});

test('returns one shared in-flight request and retains its fulfilled Promise', async () => {
  const api = browserApiWithCatalog([trackEntry('video-a')]);
  let resolveResponse;
  let fetchCalls = 0;
  const responsePromise = new Promise((resolve) => {
    resolveResponse = resolve;
  });
  const fetchTrack = (asset) => {
    fetchCalls += 1;
    assert.equal(asset, 'assets/subtitles/video-a.json');
    return responsePromise;
  };

  const first = api.loadTrack('video-a', { fetch: fetchTrack });
  const second = api.loadTrack(' video-a ', { fetch: fetchTrack });

  assert.strictEqual(second, first);
  assert.equal(fetchCalls, 1);

  resolveResponse(okJson(sampleTrack('video-a')));
  const loaded = await first;
  const third = api.loadTrack('video-a', {
    fetch() {
      throw new Error('fulfilled cache should avoid a second fetch');
    }
  });

  assert.strictEqual(third, first);
  assert.strictEqual(await third, loaded);
  assert.equal(fetchCalls, 1);
});

test('deeply freezes loaded tracks and cues after strict validation', async () => {
  const api = browserApiWithCatalog([trackEntry('video-a')]);
  const rawTrack = sampleTrack('video-a');
  const loaded = await api.loadTrack('video-a', {
    fetch: () => Promise.resolve(okJson(rawTrack))
  });

  assert.ok(Object.isFrozen(loaded));
  assert.ok(Object.isFrozen(loaded.cues));
  loaded.cues.forEach((cue) => assert.ok(Object.isFrozen(cue)));
  assert.notStrictEqual(loaded, rawTrack);
  assert.notStrictEqual(loaded.cues, rawTrack.cues);
  assert.notStrictEqual(loaded.cues[0], rawTrack.cues[0]);
  assert.strictEqual(api.cueAt(loaded, 2.5), loaded.cues[1]);
  assert.throws(() => {
    loaded.cues[0].text = 'changed';
  }, TypeError);
});

test('does not fetch no-speech, missing, unknown, or invalid video ids', async () => {
  const api = browserApiWithCatalog([
    {
      videoId: 'silent-video',
      contentStatus: 'no-speech',
      updatedAt: '2026-08-12',
      auditNote: 'Full-duration human listening confirmed no speech.'
    },
    {
      videoId: 'pending-video',
      contentStatus: 'missing',
      updatedAt: '2026-08-13',
      reason: 'Human full-duration listening is still required.'
    }
  ]);
  let fetchCalls = 0;
  const fetchTrack = () => {
    fetchCalls += 1;
    throw new Error('fetch must not run');
  };

  assert.equal(await api.loadTrack('silent-video', { fetch: fetchTrack }), null);
  assert.equal(await api.loadTrack('pending-video', { fetch: fetchTrack }), null);
  assert.equal(await api.loadTrack('unknown-video', { fetch: fetchTrack }), null);
  assert.equal(await api.loadTrack('', { fetch: fetchTrack }), null);
  assert.equal(fetchCalls, 0);
});

test('uses browser global fetch when no injected fetch is supplied', async () => {
  let fetchCalls = 0;
  const api = browserApiWithCatalog([trackEntry('video-a')], {
    fetch(asset) {
      fetchCalls += 1;
      assert.equal(asset, 'assets/subtitles/video-a.json');
      return Promise.resolve(okJson(sampleTrack('video-a')));
    }
  });

  const loaded = await api.loadTrack('video-a');

  assert.equal(loaded.videoId, 'video-a');
  assert.equal(fetchCalls, 1);
});

test('rejects HTTP failures without parsing their bodies', async () => {
  const api = browserApiWithCatalog([trackEntry('video-a')]);
  let parsed = false;

  await assert.rejects(
    api.loadTrack('video-a', {
      fetch: () => Promise.resolve({
        ok: false,
        status: 503,
        statusText: 'Unavailable',
        json() {
          parsed = true;
          return Promise.resolve(sampleTrack('video-a'));
        }
      })
    }),
    /Failed to load subtitle track video-a: HTTP 503 Unavailable/
  );
  assert.equal(parsed, false);
});

test('removes failed requests from cache so a later call retries', async () => {
  const api = browserApiWithCatalog([trackEntry('video-a')]);
  let fetchCalls = 0;
  const fetchTrack = () => {
    fetchCalls += 1;
    if (fetchCalls === 1) return Promise.reject(new Error('offline'));
    return Promise.resolve(okJson(sampleTrack('video-a')));
  };

  const failed = api.loadTrack('video-a', { fetch: fetchTrack });
  await assert.rejects(failed, /offline/);

  const retry = api.loadTrack('video-a', { fetch: fetchTrack });
  assert.notStrictEqual(retry, failed);
  assert.equal((await retry).videoId, 'video-a');
  assert.equal(fetchCalls, 2);
});

test('clearTrackCache discards fulfilled loader Promises', async () => {
  const api = browserApiWithCatalog([trackEntry('video-a')]);
  let fetchCalls = 0;
  const fetchTrack = () => {
    fetchCalls += 1;
    return Promise.resolve(okJson(sampleTrack('video-a')));
  };

  const first = api.loadTrack('video-a', { fetch: fetchTrack });
  await first;
  api.clearTrackCache();
  const second = api.loadTrack('video-a', { fetch: fetchTrack });

  assert.notStrictEqual(second, first);
  await second;
  assert.equal(fetchCalls, 2);
});

test('rejects malformed JSON and structurally invalid JSON tracks', async () => {
  const malformedJsonApi = browserApiWithCatalog([trackEntry('video-a')]);
  await assert.rejects(
    malformedJsonApi.loadTrack('video-a', {
      fetch: () => Promise.resolve({
        ok: true,
        status: 200,
        json() {
          return Promise.reject(new SyntaxError('Unexpected token'));
        }
      })
    }),
    /Unexpected token/
  );

  const invalidTrackApi = browserApiWithCatalog([trackEntry('video-a')]);
  await assert.rejects(
    invalidTrackApi.loadTrack('video-a', {
      fetch: () => Promise.resolve(okJson(sampleTrack('video-a', { cues: [] })))
    }),
    /Invalid subtitle track for videoId: video-a/
  );
});

test('rejects a valid track whose identity does not match its catalog entry', async () => {
  const api = browserApiWithCatalog([trackEntry('video-a')]);

  await assert.rejects(
    api.loadTrack('video-a', {
      fetch: () => Promise.resolve(okJson(sampleTrack('other-video')))
    }),
    /Subtitle track metadata does not match catalog entry: video-a/
  );
});

test('finds immutable cues at start-inclusive and end-exclusive boundaries', () => {
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
  assert.ok(Object.isFrozen(SfxVideoSubtitles.cueAt(track, 2)));
  assert.notStrictEqual(SfxVideoSubtitles.cueAt(track, 2), track.cues[1]);
});

test('reuses validated cues and fails closed for malformed tracks and times', () => {
  const cue = Object.freeze({ start: 0, end: 2, text: 'stable' });
  const immutableTrack = Object.freeze({ cues: Object.freeze([cue]) });
  assert.strictEqual(
    SfxVideoSubtitles.cueAt(immutableTrack, 1),
    SfxVideoSubtitles.cueAt(immutableTrack, 1.5)
  );

  const validCue = { start: 0, end: 1, text: 'valid' };
  const malformedTracks = [
    null,
    {},
    { cues: null },
    { cues: 'not-an-array' },
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

test('loads the exact extracted Xl5u91oQv-k draft asset', async () => {
  const assetPath = path.join(__dirname, '..', ...realAsset.split('/'));
  const bytes = fs.readFileSync(assetPath);
  const source = bytes.toString('utf8');
  const trailingNewline = source.match(/(?:\r\n|\n|\r)+$/);

  assert.notEqual(source.charCodeAt(0), 0xfeff);
  assert.ok(trailingNewline);
  assert.ok(trailingNewline[0] === '\n' || trailingNewline[0] === '\r\n');
  assert.ok(Buffer.from(source, 'utf8').equals(bytes));

  const rawTrack = JSON.parse(source);
  const loaded = await SfxVideoSubtitles.loadTrack(realVideoId, {
    fetch(asset) {
      assert.equal(asset, realAsset);
      return Promise.resolve(okJson(rawTrack));
    }
  });

  assert.equal(loaded.videoId, realVideoId);
  assert.equal(loaded.language, 'zh-CN');
  assert.equal(loaded.source, 'site-owned-from-public-captions');
  assert.equal(loaded.reviewStatus, 'draft');
  assert.equal(loaded.updatedAt, '2026-08-12');
  assert.equal(loaded.cues.length, 23);
  assert.equal(loaded.cues[0].start, 40.559);
  assert.equal(loaded.cues.at(-1).end, 382.199);

  const text = loaded.cues.map((cue) => cue.text).join(' ');
  [
    'Stepwise Morph',
    'Serum',
    'Analog 4088',
    'PWM',
    'GRM Reson',
    '瞬态塑形',
    '采样保持速率',
    'FFT Size'
  ].forEach((term) => {
    assert.match(text, new RegExp(term, 'i'), 'missing corrected term: ' + term);
  });
  assert.doesNotMatch(text, /F50|\[音乐]|\[掌声]|机器翻译/);
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
  assert.equal(browserApi.entryFor('unknown-video'), null);
  assert.equal(browserApi.formatTime(3661), '1:01:01');
  assert.equal(browserApi.statusFor('unknown-video').status, 'missing');
  assert.equal(browserApi.statusFor('unknown-video').label, '中文字幕整理中');
  assert.ok(Object.isFrozen(browserApi.statusFor('unknown-video')));
  assert.ok(Object.isFrozen(browserApi.coverageFor([{ videoId: 'video-a' }])));
  assert.ok(Object.isFrozen(browserApi.cueAt(sampleTrack(), 0)));
});
