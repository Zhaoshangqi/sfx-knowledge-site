(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SfxVideoSubtitles = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var rawTracks = [];

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
