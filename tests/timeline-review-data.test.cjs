'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const timelineReviewData = require('../tools/timeline-review-data.cjs');

function api() {
  assert.ok(timelineReviewData, 'timeline review data module must exist');
  return timelineReviewData;
}

function assertDeepFrozen(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return;
  }
  seen.add(value);
  assert.ok(Object.isFrozen(value));
  Reflect.ownKeys(value).forEach((key) => assertDeepFrozen(value[key], seen));
}

test('publishes the exact frozen CommonJS API', () => {
  const reviewData = api();

  assert.deepEqual(Object.keys(reviewData), [
    'buildReviewQueue',
    'candidateCues',
    'tokenize'
  ]);
  assert.ok(Object.isFrozen(reviewData));
});

test('tokenize normalizes case and NFKC while preserving useful product punctuation', () => {
  const reviewData = api();

  const result = reviewData.tokenize(
    "ＰＲＯ－Ｑ Pro-Q ＳＯＯＴＨＥ２ FilterFreak api.v2 mid_side devil's a-b xy EQ 共振 高频 共振"
  );

  assert.deepEqual(result, [
    'pro-q',
    'soothe2',
    'filterfreak',
    'api.v2',
    'mid_side',
    "devil's",
    'a-b',
    '共振',
    '高频'
  ]);
  assert.ok(Object.isFrozen(result));
});

test('tokenize removes fixed workflow stop words and fails closed for nonstrings', () => {
  const reviewData = api();
  const stopWords = [
    'use', 'add', 'sound', 'audio', 'plugin', 'effect', 'step', 'layer', 'track', 'video',
    '使用', '加入', '声音', '音效', '插件', '效果', '步骤', '素材', '处理', '调整', '然后',
    '这里', '这个'
  ].join(' ');

  assert.deepEqual(reviewData.tokenize(`${stopWords} Pro-Q 共振`), ['pro-q', '共振']);
  [undefined, null, 42, {}, [], new String('Pro-Q')].forEach((value) => {
    const result = reviewData.tokenize(value);
    assert.deepEqual(result, []);
    assert.ok(Object.isFrozen(result));
  });
});

test('candidateCues ranks distinct Pro-Q and resonance matches before earlier partial matches', () => {
  const reviewData = api();
  const track = {
    cues: [
      { start: 5, end: 8, text: 'Open Pro-Q on the dialogue bus.' },
      { start: 20, end: 24, text: 'Use Pro-Q to reduce the resonance.' }
    ]
  };
  const terms = Object.freeze(['PRO-Q', 'resonance', 'Pro-Q']);
  const trackBefore = structuredClone(track);

  const result = reviewData.candidateCues(track, terms);

  assert.deepEqual(result.map((candidate) => candidate.start), [20, 5]);
  assert.deepEqual(result, [
    {
      start: 20,
      end: 24,
      text: 'Use Pro-Q to reduce the resonance.',
      score: 2,
      matchedTerms: ['pro-q', 'resonance']
    },
    {
      start: 5,
      end: 8,
      text: 'Open Pro-Q on the dialogue bus.',
      score: 1,
      matchedTerms: ['pro-q']
    }
  ]);
  assert.deepEqual(track, trackBefore);
  assert.deepEqual(terms, ['PRO-Q', 'resonance', 'Pro-Q']);
  assert.ok(Object.isFrozen(result));
  result.forEach((candidate) => {
    assert.ok(Object.isFrozen(candidate));
    assert.ok(Object.isFrozen(candidate.matchedTerms));
  });
});

test('candidateCues caps deterministic ties at three and deduplicates normalized terms', () => {
  const reviewData = api();
  const track = {
    cues: [
      { start: 1, end: 2, text: 'Gamma Pro-Q' },
      { start: 2, end: 3, text: 'Alpha Pro-Q' },
      { start: 3, end: 4, text: 'Beta Pro-Q' },
      { start: 4, end: 5, text: 'Delta Pro-Q' }
    ]
  };

  const result = reviewData.candidateCues(track, ['Pro-Q', 'ＰＲＯ－Ｑ', 'pro-q']);

  assert.deepEqual(result.map((candidate) => candidate.text), [
    'Gamma Pro-Q',
    'Alpha Pro-Q',
    'Beta Pro-Q'
  ]);
  assert.equal(result.length, 3);
  result.forEach((candidate) => {
    assert.equal(candidate.score, 1);
    assert.deepEqual(candidate.matchedTerms, ['pro-q']);
  });
});

