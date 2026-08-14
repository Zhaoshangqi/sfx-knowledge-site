'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'src', 'youtube-caption-player.js');
const moduleSource = fs.existsSync(modulePath) ? fs.readFileSync(modulePath, 'utf8') : '';
const playerApi = fs.existsSync(modulePath) ? require(modulePath) : null;
const subtitles = require('../src/video-subtitles.js');
const track = JSON.parse(fs.readFileSync(
  path.join(__dirname, '..', 'assets', 'subtitles', 'Xl5u91oQv-k.json'),
  'utf8'
));
const entry = subtitles.entryFor('Xl5u91oQv-k');

function groupedTrack() {
  return {
    ...track,
    cues: [
      { start: 0, end: 2, text: '先听原始素材，' },
      { start: 2, end: 4, text: '再削掉刺耳共振。' },
      { start: 4.4, end: 6, text: 'Then add' },
      { start: 6, end: 8, text: 'a short tail.' }
    ]
  };
}

class FakeClassList {
  constructor() {
    this.values = new Set();
  }

  toggle(name, force) {
    if (force === undefined ? !this.values.has(name) : force) this.values.add(name);
    else this.values.delete(name);
  }

  contains(name) {
    return this.values.has(name);
  }
}

class FakeElement {
  constructor(dataset = {}, tagName = 'div') {
    this.dataset = { ...dataset };
    this.tagName = String(tagName).toUpperCase();
    this._textContent = '';
    this.textContentAssignments = 0;
    this.innerHTMLAssignments = 0;
    this.disabled = false;
    this.hidden = false;
    this.attributes = Object.create(null);
    this.classList = new FakeClassList();
    this.className = '';
    this.children = [];
    this.listeners = new Map();
    this.scrollCalls = 0;
    this.focusCalls = 0;
    this.parentNode = null;
  }

  get textContent() {
    return this._textContent + this.children.map((child) => child.textContent).join('');
  }

