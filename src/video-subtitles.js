(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SfxVideoSubtitles = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* TRACK_DATA_START */
  var rawTracks = [{
    videoId: 'Xl5u91oQv-k',
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-12',
    cues: [
      { start: 40.559, end: 48.709, text: '这次介绍几个不太复杂的小技巧。' },
      { start: 48.719, end: 57.43, text: '但我主要想强调 Stepwise Morph 这款插件有多好用。' },
      { start: 57.44, end: 67.07, text: 'Stepwise Morph 是免费的，搜索一下就能找到；Stepwise 还提供很多免费插件。' },
      { start: 67.08, end: 74.35, text: 'Morph 非常有意思，可以彻底改变一个声音。' },
      { start: 74.36, end: 80.149, text: '首先来看这个声音是怎么做出来的。' },
      { start: 80.159, end: 88.87, text: '我先演示一下：末端加了限制器，也降低了一些增益，因为这条链会变得很响。' },
      { start: 88.88, end: 98.87, text: '关掉其他插件后，基础声源其实只是 Serum 里的 Analog 4088。' },
      { start: 98.88, end: 110.35, text: 'Analog 4088 波表升高几个八度时更尖脆，降低几个八度时则更厚。' },
      { start: 110.36, end: 120.51, text: '这里主要用脉冲宽度调制，也就是 PWM，让扫描位置在波形上左右移动。' },
      { start: 120.52, end: 129.51, text: '滤波器只增加一点音色特色；我还用了多段压缩器。' },
      { start: 129.52, end: 139.55, text: '多段压缩主要是为了增加质感和延续感，得到更持续的纹理声。' },
      { start: 139.56, end: 150.91, text: '启用 GRM Reson 后，声音开始出现共振特质，再配合一些瞬态塑形。' },
      { start: 150.92, end: 165.91, text: '接着继续堆叠更多 GRM Reson，并在后面回收一些增益。' },
      { start: 165.92, end: 184.81, text: '这里很适合做变化：任选一个共振器，改变 Resonance 就能得到不同结果。' },
      { start: 207.72, end: 218.47, text: '这些设置很好玩；在任何一个共振器阶段，都可以改变 Resonance 和采样保持速率。' },
      { start: 218.48, end: 230.51, text: '接着打开同一个音色，仍然使用 Serum，再串联这些共振器。' },
      { start: 230.519, end: 240.95, text: '然后在共振器后加入 Stepwise Morph，并把它启用。' },
      { start: 240.959, end: 255.18, text: '默认曲线接近直线；加入多个控制点并上下移动，就会得到很有科幻感的频谱纹理。' },
      { start: 263.96, end: 280.31, text: '改变 FFT Size 也会明显改变结果。' },
      { start: 280.32, end: 282.71, text: '现在把 FFT Size 调得更高一些。' },
      { start: 294.8, end: 300.44, text: '哪怕只是轻微移动其中一个控制点，声音也会发生很大的变化。' },
      { start: 348.12, end: 353.25, text: '关掉 Morph 后，声音会完全不同。' },
      { start: 376.8, end: 382.199, text: 'Stepwise Morph 真的很适合拿来探索不同变化。' }
    ]
  }];
  /* TRACK_DATA_END */

  var statuses = Object.freeze({
    missing: Object.freeze({
      status: 'missing',
      label: '中文字幕整理中'
    }),
    draft: Object.freeze({
      status: 'draft',
      label: '机器初稿，术语已初步校正'
    }),
    reviewed: Object.freeze({
      status: 'reviewed',
      label: '中文字幕已校对'
    })
  });
  var normalizedCueCache = typeof WeakMap === 'function' ? new WeakMap() : null;

  function isFiniteNonNegative(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  function normalizeVideoId(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeRequiredText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeCues(rawCues) {
    if (!Array.isArray(rawCues) || rawCues.length === 0) return null;

    var cues = [];
    var previousEnd = -1;

    for (var index = 0; index < rawCues.length; index += 1) {
      var rawCue = rawCues[index];
      if (!rawCue || typeof rawCue !== 'object' || Array.isArray(rawCue)) return null;

      var start = rawCue.start;
      var end = rawCue.end;
      var text = normalizeRequiredText(rawCue.text);

      if (!isFiniteNonNegative(start) ||
          !isFiniteNonNegative(end) ||
          end <= start ||
          !text ||
          start < previousEnd) {
        return null;
      }

      cues.push(Object.freeze({ start: start, end: end, text: text }));
      previousEnd = end;
    }

    return Object.freeze(cues);
  }

  function normalizeTrack(rawTrack) {
    if (!rawTrack || typeof rawTrack !== 'object' || Array.isArray(rawTrack)) return null;

    var videoId = normalizeVideoId(rawTrack.videoId);
    var language = normalizeRequiredText(rawTrack.language);
    var source = normalizeRequiredText(rawTrack.source);
    var reviewStatus = rawTrack.reviewStatus;
    var updatedAt = normalizeRequiredText(rawTrack.updatedAt);
    var cues = normalizeCues(rawTrack.cues);

    if (!videoId ||
        !language ||
        !source ||
        (reviewStatus !== 'draft' && reviewStatus !== 'reviewed') ||
        !updatedAt ||
        !cues) {
      return null;
    }

    var track = Object.freeze({
      videoId: videoId,
      language: language,
      source: source,
      reviewStatus: reviewStatus,
      updatedAt: updatedAt,
      cues: cues
    });
    if (normalizedCueCache) normalizedCueCache.set(track, cues);
    return track;
  }

  var tracksByVideoId = Object.create(null);
  rawTracks.forEach(function (rawTrack, index) {
    var track = normalizeTrack(rawTrack);
    if (!track) throw new Error('Invalid subtitle track at index ' + index);
    if (Object.prototype.hasOwnProperty.call(tracksByVideoId, track.videoId)) {
      throw new Error('Duplicate subtitle track for videoId: ' + track.videoId);
    }
    tracksByVideoId[track.videoId] = track;
  });
  Object.freeze(tracksByVideoId);

  function trackFor(videoId) {
    var normalizedId = normalizeVideoId(videoId);
    if (!normalizedId || !Object.prototype.hasOwnProperty.call(tracksByVideoId, normalizedId)) {
      return null;
    }
    return tracksByVideoId[normalizedId];
  }

  function cueAt(track, seconds) {
    if (!track ||
        typeof track !== 'object' ||
        Array.isArray(track) ||
        !isFiniteNonNegative(seconds)) {
      return null;
    }

    var cues = normalizedCueCache && normalizedCueCache.get(track);
    if (!cues) {
      cues = normalizeCues(track.cues);
      if (!cues) return null;
      var immutableInput = Object.isFrozen(track) &&
        Array.isArray(track.cues) &&
        Object.isFrozen(track.cues) &&
        track.cues.every(function (cue) { return Object.isFrozen(cue); });
      if (cues && immutableInput && normalizedCueCache) normalizedCueCache.set(track, cues);
    }

    var low = 0;
    var high = cues.length - 1;

    while (low <= high) {
      var middle = Math.floor((low + high) / 2);
      var cue = cues[middle];

      if (seconds < cue.start) high = middle - 1;
      else if (seconds >= cue.end) low = middle + 1;
      else return cue;
    }

    return null;
  }

  function padTwo(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function formatTime(seconds) {
    var wholeSeconds = isFiniteNonNegative(seconds) ? Math.floor(seconds) : 0;
    var hours = Math.floor(wholeSeconds / 3600);
    var minutes = Math.floor((wholeSeconds % 3600) / 60);
    var remainingSeconds = wholeSeconds % 60;

    if (hours > 0) return hours + ':' + padTwo(minutes) + ':' + padTwo(remainingSeconds);
    return padTwo(minutes) + ':' + padTwo(remainingSeconds);
  }

  function statusFor(videoId) {
    var track = trackFor(videoId);
    return track ? statuses[track.reviewStatus] : statuses.missing;
  }

  function coverageFor(records) {
    var counts = { total: 0, reviewed: 0, draft: 0, missing: 0 };
    if (!Array.isArray(records)) return Object.freeze(counts);

    var seen = Object.create(null);
    records.forEach(function (record) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) return;

      var videoId = normalizeVideoId(record.videoId);
      if (!videoId || Object.prototype.hasOwnProperty.call(seen, videoId)) return;

      seen[videoId] = true;
      counts.total += 1;
      counts[statusFor(videoId).status] += 1;
    });

    return Object.freeze(counts);
  }

  return Object.freeze({
    trackFor: trackFor,
    cueAt: cueAt,
    formatTime: formatTime,
    statusFor: statusFor,
    coverageFor: coverageFor
  });
}));