test('candidateCues uses Latin token boundaries and Chinese exact substrings', () => {
  const reviewData = api();
  const track = {
    cues: [
      { start: 1, end: 2, text: 'Business routing overview' },
      { start: 2, end: 3, text: 'Route the BUS now' },
      { start: 3, end: 4, text: '我们定位高频共振问题' }
    ]
  };

  const result = reviewData.candidateCues(track, ['bus', '共振']);

  assert.deepEqual(result.map((candidate) => candidate.start), [2, 3]);
  assert.deepEqual(result.map((candidate) => candidate.matchedTerms), [['bus'], ['共振']]);
});

test('candidateCues fails closed for malformed tracks, cues, and empty terms', () => {
  const reviewData = api();
  const malformedTracks = [
    undefined,
    null,
    {},
    { cues: null },
    { cues: [null] },
    { cues: [[]] },
    { cues: [{ start: '1', end: 2, text: 'Pro-Q' }] },
    { cues: [{ start: 1, end: '2', text: 'Pro-Q' }] },
    { cues: [{ start: NaN, end: 2, text: 'Pro-Q' }] },
    { cues: [{ start: 1, end: Infinity, text: 'Pro-Q' }] },
    { cues: [{ start: -1, end: 2, text: 'Pro-Q' }] },
    { cues: [{ start: 2, end: 2, text: 'Pro-Q' }] },
    { cues: [{ start: 2, end: 1, text: 'Pro-Q' }] },
    { cues: [{ start: 1, end: 2, text: 42 }] },
    { cues: [{ start: 1, end: 2, text: '   ' }] }
  ];

  malformedTracks.forEach((track) => {
    const result = reviewData.candidateCues(track, ['pro-q']);
    assert.deepEqual(result, []);
    assert.ok(Object.isFrozen(result));
  });

  const validTrack = { cues: [{ start: 1, end: 2, text: 'Pro-Q' }] };
  [undefined, null, [], [null, 42], ['use', '音效']].forEach((terms) => {
    const result = reviewData.candidateCues(validTrack, terms);
    assert.deepEqual(result, []);
    assert.ok(Object.isFrozen(result));
  });
});

test('candidateCues trims valid cue text and rejects noncanonical cue timelines', () => {
  const reviewData = api();
  const result = reviewData.candidateCues({
    cues: [{ start: 1, end: 2, text: '  Pro-Q  ' }]
  }, ['pro-q']);

  assert.deepEqual(result, [{
    start: 1,
    end: 2,
    text: 'Pro-Q',
    score: 1,
    matchedTerms: ['pro-q']
  }]);
  assertDeepFrozen(result);
});

test('buildReviewQueue marks strict malformed cue timelines invalid with no candidates', () => {
  const reviewData = api();
  const sparseCues = new Array(2);
  sparseCues[0] = { start: 0, end: 1, text: 'Pro-Q' };
  const duplicate = { start: 0, end: 1, text: 'Pro-Q' };
  const tracksByVideoId = {
    empty: { cues: [] },
    sparse: { cues: sparseCues },
    overlap: { cues: [
      { start: 0, end: 2, text: 'Pro-Q' },
      { start: 1, end: 3, text: 'Pro-Q' }
    ] },
    'out-of-order': { cues: [
      { start: 4, end: 5, text: 'Pro-Q' },
      { start: 1, end: 2, text: 'Pro-Q' }
    ] },
    duplicate: { cues: [duplicate, { ...duplicate }] },
    blank: { cues: [{ start: 0, end: 1, text: ' \t ' }] }
  };
  const records = Object.keys(tracksByVideoId).map((videoId, index) => ({
    id: `record-${index}`,
    videoId,
    title: videoId,
    steps: [{ order: 1, name: 'Pro-Q', detail: '', params: [], imageKey: '' }]
  }));

  const queue = reviewData.buildReviewQueue(records, tracksByVideoId);

  assert.deepEqual(queue.map((entry) => entry.subtitleStatus), [
    'invalid',
    'invalid',
    'invalid',
    'invalid',
    'invalid',
    'invalid'
  ]);
  queue.forEach((entry) => assert.deepEqual(entry.steps[0].candidates, []));
});