  set textContent(value) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    this._textContent = String(value);
    this.textContentAssignments += 1;
  }

  set innerHTML(value) {
    this.children.forEach((child) => { child.parentNode = null; });
    this.children = [];
    this._textContent = String(value);
    this.innerHTMLAssignments += 1;
  }

  get innerHTML() {
    return this._textContent;
  }

  resetTextContentAssignments() {
    this.textContentAssignments = 0;
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type) {
    const event = { currentTarget: this, preventDefault() {} };
    Array.from(this.listeners.get(type) || []).forEach((listener) => listener(event));
  }

  listenerCount(type) {
    return this.listeners.get(type)?.size || 0;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
    return child;
  }

  matches(selector) {
    if (selector === '[data-cue-index]') {
      return Object.prototype.hasOwnProperty.call(this.dataset, 'cueIndex');
    }
    if (selector === '[data-paragraph-index]') {
      return Object.prototype.hasOwnProperty.call(this.dataset, 'paragraphIndex');
    }
    if (selector.startsWith('.')) {
      return this.className.split(/\s+/).includes(selector.slice(1));
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }

  querySelectorAll(selector) {
    const matches = [];
    const visit = (element) => {
      element.children.forEach((child) => {
        if (child.matches(selector)) matches.push(child);
        visit(child);
      });
    };
    visit(this);
    return matches;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  scrollIntoView() {
    this.scrollCalls += 1;
  }

  focus() {
    this.focusCalls += 1;
  }
}

function buildFixture(options = {}) {
  const videoId = options.videoId || 'Xl5u91oQv-k';
  const subtitleStatus = options.subtitleStatus || 'loading';
  const root = new FakeElement({ videoId, subtitleStatus }, 'section');
  const cover = new FakeElement();
  const target = new FakeElement();
  const caption = new FakeElement();
  const overlay = new FakeElement();
  const toggle = new FakeElement();
  const fullscreen = new FakeElement();
  const error = new FakeElement();
  const statusText = new FakeElement();
  const statusHint = new FakeElement();
  const transcript = options.includeTranscript === false ? null : new FakeElement();
  const externalTranscript = new FakeElement({}, 'section');
  if (transcript) {
    const loadingLine = new FakeElement({}, 'p');
    loadingLine.textContent = '本站中文字幕加载中…';
    transcript.appendChild(loadingLine);
  }
  toggle.disabled = true;
  toggle.setAttribute('aria-pressed', 'false');
  error.hidden = true;
  const selectors = new Map([
    ['[data-player-cover]', cover],
    ['[data-player-target]', target],
    ['[data-caption-line]', caption],
    ['[data-caption-overlay]', overlay],
    ['[data-subtitle-toggle]', toggle],
    ['[data-fullscreen-toggle]', fullscreen],
    ['[data-player-error]', error],
    ['[data-subtitle-status-text]', statusText],
    ['[data-subtitle-status-hint]', statusHint],
    ['[data-transcript-container]', transcript]
  ]);

  root.querySelector = (selector) => selectors.get(selector) || null;
  root.querySelectorAll = (selector) => (
    selector === '[data-cue-index]' && transcript ? transcript.querySelectorAll(selector) : []
  );
  root.requestFullscreenCalls = 0;
  root.requestFullscreen = () => {
    root.requestFullscreenCalls += 1;
    return Promise.resolve();
  };

  return {
    root,
    cover,
    target,
    caption,
    overlay,
    toggle,
    fullscreen,
    error,
    statusText,
    statusHint,
    transcript,
    externalTranscript,
    get paragraphButtons() {
      return [
        ...(transcript ? transcript.querySelectorAll('[data-paragraph-index]') : []),
        ...externalTranscript.querySelectorAll('[data-paragraph-index]')
      ];
    },
    get cueButtons() {
      return this.paragraphButtons;
    }
  };
}

function buildRuntime() {
  let currentTime = 0;
  let intervalCallback = null;
  let intervalDelay = null;
  let clearCalls = 0;
  let playerConfig = null;
  const iframe = new FakeElement();
  const calls = { destroy: 0, play: 0, seek: [], setOption: [], unloadModule: [] };

  class Player {
    constructor(target, config) {
      this.target = target;
      playerConfig = config;
    }

    getCurrentTime() { return currentTime; }
    seekTo(seconds, allowSeekAhead) { calls.seek.push([seconds, allowSeekAhead]); }
    playVideo() { calls.play += 1; }
    destroy() { calls.destroy += 1; }
    getIframe() { return iframe; }
    setOption(module, option, value) { calls.setOption.push([module, option, value]); }
    unloadModule(module) { calls.unloadModule.push(module); }
  }

  const YT = { Player, PlayerState: { PLAYING: 1 } };
  const window = { location: { origin: 'https://sfx.test' } };
  const createdElements = [];
  const document = {
    defaultView: window,
    activeElement: null,
    fullscreenElement: null,
    listeners: new Map(),
    createElement(tagName) {
      const element = new FakeElement({}, tagName);
      createdElements.push(element);
      return element;
    },
    addEventListener(type, listener) { this.listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (this.listeners.get(type) === listener) this.listeners.delete(type);
    },
    exitFullscreenCalls: 0,
    exitFullscreen() {
      this.exitFullscreenCalls += 1;
      return Promise.resolve();
    }
  };

  return {
    YT,
    window,
    document,
    iframe,
    calls,
    createdElements,
    setCurrentTime(value) { currentTime = value; },
    getPlayerConfig() { return playerConfig; },
    runInterval() { intervalCallback?.(); },
    getIntervalDelay() { return intervalDelay; },
    getClearCalls() { return clearCalls; },
    setInterval(callback, delay) {
      intervalCallback = callback;
      intervalDelay = delay;
      return 17;
    },
    clearInterval(id) {
      assert.equal(id, 17);
      clearCalls += 1;
      intervalCallback = null;
    }
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
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

function mountOptions(runtime, overrides = {}) {
  return {
    entry,
    loadTrack: () => Promise.resolve(track),
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval,
    ...overrides
  };
}

function extractBalancedDiv(html, openingTag) {
  const start = html.indexOf(openingTag);
  assert.ok(start >= 0, `missing div opening: ${openingTag}`);

  const divTagPattern = /<\/?div\b[^>]*>/gi;
  divTagPattern.lastIndex = start;
  const firstTag = divTagPattern.exec(html);
  assert.equal(firstTag?.index, start, `expected div opening: ${openingTag}`);
  assert.doesNotMatch(firstTag[0], /^<\/div/i);

  let depth = 1;
  let tag;
  while ((tag = divTagPattern.exec(html))) {
    if (/^<div\b/i.test(tag[0])) depth += 1;
    else depth -= 1;

    if (depth === 0) {
      return {
        before: html.slice(0, start),
        element: html.slice(start, divTagPattern.lastIndex),
        after: html.slice(divTagPattern.lastIndex)
      };
    }
  }

  throw new Error(`unclosed div: ${openingTag}`);
}

test('extractBalancedDiv excludes a sibling after a nested target', () => {
  const html = '<section><div class="stage"><div class="nested"></div></div>' +
    '<p data-caption-overlay></p></section>';
  const stage = extractBalancedDiv(html, '<div class="stage">');

  assert.equal(stage.element, '<div class="stage"><div class="nested"></div></div>');
  assert.doesNotMatch(stage.element, /data-caption-overlay/);
  assert.match(stage.after, /data-caption-overlay/);
});

test('publishes the expected UMD API', () => {
  assert.ok(playerApi, 'YouTube caption player module must exist');
  assert.deepEqual(Object.keys(playerApi), ['render', 'mount', 'loadApi']);
  assert.ok(Object.isFrozen(playerApi));

  const context = {};
  vm.runInNewContext(moduleSource, context);
  assert.ok(context.SfxYouTubeCaptionPlayer);
  assert.deepEqual(Array.from(Object.keys(context.SfxYouTubeCaptionPlayer)), ['render', 'mount', 'loadApi']);
});

test('a catalog track entry renders a cover-first loading shell without cue text', () => {
  const html = playerApi.render({
    videoId: 'Xl5u91oQv-k',
    title: '<script>alert(1)</script>'
  }, entry, 'javascript:alert(2)');

  assert.match(html, /data-youtube-caption-player/);
  assert.match(html, /data-player-cover/);
  assert.match(html, /data-player-target/);
  assert.match(html, /data-caption-overlay/);
  assert.match(html, /data-caption-line/);
  assert.match(html, /data-subtitle-toggle[^>]*disabled/);
  assert.match(html, /data-fullscreen-toggle/);
  assert.match(html, /data-subtitle-status="loading"/);
  assert.match(html, /本站中文字幕加载中/);
  assert.match(html, /data-transcript-container/);
  assert.match(html, /video-transcript-loading/);
  assert.doesNotMatch(html, /data-cue-index=/);
  assert.equal(html.includes(track.cues[0].text), false);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<iframe/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /<script>alert/i);
});

test('render keeps timed captions live while only the brief status is an atomic live region', () => {
  const html = playerApi.render({ videoId: 'Xl5u91oQv-k', title: 'Tracked video' }, entry);
  const stage = extractBalancedDiv(html, '<div class="video-player-stage">');
  const outsideStage = stage.before + stage.after;

  assert.equal((stage.element.match(/data-caption-overlay\b/g) || []).length, 1);
  assert.doesNotMatch(stage.element, /data-caption-line/);
  assert.doesNotMatch(outsideStage, /data-caption-overlay/);
  assert.equal((outsideStage.match(/data-caption-line\b/g) || []).length, 1);
  assert.match(outsideStage, /data-caption-line[^>]*aria-live="polite"/);
  assert.match(outsideStage, /data-caption-line[^>]*aria-atomic="true"/);
  assert.match(outsideStage, /data-subtitle-live-status[^>]*role="status"/);
  assert.match(outsideStage, /data-subtitle-live-status[^>]*aria-live="polite"/);
  assert.match(outsideStage, /data-subtitle-live-status[^>]*aria-atomic="true"/);
  assert.doesNotMatch(outsideStage, /data-transcript-container[^>]*aria-live/);
});

test('render reserves a stable transcript container while async hydration is pending', () => {
  const html = playerApi.render({ videoId: 'Xl5u91oQv-k', title: 'Tracked video' }, entry);

  assert.equal((html.match(/data-transcript-container\b/g) || []).length, 1);
  assert.match(html, /<p class="video-transcript-loading"[^>]*>[^<]*加载中/);
  assert.doesNotMatch(html, /video-transcript-disclosure/);
  assert.doesNotMatch(html, /video-transcript-cue/);
  assert.doesNotMatch(html, /data-cue-index=/);
});

test('no-speech entries render the exact message without a transcript or loader affordance', () => {
  const noSpeechEntry = { videoId: 'gPgKeCVN8Ek', contentStatus: 'no-speech' };
  const html = playerApi.render(
    { videoId: 'gPgKeCVN8Ek', title: 'Silent video' },
    noSpeechEntry,
    'https://i.ytimg.com/vi/gPgKeCVN8Ek/hqdefault.jpg'
  );

  assert.match(html, /data-subtitle-status="no-speech"/);
  assert.match(html, />本视频无口述内容</);
  assert.match(html, /data-subtitle-toggle[^>]*disabled/);
  assert.match(html, /data-player-cover/);
  assert.match(html, /data-player-target/);
  assert.match(html, /data-caption-overlay/);
  assert.match(html, /data-caption-line/);
  assert.match(html, /data-fullscreen-toggle/);
  assert.doesNotMatch(html, /video-transcript(?:-disclosure|-cue|" aria-label)/);
  assert.doesNotMatch(html, /data-transcript-container/);
  assert.doesNotMatch(html, /加载中/);
});

test('missing catalog entries stay playable and render a truthful unavailable state', () => {
  const html = playerApi.render({ videoId: 'gPgKeCVN8Ek', title: 'No track' }, null, 'https://i.ytimg.com/vi/gPgKeCVN8Ek/hqdefault.jpg');

  assert.match(html, /data-subtitle-status="missing"/);
  assert.match(html, /暂无本站中文字幕/);
  assert.doesNotMatch(html, /中文字幕整理中/);
  assert.match(html, /data-subtitle-toggle[^>]*disabled/);
  assert.match(html, /data-player-cover/);
  assert.match(html, /data-player-target/);
  assert.match(html, /data-caption-overlay/);
  assert.match(html, /data-caption-line/);
  assert.match(html, /data-fullscreen-toggle/);
  assert.doesNotMatch(html, /video-transcript-disclosure/);
  assert.doesNotMatch(html, /video-transcript-cue/);
  assert.doesNotMatch(html, /data-transcript-container/);
  assert.doesNotMatch(html, /data-cue-index=/);
  assert.doesNotMatch(html, /data-subtitle-evidence/);
});

test('missing catalog evidence renders its reason and audit date as escaped text', () => {
  const missingEntry = {
    videoId: 'gPgKeCVN8Ek',
    contentStatus: 'missing',
    updatedAt: '2026-08-13',
    reason: 'Human listening required <img src=x onerror="alert(1)">.'
  };
  const html = playerApi.render(
    { videoId: 'gPgKeCVN8Ek', title: 'Evidence state' },
    missingEntry,
    'https://i.ytimg.com/vi/gPgKeCVN8Ek/hqdefault.jpg'
  );

  assert.match(html, /data-subtitle-status="missing"/);
  assert.match(html, /data-subtitle-evidence/);
  assert.match(html, /证据更新：2026-08-13/);
  assert.match(html, /Human listening required &lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;\./);
  assert.doesNotMatch(html, /<img src=x/);
  assert.match(html, /data-player-cover/);
  assert.match(html, /data-fullscreen-toggle/);
});

test('missing catalog evidence remains visible before an audit date exists', () => {
  const html = playerApi.render(
    { videoId: 'gPgKeCVN8Ek', title: 'Generated missing state' },
    {
      videoId: 'gPgKeCVN8Ek',
      contentStatus: 'missing',
      reason: 'no-subtitle-track-or-approved-override'
    }
  );

  assert.match(html, /data-subtitle-evidence/);
  assert.match(html, />缺失原因</);
  assert.match(html, /no-subtitle-track-or-approved-override/);
});

test('loadApi shares one in-flight YouTube API request per window', async () => {
  const scripts = [];
  const fakeWindow = {};
  const fakeDocument = {
    head: { appendChild(script) { scripts.push(script); } },
    createElement() { return new FakeElement(); },
    querySelector() { return null; }
  };

  const first = playerApi.loadApi({ window: fakeWindow, document: fakeDocument });
  const second = playerApi.loadApi({ window: fakeWindow, document: fakeDocument });

  assert.equal(first, second);
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0].src, 'https://www.youtube.com/iframe_api');

  fakeWindow.YT = { Player: function Player() {} };
  fakeWindow.onYouTubeIframeAPIReady();
  assert.equal(await first, fakeWindow.YT);
});

test('loadApi removes a failed script and can retry cleanly', async () => {
  let activeScript = null;
  let appendCount = 0;
  const fakeWindow = {};
  const fakeDocument = {
    head: {
      appendChild(script) {
        appendCount += 1;
        activeScript = script;
        script.parentNode = {
          removeChild(node) {
            if (activeScript === node) activeScript = null;
          }
        };
      }
    },
    createElement() { return new FakeElement(); },
    querySelector() { return activeScript; }
  };

  const first = playerApi.loadApi({ window: fakeWindow, document: fakeDocument });
  activeScript.dispatch('error');
  await assert.rejects(first, /failed to load/);
  assert.equal(activeScript, null);

  const second = playerApi.loadApi({ window: fakeWindow, document: fakeDocument });
  assert.equal(appendCount, 2);
  fakeWindow.YT = { Player: function Player() {} };
  fakeWindow.onYouTubeIframeAPIReady();
  assert.equal(await second, fakeWindow.YT);
});

test('mount starts subtitle loading immediately but waits for cover activation before YouTube', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  let subtitleLoaderCalls = 0;
  let apiLoaderCalls = 0;
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    loadTrack(videoId) {
      subtitleLoaderCalls += 1;
      assert.equal(videoId, 'Xl5u91oQv-k');
      return Promise.resolve(track);
    },
    loadApi() {
      apiLoaderCalls += 1;
      return Promise.resolve(runtime.YT);
    }
  }));

  assert.equal(subtitleLoaderCalls, 1);
  assert.equal(apiLoaderCalls, 0);
  assert.equal(runtime.getPlayerConfig(), null);
  fixture.cover.dispatch('click');
  await flushPromises();

  assert.equal(apiLoaderCalls, 1);
  const config = runtime.getPlayerConfig();
  assert.equal(config.videoId, 'Xl5u91oQv-k');
  assert.deepEqual(config.playerVars, {
    autoplay: 1,
    cc_load_policy: 0,
    fs: 0,
    origin: 'https://sfx.test',
    playsinline: 1,
    rel: 0
  });
  controller.destroy();
});

