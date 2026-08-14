(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SfxYouTubeCaptionPlayer = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var apiPromises = typeof WeakMap === 'function' ? new WeakMap() : null;
  var fallbackApiPromise = null;
  var playerSequence = 0;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function safeImageUrl(value) {
    if (typeof value !== 'string') return '';
    try {
      var url = new URL(value, 'https://example.invalid/');
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
    } catch (error) {
      return '';
    }
  }

  function validVideoId(value) {
    return typeof value === 'string' && /^[A-Za-z0-9_-]{11}$/.test(value);
  }

  function formatTime(seconds) {
    var safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
    var minutes = Math.floor(safe / 60);
    var remainder = safe % 60;
    return minutes + ':' + String(remainder).padStart(2, '0');
  }

  function validLoadedTrack(track, entry, videoId) {
    if (!track || typeof track !== 'object' || Array.isArray(track) ||
        !entry || entry.contentStatus !== 'track' ||
        track.videoId !== videoId || track.videoId !== entry.videoId ||
        track.language !== entry.language || track.source !== entry.source ||
        track.reviewStatus !== entry.reviewStatus || track.updatedAt !== entry.updatedAt ||
        (track.reviewStatus !== 'draft' && track.reviewStatus !== 'reviewed') ||
        !Array.isArray(track.cues) || track.cues.length === 0) {
      return false;
    }

    var previousEnd = -1;
    for (var index = 0; index < track.cues.length; index += 1) {
      var cue = track.cues[index];
      if (!cue || typeof cue !== 'object' || Array.isArray(cue) ||
          !Number.isFinite(cue.start) || cue.start < 0 ||
          !Number.isFinite(cue.end) || cue.end <= cue.start ||
          typeof cue.text !== 'string' || !cue.text.trim() ||
          cue.start < previousEnd) {
        return false;
      }
      previousEnd = cue.end;
    }
    return true;
  }

  function render(record, entry, thumbnailUrl) {
    var source = record && typeof record === 'object' ? record : {};
    var videoId = validVideoId(source.videoId) ? source.videoId : '';
    var title = typeof source.title === 'string' && source.title.trim()
      ? source.title.trim()
      : 'YouTube 视频';
    var imageUrl = safeImageUrl(thumbnailUrl);
    var contentStatus = entry && typeof entry === 'object' && !Array.isArray(entry)
      ? entry.contentStatus
      : 'missing';
    var subtitleStatus = contentStatus === 'track'
      ? 'loading'
      : contentStatus === 'no-speech'
        ? 'no-speech'
        : 'missing';
    var statusText = subtitleStatus === 'loading'
      ? '本站中文字幕加载中'
      : subtitleStatus === 'no-speech'
        ? '本视频无口述内容'
        : '暂无本站中文字幕';
    var statusHint = subtitleStatus === 'loading'
      ? '正在加载字幕，视频可先播放'
      : '视频仍可正常播放';
    var evidenceReason = subtitleStatus === 'missing' && entry && typeof entry.reason === 'string'
      ? entry.reason.trim()
      : '';
    var evidenceUpdatedAt = subtitleStatus === 'missing' && entry && typeof entry.updatedAt === 'string'
      ? entry.updatedAt.trim()
      : '';
    var evidenceLabel = evidenceUpdatedAt ? '证据更新：' + evidenceUpdatedAt : '缺失原因';
    var evidencePanel = evidenceReason
      ? '<p class="video-caption-evidence" data-subtitle-evidence><strong>' +
          escapeHtml(evidenceLabel) + '</strong><span>' + escapeHtml(evidenceReason) + '</span></p>'
      : '';
    var transcriptPanel = subtitleStatus === 'loading'
      ? '<div class="video-transcript-container" data-transcript-container>' +
          '<p class="video-transcript-loading" data-transcript-loading>本站中文字幕加载中…</p>' +
        '</div>'
      : '';
    var image = imageUrl
      ? '<img src="' + escapeHtml(imageUrl) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="video-player-cover-fallback" aria-hidden="true">YouTube</span>';
    var playerId = 'youtube-caption-player-' + escapeHtml(videoId || 'invalid') + '-' + (++playerSequence);

    return '<section class="video-player" data-youtube-caption-player data-video-id="' +
      escapeHtml(videoId) + '" data-subtitle-status="' + subtitleStatus + '">' +
      '<div class="video-player-stage">' +
        '<button type="button" class="video-player-cover" data-player-cover aria-label="播放 ' +
          escapeHtml(title) + '">' + image +
          '<span class="video-player-play" aria-hidden="true">▶</span>' +
        '</button>' +
        '<div class="video-player-target" id="' + playerId + '" data-player-target></div>' +
        '<p class="video-caption-overlay" data-caption-overlay aria-hidden="true"></p>' +
        '<p class="video-player-error" data-player-error role="status" hidden></p>' +
      '</div>' +
      '<div class="video-caption-header">' +
        '<span class="video-caption-status" data-subtitle-live-status role="status" aria-live="polite" aria-atomic="true"><strong data-subtitle-status-text>' + statusText +
          '</strong><small data-subtitle-status-hint>' + statusHint + '</small></span>' +
        '<span class="video-caption-controls">' +
          '<button type="button" class="video-icon-button" data-subtitle-toggle aria-label="显示或隐藏本站中文字幕" title="字幕"' +
            ' disabled aria-pressed="false"><span aria-hidden="true">CC</span></button>' +
          '<button type="button" class="video-icon-button" data-fullscreen-toggle aria-label="切换网页全屏" title="全屏"><span aria-hidden="true">□</span></button>' +
        '</span>' +
      '</div>' +
      evidencePanel +
      '<p class="video-caption-line" data-caption-line aria-live="polite" aria-atomic="true"></p>' +
      transcriptPanel +
    '</section>';
  }

  function getStoredApiPromise(windowObject) {
    return apiPromises && windowObject && (typeof windowObject === 'object' || typeof windowObject === 'function')
      ? apiPromises.get(windowObject)
      : fallbackApiPromise;
  }

  function storeApiPromise(windowObject, promise) {
    if (apiPromises && windowObject && (typeof windowObject === 'object' || typeof windowObject === 'function')) {
      apiPromises.set(windowObject, promise);
    } else {
      fallbackApiPromise = promise;
    }
  }

  function clearApiPromise(windowObject) {
    if (apiPromises && windowObject && (typeof windowObject === 'object' || typeof windowObject === 'function')) {
      apiPromises.delete(windowObject);
    } else {
      fallbackApiPromise = null;
    }
  }

  function loadApi(options) {
    var settings = options && typeof options === 'object' ? options : {};
    var windowObject = settings.window || (typeof window !== 'undefined' ? window : null);
    var documentObject = settings.document || (typeof document !== 'undefined' ? document : null);

    if (!windowObject || !documentObject) {
      return Promise.reject(new Error('YouTube API requires a browser window and document'));
    }
    if (windowObject.YT && typeof windowObject.YT.Player === 'function') {
      return Promise.resolve(windowObject.YT);
    }

    var stored = getStoredApiPromise(windowObject);
    if (stored) return stored;

    var promise = new Promise(function (resolve, reject) {
      var priorReady = typeof windowObject.onYouTubeIframeAPIReady === 'function'
        ? windowObject.onYouTubeIframeAPIReady
        : null;
      var settled = false;
      var script = null;
      var readyHandler = null;

      function restoreReadyHandler() {
        if (windowObject.onYouTubeIframeAPIReady === readyHandler) {
          windowObject.onYouTubeIframeAPIReady = priorReady || null;
        }
      }

      function fail(error) {
        if (settled) return;
        settled = true;
        restoreReadyHandler();
        if (script && script.parentNode && typeof script.parentNode.removeChild === 'function') {
          script.parentNode.removeChild(script);
        }
        clearApiPromise(windowObject);
        reject(error instanceof Error ? error : new Error('YouTube API failed to load'));
      }

      readyHandler = function () {
        if (priorReady) {
          try { priorReady(); } catch (error) {}
        }
        if (windowObject.YT && typeof windowObject.YT.Player === 'function') {
          settled = true;
          restoreReadyHandler();
          resolve(windowObject.YT);
        } else {
          fail(new Error('YouTube API loaded without Player support'));
        }
      };
      windowObject.onYouTubeIframeAPIReady = readyHandler;

      script = documentObject.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!script) {
        script = documentObject.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        documentObject.head.appendChild(script);
      }
      script.addEventListener('error', function () {
        fail(new Error('YouTube API failed to load'));
      }, { once: true });
    });

    storeApiPromise(windowObject, promise);
    return promise;
  }

  function mount(rootElement, options) {
    if (!rootElement || typeof rootElement.querySelector !== 'function') {
      throw new TypeError('player root must be a DOM element');
    }

    var settings = options && typeof options === 'object' ? options : {};
    var documentObject = settings.document || rootElement.ownerDocument ||
      (typeof document !== 'undefined' ? document : null);
    var windowObject = settings.window || (documentObject && documentObject.defaultView) ||
      (typeof window !== 'undefined' ? window : null);
    var subtitleApi = settings.subtitles ||
      (typeof globalThis !== 'undefined' ? globalThis.SfxVideoSubtitles : null);
    var entry = settings.entry && typeof settings.entry === 'object' && !Array.isArray(settings.entry)
      ? settings.entry
      : null;
    var loadTrackFunction = typeof settings.loadTrack === 'function'
      ? settings.loadTrack
      : subtitleApi && typeof subtitleApi.loadTrack === 'function'
        ? function (requestedVideoId) { return subtitleApi.loadTrack(requestedVideoId); }
        : null;
    var track = null;
    var setIntervalFunction = settings.setInterval ||
      (typeof setInterval === 'function' ? setInterval : null);
    var clearIntervalFunction = settings.clearInterval ||
      (typeof clearInterval === 'function' ? clearInterval : null);
    var loadApiFunction = settings.loadApi || function () {
      return loadApi({ window: windowObject, document: documentObject });
    };
    var videoId = rootElement.dataset ? rootElement.dataset.videoId : '';
    var coverButton = rootElement.querySelector('[data-player-cover]');
    var playerTarget = rootElement.querySelector('[data-player-target]');
    var captionLine = rootElement.querySelector('[data-caption-line]');
    var captionOverlay = rootElement.querySelector('[data-caption-overlay]');
    var subtitleToggle = rootElement.querySelector('[data-subtitle-toggle]');
    var fullscreenToggle = rootElement.querySelector('[data-fullscreen-toggle]');
    var errorLine = rootElement.querySelector('[data-player-error]');
    var subtitleStatusText = rootElement.querySelector('[data-subtitle-status-text]');
    var subtitleStatusHint = rootElement.querySelector('[data-subtitle-status-hint]');
    var internalTranscriptContainer = rootElement.querySelector('[data-transcript-container]');
    var transcriptContainer = settings.transcriptRoot || internalTranscriptContainer;
    var paragraphButtons = [];
    var cueToParagraph = [];
    var transcriptMount = null;
    var listeners = [];
    var paragraphListeners = [];
    var player = null;
    var playerReady = false;
    var activationPromise = null;
    var readyPromise = null;
    var resolveReady = null;
    var trackLoadPromise = null;
    var intervalId = null;
    var destroyed = false;
    var subtitlesVisible = false;
    var activeParagraphIndex = -1;
    var moveFocusIntoPlayer = false;
    var onTrackLoaded = typeof settings.onTrackLoaded === 'function'
      ? settings.onTrackLoaded
      : null;

    if (!validVideoId(videoId) || !coverButton || !playerTarget) {
      throw new Error('player root is missing required YouTube data');
    }

    function listen(element, type, handler, bucket) {
      if (!element || typeof element.addEventListener !== 'function') return;
      element.addEventListener(type, handler);
      (bucket || listeners).push([element, type, handler]);
    }

    function removeListeners(bucket) {
      bucket.forEach(function (entry) {
        entry[0].removeEventListener(entry[1], entry[2]);
      });
      bucket.length = 0;
    }

    function showError(message) {
      if (!errorLine) return;
      errorLine.textContent = message;
      errorLine.hidden = false;
    }

    function clearError() {
      if (!errorLine) return;
      errorLine.textContent = '';
      errorLine.hidden = true;
    }

    function setNodeText(element, value) {
      if (element && element.textContent !== value) element.textContent = value;
    }

    function setSubtitleStatus(status, text, hint) {
      if (rootElement.dataset) rootElement.dataset.subtitleStatus = status;
      else if (typeof rootElement.setAttribute === 'function') {
        rootElement.setAttribute('data-subtitle-status', status);
      }
      setNodeText(subtitleStatusText, text);
      setNodeText(subtitleStatusHint, hint);
    }

    function updateSubtitleToggle(enabled, visible) {
      if (!subtitleToggle) return;
      subtitleToggle.disabled = !enabled;
      subtitleToggle.setAttribute('aria-pressed', String(Boolean(enabled && visible)));
    }

    function cueTime(seconds) {
      if (subtitleApi && typeof subtitleApi.formatTime === 'function') {
        try { return subtitleApi.formatTime(seconds); } catch (error) {}
      }
      return formatTime(seconds);
    }

    function handleParagraphClick(button) {
      var start = Number(button.dataset ? button.dataset.paragraphStart : null);
      var paragraphIndex = Number(button.dataset ? button.dataset.paragraphIndex : null);
      if (!Number.isFinite(start) || start < 0) return;
      activate().then(function (activePlayer) {
        if (destroyed || !activePlayer) return;
        if (typeof activePlayer.seekTo === 'function') activePlayer.seekTo(start, true);
        if (typeof activePlayer.playVideo === 'function') activePlayer.playVideo();
        synchronize();
        if (Number.isInteger(paragraphIndex) && paragraphIndex >= 0) {
          setActiveParagraph(paragraphIndex, true);
        }
      }).catch(function () {});
    }

    function clearTranscript() {
      setActiveParagraph(-1, false);
      removeListeners(paragraphListeners);
      paragraphButtons = [];
      cueToParagraph = [];
      if (transcriptMount && transcriptMount.parentNode &&
          typeof transcriptMount.parentNode.removeChild === 'function') {
        transcriptMount.parentNode.removeChild(transcriptMount);
      }
      transcriptMount = null;
      if (internalTranscriptContainer) internalTranscriptContainer.textContent = '';
    }

    function createTranscript(loadedTrack) {
      if (!documentObject || typeof documentObject.createElement !== 'function' || !transcriptContainer) {
        throw new Error('player root is missing the subtitle transcript container');
      }
      if (!subtitleApi || typeof subtitleApi.paragraphsFor !== 'function') {
        throw new Error('subtitle paragraph projection is unavailable');
      }

      var paragraphs = subtitleApi.paragraphsFor(loadedTrack);
      if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
        throw new Error('subtitle paragraph projection is empty');
      }
      clearTranscript();

      var disclosure = documentObject.createElement('details');
      disclosure.className = 'video-transcript-disclosure';
      var summary = documentObject.createElement('summary');
      summary.textContent = '字幕全文';
      disclosure.appendChild(summary);

      var transcript = documentObject.createElement('ol');
      transcript.className = 'video-transcript';
      transcript.setAttribute('aria-label', '中文字幕全文');
      var nextButtons = [];
      var nextCueToParagraph = [];

      paragraphs.forEach(function (paragraph, index) {
        var item = documentObject.createElement('li');
        item.className = 'video-transcript-item';
        var button = documentObject.createElement('button');
        button.setAttribute('type', 'button');
        button.className = 'video-transcript-cue video-transcript-paragraph';
        if (button.dataset) {
          button.dataset.paragraphIndex = String(index);
          button.dataset.paragraphStart = String(paragraph.start);
        } else {
          button.setAttribute('data-paragraph-index', String(index));
          button.setAttribute('data-paragraph-start', String(paragraph.start));
        }

        var time = documentObject.createElement('span');
        time.className = 'video-transcript-time';
        time.textContent = cueTime(paragraph.start);
        var text = documentObject.createElement('span');
        text.className = 'video-transcript-text';
        text.textContent = paragraph.text;
        button.appendChild(time);
        button.appendChild(text);
        item.appendChild(button);
        transcript.appendChild(item);
        nextButtons.push(button);
        paragraph.cueIndexes.forEach(function (cueIndex) {
          nextCueToParagraph[cueIndex] = index;
        });
      });

      disclosure.appendChild(transcript);
      transcriptContainer.appendChild(disclosure);
      transcriptMount = disclosure;
      paragraphButtons = nextButtons;
      cueToParagraph = nextCueToParagraph;
      paragraphButtons.forEach(function (button) {
        listen(button, 'click', function () { handleParagraphClick(button); }, paragraphListeners);
      });
    }

    function showSubtitleLoadError() {
      track = null;
      subtitlesVisible = false;
      clearTranscript();
      updateSubtitleToggle(false, false);
      rootElement.classList.toggle('subtitles-hidden', false);
      setCaption('');
      setSubtitleStatus('error', '中文字幕加载失败，视频仍可正常播放。', '');
    }

    function hydrateTrack(loadedTrack) {
      createTranscript(loadedTrack);
      track = loadedTrack;
      subtitlesVisible = true;
      activeParagraphIndex = -1;
      updateSubtitleToggle(true, true);
      rootElement.classList.toggle('subtitles-hidden', false);
      if (track.reviewStatus === 'reviewed') {
        setSubtitleStatus('reviewed', '本站中文字幕 · 已校对', '术语与时间轴已校对');
      } else {
        setSubtitleStatus('draft', '本站中文字幕 · 字幕草稿', '已同步时间轴，术语仍在校对');
      }
      if (playerReady) synchronize();
      if (onTrackLoaded) {
        try { onTrackLoaded(loadedTrack); } catch (error) {}
      }
    }

    function beginTrackLoad() {
      if (!entry || entry.contentStatus !== 'track') return;

      var request;
      try {
        if (!loadTrackFunction) throw new Error('subtitle track loader is unavailable');
        request = loadTrackFunction(videoId);
      } catch (error) {
        request = Promise.reject(error);
      }

      trackLoadPromise = Promise.resolve(request)
        .then(function (loadedTrack) {
          if (destroyed) return;
          if (!validLoadedTrack(loadedTrack, entry, videoId)) {
            throw new Error('subtitle track failed validation');
          }
          hydrateTrack(loadedTrack);
        })
        .catch(function () {
          if (!destroyed) showSubtitleLoadError();
        });
    }

    function setCaption(text) {
      var value = subtitlesVisible ? text : '';
      if (captionLine && captionLine.textContent !== value) captionLine.textContent = value;
      if (captionOverlay && captionOverlay.textContent !== value) captionOverlay.textContent = value;
    }

    function setActiveParagraph(index, shouldScroll) {
      if (activeParagraphIndex === index) {
        if (shouldScroll && index >= 0 && paragraphButtons[index] &&
            typeof paragraphButtons[index].scrollIntoView === 'function') {
          paragraphButtons[index].scrollIntoView({ block: 'nearest' });
        }
        return;
      }
      if (activeParagraphIndex >= 0 && paragraphButtons[activeParagraphIndex]) {
        paragraphButtons[activeParagraphIndex].removeAttribute('aria-current');
      }
      activeParagraphIndex = index;
      if (index >= 0 && paragraphButtons[index]) {
        paragraphButtons[index].setAttribute('aria-current', 'true');
        if (shouldScroll && typeof paragraphButtons[index].scrollIntoView === 'function') {
          paragraphButtons[index].scrollIntoView({ block: 'nearest' });
        }
      }
    }

    function synchronize() {
      if (destroyed || !player || typeof player.getCurrentTime !== 'function' ||
          !track || !subtitleApi || typeof subtitleApi.cueAt !== 'function') {
        setCaption('');
        setActiveParagraph(-1, false);
        return;
      }

      var cue = subtitleApi.cueAt(track, player.getCurrentTime());
      var index = cue ? track.cues.findIndex(function (candidate) {
        return candidate === cue ||
          (candidate.start === cue.start && candidate.end === cue.end && candidate.text === cue.text);
      }) : -1;
      setCaption(cue ? cue.text : '');
      setActiveParagraph(index >= 0 ? cueToParagraph[index] : -1, false);
    }

    function stopPolling() {
      if (intervalId == null) return;
      if (clearIntervalFunction) clearIntervalFunction(intervalId);
      intervalId = null;
    }

    function startPolling() {
      if (intervalId != null || !setIntervalFunction) return;
      synchronize();
      intervalId = setIntervalFunction(synchronize, 200);
    }

    function suppressNativeCaptions() {
      if (!player || typeof player.setOption !== 'function') return;
      try {
        player.setOption('captions', 'track', {});
      } catch (error) {}
    }

    function focusPlayerFrame() {
      if (!moveFocusIntoPlayer || !player) return;
      moveFocusIntoPlayer = false;
      var iframe = typeof player.getIframe === 'function' ? player.getIframe() : null;
      if (iframe && typeof iframe.focus === 'function') iframe.focus();
      else if (fullscreenToggle && typeof fullscreenToggle.focus === 'function') fullscreenToggle.focus();
    }

    function activate() {
      if (destroyed) return Promise.reject(new Error('player has been destroyed'));
      if (activationPromise) return activationPromise;

      moveFocusIntoPlayer = Boolean(documentObject && documentObject.activeElement === coverButton);
      coverButton.setAttribute('aria-busy', 'true');
      var apiRequest;
      try {
        apiRequest = loadApiFunction({ window: windowObject, document: documentObject });
      } catch (error) {
        apiRequest = Promise.reject(error);
      }
      activationPromise = Promise.resolve(apiRequest).then(function (YT) {
        if (destroyed) throw new Error('player has been destroyed');
        if (!YT || typeof YT.Player !== 'function') throw new Error('YouTube Player API is unavailable');

        readyPromise = new Promise(function (resolve) {
          resolveReady = resolve;
        });
        var playerVars = {
          autoplay: 1,
          cc_load_policy: 0,
          fs: 0,
          playsinline: 1,
          rel: 0
        };
        var pageOrigin = windowObject && windowObject.location
          ? String(windowObject.location.origin || '')
          : '';
        if (/^https?:\/\//.test(pageOrigin)) playerVars.origin = pageOrigin;

        player = new YT.Player(playerTarget, {
          videoId: videoId,
          playerVars: playerVars,
          events: {
            onReady: function (event) {
              if (destroyed) return;
              if (event && event.target) player = event.target;
              playerReady = true;
              suppressNativeCaptions();
              clearError();
              coverButton.removeAttribute('aria-busy');
              coverButton.hidden = true;
              focusPlayerFrame();
              synchronize();
              if (resolveReady) resolveReady(player);
            },
            onApiChange: suppressNativeCaptions,
            onStateChange: function (event) {
              var playingState = YT.PlayerState ? YT.PlayerState.PLAYING : 1;
              if (event && event.data === playingState) startPolling();
              else {
                stopPolling();
                synchronize();
              }
            },
            onError: function () {
              stopPolling();
              showError('YouTube 视频暂时无法播放，请稍后重试。');
            }
          }
        });
        return readyPromise;
      }).catch(function (error) {
        if (!destroyed) {
          coverButton.removeAttribute('aria-busy');
          moveFocusIntoPlayer = false;
          showError('YouTube 视频加载失败，请检查网络后重试。');
          activationPromise = null;
        }
        throw error;
      });

      return activationPromise;
    }

    function handleCoverClick() {
      activate().catch(function () {});
    }

    function handleSubtitleToggle() {
      if (!track) return;
      subtitlesVisible = !subtitlesVisible;
      subtitleToggle.setAttribute('aria-pressed', String(subtitlesVisible));
      rootElement.classList.toggle('subtitles-hidden', !subtitlesVisible);
      synchronize();
    }

    function updateFullscreenState() {
      if (!fullscreenToggle || !documentObject) return;
      fullscreenToggle.setAttribute('aria-pressed', String(documentObject.fullscreenElement === rootElement));
    }

    function handleFullscreenToggle() {
      if (!documentObject || !fullscreenToggle || fullscreenToggle.disabled) return;
      var fullscreenRequest = null;
      if (documentObject.fullscreenElement === rootElement) {
        if (typeof documentObject.exitFullscreen === 'function') fullscreenRequest = documentObject.exitFullscreen();
      } else if (typeof rootElement.requestFullscreen === 'function') {
        fullscreenRequest = rootElement.requestFullscreen();
      }
      if (fullscreenRequest && typeof fullscreenRequest.catch === 'function') {
        fullscreenRequest.catch(function () {
          showError('浏览器未能切换网页全屏。');
        });
      }
    }

    listen(coverButton, 'click', handleCoverClick);
    listen(subtitleToggle, 'click', handleSubtitleToggle);
    listen(fullscreenToggle, 'click', handleFullscreenToggle);
    listen(documentObject, 'fullscreenchange', updateFullscreenState);

    updateSubtitleToggle(false, false);
    if (fullscreenToggle) {
      var fullscreenSupported = Boolean(documentObject &&
        documentObject.fullscreenEnabled !== false &&
        typeof documentObject.exitFullscreen === 'function' &&
        typeof rootElement.requestFullscreen === 'function');
      fullscreenToggle.disabled = !fullscreenSupported;
      fullscreenToggle.setAttribute('aria-disabled', String(!fullscreenSupported));
    }
    updateFullscreenState();
    beginTrackLoad();

    return Object.freeze({
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        stopPolling();
        clearTranscript();
        removeListeners(listeners);
        if (player && typeof player.destroy === 'function') player.destroy();
        player = null;
        playerReady = false;
        track = null;
        paragraphButtons = [];
        cueToParagraph = [];
        onTrackLoaded = null;
        resolveReady = null;
        readyPromise = null;
        activationPromise = null;
        trackLoadPromise = null;
      }
    });
  }

  return Object.freeze({
    render: render,
    mount: mount,
    loadApi: loadApi
  });
}));
