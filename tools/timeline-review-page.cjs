'use strict';

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderReviewPage(options = {}) {
  const nonce = escapeHtml(options.nonce || '');
  const title = escapeHtml(options.title || 'Timeline Review Workbench');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style nonce="${nonce}">
    :root {
      color-scheme: light;
      font-family: Inter, "Segoe UI", Arial, sans-serif;
      background: #eef1f3;
      color: #172026;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-width: 320px; background: #eef1f3; }
    button, input { font: inherit; }
    button {
      min-height: 40px;
      border: 1px solid #64727b;
      border-radius: 4px;
      padding: 8px 12px;
      background: #ffffff;
      color: #172026;
      cursor: pointer;
    }
    button:hover { background: #edf8f8; border-color: #167a80; }
    button:focus-visible, input:focus-visible { outline: 3px solid #f2ae2e; outline-offset: 2px; }
    button:disabled { cursor: not-allowed; opacity: 0.48; }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      min-height: 64px;
      padding: 12px 20px;
      border-bottom: 1px solid #aab3b8;
      background: #ffffff;
    }
    h1 { margin: 0; font-size: 20px; letter-spacing: 0; }
    h2 { margin: 0 0 12px; font-size: 16px; letter-spacing: 0; }
    p { margin: 0; }
    .layout {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(280px, 360px);
      min-height: calc(100vh - 64px);
    }
    .workspace { min-width: 0; border-right: 1px solid #aab3b8; }
    .player-band, .detail-band, .review-sidebar { padding: 20px; }
    .player-band { border-bottom: 1px solid #aab3b8; background: #11181c; color: #f6f8f9; }
    [data-review-player] {
      width: 100%;
      aspect-ratio: 16 / 9;
      min-height: 220px;
      background: #050708;
    }
    .transport, .item-nav, .commands, .candidate-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .transport { margin-top: 12px; }
    .transport button { min-width: 48px; }
    .detail-grid {
      display: grid;
      grid-template-columns: minmax(140px, 0.8fr) minmax(220px, 1.5fr);
      gap: 8px 20px;
      margin: 0;
    }
    .detail-grid dt { color: #526069; font-weight: 600; }
    .detail-grid dd { margin: 0; overflow-wrap: anywhere; }
    .item-nav { justify-content: space-between; margin-top: 20px; }
    .review-sidebar { background: #f7f8f9; }
    .review-sidebar section { padding: 16px 0; border-bottom: 1px solid #c5ccd0; }
    .review-sidebar section:first-child { padding-top: 0; }
    .review-sidebar section:last-child { border-bottom: 0; }
    .candidate-list { align-items: stretch; }
    .candidate-list button { flex: 1 1 120px; text-align: left; }
    .candidate-time { display: block; font-weight: 700; color: #11676c; }
    .candidate-text { display: block; margin-top: 3px; color: #526069; font-size: 13px; }
    .screenshot-row { display: grid; gap: 10px; }
    .check-label { display: flex; align-items: center; gap: 8px; }
    .check-label input { width: 20px; height: 20px; }
    .commands { margin-top: 14px; }
    [data-confirm-current] { background: #176a45; border-color: #176a45; color: #ffffff; }
    [data-save-review] { background: #165f8a; border-color: #165f8a; color: #ffffff; }
    [data-review-status] {
      max-width: 720px;
      color: #37444b;
      font-size: 14px;
      overflow-wrap: anywhere;
    }
    .empty { color: #68757c; font-style: italic; }
    @media (max-width: 840px) {
      .layout { grid-template-columns: 1fr; }
      .workspace { border-right: 0; }
      .review-sidebar { border-top: 1px solid #aab3b8; }
      .detail-grid { grid-template-columns: 1fr; }
      .detail-grid dd { margin-bottom: 8px; }
    }
    @media (max-width: 520px) {
      header { align-items: flex-start; flex-direction: column; }
      .player-band, .detail-band, .review-sidebar { padding: 14px; }
      [data-review-player] { min-height: 170px; }
      .item-nav button { flex: 1 1 120px; }
      .commands button { flex: 1 1 100%; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${title}</h1>
    <p data-review-status role="status" aria-live="polite">Loading review data...</p>
  </header>
  <div class="layout">
    <main class="workspace">
      <section class="player-band" aria-labelledby="player-heading">
        <h2 id="player-heading">Video</h2>
        <div data-review-player aria-label="YouTube review player"></div>
        <div class="transport" aria-label="Timeline controls">
          <button type="button" data-seek-delta="-5" aria-label="Seek backward 5 seconds">-5s</button>
          <button type="button" data-seek-delta="5" aria-label="Seek forward 5 seconds">+5s</button>
          <button type="button" data-record-current>Record current time</button>
        </div>
      </section>
      <section class="detail-band" aria-labelledby="detail-heading">
        <h2 id="detail-heading">Current item</h2>
        <dl class="detail-grid">
          <dt>Record</dt><dd data-record-label class="empty">None</dd>
          <dt>Video ID</dt><dd data-video-id class="empty">None</dd>
          <dt>Item</dt><dd data-item-label class="empty">None</dd>
          <dt>Draft time</dt><dd data-draft-time class="empty">Not recorded</dd>
          <dt>Status</dt><dd data-item-status>unreviewed</dd>
        </dl>
        <nav class="item-nav" aria-label="Review item navigation">
          <button type="button" data-prev-item>Previous item</button>
          <span data-item-position aria-live="polite">0 / 0</span>
          <button type="button" data-next-item>Next item</button>
        </nav>
      </section>
    </main>
    <aside class="review-sidebar" aria-label="Review controls">
      <section aria-labelledby="candidate-heading">
        <h2 id="candidate-heading">Candidate times</h2>
        <div class="candidate-list" data-candidate-list>
          <p class="empty">No candidates</p>
        </div>
      </section>
      <section aria-labelledby="screenshot-heading">
        <h2 id="screenshot-heading">Screenshot</h2>
        <div class="screenshot-row">
          <p>Key: <span data-screenshot-key class="empty">None</span></p>
          <label class="check-label">
            <input type="checkbox" data-screenshot-reviewed disabled>
            Screenshot reviewed
          </label>
        </div>
      </section>
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading">Actions</h2>
        <p>Recording creates an unreviewed draft. Confirmation is explicit.</p>
        <div class="commands">
          <button type="button" data-confirm-current>Confirm current item</button>
          <button type="button" data-save-review>Save review</button>
        </div>
      </section>
    </aside>
  </div>
  <script nonce="${nonce}">
    'use strict';
    (() => {
      const pageUrl = new URL(window.location.href);
      const token = pageUrl.searchParams.get('token') || '';
      const elements = {
        player: document.querySelector('[data-review-player]'),
        status: document.querySelector('[data-review-status]'),
        recordLabel: document.querySelector('[data-record-label]'),
        videoId: document.querySelector('[data-video-id]'),
        itemLabel: document.querySelector('[data-item-label]'),
        draftTime: document.querySelector('[data-draft-time]'),
        itemStatus: document.querySelector('[data-item-status]'),
        itemPosition: document.querySelector('[data-item-position]'),
        previous: document.querySelector('[data-prev-item]'),
        next: document.querySelector('[data-next-item]'),
        record: document.querySelector('[data-record-current]'),
        confirm: document.querySelector('[data-confirm-current]'),
        save: document.querySelector('[data-save-review]'),
        candidates: document.querySelector('[data-candidate-list]'),
        screenshotKey: document.querySelector('[data-screenshot-key]'),
        screenshotReviewed: document.querySelector('[data-screenshot-reviewed]')
      };
      let queue = [];
      let review = { records: [] };
      let items = [];
      let itemIndex = 0;
      let player = null;
      let loadedVideoId = '';

      function apiUrl(endpoint) {
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set('token', token);
        return url;
      }

      function setStatus(message) {
        elements.status.textContent = message;
      }

      function rebuildItems() {
        items = [];
        review.records.forEach((record, recordIndex) => {
          record.steps.forEach((value, valueIndex) => {
            items.push({ kind: 'step', recordIndex, valueIndex, value });
          });
          record.cases.forEach((value, valueIndex) => {
            items.push({ kind: 'case', recordIndex, valueIndex, value });
          });
        });
        itemIndex = Math.min(itemIndex, Math.max(0, items.length - 1));
      }

      function currentDescriptor() {
        return items[itemIndex] || null;
      }

      function currentRecord() {
        const descriptor = currentDescriptor();
        return descriptor ? review.records[descriptor.recordIndex] : null;
      }

      function currentItem() {
        const descriptor = currentDescriptor();
        return descriptor ? descriptor.value : null;
      }

      function queueRecord(record) {
        return record ? queue.find((entry) => entry.recordId === record.recordId) : null;
      }

      function currentCandidates() {
        const descriptor = currentDescriptor();
        const record = currentRecord();
        const queued = queueRecord(record);
        if (!descriptor || !queued) {
          return [];
        }
        let step;
        if (descriptor.kind === 'step') {
          step = queued.steps.find((entry) => entry.order === descriptor.value.order);
        } else if (descriptor.value.stepIndex !== null) {
          step = queued.steps.find((entry) => entry.order === descriptor.value.stepIndex)
            || queued.steps[descriptor.value.stepIndex]
            || queued.steps[descriptor.value.stepIndex - 1];
        }
        return step && Array.isArray(step.candidates) ? step.candidates : [];
      }

      function formatTime(value) {
        if (!Number.isFinite(value)) {
          return 'Not recorded';
        }
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60).toString().padStart(2, '0');
        return minutes + ':' + seconds;
      }

      function itemText(descriptor) {
        if (!descriptor) {
          return 'None';
        }
        return descriptor.kind === 'step'
          ? 'Step ' + descriptor.value.order + ': ' + descriptor.value.name
          : 'Case: ' + descriptor.value.useId;
      }

      function updateRecordStatus(record) {
        const values = record.steps.concat(record.cases);
        if (values.length > 0 && values.every((value) => value.status === 'reviewed')) {
          record.status = 'reviewed';
        } else if (values.some((value) => value.status === 'reviewed' || value.startSeconds !== null)) {
          record.status = 'in-progress';
        } else {
          record.status = 'unreviewed';
        }
      }

      function seekTo(seconds) {
        if (!player || typeof player.seekTo !== 'function' || !Number.isFinite(seconds)) {
          setStatus('Player is not ready.');
          return;
        }
        player.seekTo(Math.max(0, seconds), true);
      }

      function renderCandidates() {
        elements.candidates.replaceChildren();
        const candidates = currentCandidates();
        if (candidates.length === 0) {
          const empty = document.createElement('p');
          empty.className = 'empty';
          empty.textContent = 'No candidates';
          elements.candidates.append(empty);
          return;
        }
        candidates.forEach((candidate) => {
          const candidateButton = document.createElement('button');
          candidateButton.type = 'button';
          candidateButton.setAttribute('data-candidate-time', String(candidate.start));
          candidateButton.setAttribute('aria-label', 'Seek to candidate ' + formatTime(candidate.start));
          const time = document.createElement('span');
          time.className = 'candidate-time';
          time.textContent = formatTime(candidate.start);
          const text = document.createElement('span');
          text.className = 'candidate-text';
          text.textContent = candidate.text || 'Candidate cue';
          candidateButton.append(time, text);
          candidateButton.addEventListener('click', () => {
            seekTo(candidate.start);
          });
          elements.candidates.append(candidateButton);
        });
      }

      function loadCurrentVideo() {
        const record = currentRecord();
        if (!record || !window.YT || typeof window.YT.Player !== 'function') {
          return;
        }
        if (!player) {
          loadedVideoId = record.videoId;
          player = new window.YT.Player(elements.player, {
            videoId: record.videoId,
            playerVars: {
              autoplay: 0,
              playsinline: 1,
              origin: window.location.origin
            },
            events: {
              onReady: () => setStatus('Player ready.'),
              onError: () => setStatus('YouTube player error.')
            }
          });
        } else if (record.videoId !== loadedVideoId && typeof player.cueVideoById === 'function') {
          loadedVideoId = record.videoId;
          player.cueVideoById(record.videoId);
        }
      }

      function render() {
        const descriptor = currentDescriptor();
        const record = currentRecord();
        const value = currentItem();
        elements.recordLabel.textContent = record ? record.recordId : 'None';
        elements.videoId.textContent = record ? record.videoId : 'None';
        elements.itemLabel.textContent = itemText(descriptor);
        elements.draftTime.textContent = value ? formatTime(value.startSeconds) : 'Not recorded';
        elements.itemStatus.textContent = value ? value.status : 'unreviewed';
        elements.itemPosition.textContent = items.length === 0 ? '0 / 0' : (itemIndex + 1) + ' / ' + items.length;
        elements.previous.disabled = itemIndex <= 0;
        elements.next.disabled = itemIndex >= items.length - 1;
        elements.record.disabled = !value;
        elements.confirm.disabled = !value;
        elements.save.disabled = review.records.length === 0;
        const isCase = Boolean(descriptor && descriptor.kind === 'case');
        elements.screenshotKey.textContent = isCase && value.screenshotKey !== null
          ? value.screenshotKey
          : 'None';
        elements.screenshotReviewed.disabled = !isCase;
        elements.screenshotReviewed.checked = isCase ? value.screenshotReviewed : false;
        renderCandidates();
        loadCurrentVideo();
      }

      document.querySelectorAll('[data-seek-delta]').forEach((button) => {
        button.addEventListener('click', () => {
          if (!player || typeof player.getCurrentTime !== 'function') {
            setStatus('Player is not ready.');
            return;
          }
          seekTo(player.getCurrentTime() + Number(button.dataset.seekDelta));
        });
      });

      elements.record.addEventListener('click', () => {
        if (!currentItem() || !player || typeof player.getCurrentTime !== 'function') {
          setStatus('Player is not ready.');
          return;
        }
        currentItem().startSeconds = Math.max(0, Math.floor(player.getCurrentTime()));
        currentItem().status = 'unreviewed';
        updateRecordStatus(currentRecord());
        setStatus('Draft time recorded.');
        render();
      });

      elements.confirm.addEventListener('click', () => {
        if (!currentItem() || currentItem().startSeconds === null) {
          setStatus('Record a draft time before confirming.');
          return;
        }
        currentItem().status = 'reviewed';
        updateRecordStatus(currentRecord());
        setStatus('Current item confirmed.');
        render();
      });

      elements.previous.addEventListener('click', () => {
        itemIndex = Math.max(0, itemIndex - 1);
        render();
      });

      elements.next.addEventListener('click', () => {
        itemIndex = Math.min(items.length - 1, itemIndex + 1);
        render();
      });

      elements.screenshotReviewed.addEventListener('change', () => {
        const descriptor = currentDescriptor();
        if (descriptor && descriptor.kind === 'case') {
          descriptor.value.screenshotReviewed = elements.screenshotReviewed.checked;
          updateRecordStatus(currentRecord());
          setStatus('Screenshot status updated in the draft.');
        }
      });

      elements.save.addEventListener('click', async () => {
        elements.save.disabled = true;
        setStatus('Saving review...');
        try {
          const response = await fetch(apiUrl('/api/review'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(review)
          });
          if (!response.ok) {
            throw new Error('Save failed with status ' + response.status);
          }
          review = await response.json();
          rebuildItems();
          setStatus('Review saved.');
          render();
        } catch (error) {
          setStatus(error.message || 'Review save failed.');
          elements.save.disabled = false;
        }
      });

      window.onYouTubeIframeAPIReady = () => {
        loadCurrentVideo();
      };

      Promise.all([
        fetch(apiUrl('/api/queue')),
        fetch(apiUrl('/api/review'))
      ]).then(async ([queueResponse, reviewResponse]) => {
        if (!queueResponse.ok || !reviewResponse.ok) {
          throw new Error('Review data request failed.');
        }
        queue = await queueResponse.json();
        review = await reviewResponse.json();
        rebuildItems();
        setStatus(items.length + ' items loaded.');
        render();
      }).catch((error) => {
        setStatus(error.message || 'Unable to load review data.');
      });
    })();
  </script>
  <script nonce="${nonce}" src="https://www.youtube.com/iframe_api"></script>
</body>
</html>
`;
}

module.exports = Object.freeze({ renderReviewPage });