test('successful async hydration builds transcript controls and synchronizes a ready player', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const trackRequest = deferred();
  runtime.setCurrentTime(track.cues[1].start);
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    loadTrack: () => trackRequest.promise
  }));

  assert.equal(fixture.toggle.disabled, true);
  assert.equal(fixture.toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(fixture.cueButtons.length, 0);
  fixture.cover.dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();
  assert.equal(fixture.caption.textContent, '');

  trackRequest.resolve(track);
  await flushPromises();

  assert.equal(fixture.root.dataset.subtitleStatus, 'draft');
  assert.equal(fixture.statusText.textContent, '本站中文字幕 · 字幕草稿');
  assert.equal(fixture.statusHint.textContent, '已同步时间轴，术语仍在校对');
  assert.equal(fixture.toggle.disabled, false);
  assert.equal(fixture.toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(fixture.cueButtons.length, track.cues.length);
  assert.equal(fixture.cueButtons[0].dataset.paragraphStart, String(track.cues[0].start));
  assert.equal(fixture.cueButtons[0].querySelector('.video-transcript-time').textContent, '00:40');
  assert.equal(fixture.cueButtons[0].querySelector('.video-transcript-text').textContent, track.cues[0].text);
  assert.equal(fixture.transcript.innerHTMLAssignments, 0);
  assert.equal(fixture.caption.textContent, track.cues[1].text);
  assert.equal(fixture.overlay.textContent, track.cues[1].text);
  assert.equal(fixture.cueButtons[1].getAttribute('aria-current'), 'true');
  controller.destroy();
});

