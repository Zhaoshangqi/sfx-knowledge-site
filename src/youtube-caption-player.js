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

  function render(record, track, thumbnailUrl) {
    var source = record && typeof record === 'object' ? record : {};
    var videoId = validVideoId(source.videoId) ? source.videoId : '';
    var title = typeof source.title === 'string' && source.title.trim()
      ? source.title.trim()
      : 'YouTube 视频';
    var imageUrl = safeImageUrl(thumbnailUrl);
    var hasTrack = Boolean(track && Array.isArray(track.cues) && track.cues.length);
    var reviewStatus = hasTrack && track.reviewStatus === 'reviewed' ? 'reviewed' : 'draft';
    var statusText = !hasTrack
      ? '中文字幕整理中'
      : reviewStatus === 'reviewed'
        ? '本站中文字幕 · 已校对'
        : '本站中文字幕 · 字幕草稿';
    var statusHint = !hasTrack
      ? '视频仍可正常播放'
      : reviewStatus === 'reviewed'
        ? '术语与时间轴已校对'
        : '已同步时间轴，术语仍在校对';
    var transcript = hasTrack ? track.cues.map(function (cue, index) {
      return '<li class="video-transcript-item">' +
        '<button type="button" class="video-transcript-cue" data-cue-index="' + index +
        '" data-cue-start="' + escapeHtml(cue.start) + '">' +
        '<span class="video-transcript-time">' + escapeHtml(formatTime(cue.start)) + '</span>' +
        '<span class="video-transcript-text">' + escapeHtml(cue.text) + '</span>' +
        '</button></li>';
    }).join('') : '';
    var transcriptPanel = hasTrack
      ? '<details class="video-transcript-disclosure">' +
          '<summary>字幕全文</summary>' +
          '<ol class="video-transcript" aria-label="中文字幕全文">' + transcript + '</ol>' +
        '</details>'
      : '<p class="video-transcript-empty">这条视频尚未整理本站字幕。</p>';
    var image = imageUrl
      ? '<img src="' + escapeHtml(imageUrl) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="video-player-cover-fallback" aria-hidden="true">YouTube</span>';
    var playerId = 'youtube-caption-player-' + escapeHtml(videoId || 'invalid') + '-' + (++playerSequence);

    return '<section class="video-player" data-youtube-caption-player data-video-id="' +
      escapeHtml(videoId) + '" data-subtitle-status="' + (hasTrack ? reviewStatus : 'missing') + '">' +
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
        '<span class="video-caption-status"><strong>' + statusText + '</strong><small>' + statusHint + '</small></span>' +
        '<span class="video-caption-controls">' +
          '<button type="button" class="video-icon-button" data-subtitle-toggle aria-label="显示或隐藏本站中文字幕" title="字幕"' +
            (hasTrack ? '' : ' disabled') + '><span aria-hidden="true">CC</span></button>' +
          '<button type="button" class="video-icon-button" data-fullscreen-toggle aria-label="切换网页全屏" title="全屏"><span aria-hidden="true">□</span></button>' +
        '</span>' +
      '</div>' +
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
    var track = settings.track && Array.isArray(settings.track.cues) ? settings.track : null;
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
    var cueButtons = Array.from(rootElement.querySelectorAll('[data-cue-index]'));
    var listeners = [];
    var player = null;
    var activationPromise = null;
    var readyPromise = null;
    var resolveReady = null;
    var intervalId = null;
    var destroyed = false;
    var subtitlesVisible = Boolean(track);
    var activeCueIndex = -1;
    var moveFocusIntoPlayer = false;

    if (!validVideoId(videoId) || !coverButton || !playerTarget) {
      throw new Error('player root is missing required YouTube data');
    }

    function listen(element, type, handler) {
      if (!element || typeof element.addEventListener !== 'function') return;
      element.addEventListener(type, handler);
      listeners.push([element, type, handler]);
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

    function setCaption(text) {
      var value = subtitlesVisible ? text : '';
      if (captionLine) captionLine.textContent = value;
      if (captionOverlay) captionOverlay.textContent = value;
    }

    function setActiveCue(index) {
      if (activeCueIndex === index) return;
      if (activeCueIndex >= 0 && cueButtons[activeCueIndex]) {
        cueButtons[activeCueIndex].removeAttribute('aria-current');
      }
      activeCueIndex = index;
      if (index >= 0 && cueButtons[index]) {
        cueButtons[index].setAttribute('aria-current', 'true');
        if (typeof cueButtons[index].scrollIntoView === 'function') {
          cueButtons[index].scrollIntoView({ block: 'nearest' });
        }
      }
    }

    function synchronize() {
      if (destroyed || !player || typeof player.getCurrentTime !== 'function' ||
          !track || !subtitleApi || typeof subtitleApi.cueAt !== 'function') {
        setCaption('');
        setActiveCue(-1);
        return;
      }

      var cue = subtitleApi.cueAt(track, player.getCurrentTime());
      var index = cue ? track.cues.indexOf(cue) : -1;
      setCaption(cue ? cue.text : '');
      setActiveCue(index);
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

    cueButtons.forEach(function (button) {
      listen(button, 'click', function () {
        var start = Number(button.dataset.cueStart);
        if (!Number.isFinite(start) || start < 0) return;
        activate().then(function (activePlayer) {
          if (destroyed || !activePlayer) return;
          if (typeof activePlayer.seekTo === 'function') activePlayer.seekTo(start, true);
          if (typeof activePlayer.playVideo === 'function') activePlayer.playVideo();
          synchronize();
        }).catch(function () {});
      });
    });

    if (subtitleToggle) {
      subtitleToggle.disabled = !track;
      subtitleToggle.setAttribute('aria-pressed', String(subtitlesVisible));
    }
    if (fullscreenToggle) {
      var fullscreenSupported = Boolean(documentObject &&
        documentObject.fullscreenEnabled !== false &&
        typeof documentObject.exitFullscreen === 'function' &&
        typeof rootElement.requestFullscreen === 'function');
      fullscreenToggle.disabled = !fullscreenSupported;
      fullscreenToggle.setAttribute('aria-disabled', String(!fullscreenSupported));
    }
    updateFullscreenState();

    return Object.freeze({
      destroy: function () {
        if (destroyed) return;
        destroyed = true;
        stopPolling();
        listeners.forEach(function (entry) {
          entry[0].removeEventListener(entry[1], entry[2]);
        });
        listeners.length = 0;
        if (player && typeof player.destroy === 'function') player.destroy();
        player = null;
        resolveReady = null;
        readyPromise = null;
        activationPromise = null;
      }
    });
  }

  return Object.freeze({
    render: render,
    mount: mount,
    loadApi: loadApi
  });
}));
