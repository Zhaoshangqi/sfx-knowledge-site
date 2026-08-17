'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

function pageApi() {
  return require('../tools/timeline-review-page.cjs');
}

function serverApi() {
  return require('../tools/timeline-review-server.cjs');
}

function reviewFixture(overrides = {}) {
  return {
    records: [{
      recordId: 'record-a',
      videoId: 'abcdefghijk',
      durationSeconds: 90,
      status: 'in-progress',
      steps: [{
        order: 1,
        name: 'Source layer',
        status: 'reviewed',
        startSeconds: 12
      }],
      cases: [{
        useId: 'record-a:effect:eq:1',
        stepIndex: 0,
        status: 'unreviewed',
        startSeconds: null,
        screenshotReviewed: false,
        screenshotKey: 'record-a-step-1'
      }],
      ...overrides
    }]
  };
}

async function startFixture(t, options = {}) {
  const writes = [];
  const fixture = await serverApi().startReviewServer({
    port: 0,
    token: 'fixed-token',
    queue: [{ recordId: 'record-a', videoId: 'abcdefghijk', title: 'Record A', steps: [] }],
    review: reviewFixture(),
    writeState: async (state) => {
      writes.push(state);
    },
    ...options
  });
  t.after(async () => {
    await fixture.close();
  });
  return { fixture, writes };
}

function apiUrl(fixture, pathname, token = 'fixed-token') {
  const url = new URL(pathname, fixture.url);
  if (token !== null) {
    url.searchParams.set('token', token);
  }
  return url;
}