test('hydrates readable paragraphs into an external transcript root', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const loadedTrack = groupedTrack();
  const paragraphs = subtitles.paragraphsFor(loadedTrack);
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    transcriptRoot: fixture.externalTranscript,
    loadTrack: () => Promise.resolve(loadedTrack)
  }));

  await flushPromises();

  assert.equal(fixture.externalTranscript.querySelectorAll('[data-paragraph-index]').length, paragraphs.length);
  assert.equal(fixture.transcript.textContent, '');
  assert.equal(fixture.transcript.children.length, 0);
  assert.equal(fixture.externalTranscript.querySelector('.video-transcript-time').textContent, '00:00');
  assert.equal(
    fixture.externalTranscript.querySelector('.video-transcript-text').textContent,
    paragraphs[0].text
  );
  controller.destroy();
  assert.equal(fixture.externalTranscript.children.length, 0);
});

test('paragraph controls seek while the overlay remains cue-accurate and polling does not scroll', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const loadedTrack = groupedTrack();
  const paragraphs = subtitles.paragraphsFor(loadedTrack);
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    transcriptRoot: fixture.externalTranscript,
    loadTrack: () => Promise.resolve(loadedTrack)
  }));

  await flushPromises();
  const buttons = fixture.paragraphButtons.slice();
  buttons[0].dispatch('click');
  await flushPromises();
  const config = runtime.getPlayerConfig();
  config.events.onReady();
  await flushPromises();

  assert.deepEqual(runtime.calls.seek[0], [paragraphs[0].start, true]);
  assert.equal(buttons[0].scrollCalls, 1);
  runtime.setCurrentTime(loadedTrack.cues[1].start);
  config.events.onStateChange({ data: 1 });
  assert.equal(fixture.overlay.textContent, loadedTrack.cues[1].text);
  assert.equal(buttons[0].getAttribute('aria-current'), 'true');
  runtime.runInterval();
  assert.equal(buttons[0].scrollCalls, 1);
  controller.destroy();
});

