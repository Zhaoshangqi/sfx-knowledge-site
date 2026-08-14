'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'tools', 'timeline-review-data.cjs');
const timelineReviewData = fs.existsSync(modulePath) ? require(modulePath) : null;

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
      { start: 2, end: 3, text: 'Beta Pro-Q' },
      { start: 4, end: 5, text: 'Delta Pro-Q' },
      { start: 1, end: 2, text: 'Gamma Pro-Q' },
      { start: 2, end: 3, text: 'Alpha Pro-Q' }
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
    'video-valid': { cues: [] },
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
      order: 1,
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