function postReview(fixture, body, options = {}) {
  return fetch(apiUrl(fixture, '/api/review', options.token === undefined ? 'fixed-token' : options.token), {
    method: 'POST',
    headers: {
      origin: options.origin === undefined ? fixture.url : options.origin,
      'content-type': options.contentType === undefined ? 'application/json' : options.contentType,
      ...(options.headers || {})
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });
}

class FakeElement {
  constructor() {
    this.attributes = Object.create(null);
    this.children = [];
    this.checked = false;
    this.className = '';
    this.dataset = Object.create(null);
    this.disabled = false;
    this.listeners = Object.create(null);
    this.textContent = '';
    this.type = '';
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = children;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  dispatch(type) {
    const listener = this.listeners[type];
    return listener ? listener({ target: this }) : undefined;
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function response(value, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => value };
}

async function flushClient() {
  await new Promise((resolve) => setImmediate(resolve));
  await Promise.resolve();
}

function executeReviewClient({ queue, review, saveResponse, loadFailure = null, yt = null }) {
  const html = pageApi().renderReviewPage({ nonce: 'client-test-nonce' });
  const scripts = Array.from(html.matchAll(/<script nonce="[^"]+"(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g));
  assert.equal(scripts.length, 1);

  const selectors = [
    '[data-review-player]', '[data-review-status]', '[data-record-label]', '[data-video-id]',
    '[data-item-label]', '[data-draft-time]', '[data-item-status]', '[data-item-position]',
    '[data-prev-item]', '[data-next-item]', '[data-record-current]', '[data-confirm-current]',
    '[data-save-review]', '[data-candidate-list]', '[data-screenshot-key]',
    '[data-screenshot-reviewed]', '[data-screenshot-state]', '[data-case-step]',
    '[data-case-step-select]'
  ];
  const elements = Object.fromEntries(selectors.map((selector) => [selector, new FakeElement()]));
  elements['[data-save-review]'].disabled = /<button[^>]+data-save-review[^>]+disabled/i.test(html);
  const seekBack = new FakeElement();
  seekBack.dataset.seekDelta = '-5';
  const seekForward = new FakeElement();
  seekForward.dataset.seekDelta = '5';
  const calls = [];
  const window = {
    location: {
      href: 'http://127.0.0.1:8123/?token=fixed-token',
      origin: 'http://127.0.0.1:8123'
    },
    YT: yt
  };
  const document = {
    createElement() { return new FakeElement(); },
    querySelector(selector) { return elements[selector] || null; },
    querySelectorAll(selector) {
      return selector === '[data-seek-delta]' ? [seekBack, seekForward] : [];
    }
  };
  const fetch = async (url, options = {}) => {
    const parsed = new URL(String(url));
    calls.push({ pathname: parsed.pathname, options });
    if (options.method === 'POST') {
      return saveResponse.promise;
    }
    if (loadFailure) {
      throw loadFailure;
    }
    return parsed.pathname === '/api/queue' ? response(queue) : response(review);
  };
  vm.runInNewContext(scripts[0][1], { URL, document, fetch, window });
  return { calls, elements, html, saveResponse, seekBack, seekForward, window };
}

test('review page publishes the exact frozen CommonJS API', () => {
  const reviewPage = pageApi();

  assert.deepEqual(Object.keys(reviewPage), ['renderReviewPage']);
  assert.ok(Object.isFrozen(reviewPage));
  assert.equal(typeof reviewPage.renderReviewPage, 'function');
});

test('renderReviewPage emits a complete escaped maintenance page with every stable hook', () => {
  const { renderReviewPage } = pageApi();
  const html = renderReviewPage({
    nonce: 'fixed-review-nonce',
    title: 'Review <img src=x onerror=alert(1)>',
    queue: [{ title: 'must-not-be-embedded' }]
  });

  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<meta charset="utf-8">/i);
  assert.match(html, /Review &lt;img src=x onerror=alert\(1\)&gt;/);
  assert.doesNotMatch(html, /Review <img/);
  assert.doesNotMatch(html, /must-not-be-embedded/);

  for (const hook of [
    'data-seek-delta="-5"',
    'data-seek-delta="5"',
    'data-record-current',
    'data-prev-item',
    'data-next-item',
    'data-confirm-current',
    'data-save-review',
    'data-candidate-time',
    'data-review-player',
    'data-review-status',
    'data-case-step-select',
    'data-screenshot-state'
  ]) {
    assert.ok(html.includes(hook), `missing stable hook ${hook}`);
  }

  assert.match(html, /<button[^>]+data-record-current[^>]*>/i);
  assert.match(html, /<button[^>]+data-confirm-current[^>]*>/i);
  assert.doesNotMatch(html, /<(?:input|textarea|select)[^>]+(?:name|data-[\w-]*)=["'][^"']*path/i);
  assert.match(html, /<script nonce="fixed-review-nonce">/);
  assert.match(html, /<script[^>]+src="https:\/\/www\.youtube\.com\/iframe_api"/);
  assert.match(html, /class="review-player-frame"[^>]*>\s*<div data-review-player/s);
});

test('renderReviewPage requires a nonblank CSP nonce', () => {
  const { renderReviewPage } = pageApi();

  assert.throws(() => renderReviewPage(), /nonce/i);
  assert.throws(() => renderReviewPage({ nonce: '   ' }), /nonce/i);
});

test('rendered client uses same-origin token APIs and keeps record, confirm, and candidate actions separate', () => {
  const { renderReviewPage } = pageApi();
  const html = renderReviewPage({ nonce: 'nonce-123' });

  assert.match(html, /new URL\(window\.location\.href\)/);
  assert.match(html, /new URL\(endpoint, window\.location\.origin\)/);
  assert.match(html, /searchParams\.set\(['"]token['"], token\)/);
  assert.match(html, /fetch\(apiUrl\(['"]\/api\/queue['"]\)/);
  assert.match(html, /fetch\(apiUrl\(['"]\/api\/review['"]\)/);
  assert.match(html, /method:\s*['"]POST['"]/);
  assert.match(html, /const payload = JSON\.stringify\(review\)/);
  assert.match(html, /body:\s*payload/);
  assert.doesNotMatch(html, /JSON\.stringify\(\{[^}]*path/i);

  assert.match(html, /origin:\s*window\.location\.origin/);
  assert.match(html, /autoplay:\s*0/);
  assert.doesNotMatch(html, /playVideo\s*\(/);
  assert.match(html, /candidateButton\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*\{\s*seekTo\(candidate\.start\);\s*\}\)/s);
  assert.match(html, /currentItem\(\)\.status = ['"]unreviewed['"]/);
  assert.match(html, /currentItem\(\)\.status = ['"]reviewed['"]/);
});

test('review client keeps save disabled through hydration failure and maps cases by zero-based stepIndex', async () => {
  const saveResponse = deferred();
  const review = reviewFixture({
    steps: [
      { order: 1, name: 'First', status: 'unreviewed', startSeconds: null },
      { order: 2, name: 'Second', status: 'unreviewed', startSeconds: null }
    ],
    cases: [{
      useId: 'record-a:effect:eq:1', stepIndex: 1, status: 'unreviewed', startSeconds: null,
      screenshotReviewed: false, screenshotKey: 'record-a-step-2'
    }]
  });
  const queue = [{
    recordId: 'record-a',
    videoId: 'abcdefghijk',
    title: 'Record A',
    steps: [
      { order: 1, candidates: [{ start: 10, text: 'first cue' }] },
      { order: 2, candidates: [{ start: 20, text: 'second cue' }] }
    ]
  }];
  const client = executeReviewClient({ queue, review, saveResponse });

  assert.equal(client.elements['[data-save-review]'].disabled, true);
  await flushClient();
  assert.equal(client.elements['[data-save-review]'].disabled, false);
  client.elements['[data-next-item]'].dispatch('click');
  client.elements['[data-next-item]'].dispatch('click');
  assert.equal(client.elements['[data-candidate-list]'].children.length, 1);
  assert.equal(client.elements['[data-candidate-list]'].children[0].attributes['data-candidate-time'], '20');

  const failedSave = deferred();
  const failedClient = executeReviewClient({
    queue: [],
    review: { records: [] },
    saveResponse: failedSave,
    loadFailure: new Error('load failed')
  });
  await flushClient();
  assert.equal(failedClient.elements['[data-save-review]'].disabled, true);
});

test('review client locks every mutating control while a save is in flight', async () => {
  const saveResponse = deferred();
  const review = reviewFixture();
  const client = executeReviewClient({ queue: [], review, saveResponse });
  await flushClient();
  assert.equal(client.elements['[data-save-review]'].disabled, false);
  assert.equal(client.elements['[data-next-item]'].disabled, false);

  const saving = client.elements['[data-save-review]'].dispatch('click');
  for (const selector of [
    '[data-record-current]',
    '[data-confirm-current]',
    '[data-prev-item]',
    '[data-next-item]',
    '[data-screenshot-reviewed]',
    '[data-save-review]'
  ]) {
    assert.equal(client.elements[selector].disabled, true, `${selector} must be locked`);
  }

  saveResponse.resolve(response(review));
  await saving;
  assert.equal(client.elements['[data-next-item]'].disabled, false);
  assert.equal(client.elements['[data-save-review]'].disabled, false);
});

test('review client records only a ready matching video time and persists its finite duration', async () => {
  const players = [];
  class FakePlayer {
    constructor(_element, options) {
      this.currentTime = 12.75;
      this.duration = 90;
      this.videoId = options.videoId;
      this.options = options;
      players.push(this);
    }

    cueVideoById(videoId) { this.videoId = videoId; }
    getCurrentTime() { return this.currentTime; }
    getDuration() { return this.duration; }
    getVideoData() { return { video_id: this.videoId }; }
    seekTo() {}
    ready() { this.options.events.onReady(); }
  }
  const saveResponse = deferred();
  const review = reviewFixture({
    durationSeconds: null,
    status: 'unreviewed',
    steps: [{ order: 1, name: 'Source layer', status: 'unreviewed', startSeconds: null }],
    cases: []
  });
  const client = executeReviewClient({
    queue: [],
    review,
    saveResponse,
    yt: { Player: FakePlayer, PlayerState: { CUED: 5 } }
  });
  await flushClient();

  assert.equal(players.length, 1);
  assert.equal(client.elements['[data-record-current]'].disabled, true);
  players[0].ready();
  assert.equal(client.elements['[data-record-current]'].disabled, false);
  client.elements['[data-record-current]'].dispatch('click');
  assert.equal(client.elements['[data-draft-time]'].textContent, '0:12');

  client.elements['[data-confirm-current]'].dispatch('click');
  const saving = client.elements['[data-save-review]'].dispatch('click');
  await flushClient();
  const post = client.calls.find((call) => call.options.method === 'POST');
  const payload = JSON.parse(post.options.body);
  assert.equal(payload.records[0].durationSeconds, 90);
  assert.equal(payload.records[0].steps[0].startSeconds, 12);

  saveResponse.resolve(response(payload));
  await saving;
});

test('review client rejects wrong-video and out-of-duration player times', async () => {
  const players = [];
  class FakePlayer {
    constructor(_element, options) {
      this.currentTime = 90;
      this.duration = 90;
      this.videoId = 'wrongVideo1';
      this.options = options;
      players.push(this);
    }

    getCurrentTime() { return this.currentTime; }
    getDuration() { return this.duration; }
    getVideoData() { return { video_id: this.videoId }; }
    seekTo() {}
    ready() { this.options.events.onReady(); }
  }
  const client = executeReviewClient({
    queue: [],
    review: reviewFixture({
      durationSeconds: null,
      status: 'unreviewed',
      steps: [{ order: 1, name: 'Step', status: 'unreviewed', startSeconds: null }],
      cases: []
    }),
    saveResponse: deferred(),
    yt: { Player: FakePlayer, PlayerState: { CUED: 5 } }
  });
  await flushClient();

  players[0].ready();
  assert.equal(client.elements['[data-record-current]'].disabled, true);
  players[0].videoId = 'abcdefghijk';
  players[0].ready();
  assert.equal(client.elements['[data-record-current]'].disabled, false);
  client.elements['[data-record-current]'].dispatch('click');
  assert.equal(client.elements['[data-draft-time]'].textContent, 'Not recorded');
});

test('review client exposes case ownership and revokes confirmation when screenshot review is removed', async () => {
  const client = executeReviewClient({
    queue: [],
    review: reviewFixture({
      status: 'reviewed',
      steps: [{ order: 1, name: 'EQ cleanup', status: 'reviewed', startSeconds: 12 }],
      cases: [{
        useId: 'record-a:effect:eq:1', stepIndex: 0, status: 'reviewed', startSeconds: 12,
        screenshotReviewed: true, screenshotKey: 'record-a-step-1'
      }]
    }),
    saveResponse: deferred()
  });
  await flushClient();
  client.elements['[data-next-item]'].dispatch('click');

  assert.equal(client.elements['[data-case-step]'].textContent, 'Step 1: EQ cleanup');
  assert.equal(client.elements['[data-screenshot-reviewed]'].disabled, false);
  client.elements['[data-screenshot-reviewed]'].checked = false;
  client.elements['[data-screenshot-reviewed]'].dispatch('change');
  assert.equal(client.elements['[data-item-status]'].textContent, 'unreviewed');
  assert.equal(client.elements['[data-confirm-current]'].disabled, true);
});

test('review client explicitly maps an unassigned public case to a screenshot-bearing step', async () => {
  const client = executeReviewClient({
    queue: [{
      recordId: 'record-a',
      videoId: 'abcdefghijk',
      title: 'Record A',
      steps: [
        { order: 1, name: 'First', imageKey: '', candidates: [] },
        { order: 2, name: 'Reverb tail', imageKey: 'record-a-step-2', candidates: [] }
      ]
    }],
    review: reviewFixture({
      status: 'in-progress',
      steps: [
        { order: 1, name: 'First', status: 'reviewed', startSeconds: 4 },
        { order: 2, name: 'Reverb tail', status: 'reviewed', startSeconds: 18 }
      ],
      cases: [{
        useId: 'record-a:effect:reverb:1', stepIndex: null, status: 'unreviewed', startSeconds: 30,
        screenshotReviewed: true, screenshotKey: 'stale-key'
      }]
    }),
    saveResponse: deferred()
  });
  await flushClient();
  client.elements['[data-next-item]'].dispatch('click');
  client.elements['[data-next-item]'].dispatch('click');
  assert.equal(client.elements['[data-case-step-select]'].disabled, false);
  assert.equal(client.elements['[data-screenshot-reviewed]'].disabled, true);

  client.elements['[data-case-step-select]'].value = '1';
  client.elements['[data-case-step-select]'].dispatch('change');

  assert.equal(client.elements['[data-case-step]'].textContent, 'Step 2: Reverb tail');
  assert.equal(client.elements['[data-screenshot-key]'].textContent, 'record-a-step-2');
  assert.equal(client.elements['[data-draft-time]'].textContent, 'Not recorded');
  assert.equal(client.elements['[data-item-status]'].textContent, 'unreviewed');
  assert.equal(client.elements['[data-screenshot-reviewed]'].checked, false);
});

test('review client can truthfully confirm reviewed-missing screenshot evidence', async () => {
  const client = executeReviewClient({
    queue: [{
      recordId: 'record-a', videoId: 'abcdefghijk', title: 'Record A',
      steps: [{ order: 1, name: 'No captured frame', imageKey: '', candidates: [] }]
    }],
    review: reviewFixture({
      steps: [{ order: 1, name: 'No captured frame', status: 'reviewed', startSeconds: 4 }],
      cases: [{
        useId: 'record-a:effect:missing:1', stepIndex: null, status: 'unreviewed', startSeconds: null,
        screenshotReviewed: false, screenshotKey: null
      }]
    }),
    saveResponse: deferred()
  });
  await flushClient();
  client.elements['[data-next-item]'].dispatch('click');
  client.elements['[data-case-step-select]'].value = '0';
  client.elements['[data-case-step-select]'].dispatch('change');

  assert.equal(client.elements['[data-screenshot-key]'].textContent, 'None');
  assert.equal(client.elements['[data-screenshot-reviewed]'].disabled, false);
  assert.match(client.elements['[data-screenshot-state]'].textContent, /missing|no strict screenshot/i);
  client.elements['[data-screenshot-reviewed]'].checked = true;
  client.elements['[data-screenshot-reviewed]'].dispatch('change');
  assert.equal(client.elements['[data-screenshot-reviewed]'].checked, true);
});

test('review server publishes the exact frozen CommonJS API', () => {
  const reviewServer = serverApi();

  assert.deepEqual(Object.keys(reviewServer), [
    'MAX_BODY_BYTES',
    'startReviewServer',
    'validateReview',
    'runCli'
  ]);
  assert.ok(Object.isFrozen(reviewServer));
  assert.equal(reviewServer.MAX_BODY_BYTES, 2 * 1024 * 1024);
});

test('review server binds literal loopback and serves a nonce-matched no-store page', async (t) => {
  const { fixture } = await startFixture(t);

  assert.equal(fixture.address.address, '127.0.0.1');
  assert.equal(fixture.address.family, 'IPv4');
  const response = await fetch(fixture.url + '/?token=fixed-token');
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /^text\/html; charset=utf-8$/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  const csp = response.headers.get('content-security-policy');
  const nonce = html.match(/<script nonce="([^"]+)">/)[1];
  assert.ok(nonce.length >= 16);
  assert.match(csp, new RegExp("script-src 'nonce-" + nonce + "' https://www\\.youtube\\.com"));
  assert.match(csp, new RegExp("style-src 'nonce-" + nonce + "'"));
  assert.match(csp, /frame-ancestors 'none'/);
});

test('API endpoints require the startup token and expose only queue and review state', async (t) => {
  const { fixture } = await startFixture(t);

  assert.equal((await fetch(apiUrl(fixture, '/api/queue', null))).status, 403);
  assert.equal((await fetch(apiUrl(fixture, '/api/queue', 'wrong-token'))).status, 403);
  const queueResponse = await fetch(apiUrl(fixture, '/api/queue'));
  assert.equal(queueResponse.status, 200);
  assert.equal(queueResponse.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await queueResponse.json(), [{
    recordId: 'record-a', videoId: 'abcdefghijk', title: 'Record A', steps: []
  }]);

  const reviewResponse = await fetch(apiUrl(fixture, '/api/review'));
  assert.equal(reviewResponse.status, 200);
  assert.deepEqual(await reviewResponse.json(), reviewFixture());
  assert.equal((await fetch(apiUrl(fixture, '/api/nope'))).status, 404);
  assert.equal((await fetch(apiUrl(fixture, '/api/queue'), { method: 'POST' })).status, 405);
  assert.equal((await fetch(fixture.url + '/other')).status, 404);
});

test('POST rejects missing token, cross-origin requests, wrong media types, and unknown path fields', async (t) => {
  const { fixture, writes } = await startFixture(t);

  assert.equal((await postReview(fixture, reviewFixture(), { token: null })).status, 403);
  assert.equal((await postReview(fixture, reviewFixture(), { origin: 'http://127.0.0.1:9' })).status, 403);
  assert.equal((await postReview(fixture, reviewFixture(), { contentType: 'text/plain' })).status, 415);
  assert.equal((await postReview(fixture, { ...reviewFixture(), path: '../../index.html' })).status, 400);
  assert.equal(writes.length, 0);
});

test('POST caps the raw body at two MiB before JSON parsing', async (t) => {
  const { fixture, writes } = await startFixture(t);
  const oversized = ' '.repeat(serverApi().MAX_BODY_BYTES + 1);

  const response = await postReview(fixture, oversized);

  assert.equal(response.status, 413);
  assert.equal(writes.length, 0);
});

test('validateReview returns a detached deeply frozen normalized clone', () => {
  const source = reviewFixture();
  const normalized = serverApi().validateReview(source);

  assert.deepEqual(normalized, source);
  assert.notEqual(normalized, source);
  assert.notEqual(normalized.records, source.records);
  assert.notEqual(normalized.records[0], source.records[0]);
  assert.ok(Object.isFrozen(normalized));
  assert.ok(Object.isFrozen(normalized.records));
  assert.ok(Object.isFrozen(normalized.records[0]));
  assert.ok(Object.isFrozen(normalized.records[0].steps[0]));
  assert.ok(Object.isFrozen(normalized.records[0].cases[0]));

  source.records[0].steps[0].name = 'Changed later';
  assert.equal(normalized.records[0].steps[0].name, 'Source layer');
});

test('validateReview rejects unknown keys, sparse data, duplicates, accessors, and custom prototypes', () => {
  const { validateReview } = serverApi();
  const unknown = reviewFixture();
  unknown.records[0].steps[0].candidate = true;
  assert.throws(() => validateReview(unknown), /unknown key/i);

  const sparse = reviewFixture();
  sparse.records.length = 2;
  assert.throws(() => validateReview(sparse), /dense array|hole/i);

  const duplicateRecord = reviewFixture();
  duplicateRecord.records.push(reviewFixture().records[0]);
  assert.throws(() => validateReview(duplicateRecord), /duplicate recordId/i);

  const duplicateVideo = reviewFixture();
  duplicateVideo.records.push({
    ...reviewFixture().records[0],
    recordId: 'record-b'
  });
  assert.throws(() => validateReview(duplicateVideo), /duplicate videoId/i);

  const duplicateStep = reviewFixture();
  duplicateStep.records[0].steps.push({ ...duplicateStep.records[0].steps[0] });
  assert.throws(() => validateReview(duplicateStep), /duplicate step order/i);

  const duplicateCase = reviewFixture();
  duplicateCase.records[0].cases.push({ ...duplicateCase.records[0].cases[0] });
  assert.throws(() => validateReview(duplicateCase), /duplicate useId/i);

  let getterCalls = 0;
  const accessor = reviewFixture();
  Object.defineProperty(accessor.records[0], 'recordId', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'record-a';
    }
  });
  assert.throws(() => validateReview(accessor), /accessor/i);
  assert.equal(getterCalls, 0);

  const custom = reviewFixture();
  Object.setPrototypeOf(custom.records[0].steps[0], { inherited: true });
  assert.throws(() => validateReview(custom), /plain data object|prototype/i);
});

test('validateReview rejects malformed identities, statuses, reviewed nulls, and out-of-duration times', () => {
  const { validateReview } = serverApi();
  const invalidCases = [
    [() => { const value = reviewFixture(); value.records[0].recordId = ' '; return value; }, /recordId/i],
    [() => { const value = reviewFixture(); value.records[0].recordId = 'bad/id'; return value; }, /recordId/i],
    [() => { const value = reviewFixture(); value.records[0].videoId = 'short'; return value; }, /videoId/i],
    [() => { const value = reviewFixture(); value.records[0].durationSeconds = 0; return value; }, /durationSeconds/i],
    [() => { const value = reviewFixture(); value.records[0].status = 'done'; return value; }, /status/i],
    [() => { const value = reviewFixture(); value.records[0].steps[0].order = 0; return value; }, /order/i],
    [() => { const value = reviewFixture(); value.records[0].steps[0].name = ''; return value; }, /name/i],
    [() => { const value = reviewFixture(); value.records[0].steps[0].startSeconds = 1.5; return value; }, /startSeconds/i],
    [() => { const value = reviewFixture(); value.records[0].steps[0].startSeconds = null; return value; }, /reviewed.*startSeconds|startSeconds.*reviewed/i],
    [() => { const value = reviewFixture(); value.records[0].steps[0].startSeconds = 90; return value; }, /duration/i],
    [() => { const value = reviewFixture(); value.records[0].cases[0].stepIndex = -1; return value; }, /stepIndex/i],
    [() => { const value = reviewFixture(); value.records[0].cases[0].useId = 'bad/use'; return value; }, /useId/i],
    [() => { const value = reviewFixture(); value.records[0].cases[0].screenshotReviewed = 1; return value; }, /screenshotReviewed/i],
    [() => { const value = reviewFixture(); value.records[0].cases[0].screenshotKey = 3; return value; }, /screenshotKey/i]
  ];

  for (const [makeValue, pattern] of invalidCases) {
    assert.throws(() => validateReview(makeValue()), pattern);
  }
});

test('validateReview enforces page-derived status consistency while allowing reviewed-missing screenshots', () => {
  const { validateReview } = serverApi();
  const inconsistentRecord = reviewFixture({ status: 'reviewed' });
  assert.throws(() => validateReview(inconsistentRecord), /record status|status.*items/i);

  const unreviewedScreenshot = reviewFixture({
    status: 'reviewed',
    cases: [{
      useId: 'record-a:effect:eq:1', stepIndex: 0, status: 'reviewed', startSeconds: 12,
      screenshotReviewed: false, screenshotKey: 'record-a-step-1'
    }]
  });
  assert.throws(() => validateReview(unreviewedScreenshot), /screenshotReviewed|screenshot.*reviewed/i);

  const reviewedMissing = reviewFixture({
    status: 'reviewed',
    cases: [{
      useId: 'record-a:effect:eq:1', stepIndex: 0, status: 'reviewed', startSeconds: 12,
      screenshotReviewed: true, screenshotKey: null
    }]
  });
  assert.doesNotThrow(() => validateReview(reviewedMissing));

  const unassignedReviewed = reviewFixture({
    status: 'reviewed',
    cases: [{
      useId: 'record-a:effect:eq:1', stepIndex: null, status: 'reviewed', startSeconds: 12,
      screenshotReviewed: true, screenshotKey: null
    }]
  });
  assert.throws(() => validateReview(unassignedReviewed), /stepIndex|owning step/i);
});

test('successful persistence updates GET state once and writer failure preserves the old state', async (t) => {
  let shouldFail = false;
  const writes = [];
  const { fixture } = await startFixture(t, {
    writeState: async (state) => {
      writes.push(state);
      if (shouldFail) {
        throw new Error('disk unavailable');
      }
    }
  });
  const updated = reviewFixture({ durationSeconds: 91 });

  const saved = await postReview(fixture, updated);
  assert.equal(saved.status, 200);
  assert.deepEqual(await saved.json(), updated);
  assert.equal(writes.length, 1);
  assert.deepEqual(await (await fetch(apiUrl(fixture, '/api/review'))).json(), updated);

  shouldFail = true;
  const rejected = reviewFixture({ durationSeconds: 92 });
  assert.equal((await postReview(fixture, rejected)).status, 500);
  assert.equal(writes.length, 2);
  assert.deepEqual(await (await fetch(apiUrl(fixture, '/api/review'))).json(), updated);
});

test('concurrent POST writes are serialized in arrival order', async (t) => {
  let active = 0;
  let maxActive = 0;
  const persisted = [];
  const { fixture } = await startFixture(t, {
    writeState: async (state) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 20));
      persisted.push(state.records[0].durationSeconds);
      active -= 1;
    }
  });

  const first = postReview(fixture, reviewFixture({ durationSeconds: 101 }));
  await new Promise((resolve) => setTimeout(resolve, 5));
  const second = postReview(fixture, reviewFixture({ durationSeconds: 102 }));
  assert.equal((await first).status, 200);
  assert.equal((await second).status, 200);

  assert.equal(maxActive, 1);
  assert.deepEqual(persisted, [101, 102]);
  assert.equal((await (await fetch(apiUrl(fixture, '/api/review'))).json()).records[0].durationSeconds, 102);
});

test('closing the server rejects a queued late write', async () => {
  let releaseFirst;
  let signalFirst;
  const firstStarted = new Promise((resolve) => { signalFirst = resolve; });
  const firstRelease = new Promise((resolve) => { releaseFirst = resolve; });
  const persisted = [];
  const fixture = await serverApi().startReviewServer({
    port: 0,
    token: 'fixed-token',
    queue: [],
    review: reviewFixture(),
    writeState: async (state) => {
      signalFirst();
      await firstRelease;
      persisted.push(state.records[0].durationSeconds);
    }
  });

  const first = postReview(fixture, reviewFixture({ durationSeconds: 111 }));
  await firstStarted;
  const second = postReview(fixture, reviewFixture({ durationSeconds: 112 }));
  await new Promise((resolve) => setTimeout(resolve, 5));
  const closing = fixture.close();
  releaseFirst();

  assert.equal((await first).status, 200);
  assert.equal((await second).status, 503);
  await closing;
  assert.deepEqual(persisted, [111]);
});

test('runCli accepts only repo index and fixed work paths, loads existing subtitle JSON, and supplies an atomic writer', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-review-cli-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const indexPath = path.join(root, 'index.html');
  const workPath = path.join(root, '.work', 'timeline-review');
  const subtitlePath = path.join(root, 'assets', 'subtitles', 'abcdefghijk.json');
  fs.mkdirSync(path.dirname(subtitlePath), { recursive: true });
  fs.writeFileSync(indexPath, '<script>\n    const records = [{"id":"record-a","videoId":"abcdefghijk","title":"A","steps":[{"order":1,"name":"Step"}]}];\n    const imageManifest = {};\n    const pluginReferenceCatalog = [];\n</script>\n', 'utf8');
  fs.writeFileSync(subtitlePath, JSON.stringify({ cues: [{ start: 1, end: 2, text: 'Step' }] }), 'utf8');

  let startedOptions;
  const fixture = Object.freeze({ close: async () => {} });
  const dependencies = {
    startServer: async (options) => {
      startedOptions = options;
      return fixture;
    },
    stdout: { write() {} },
    publicUseIds: ['record-a:effect:eq:1'],
    buildEffectUses: () => [{
      id: 'record-a:effect:eq:1', sourceRecordId: 'record-a', stepIndex: 0,
      startSeconds: null, screenshotReviewed: false, screenshotKey: 'record-a-step-1'
    }]
  };

  await assert.rejects(
    serverApi().runCli(['--index', indexPath, '--work', path.join(root, 'elsewhere')], dependencies),
    /fixed.*\.work|work path/i
  );
  const returned = await serverApi().runCli([
    '--index', indexPath,
    '--work', workPath,
    '--port', '0'
  ], dependencies);

  assert.equal(returned, fixture);
  assert.equal(startedOptions.port, 0);
  assert.equal(startedOptions.queue.length, 1);
  assert.equal(startedOptions.queue[0].subtitleStatus, 'track');
  assert.equal(startedOptions.review.records.length, 1);
  assert.equal(startedOptions.review.records[0].cases.length, 1);

  await startedOptions.writeState(reviewFixture());
  const reviewPath = path.join(workPath, 'review.json');
  assert.deepEqual(JSON.parse(fs.readFileSync(reviewPath, 'utf8')), reviewFixture());
  assert.deepEqual(
    fs.readdirSync(workPath).sort(),
    ['review.json']
  );

  const stale = reviewFixture();
  stale.records[0].recordId = 'stale-record';
  fs.writeFileSync(reviewPath, JSON.stringify(stale), 'utf8');
  await assert.rejects(
    serverApi().runCli(['--index', indexPath, '--work', workPath, '--port', '0'], dependencies),
    /review.*identity|does not match.*site/i
  );
});

test('runCli restores an applied public case from its verified owning step time', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-review-inherited-case-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const indexPath = path.join(root, 'index.html');
  const workPath = path.join(root, '.work', 'timeline-review');
  const useId = 'record-a:effect:eq:explicit-1';
  const records = [{
    id: 'record-a',
    videoId: 'abcdefghijk',
    title: 'A',
    timeline: { durationSeconds: 90, reviewedAt: '2026-08-14', source: 'youtube-player' },
    steps: [{ order: 1, name: 'EQ', startSeconds: 12, imageKey: 'record-a-step-1' }],
    effectUses: [{
      id: useId,
      name: 'EQ',
      stepIndex: 0,
      screenshotReviewed: true,
      screenshotKey: 'record-a-step-1'
    }]
  }];
  fs.writeFileSync(indexPath, [
    '<script>',
    `    const records = ${JSON.stringify(records)};`,
    '    const imageManifest = {};',
    '    const pluginReferenceCatalog = [];',
    '</script>',
    ''
  ].join('\n'), 'utf8');

  let startedOptions;
  await serverApi().runCli([
    '--index', indexPath,
    '--work', workPath,
    '--port', '0'
  ], {
    publicUseIds: [useId],
    startServer: async (options) => {
      startedOptions = options;
      return Object.freeze({ close: async () => {} });
    },
    stdout: { write() {} }
  });

  const restored = startedOptions.review.records[0];
  assert.equal(restored.status, 'reviewed');
  assert.equal(restored.cases[0].status, 'reviewed');
  assert.equal(restored.cases[0].startSeconds, 12);
});

test('runCli projects exactly the 98 curated public effect cases from the real site', async () => {
  const root = path.resolve(__dirname, '..');
  const manifest = require('../tools/data/public-effect-use-ids.json');
  const reviewPath = path.join(root, '.work', 'timeline-review', 'review.json');
  const isolatedFs = {
    ...fs,
    existsSync(filename) {
      return path.resolve(filename) === path.resolve(reviewPath) ? false : fs.existsSync(filename);
    }
  };
  let startedOptions;
  const fixture = Object.freeze({ close: async () => {} });

  await serverApi().runCli([
    '--index', path.join(root, 'index.html'),
    '--work', path.join(root, '.work', 'timeline-review'),
    '--port', '0'
  ], {
    fs: isolatedFs,
    startServer: async (options) => {
      startedOptions = options;
      return fixture;
    },
    stdout: { write() {} }
  });

  const caseIds = startedOptions.review.records.flatMap((record) => (
    record.cases.map((reviewCase) => reviewCase.useId)
  ));
  assert.equal(caseIds.length, 98);
  assert.equal(new Set(caseIds).size, 98);
  assert.deepEqual(new Set(caseIds), new Set(manifest.useIds));
});