test('notifies once after valid hydration, ignores callback failures, and stays silent after destroy', async () => {
  const loaded = [];
  const firstFixture = buildFixture();
  const firstRuntime = buildRuntime();
  const firstController = playerApi.mount(firstFixture.root, mountOptions(firstRuntime, {
    onTrackLoaded(value) { loaded.push(value); }
  }));
  await flushPromises();
  assert.deepEqual(loaded, [track]);
  firstController.destroy();

  const throwingFixture = buildFixture();
  const throwingRuntime = buildRuntime();
  const throwingController = playerApi.mount(throwingFixture.root, mountOptions(throwingRuntime, {
    onTrackLoaded() { throw new Error('observer failure'); }
  }));
  await flushPromises();
  assert.equal(throwingFixture.paragraphButtons.length, subtitles.paragraphsFor(track).length);
  throwingController.destroy();

  const lateFixture = buildFixture();
  const lateRuntime = buildRuntime();
  const request = deferred();
  let lateCalls = 0;
  const lateController = playerApi.mount(lateFixture.root, mountOptions(lateRuntime, {
    loadTrack: () => request.promise,
    onTrackLoaded() { lateCalls += 1; }
  }));
  lateController.destroy();
  request.resolve(track);
  await flushPromises();
  assert.equal(lateCalls, 0);
});

