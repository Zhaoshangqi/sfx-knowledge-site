'use strict';

const EMPTY = Object.freeze([]);
const STOP_TERMS = new Set([
  'use',
  'add',
  'sound',
  'audio',
  'plugin',
  'effect',
  'step',
  'layer',
  'track',
  'video',
  '使用',
  '加入',
  '声音',
  '音效',
  '插件',
  '效果',
  '步骤',
  '素材',
  '处理',
  '调整',
  '然后',
  '这里',
  '这个'
]);
const TOKEN_PATTERN = /[\p{Script=Han}]+|[\p{Script=Latin}\p{Number}](?:[\p{Script=Latin}\p{Number}+._'’-]*[\p{Script=Latin}\p{Number}])?/gu;
const HAN_PATTERN = /^[\p{Script=Han}]+$/u;

function tokenize(value) {
  if (typeof value !== 'string') {
    return EMPTY;
  }

  const tokens = [];
  const seen = new Set();
  const normalized = value.normalize('NFKC').toLowerCase();

  for (const match of normalized.matchAll(TOKEN_PATTERN)) {
    const token = match[0];
    const minimumLength = HAN_PATTERN.test(token) ? 2 : 3;
    if (
      Array.from(token).length < minimumLength
      || STOP_TERMS.has(token)
      || seen.has(token)
    ) {
      continue;
    }
    seen.add(token);
    tokens.push(token);
  }

  return tokens.length === 0 ? EMPTY : Object.freeze(tokens);
}

function validCue(cue) {
  return cue !== null
    && typeof cue === 'object'
    && !Array.isArray(cue)
    && typeof cue.start === 'number'
    && Number.isFinite(cue.start)
    && cue.start >= 0
    && typeof cue.end === 'number'
    && Number.isFinite(cue.end)
    && cue.end > cue.start
    && typeof cue.text === 'string'
    && cue.text.trim().length > 0;
}

function validTrack(track) {
  if (
    track === null
    || typeof track !== 'object'
    || Array.isArray(track)
    || !Array.isArray(track.cues)
  ) {
    return false;
  }

  for (let index = 0; index < track.cues.length; index += 1) {
    if (
      !Object.prototype.hasOwnProperty.call(track.cues, index)
      || !validCue(track.cues[index])
    ) {
      return false;
    }
  }
  return true;
}

function normalizedTerms(terms) {
  if (!Array.isArray(terms)) {
    return EMPTY;
  }

  const normalized = [];
  const seen = new Set();
  terms.forEach((term) => {
    tokenize(term).forEach((token) => {
      if (!seen.has(token)) {
        seen.add(token);
        normalized.push(token);
      }
    });
  });
  return normalized.length === 0 ? EMPTY : Object.freeze(normalized);
}

function compareCandidates(left, right) {
  if (left.score !== right.score) {
    return right.score - left.score;
  }
  if (left.start !== right.start) {
    return left.start - right.start;
  }
  if (left.end !== right.end) {
    return left.end - right.end;
  }
  if (left.text < right.text) {
    return -1;
  }
  return left.text > right.text ? 1 : 0;
}

function candidateCues(track, terms) {
  if (!validTrack(track)) {
    return EMPTY;
  }

  const termList = normalizedTerms(terms);
  if (termList.length === 0) {
    return EMPTY;
  }

  const candidates = [];
  track.cues.forEach((cue) => {
    const normalizedText = cue.text.normalize('NFKC').toLowerCase();
    const latinTokens = new Set(tokenize(cue.text).filter((token) => !HAN_PATTERN.test(token)));
    const matchedTerms = termList.filter((term) => (
      HAN_PATTERN.test(term) ? normalizedText.includes(term) : latinTokens.has(term)
    ));

    if (matchedTerms.length > 0) {
      candidates.push(Object.freeze({
        start: cue.start,
        end: cue.end,
        text: cue.text,
        score: matchedTerms.length,
        matchedTerms: Object.freeze(matchedTerms)
      }));
    }
  });

  if (candidates.length === 0) {
    return EMPTY;
  }
  candidates.sort(compareCandidates);
  return Object.freeze(candidates.slice(0, 3));
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function safeText(value) {
  return typeof value === 'string' ? value : '';
}

function trackForVideo(videoId, tracksByVideoId) {
  if (
    !isObject(tracksByVideoId)
    || !Object.prototype.hasOwnProperty.call(tracksByVideoId, videoId)
  ) {
    return Object.freeze({ status: 'missing', track: null });
  }

  const track = tracksByVideoId[videoId];
  return validTrack(track)
    ? Object.freeze({ status: 'track', track })
    : Object.freeze({ status: 'invalid', track: null });
}

function candidateTerms(step) {
  if (!step) {
    return EMPTY;
  }

  const terms = [step.name, step.detail];
  if (Array.isArray(step.params)) {
    step.params.forEach((param) => terms.push(param));
  } else {
    terms.push(step.params);
  }
  return terms;
}

function projectStep(step, index, track) {
  const source = isObject(step) ? step : null;
  return Object.freeze({
    order: source && typeof source.order === 'number' && Number.isFinite(source.order)
      ? source.order
      : index + 1,
    name: source ? safeText(source.name) : '',
    detail: source ? safeText(source.detail) : '',
    imageKey: source ? safeText(source.imageKey) : '',
    status: 'unreviewed',
    startSeconds: null,
    candidates: candidateCues(track, candidateTerms(source))
  });
}

function buildReviewQueue(records, tracksByVideoId) {
  if (!Array.isArray(records)) {
    return EMPTY;
  }

  const queue = [];
  records.forEach((record) => {
    if (!isObject(record)) {
      return;
    }

    const videoId = safeText(record.videoId);
    const subtitle = trackForVideo(videoId, tracksByVideoId);
    const sourceSteps = Array.isArray(record.steps) ? record.steps : EMPTY;
    const steps = Array.from(
      sourceSteps,
      (step, index) => projectStep(step, index, subtitle.track)
    );

    queue.push(Object.freeze({
      recordId: safeText(record.id),
      videoId,
      title: safeText(record.title),
      subtitleStatus: subtitle.status,
      steps: steps.length === 0 ? EMPTY : Object.freeze(steps)
    }));
  });

  return queue.length === 0 ? EMPTY : Object.freeze(queue);
}

module.exports = Object.freeze({
  buildReviewQueue,
  candidateCues,
  tokenize
});