test('candidateCues rejects inherited, custom-prototype, and accessor cue evidence', () => {
  const reviewData = api();
  const plainCue = { start: 0, end: 1, text: 'Pro-Q' };
  const inheritedTrack = Object.create({ cues: [plainCue] });
  const customTrack = Object.assign(Object.create({ marker: true }), { cues: [plainCue] });
  const inheritedCue = Object.create(plainCue);
  const customCue = Object.assign(Object.create({ marker: true }), plainCue);
  let getterCalls = 0;
  const accessorTrack = {};
  Object.defineProperty(accessorTrack, 'cues', {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error('track cues getter must not run');
    }
  });
  const accessorCue = { end: 1, text: 'Pro-Q' };
  Object.defineProperty(accessorCue, 'start', {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error('cue start getter must not run');
    }
  });

  [
    inheritedTrack,
    customTrack,
    { cues: [inheritedCue] },
    { cues: [customCue] }
  ].forEach((track) => assert.deepEqual(reviewData.candidateCues(track, ['pro-q']), []));

  let accessorTrackResult;
  let accessorCueResult;
  assert.doesNotThrow(() => {
    accessorTrackResult = reviewData.candidateCues(accessorTrack, ['pro-q']);
    accessorCueResult = reviewData.candidateCues({ cues: [accessorCue] }, ['pro-q']);
  });
  assert.deepEqual(accessorTrackResult, []);
  assert.deepEqual(accessorCueResult, []);
  assert.equal(getterCalls, 0);
});

test('candidateCues catches reflective failures and preserves null-prototype data', () => {
  const reviewData = api();
  const hostileTrack = new Proxy({}, {
    get() {
      throw new Error('proxy get must not run');
    },
    getOwnPropertyDescriptor() {
      throw new Error('reflective failure');
    }
  });
  let hostileResult;

  assert.doesNotThrow(() => {
    hostileResult = reviewData.candidateCues(hostileTrack, ['pro-q']);
  });
  assert.deepEqual(hostileResult, []);

  const cue = Object.assign(Object.create(null), {
    start: 0,
    end: 1,
    text: ' Pro-Q '
  });
  const track = Object.assign(Object.create(null), { cues: [cue] });
  assert.deepEqual(reviewData.candidateCues(track, ['pro-q']), [{
    start: 0,
    end: 1,
    text: 'Pro-Q',
    score: 1,
    matchedTerms: ['pro-q']
  }]);
});

test('buildReviewQueue skips unsafe records without invoking getters', () => {
  const reviewData = api();
  const customRecord = Object.assign(Object.create({ inherited: true }), {
    id: 'custom-record',
    videoId: 'video-safe',
    title: 'Custom',
    steps: []
  });
  let getterCalls = 0;
  const accessorRecord = {
    id: 'accessor-record',
    videoId: 'video-safe',
    title: 'Accessor'
  };
  Object.defineProperty(accessorRecord, 'steps', {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error('record steps getter must not run');
    }
  });
  const hostileRecord = new Proxy({}, {
    get() {
      throw new Error('record proxy get must not run');
    },
    getOwnPropertyDescriptor() {
      throw new Error('record reflective failure');
    }
  });
  let queue;

  assert.doesNotThrow(() => {
    queue = reviewData.buildReviewQueue([customRecord, accessorRecord, hostileRecord], {});
  });
  assert.deepEqual(queue, []);
  assert.equal(getterCalls, 0);
});

test('buildReviewQueue treats accessor map values as invalid without invoking them', () => {
  const reviewData = api();
  let getterCalls = 0;
  const tracksByVideoId = {};
  Object.defineProperty(tracksByVideoId, 'video-accessor', {
    enumerable: true,
    get() {
      getterCalls += 1;
      throw new Error('track map getter must not run');
    }
  });
  let queue;

  assert.doesNotThrow(() => {
    queue = reviewData.buildReviewQueue([{
      id: 'record-accessor',
      videoId: 'video-accessor',
      title: 'Accessor track',
      steps: [{ order: 1, name: 'Pro-Q', detail: '', params: [], imageKey: '' }]
    }], tracksByVideoId);
  });
  assert.equal(getterCalls, 0);
  assert.equal(queue[0].subtitleStatus, 'invalid');
  assert.deepEqual(queue[0].steps[0].candidates, []);
});