test('no-speech state never loads a track and keeps normal playback available', async () => {
  const fixture = buildFixture({
    videoId: 'gPgKeCVN8Ek',
    subtitleStatus: 'no-speech',
    includeTranscript: false
  });
  const runtime = buildRuntime();
  let loaderCalls = 0;
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    entry: { videoId: 'gPgKeCVN8Ek', contentStatus: 'no-speech' },
    loadTrack() {
      loaderCalls += 1;
      return Promise.resolve(track);
    }
  }));

  assert.equal(loaderCalls, 0);
  assert.equal(fixture.toggle.disabled, true);
  assert.equal(fixture.cueButtons.length, 0);
  fixture.cover.dispatch('click');
  await flushPromises();
  assert.equal(runtime.getPlayerConfig().videoId, 'gPgKeCVN8Ek');
  runtime.getPlayerConfig().events.onReady();
  assert.equal(fixture.cover.hidden, true);
  controller.destroy();
});

test('missing catalog state never loads a track and keeps normal playback available', async () => {
  const fixture = buildFixture({
    videoId: 'gPgKeCVN8Ek',
    subtitleStatus: 'missing',
    includeTranscript: false
  });
  const runtime = buildRuntime();
  let loaderCalls = 0;
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    entry: null,
    loadTrack() {
      loaderCalls += 1;
      return Promise.resolve(track);
    }
  }));

  assert.equal(loaderCalls, 0);
  assert.equal(fixture.toggle.disabled, true);
  assert.equal(fixture.cueButtons.length, 0);
  fixture.cover.dispatch('click');
  await flushPromises();
  assert.equal(runtime.getPlayerConfig().videoId, 'gPgKeCVN8Ek');
  runtime.getPlayerConfig().events.onReady();
  assert.equal(fixture.cover.hidden, true);
  controller.destroy();
});

test('subtitle load rejection shows an isolated error while playback and fullscreen remain usable', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    loadTrack: () => Promise.reject(new Error('subtitle network failure'))
  }));

  await flushPromises();
  assert.equal(fixture.root.dataset.subtitleStatus, 'error');
  assert.equal(fixture.statusText.textContent, '中文字幕加载失败，视频仍可正常播放。');
  assert.equal(fixture.toggle.disabled, true);
  assert.equal(fixture.cueButtons.length, 0);
  assert.equal(fixture.error.hidden, true);
  assert.equal(fixture.error.textContent, '');

  fixture.fullscreen.dispatch('click');
  assert.equal(fixture.root.requestFullscreenCalls, 1);
  fixture.cover.dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();
  assert.equal(fixture.cover.hidden, true);
  assert.equal(fixture.error.hidden, true);
  controller.destroy();
});

test('a synchronous subtitle loader throw is caught as a subtitle-only error', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    loadTrack() {
      throw new Error('synchronous subtitle failure');
    }
  }));

  await flushPromises();
  assert.equal(fixture.root.dataset.subtitleStatus, 'error');
  assert.equal(fixture.statusText.textContent, '中文字幕加载失败，视频仍可正常播放。');
  assert.equal(fixture.error.hidden, true);
  controller.destroy();
});

test('destroy ignores late subtitle resolution and rejection without mutations or listeners', async (t) => {
  for (const outcome of ['resolve', 'reject']) {
    await t.test(outcome, async () => {
      const fixture = buildFixture();
      const runtime = buildRuntime();
      const trackRequest = deferred();
      const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
        loadTrack: () => trackRequest.promise
      }));
      controller.destroy();

      const snapshot = {
        status: fixture.root.dataset.subtitleStatus,
        statusText: fixture.statusText.textContent,
        statusTextAssignments: fixture.statusText.textContentAssignments,
        statusHint: fixture.statusHint.textContent,
        statusHintAssignments: fixture.statusHint.textContentAssignments,
        transcriptText: fixture.transcript.textContent,
        transcriptAssignments: fixture.transcript.textContentAssignments,
        transcriptChildren: fixture.transcript.children.length,
        toggleDisabled: fixture.toggle.disabled,
        togglePressed: fixture.toggle.getAttribute('aria-pressed')
      };

      assert.equal(fixture.cover.listenerCount('click'), 0);
      assert.equal(fixture.toggle.listenerCount('click'), 0);
      assert.equal(fixture.fullscreen.listenerCount('click'), 0);
      if (outcome === 'resolve') trackRequest.resolve(track);
      else trackRequest.reject(new Error('late subtitle failure'));
      await flushPromises();

      assert.deepEqual({
        status: fixture.root.dataset.subtitleStatus,
        statusText: fixture.statusText.textContent,
        statusTextAssignments: fixture.statusText.textContentAssignments,
        statusHint: fixture.statusHint.textContent,
        statusHintAssignments: fixture.statusHint.textContentAssignments,
        transcriptText: fixture.transcript.textContent,
        transcriptAssignments: fixture.transcript.textContentAssignments,
        transcriptChildren: fixture.transcript.children.length,
        toggleDisabled: fixture.toggle.disabled,
        togglePressed: fixture.toggle.getAttribute('aria-pressed')
      }, snapshot);
      assert.equal(fixture.cueButtons.length, 0);
      assert.equal(runtime.document.listeners.has('fullscreenchange'), false);
    });
  }
});

