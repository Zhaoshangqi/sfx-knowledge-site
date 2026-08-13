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
const track = subtitles.trackFor('Xl5u91oQv-k');

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
  constructor(dataset = {}) {
    this.dataset = { ...dataset };
    this.textContent = '';
    this.disabled = false;
    this.hidden = false;
    this.attributes = Object.create(null);
    this.classList = new FakeClassList();
    this.listeners = new Map();
    this.scrollCalls = 0;
    this.focusCalls = 0;
    this.parentNode = null;
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

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  scrollIntoView() {
    this.scrollCalls += 1;
  }

  focus() {
    this.focusCalls += 1;
  }
}

function buildFixture() {
  const root = new FakeElement({ videoId: 'Xl5u91oQv-k' });
  const cover = new FakeElement();
  const target = new FakeElement();
  const caption = new FakeElement();
  const overlay = new FakeElement();
  const toggle = new FakeElement();
  const fullscreen = new FakeElement();
  const error = new FakeElement();
  const cueButtons = track.cues.map((cue, index) => new FakeElement({
    cueIndex: String(index),
    cueStart: String(cue.start)
  }));
  const selectors = new Map([
    ['[data-player-cover]', cover],
    ['[data-player-target]', target],
    ['[data-caption-line]', caption],
    ['[data-caption-overlay]', overlay],
    ['[data-subtitle-toggle]', toggle],
    ['[data-fullscreen-toggle]', fullscreen],
    ['[data-player-error]', error]
  ]);

  root.querySelector = (selector) => selectors.get(selector) || null;
  root.querySelectorAll = (selector) => selector === '[data-cue-index]' ? cueButtons : [];
  root.requestFullscreenCalls = 0;
  root.requestFullscreen = () => {
    root.requestFullscreenCalls += 1;
    return Promise.resolve();
  };

  return { root, cover, target, caption, overlay, toggle, fullscreen, error, cueButtons };
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
  const document = {
    defaultView: window,
    activeElement: null,
    fullscreenElement: null,
    listeners: new Map(),
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

test('render returns a cover-first shell with escaped content and no iframe', () => {
  const html = playerApi.render({
    videoId: 'Xl5u91oQv-k',
    title: '<script>alert(1)</script>'
  }, track, 'javascript:alert(2)');

  assert.match(html, /data-youtube-caption-player/);
  assert.match(html, /data-player-cover/);
  assert.match(html, /data-player-target/);
  assert.match(html, /本站中文字幕/);
  assert.match(html, /字幕草稿/);
  assert.match(html, /data-cue-index="0"/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<iframe/i);
  assert.doesNotMatch(html, /javascript:/i);
  assert.doesNotMatch(html, /<script>alert/i);
});

test('render keeps one caption overlay in the stage and one live region outside it', () => {
  const html = playerApi.render({ videoId: 'Xl5u91oQv-k', title: 'Tracked video' }, track);
  const stage = extractBalancedDiv(html, '<div class="video-player-stage">');
  const outsideStage = stage.before + stage.after;

  assert.equal((stage.element.match(/data-caption-overlay\b/g) || []).length, 1);
  assert.doesNotMatch(stage.element, /data-caption-line/);
  assert.doesNotMatch(outsideStage, /data-caption-overlay/);
  assert.equal((outsideStage.match(/data-caption-line\b/g) || []).length, 1);
  assert.match(outsideStage, /data-caption-line[^>]*aria-live="polite"/);
  assert.match(outsideStage, /data-caption-line[^>]*aria-atomic="true"/);
});

test('render collapses the full transcript behind a native disclosure', () => {
  const html = playerApi.render({ videoId: 'Xl5u91oQv-k', title: 'Tracked video' }, track);
  const disclosureStart = html.indexOf('<details class="video-transcript-disclosure">');
  const disclosureEnd = html.indexOf('</details>', disclosureStart);
  const disclosureHtml = html.slice(disclosureStart, disclosureEnd + '</details>'.length);

  assert.ok(disclosureStart >= 0, 'tracked videos must render a transcript disclosure');
  assert.ok(disclosureEnd > disclosureStart, 'the transcript disclosure must close');
  assert.equal((html.match(/<details class="video-transcript-disclosure"(?:\s|>)/g) || []).length, 1);
  assert.doesNotMatch(disclosureHtml.match(/^<details[^>]*>/)[0], /\sopen(?:\s|=|>)/);
  assert.match(disclosureHtml, /<summary>字幕全文<\/summary>/);
  assert.equal((disclosureHtml.match(/<ol class="video-transcript"(?:\s|>)/g) || []).length, 1);
  assert.match(disclosureHtml, /data-cue-index="0"/);
});

test('render keeps videos playable while showing an explicit missing subtitle state', () => {
  const html = playerApi.render({ videoId: 'gPgKeCVN8Ek', title: 'No track' }, null, 'https://i.ytimg.com/vi/gPgKeCVN8Ek/hqdefault.jpg');

  assert.match(html, /中文字幕整理中/);
  assert.match(html, /data-subtitle-toggle[^>]*disabled/);
  assert.match(html, /data-player-cover/);
  assert.doesNotMatch(html, /video-transcript-disclosure/);
  assert.doesNotMatch(html, /video-transcript-cue/);
  assert.doesNotMatch(html, /data-cue-index=/);
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

test('mount waits for cover activation and creates a configured inline player', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  let loaderCalls = 0;
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi() {
      loaderCalls += 1;
      return Promise.resolve(runtime.YT);
    },
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

  assert.equal(loaderCalls, 0);
  assert.equal(runtime.getPlayerConfig(), null);
  fixture.cover.dispatch('click');
  await flushPromises();

  assert.equal(loaderCalls, 1);
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

test('playing polls every 200 ms and synchronizes both caption surfaces and transcript', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

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
  assert.equal(fixture.cueButtons[1].scrollCalls, 1);

  runtime.setCurrentTime(track.cues[1].end);
  runtime.runInterval();
  assert.equal(fixture.caption.textContent, '');
  assert.equal(fixture.cueButtons[1].getAttribute('aria-current'), null);
  controller.destroy();
});

test('player readiness and caption-module changes suppress native captions', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

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

test('subtitle toggle hides custom text without disabling playback', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

  fixture.cover.dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();
  runtime.setCurrentTime(track.cues[0].start);
  fixture.toggle.dispatch('click');

  assert.equal(fixture.toggle.getAttribute('aria-pressed'), 'false');
  assert.equal(fixture.caption.textContent, '');
  assert.equal(fixture.overlay.textContent, '');
  assert.equal(runtime.calls.destroy, 0);
  controller.destroy();
});

test('transcript controls start the player and seek to their cue', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

  fixture.cueButtons[2].dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();
  await flushPromises();

  assert.deepEqual(runtime.calls.seek, [[track.cues[2].start, true]]);
  assert.equal(runtime.calls.play, 1);
  controller.destroy();
});

test('fullscreen control targets the complete player wrapper', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

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
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

  assert.equal(fixture.fullscreen.disabled, true);
  assert.equal(fixture.fullscreen.getAttribute('aria-disabled'), 'true');
  controller.destroy();
});

test('mount disables fullscreen when permissions policy reports it unavailable', () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  runtime.document.fullscreenEnabled = false;
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

  assert.equal(fixture.fullscreen.disabled, true);
  assert.equal(fixture.fullscreen.getAttribute('aria-disabled'), 'true');
  controller.destroy();
});

test('cover activation moves keyboard focus into the ready YouTube iframe', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  runtime.document.activeElement = fixture.cover;
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

  fixture.cover.dispatch('click');
  await flushPromises();
  runtime.getPlayerConfig().events.onReady();

  assert.equal(runtime.iframe.focusCalls, 1);
  assert.equal(fixture.cover.hidden, true);
  controller.destroy();
});

test('destroy clears polling, listeners, and the active YouTube instance', async () => {
  const fixture = buildFixture();
  const runtime = buildRuntime();
  const controller = playerApi.mount(fixture.root, {
    track,
    subtitles,
    document: runtime.document,
    loadApi: () => Promise.resolve(runtime.YT),
    setInterval: runtime.setInterval,
    clearInterval: runtime.clearInterval
  });

  fixture.cover.dispatch('click');
  await flushPromises();
  const config = runtime.getPlayerConfig();
  config.events.onStateChange({ data: 1 });
  controller.destroy();

  assert.equal(runtime.calls.destroy, 1);
  assert.equal(runtime.getClearCalls(), 1);
  assert.equal(runtime.document.listeners.has('fullscreenchange'), false);
  fixture.cover.dispatch('click');
  assert.equal(runtime.calls.destroy, 1);
});