test('buildReviewQueue preserves unsafe step positions as empty projections', () => {
  const reviewData = api();
  const customStep = Object.assign(Object.create({ inherited: true }), {
    order: 90,
    name: 'Pro-Q',
    detail: 'Resonance',
    params: ['soothe2'],
    imageKey: 'custom-shot'
  });
  let getterCalls = 0;
  const accessorStep = {};
  ['order', 'name', 'detail', 'params', 'imageKey'].forEach((field) => {
    Object.defineProperty(accessorStep, field, {
      enumerable: true,
      get() {
        getterCalls += 1;
        throw new Error(`step ${field} getter must not run`);
      }
    });
  });
  const nullPrototypeStep = Object.assign(Object.create(null), {
    order: 3,
    name: 'Pro-Q',
    detail: '',
    params: [],
    imageKey: 'plain-shot'
  });
  const record = {
    id: 'record-steps',
    videoId: 'video-steps',
    title: 'Step safety',
    steps: [customStep, accessorStep, nullPrototypeStep]
  };
  let queue;

  assert.doesNotThrow(() => {
    queue = reviewData.buildReviewQueue([record], {
      'video-steps': { cues: [{ start: 0, end: 1, text: 'Pro-Q' }] }
    });
  });
  assert.equal(getterCalls, 0);
  assert.deepEqual(queue[0].steps.slice(0, 2), [
    {
      order: '',
      name: '',
      detail: '',
      imageKey: '',
      status: 'unreviewed',
      startSeconds: null,
      candidates: []
    },
    {
      order: '',
      name: '',
      detail: '',
      imageKey: '',
      status: 'unreviewed',
      startSeconds: null,
      candidates: []
    }
  ]);
  assert.equal(queue[0].steps[2].order, 3);
  assert.deepEqual(queue[0].steps[2].candidates.map((candidate) => candidate.start), [0]);
  assertDeepFrozen(queue);
});

test('buildReviewQueue preserves plain null-prototype records and track maps', () => {
  const reviewData = api();
  const step = Object.assign(Object.create(null), {
    order: 1,
    name: 'Pro-Q',
    detail: '',
    params: [],
    imageKey: 'null-shot'
  });
  const record = Object.assign(Object.create(null), {
    id: 'null-record',
    videoId: 'null-video',
    title: 'Null prototype',
    steps: [step]
  });
  const cue = Object.assign(Object.create(null), {
    start: 0,
    end: 1,
    text: 'Pro-Q'
  });
  const track = Object.assign(Object.create(null), { cues: [cue] });
  const tracksByVideoId = Object.assign(Object.create(null), { 'null-video': track });

  const queue = reviewData.buildReviewQueue([record], tracksByVideoId);

  assert.equal(queue[0].subtitleStatus, 'track');
  assert.equal(queue[0].recordId, 'null-record');
  assert.deepEqual(queue[0].steps[0].candidates.map((candidate) => candidate.start), [0]);
  assertDeepFrozen(queue);
});

test('buildReviewQueue projects ranked candidates but keeps every step unreviewed and untimed', () => {
  const reviewData = api();
  const records = [{
    id: 'record-pro-q',
    videoId: 'video-pro-q',
    title: 'Resonance cleanup',
    steps: [{
      order: 7,
      name: 'Pro-Q',
      detail: 'Resonance cleanup',
      params: ['soothe2'],
      imageKey: 'shot-pro-q',
      status: 'confirmed',
      startSeconds: 999,
      candidates: [{ start: 999, end: 1000, text: 'stale' }]
    }]
  }];
  const tracksByVideoId = {
    'video-pro-q': {
      cues: [
        { start: 5, end: 8, text: 'Open Pro-Q on the dialogue bus.' },
        { start: 20, end: 24, text: 'Use Pro-Q to reduce the resonance.' },
        { start: 30, end: 34, text: 'Then audition soothe2.' }
      ]
    }
  };
  const recordsBefore = structuredClone(records);
  const tracksBefore = structuredClone(tracksByVideoId);

  const queue = reviewData.buildReviewQueue(records, tracksByVideoId);

  assert.equal(queue.length, 1);
  assert.deepEqual(queue[0], {
    recordId: 'record-pro-q',
    videoId: 'video-pro-q',
    title: 'Resonance cleanup',
    subtitleStatus: 'track',
    steps: [{
      order: 7,
      name: 'Pro-Q',
      detail: 'Resonance cleanup',
      imageKey: 'shot-pro-q',
      status: 'unreviewed',
      startSeconds: null,
      candidates: [
        {
          start: 20,
          end: 24,
          text: 'Use Pro-Q to reduce the resonance.',
          score: 2,
          matchedTerms: ['pro-q', 'resonance']
        },
        {
          start: 5,
          end: 8,
          text: 'Open Pro-Q on the dialogue bus.',
          score: 1,
          matchedTerms: ['pro-q']
        },
        {
          start: 30,
          end: 34,
          text: 'Then audition soothe2.',
          score: 1,
          matchedTerms: ['soothe2']
        }
      ]
    }]
  });
  assert.equal(queue[0].steps[0].status, 'unreviewed');
  assert.equal(queue[0].steps[0].startSeconds, null);
  assert.deepEqual(queue[0].steps[0].candidates.slice(0, 2).map((cue) => cue.start), [20, 5]);
  assert.deepEqual(records, recordsBefore);
  assert.deepEqual(tracksByVideoId, tracksBefore);
  assertDeepFrozen(queue);
});