test('cover activation and playback work before subtitle loading settles', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const trackRequest = deferred();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    loadTrack: () => trackRequest.promise
  }));

  fixture.cover.dispatch('click');
  await flushPromises();
  const config = runtime.getPlayerConfig();
  assert.ok(config);
  config.events.onReady();
  config.events.onStateChange({ data: 1 });
  assert.equal(fixture.cover.hidden, true);
  assert.equal(runtime.getIntervalDelay(), 200);
  assert.equal(fixture.toggle.disabled, true);
  assert.equal(fixture.cueButtons.length, 0);
  controller.destroy();
  trackRequest.resolve(track);
  await flushPromises();
});

test('playing polls every 200 ms and synchronizes both caption surfaces and transcript', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  await flushPromises();
  fixture.cover.dispatch('click');
  await flushPromises();
  const config = runtime.getPlayerConfig();
  config.events.onReady();
  config.events.onStateChange({ data: 1 });
  assert.equal(runtime.getIntervalDelay(), 200);

  runtime.setCurrentTime(track.cues[1].start);
  runtime.runInterval();
  assert.equal(fixture.caption.textContent, track.cues[1].text);
  assert.equal(fixture.overlay.textContent, track.cues[1].text);
  assert.equal(fixture.cueButtons[1].getAttribute('aria-current'), 'true');
  assert.equal(fixture.cueButtons[1].scrollCalls, 0);

  runtime.setCurrentTime(track.cues[1].end);
  runtime.runInterval();
  assert.equal(fixture.caption.textContent, '');
  assert.equal(fixture.cueButtons[1].getAttribute('aria-current'), null);
  controller.destroy();
});

test('caption surfaces mutate only when the displayed text changes', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  await flushPromises();
  fixture.cover.dispatch('click');
  await flushPromises();
  const config = runtime.getPlayerConfig();
  config.events.onReady();
  fixture.caption.resetTextContentAssignments();
  fixture.overlay.resetTextContentAssignments();

  runtime.setCurrentTime(track.cues[0].start);
  config.events.onStateChange({ data: 1 });
  assert.equal(fixture.caption.textContent, track.cues[0].text);
  assert.equal(fixture.overlay.textContent, track.cues[0].text);
  assert.equal(fixture.caption.textContentAssignments, 1);
  assert.equal(fixture.overlay.textContentAssignments, 1);

  runtime.runInterval();
  runtime.runInterval();
  assert.equal(fixture.caption.textContentAssignments, 1);
  assert.equal(fixture.overlay.textContentAssignments, 1);

  runtime.setCurrentTime(track.cues[1].start);
  runtime.runInterval();
  assert.equal(fixture.caption.textContent, track.cues[1].text);
  assert.equal(fixture.overlay.textContent, track.cues[1].text);
  assert.equal(fixture.caption.textContentAssignments, 2);
  assert.equal(fixture.overlay.textContentAssignments, 2);

  runtime.runInterval();
  assert.equal(fixture.caption.textContentAssignments, 2);
  assert.equal(fixture.overlay.textContentAssignments, 2);

  fixture.toggle.dispatch('click');
  assert.equal(fixture.caption.textContent, '');
  assert.equal(fixture.overlay.textContent, '');
  assert.equal(fixture.caption.textContentAssignments, 3);
  assert.equal(fixture.overlay.textContentAssignments, 3);

  runtime.runInterval();
  assert.equal(fixture.caption.textContentAssignments, 3);
  assert.equal(fixture.overlay.textContentAssignments, 3);

  fixture.toggle.dispatch('click');
  assert.equal(fixture.caption.textContent, track.cues[1].text);
  assert.equal(fixture.overlay.textContent, track.cues[1].text);
  assert.equal(fixture.caption.textContentAssignments, 4);
  assert.equal(fixture.overlay.textContentAssignments, 4);

  runtime.setCurrentTime(track.cues[track.cues.length - 1].end + 1);
  runtime.runInterval();
  assert.equal(fixture.caption.textContent, '');
  assert.equal(fixture.overlay.textContent, '');
  assert.equal(fixture.caption.textContentAssignments, 5);
  assert.equal(fixture.overlay.textContentAssignments, 5);
  controller.destroy();
});

