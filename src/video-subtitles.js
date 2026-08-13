(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(root);
  } else {
    root.SfxVideoSubtitles = factory(root);
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';

  /* SUBTITLE_CATALOG_START */
  var rawCatalog = [{
    videoId: 'Xl5u91oQv-k',
    language: 'zh-CN',
    source: 'site-owned-from-public-captions',
    reviewStatus: 'draft',
    updatedAt: '2026-08-12',
    contentStatus: 'track',
    asset: 'assets/subtitles/Xl5u91oQv-k.json'
  }];
  /* SUBTITLE_CATALOG_END */

  var statuses = Object.freeze({
    missing: Object.freeze({
      status: 'missing',
      label: '中文字幕整理中'
    }),
    noSpeech: Object.freeze({
      status: 'no-speech',
      label: '无语音，无需字幕'
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
  var trackPromiseCache = Object.create(null);

  function isFiniteNonNegative(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  function normalizeVideoId(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function normalizeRequiredText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function isSafeCatalogVideoId(videoId) {
    return /^[A-Za-z0-9_-]+$/.test(videoId);
  }

  function normalizeCatalogEntry(rawEntry) {
    if (!rawEntry || typeof rawEntry !== 'object' || Array.isArray(rawEntry)) return null;

    var videoId = normalizeVideoId(rawEntry.videoId);
    var contentStatus = rawEntry.contentStatus;
    if (!videoId || !isSafeCatalogVideoId(videoId) ||
        (contentStatus !== 'track' &&
         contentStatus !== 'no-speech' &&
         contentStatus !== 'missing')) {
      return null;
    }

    if (contentStatus !== 'track') {
      return Object.freeze({
        videoId: videoId,
        contentStatus: contentStatus
      });
    }

    var language = normalizeRequiredText(rawEntry.language);
    var source = normalizeRequiredText(rawEntry.source);
    var reviewStatus = rawEntry.reviewStatus;
    var updatedAt = normalizeRequiredText(rawEntry.updatedAt);
    var asset = normalizeRequiredText(rawEntry.asset);
    var expectedAsset = 'assets/subtitles/' + videoId + '.json';

    if (!language ||
        !source ||
        (reviewStatus !== 'draft' && reviewStatus !== 'reviewed') ||
        !updatedAt ||
        asset !== expectedAsset) {
      return null;
    }

    return Object.freeze({
      videoId: videoId,
      language: language,
      source: source,
      reviewStatus: reviewStatus,
      updatedAt: updatedAt,
      contentStatus: contentStatus,
      asset: asset
    });
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

  var catalogByVideoId = Object.create(null);
  rawCatalog.forEach(function (rawEntry, index) {
    var entry = normalizeCatalogEntry(rawEntry);
    if (!entry) throw new Error('Invalid subtitle catalog entry at index ' + index);
    if (Object.prototype.hasOwnProperty.call(catalogByVideoId, entry.videoId)) {
      throw new Error('Duplicate subtitle catalog entry for videoId: ' + entry.videoId);
    }
    catalogByVideoId[entry.videoId] = entry;
  });
  Object.freeze(catalogByVideoId);

  function entryFor(videoId) {
    var normalizedId = normalizeVideoId(videoId);
    if (!normalizedId || !Object.prototype.hasOwnProperty.call(catalogByVideoId, normalizedId)) {
      return null;
    }
    return catalogByVideoId[normalizedId];
  }

  function fetchFor(options) {
    if (options &&
        typeof options === 'object' &&
        Object.prototype.hasOwnProperty.call(options, 'fetch')) {
      return typeof options.fetch === 'function' ? options.fetch : null;
    }
    return root && typeof root.fetch === 'function' ? root.fetch : null;
  }

  function trackMatchesEntry(track, entry) {
    return track.videoId === entry.videoId &&
      track.language === entry.language &&
      track.source === entry.source &&
      track.reviewStatus === entry.reviewStatus &&
      track.updatedAt === entry.updatedAt;
  }

  function loadTrack(videoId, options) {
    var entry = entryFor(videoId);
    if (!entry || entry.contentStatus !== 'track') return Promise.resolve(null);

    var normalizedId = entry.videoId;
    if (Object.prototype.hasOwnProperty.call(trackPromiseCache, normalizedId)) {
      return trackPromiseCache[normalizedId];
    }

    var fetchImpl = fetchFor(options);
    var fetchResult;
    if (!fetchImpl) {
      fetchResult = Promise.reject(
        new Error('No fetch implementation available for subtitle track: ' + normalizedId)
      );
    } else {
      try {
        fetchResult = fetchImpl.call(root, entry.asset);
      } catch (error) {
        fetchResult = Promise.reject(error);
      }
    }

    var request = Promise.resolve(fetchResult)
      .then(function (response) {
        if (!response || response.ok !== true) {
          var status = response && typeof response.status !== 'undefined'
            ? String(response.status)
            : 'unknown';
          var statusText = response ? normalizeRequiredText(response.statusText) : '';
          throw new Error(
            'Failed to load subtitle track ' + normalizedId + ': HTTP ' +
            status + (statusText ? ' ' + statusText : '')
          );
        }
        if (typeof response.json !== 'function') {
          throw new Error('Invalid subtitle response for videoId: ' + normalizedId);
        }
        return response.json();
      })
      .then(function (rawTrack) {
        var track = normalizeTrack(rawTrack);
        if (!track) throw new Error('Invalid subtitle track for videoId: ' + normalizedId);
        if (!trackMatchesEntry(track, entry)) {
          throw new Error('Subtitle track metadata does not match catalog entry: ' + normalizedId);
        }
        return track;
      });

    var cachedPromise = request.catch(function (error) {
      if (trackPromiseCache[normalizedId] === cachedPromise) {
        delete trackPromiseCache[normalizedId];
      }
      throw error;
    });
    trackPromiseCache[normalizedId] = cachedPromise;
    return cachedPromise;
  }

  function clearTrackCache() {
    trackPromiseCache = Object.create(null);
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
      if (immutableInput && normalizedCueCache) normalizedCueCache.set(track, cues);
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
    var entry = entryFor(videoId);
    if (!entry || entry.contentStatus === 'missing') return statuses.missing;
    if (entry.contentStatus === 'no-speech') return statuses.noSpeech;
    return statuses[entry.reviewStatus];
  }

  function coverageFor(records) {
    var counts = {
      total: 0,
      tracks: 0,
      reviewed: 0,
      draft: 0,
      noSpeech: 0,
      missing: 0
    };
    if (!Array.isArray(records)) return Object.freeze(counts);

    var seen = Object.create(null);
    records.forEach(function (record) {
      if (!record || typeof record !== 'object' || Array.isArray(record)) return;

      var videoId = normalizeVideoId(record.videoId);
      if (!videoId || Object.prototype.hasOwnProperty.call(seen, videoId)) return;

      seen[videoId] = true;
      counts.total += 1;

      var entry = entryFor(videoId);
      if (entry && entry.contentStatus === 'track') {
        counts.tracks += 1;
        counts[entry.reviewStatus] += 1;
      } else if (entry && entry.contentStatus === 'no-speech') {
        counts.noSpeech += 1;
      } else {
        counts.missing += 1;
      }
    });

    return Object.freeze(counts);
  }

  return Object.freeze({
    entryFor: entryFor,
    loadTrack: loadTrack,
    clearTrackCache: clearTrackCache,
    cueAt: cueAt,
    formatTime: formatTime,
    statusFor: statusFor,
    coverageFor: coverageFor
  });
}));
