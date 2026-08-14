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
  if (typeof options.nonce !== 'string' || !options.nonce.trim()) {
    throw new TypeError('nonce must be a nonblank string');
  }
  const nonce = escapeHtml(options.nonce.trim());
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
    button, input, select { font: inherit; }
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
    button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid #f2ae2e; outline-offset: 2px; }
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
    .review-player-frame {
      width: 100%;
      aspect-ratio: 16 / 9;
      min-height: 220px;
      background: #050708;
      overflow: hidden;
    }
    [data-review-player], .review-player-frame iframe {
      display: block;
      width: 100% !important;
      height: 100% !important;
      border: 0;
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
    .screenshot-row select { width: 100%; min-height: 40px; }
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
      .review-player-frame { min-height: 170px; }
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
        <div class="review-player-frame">
          <div data-review-player aria-label="YouTube review player"></div>
        </div>
        <div class="transport" aria-label="Timeline controls">
          <button type="button" data-seek-delta="-5" aria-label="Seek backward 5 seconds">-5s</button>
          <button type="button" data-seek-delta="5" aria-label="Seek forward 5 seconds">+5s</button>
          <button type="button" data-record-current disabled>Record current time</button>
        </div>
      </section>
      <section class="detail-band" aria-labelledby="detail-heading">
        <h2 id="detail-heading">Current item</h2>
        <dl class="detail-grid">
          <dt>Record</dt><dd data-record-label class="empty">None</dd>
          <dt>Video ID</dt><dd data-video-id class="empty">None</dd>
          <dt>Item</dt><dd data-item-label class="empty">None</dd>
          <dt>Owning step</dt><dd data-case-step class="empty">None</dd>
          <dt>Draft time</dt><dd data-draft-time class="empty">Not recorded</dd>
          <dt>Status</dt><dd data-item-status>unreviewed</dd>
        </dl>
        <nav class="item-nav" aria-label="Review item navigation">
          <button type="button" data-prev-item disabled>Previous item</button>
          <span data-item-position aria-live="polite">0 / 0</span>
          <button type="button" data-next-item disabled>Next item</button>
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
          <label>
            Owning step
            <select data-case-step-select disabled>
              <option value="">Unassigned</option>
            </select>
          </label>
          <p>Key: <span data-screenshot-key class="empty">None</span></p>
          <p data-screenshot-state class="empty">No public case selected.</p>
          <label class="check-label">
            <input type="checkbox" data-screenshot-reviewed disabled>
            Screenshot ownership reviewed
          </label>
        </div>
      </section>
      <section aria-labelledby="actions-heading">
        <h2 id="actions-heading">Actions</h2>
        <p>Recording creates an unreviewed draft. Confirmation is explicit.</p>
        <div class="commands">
          <button type="button" data-confirm-current disabled>Confirm current item</button>
          <button type="button" data-save-review disabled>Save review</button>
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
        screenshotState: document.querySelector('[data-screenshot-state]'),
        screenshotReviewed: document.querySelector('[data-screenshot-reviewed]'),
        caseStep: document.querySelector('[data-case-step]'),
        caseStepSelect: document.querySelector('[data-case-step-select]'),
        seekButtons: Array.from(document.querySelectorAll('[data-seek-delta]'))
      };
      let queue = [];
      let review = { records: [] };
      let items = [];
      let itemIndex = 0;
      let player = null;
      let loadedVideoId = '';
      let playerDuration = null;
      let playerReady = false;
      let hydrated = false;
      let saving = false;

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

      function currentPlayerReady() {
        const record = currentRecord();
        return Boolean(record && playerReady && loadedVideoId === record.videoId
          && Number.isFinite(playerDuration) && playerDuration > 0);
      }

      function playerMetadata() {
        if (!player || typeof player.getDuration !== 'function' || typeof player.getVideoData !== 'function') {
          return null;
        }
        try {
          const data = player.getVideoData();
          const duration = player.getDuration();
          if (!data || data.video_id !== loadedVideoId || !Number.isFinite(duration) || duration <= 0) {
            return null;
          }
          return { duration };
        } catch (_error) {
          return null;
        }
      }

      function synchronizePlayer(message) {
        const metadata = playerMetadata();
        playerReady = Boolean(metadata);
        playerDuration = metadata ? metadata.duration : null;
        const record = currentRecord();
        if (record && playerReady && record.videoId === loadedVideoId) {
          record.durationSeconds = playerDuration;
          setStatus(message || 'Player ready.');
        }
        render();
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
          step = queued.steps[descriptor.value.stepIndex];
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
        if (!currentPlayerReady() || !player || typeof player.seekTo !== 'function' || !Number.isFinite(seconds)) {
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
          candidateButton.disabled = !hydrated || saving || !currentPlayerReady();
          candidateButton.setAttribute('data-candidate-time', String(candidate.start));
          candidateButton.setAttribute(
            'aria-label',
            'Seek to candidate ' + formatTime(candidate.start) + ': '
              + (candidate.text || 'Candidate cue')
          );
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
          playerReady = false;
          playerDuration = null;
          player = new window.YT.Player(elements.player, {
            videoId: record.videoId,
            playerVars: {
              autoplay: 0,
              playsinline: 1,
              origin: window.location.origin
            },
            events: {
              onReady: () => synchronizePlayer('Player ready.'),
              onStateChange: () => synchronizePlayer('Player ready.'),
              onError: () => {
                playerReady = false;
                playerDuration = null;
                setStatus('YouTube player error.');
                render();
              }
            }
          });
        } else if (record.videoId !== loadedVideoId && typeof player.cueVideoById === 'function') {
          loadedVideoId = record.videoId;
          playerReady = false;
          playerDuration = null;
          setStatus('Cueing video...');
          player.cueVideoById(record.videoId);
        }
      }

      function render() {
        const descriptor = currentDescriptor();
        const record = currentRecord();
        const value = currentItem();
        const locked = !hydrated || saving;
        const ready = currentPlayerReady();
        const isCase = Boolean(descriptor && descriptor.kind === 'case');
        const owner = isCase && value && Number.isInteger(value.stepIndex) && record
          ? record.steps[value.stepIndex]
          : null;
        const screenshotReady = !isCase || Boolean(value && Number.isInteger(value.stepIndex)
          && value.screenshotReviewed);
        elements.recordLabel.textContent = record ? record.recordId : 'None';
        elements.videoId.textContent = record ? record.videoId : 'None';
        elements.itemLabel.textContent = itemText(descriptor);
        elements.caseStep.textContent = owner ? 'Step ' + owner.order + ': ' + owner.name : 'None';
        elements.draftTime.textContent = value ? formatTime(value.startSeconds) : 'Not recorded';
        elements.itemStatus.textContent = value ? value.status : 'unreviewed';
        elements.itemPosition.textContent = items.length === 0 ? '0 / 0' : (itemIndex + 1) + ' / ' + items.length;
        elements.previous.disabled = locked || itemIndex <= 0;
        elements.next.disabled = locked || itemIndex >= items.length - 1;
        elements.record.disabled = locked || !value || !ready;
        elements.confirm.disabled = locked || !value || !ready
          || value.startSeconds === null || !screenshotReady;
        elements.save.disabled = locked || review.records.length === 0;
        elements.seekButtons.forEach((button) => { button.disabled = locked || !ready; });
        elements.caseStepSelect.replaceChildren();
        const unassigned = document.createElement('option');
        unassigned.value = '';
        unassigned.textContent = 'Unassigned';
        elements.caseStepSelect.append(unassigned);
        if (isCase && record) {
          const queued = queueRecord(record);
          record.steps.forEach((step, stepIndex) => {
            const option = document.createElement('option');
            const queuedStep = queued && queued.steps[stepIndex];
            option.value = String(stepIndex);
            option.textContent = 'Step ' + step.order + ': ' + step.name
              + (queuedStep && queuedStep.imageKey ? '' : ' (no screenshot)');
            elements.caseStepSelect.append(option);
          });
        }
        elements.caseStepSelect.value = isCase && Number.isInteger(value.stepIndex)
          ? String(value.stepIndex)
          : '';
        elements.caseStepSelect.disabled = locked || !isCase;
        elements.screenshotKey.textContent = isCase && value.screenshotKey !== null
          ? value.screenshotKey
          : 'None';
        elements.screenshotState.textContent = !isCase
          ? 'No public case selected.'
          : !Number.isInteger(value.stepIndex)
            ? 'Assign an owning step before reviewing screenshot evidence.'
          : value.screenshotReviewed
            ? value.screenshotKey
              ? 'Screenshot assignment reviewed.'
              : 'Reviewed missing: no strict screenshot is assigned.'
            : value.screenshotKey
              ? 'Screenshot assignment requires review.'
              : 'No strict screenshot is assigned; review as missing evidence.';
        elements.screenshotReviewed.disabled = locked || !isCase || !Number.isInteger(value.stepIndex);
        elements.screenshotReviewed.checked = isCase ? value.screenshotReviewed : false;
        renderCandidates();
        loadCurrentVideo();
      }

      elements.seekButtons.forEach((button) => {
        button.addEventListener('click', () => {
          if (!currentPlayerReady() || !player || typeof player.getCurrentTime !== 'function') {
            setStatus('Player is not ready.');
            return;
          }
          seekTo(player.getCurrentTime() + Number(button.dataset.seekDelta));
        });
      });

      elements.record.addEventListener('click', () => {
        if (!hydrated || saving || !currentItem() || !currentPlayerReady()
          || !player || typeof player.getCurrentTime !== 'function') {
          setStatus('Player is not ready.');
          return;
        }
        const metadata = playerMetadata();
        const time = player.getCurrentTime();
        if (!metadata || !Number.isFinite(time) || time < 0 || time >= metadata.duration) {
          setStatus('Current player time is outside the video duration.');
          return;
        }
        currentRecord().durationSeconds = metadata.duration;
        currentItem().startSeconds = Math.floor(time);
        currentItem().status = 'unreviewed';
        updateRecordStatus(currentRecord());
        setStatus('Draft time recorded.');
        render();
      });

      elements.confirm.addEventListener('click', () => {
        const descriptor = currentDescriptor();
        const screenshotReady = !descriptor || descriptor.kind !== 'case'
          || Boolean(currentItem() && Number.isInteger(currentItem().stepIndex)
            && currentItem().screenshotReviewed);
        if (!hydrated || saving || !currentPlayerReady() || !currentItem()
          || currentItem().startSeconds === null || !screenshotReady) {
          setStatus('Record a draft time before confirming.');
          return;
        }
        currentItem().status = 'reviewed';
        updateRecordStatus(currentRecord());
        setStatus('Current item confirmed.');
        render();
      });

      elements.previous.addEventListener('click', () => {
        if (!hydrated || saving) {
          return;
        }
        itemIndex = Math.max(0, itemIndex - 1);
        render();
      });

      elements.next.addEventListener('click', () => {
        if (!hydrated || saving) {
          return;
        }
        itemIndex = Math.min(items.length - 1, itemIndex + 1);
        render();
      });

      elements.caseStepSelect.addEventListener('change', () => {
        const descriptor = currentDescriptor();
        const record = currentRecord();
        if (!hydrated || saving || !descriptor || descriptor.kind !== 'case' || !record) {
          return;
        }
        const selected = elements.caseStepSelect.value;
        const stepIndex = selected === '' ? null : Number(selected);
        const queued = queueRecord(record);
        const queuedStep = Number.isInteger(stepIndex) && stepIndex >= 0 && stepIndex < record.steps.length
          && queued && queued.steps[stepIndex]
          ? queued.steps[stepIndex]
          : null;
        descriptor.value.stepIndex = queuedStep ? stepIndex : null;
        descriptor.value.screenshotKey = queuedStep && queuedStep.imageKey ? queuedStep.imageKey : null;
        descriptor.value.screenshotReviewed = false;
        descriptor.value.startSeconds = null;
        descriptor.value.status = 'unreviewed';
        updateRecordStatus(record);
        setStatus('Case ownership updated in the draft.');
        render();
      });

      elements.screenshotReviewed.addEventListener('change', () => {
        const descriptor = currentDescriptor();
        if (hydrated && !saving && descriptor && descriptor.kind === 'case') {
          descriptor.value.screenshotReviewed = elements.screenshotReviewed.checked;
          descriptor.value.status = 'unreviewed';
          updateRecordStatus(currentRecord());
          setStatus('Screenshot status updated in the draft.');
          render();
        }
      });

      elements.save.addEventListener('click', async () => {
        if (!hydrated || saving || review.records.length === 0) {
          return;
        }
        saving = true;
        render();
        setStatus('Saving review...');
        try {
          const payload = JSON.stringify(review);
          const response = await fetch(apiUrl('/api/review'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload
          });
          if (!response.ok) {
            throw new Error('Save failed with status ' + response.status);
          }
          review = response.status === 204 ? JSON.parse(payload) : await response.json();
          rebuildItems();
          setStatus('Review saved.');
        } catch (error) {
          setStatus(error.message || 'Review save failed.');
        } finally {
          saving = false;
          render();
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
        hydrated = true;
        rebuildItems();
        setStatus(items.length + ' items loaded.');
        render();
      }).catch((error) => {
        setStatus(error.message || 'Unable to load review data.');
        render();
      });
    })();
  </script>
  <script nonce="${nonce}" src="https://www.youtube.com/iframe_api"></script>
</body>
</html>
`;
}

module.exports = Object.freeze({ renderReviewPage });