test('player readiness and caption-module changes suppress native captions', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  await flushPromises();
  fixture.cover.dispatch('click');
  await flushPromises();
  const config = runtime.getPlayerConfig();
  fixture.error.hidden = false;
  fixture.error.textContent = 'previous load error';
  config.events.onReady();
  config.events.onApiChange();

  assert.deepEqual(runtime.calls.setOption, [
    ['captions', 'track', {}],
    ['captions', 'track', {}]
  ]);
  assert.deepEqual(runtime.calls.unloadModule, []);
  assert.equal(fixture.error.hidden, true);
  assert.equal(fixture.error.textContent, '');
  controller.destroy();
});

test('caption toggle stays disabled until hydration, then preserves hide and show behavior', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const trackRequest = deferred();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime, {
    loadTrack: () => trackRequest.promise
  }));

  assert.equal(fixture.toggle.disabled, true);
  fixture.toggle.dispatch('click');
  assert.equal(fixture.toggle.getAttribute('aria-pressed'), 'false');
  trackRequest.resolve(track);
  await flushPromises();
  assert.equal(fixture.toggle.disabled, false);
  assert.equal(fixture.toggle.getAttribute('aria-pressed'), 'true');

  fixture.cover.dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();
  runtime.setCurrentTime(track.cues[0].start);
  runtime.getPlayerConfig().events.onStateChange({ data: 1 });
  assert.equal(fixture.caption.textContent, track.cues[0].text);

  fixture.toggle.dispatch('click');
  assert.equal(fixture.toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(fixture.caption.textContent, '');
  assert.equal(fixture.overlay.textContent, '');
  assert.equal(fixture.root.classList.contains('subtitles-hidden'), true);

  fixture.toggle.dispatch('click');
  assert.equal(fixture.toggle.getAttribute('aria-pressed'), 'true');
  assert.equal(fixture.caption.textContent, track.cues[0].text);
  assert.equal(fixture.overlay.textContent, track.cues[0].text);
  assert.equal(fixture.root.classList.contains('subtitles-hidden'), false);
  controller.destroy();
});

test('hydrated transcript controls start the player and seek to their cue', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  await flushPromises();
  assert.equal(fixture.cueButtons.length, track.cues.length);
  fixture.cueButtons[2].dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();
  await flushPromises();

  assert.deepEqual(runtime.calls.seek, [[track.cues[2].start, true]]);
  assert.equal(runtime.calls.play, 1);
  controller.destroy();
});

test('fullscreen control targets the complete player wrapper', () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  fixture.fullscreen.dispatch('click');
  assert.equal(fixture.root.requestFullscreenCalls, 1);

  runtime.document.fullscreenElement = fixture.root;
  runtime.document.listeners.get('fullscreenchange')();
  assert.equal(fixture.fullscreen.getAttribute('aria-pressed'), 'true');
  fixture.fullscreen.dispatch('click');
  assert.equal(runtime.document.exitFullscreenCalls, 1);
  controller.destroy();
});

test('mount disables fullscreen when the browser does not support it', () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  delete fixture.root.requestFullscreen;
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  assert.equal(fixture.fullscreen.disabled, true);
  assert.equal(fixture.fullscreen.getAttribute('aria-disabled'), 'true');
  controller.destroy();
});

test('mount disables fullscreen when permissions policy reports it unavailable', () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  runtime.document.fullscreenEnabled = false;
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  assert.equal(fixture.fullscreen.disabled, true);
  assert.equal(fixture.fullscreen.getAttribute('aria-disabled'), 'true');
  controller.destroy();
});

test('cover activation moves keyboard focus into the ready YouTube iframe', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  runtime.document.activeElement = fixture.cover;
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  fixture.cover.dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();

  assert.equal(runtime.iframe.focusCalls, 1);
  assert.equal(fixture.cover.hidden, true);
  controller.destroy();
});

test('destroy clears polling, static and cue listeners, and the active YouTube instance', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, mountOptions(runtime));

  await flushPromises();
  const hydratedButtons = fixture.cueButtons.slice();
  assert.equal(hydratedButtons[0].listenerCount('click'), 1);
  fixture.cover.dispatch('click');
  await flushPromises();
  const config = runtime.getPlayerConfig();
  config.events.onStateChange({ data: 1 });
  controller.destroy();

  assert.equal(runtime.calls.destroy, 1);
  assert.equal(runtime.getClearCalls(), 1);
  assert.equal(runtime.document.listeners.has('fullscreenchange'), false);
  assert.equal(fixture.cover.listenerCount('click'), 0);
  assert.equal(fixture.toggle.listenerCount('click'), 0);
  assert.equal(fixture.fullscreen.listenerCount('click'), 0);
  hydratedButtons.forEach((button) => assert.equal(button.listenerCount('click'), 0));
  fixture.cover.dispatch('click');
  hydratedButtons[0].dispatch('click');
  assert.equal(runtime.calls.destroy, 1);
  assert.deepEqual(runtime.calls.seek, []);
});