test('buildReviewQueue distinguishes track, missing, and malformed subtitle sources', () => {
  const reviewData = api();
  const records = [
    { id: 'valid', videoId: 'video-valid', title: 'Valid', steps: [] },
    { id: 'missing', videoId: 'video-missing', title: 'Missing', steps: [] },
    { id: 'invalid', videoId: 'video-invalid', title: 'Invalid', steps: [] },
    { id: 'sparse', videoId: 'video-sparse', title: 'Sparse', steps: [] }
  ];
  const tracksByVideoId = {
    'video-valid': { cues: [{ start: 0, end: 1, text: 'Valid cue' }] },
    'video-invalid': { cues: [{ start: '0', end: 1, text: 'Bad' }] },
    'video-sparse': { cues: new Array(1) }
  };

  const queue = reviewData.buildReviewQueue(records, tracksByVideoId);

  assert.deepEqual(
    queue.map((entry) => entry.subtitleStatus),
    ['track', 'missing', 'invalid', 'invalid']
  );
  queue.forEach((entry) => assert.ok(Object.isFrozen(entry.steps)));
});

test('buildReviewQueue never treats record-level fields or preexisting review data as proof', () => {
  const reviewData = api();
  const records = [{
    id: 'trap',
    videoId: 'video-trap',
    title: 'Trap',
    summary: 'summary-only',
    coreIdeas: ['coreidea-only'],
    plugins: [{ name: 'pluginproof-only' }],
    timeline: { note: 'timelineproof-only' },
    steps: [{
      order: 1,
      name: 'Use audio',
      detail: 'Add effect',
      params: ['track layer'],
      imageKey: 'trap-shot',
      status: 'reviewed',
      startSeconds: 12,
      candidates: [{ start: 12, end: 13, text: 'summary-only' }]
    }]
  }];
  const tracksByVideoId = {
    'video-trap': {
      cues: [{
        start: 12,
        end: 16,
        text: 'summary-only coreidea-only pluginproof-only timelineproof-only'
      }]
    }
  };

  const queue = reviewData.buildReviewQueue(records, tracksByVideoId);

  assert.equal(queue.length, 1);
  const step = queue[0].steps[0];
  assert.deepEqual(step.candidates, []);
  assert.equal(step.status, 'unreviewed');
  assert.equal(step.startSeconds, null);
});

test('buildReviewQueue preserves source order, skips nonobjects, and sanitizes malformed steps', () => {
  const reviewData = api();
  const records = [
    null,
    {
      id: 'record-b',
      videoId: 'video-b',
      title: 42,
      steps: [
        null,
        { order: 9, name: 42, detail: 'kept detail', imageKey: null, params: [42] }
      ]
    },
    'bad record',
    [],
    { id: 'record-a', videoId: 'video-a', title: 'A', steps: null }
  ];

  const queue = reviewData.buildReviewQueue(records, {});

  assert.deepEqual(queue.map((entry) => entry.recordId), ['record-b', 'record-a']);
  assert.equal(queue[0].title, '');
  assert.deepEqual(queue[0].steps, [
    {
      order: '',
      name: '',
      detail: '',
      imageKey: '',
      status: 'unreviewed',
      startSeconds: null,
      candidates: []
    },
    {
      order: 9,
      name: '',
      detail: 'kept detail',
      imageKey: '',
      status: 'unreviewed',
      startSeconds: null,
      candidates: []
    }
  ]);
  assert.deepEqual(queue[1].steps, []);
  assert.deepEqual(queue.map((entry) => entry.subtitleStatus), ['missing', 'missing']);
  assertDeepFrozen(queue);
});

test('buildReviewQueue returns a frozen empty queue for non-array records', () => {
  const reviewData = api();

  [undefined, null, {}, 'records'].forEach((records) => {
    const queue = reviewData.buildReviewQueue(records, {
      ignored: { cues: [{ start: 0, end: 1, text: 'Pro-Q' }] }
    });
    assert.deepEqual(queue, []);
    assert.ok(Object.isFrozen(queue));
  });
});
