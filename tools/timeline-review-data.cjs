'use strict';

const EMPTY = Object.freeze([]);
const INVALID = Symbol('invalid');
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

function isPlainDataObject(value) {
  try {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return false;
    }
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch (_error) {
    return false;
  }
}

function ownData(object, key) {
  try {
    const descriptor = Object.getOwnPropertyDescriptor(object, key);
    if (!descriptor) {
      return { ok: true, present: false, value: undefined };
    }
    if (!Object.prototype.hasOwnProperty.call(descriptor, 'value')) {
      return { ok: false, present: true, value: undefined };
    }
    return { ok: true, present: true, value: descriptor.value };
  } catch (_error) {
    return { ok: false, present: false, value: undefined };
  }
}

function ownFields(value, names) {
  if (!isPlainDataObject(value)) {
    return null;
  }

  const fields = Object.create(null);
  for (const name of names) {
    const field = ownData(value, name);
    if (!field.ok) {
      return null;
    }
    fields[name] = field.value;
  }
  return fields;
}

function arrayLength(value) {
  try {
    if (!Array.isArray(value)) {
      return null;
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, 'length');
    if (
      !descriptor
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
      || !Number.isSafeInteger(descriptor.value)
      || descriptor.value < 0
    ) {
      return null;
    }
    return descriptor.value;
  } catch (_error) {
    return null;
  }
}

function normalizeCue(cue) {
  const fields = ownFields(cue, ['start', 'end', 'text']);
  if (!fields) {
    return null;
  }

  const { start, end } = fields;
  const text = typeof fields.text === 'string' ? fields.text.trim() : '';
  if (
    typeof start !== 'number'
    || !Number.isFinite(start)
    || start < 0
    || typeof end !== 'number'
    || !Number.isFinite(end)
    || end <= start
    || !text
  ) {
    return null;
  }
  return Object.freeze({ start, end, text });
}

function normalizeTrack(track) {
  const fields = ownFields(track, ['cues']);
  if (!fields) {
    return null;
  }

  const length = arrayLength(fields.cues);
  if (length === null || length === 0) {
    return null;
  }

  const cues = [];
  const seen = new Set();
  let previousEnd = -1;
  for (let index = 0; index < length; index += 1) {
    const slot = ownData(fields.cues, String(index));
    if (!slot.ok || !slot.present) {
      return null;
    }
    const cue = normalizeCue(slot.value);
    if (!cue || cue.start < previousEnd) {
      return null;
    }
    const key = `${cue.start}\u0000${cue.end}\u0000${cue.text}`;
    if (seen.has(key)) {
      return null;
    }
    seen.add(key);
    cues.push(cue);
    previousEnd = cue.end;
  }
  return Object.freeze({ cues: Object.freeze(cues) });
}

function normalizedTerms(terms) {
  const length = arrayLength(terms);
  if (length === null) {
    return EMPTY;
  }

  const normalized = [];
  const seen = new Set();
  for (let index = 0; index < length; index += 1) {
    const slot = ownData(terms, String(index));
    if (!slot.ok || !slot.present) {
      continue;
    }
    tokenize(slot.value).forEach((token) => {
      if (!seen.has(token)) {
        seen.add(token);
        normalized.push(token);
      }
    });
  }
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

function candidatesFromTrack(track, terms) {
  const termList = normalizedTerms(terms);
  if (termList.length === 0) {
    return EMPTY;
  }

  const candidates = [];
  track.cues.forEach((cue) => {
    const text = cue.text;
    const normalizedText = text.normalize('NFKC').toLowerCase();
    const latinTokens = new Set(tokenize(text).filter((token) => !HAN_PATTERN.test(token)));
    const matchedTerms = termList.filter((term) => (
      HAN_PATTERN.test(term) ? normalizedText.includes(term) : latinTokens.has(term)
    ));

    if (matchedTerms.length > 0) {
      candidates.push(Object.freeze({
        start: cue.start,
        end: cue.end,
        text,
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

function candidateCues(track, terms) {
  const normalizedTrack = normalizeTrack(track);
  return normalizedTrack ? candidatesFromTrack(normalizedTrack, terms) : EMPTY;
}

function safeText(value) {
  return typeof value === 'string' ? value : '';
}

function trackForVideo(videoId, tracksByVideoId) {
  if (!isPlainDataObject(tracksByVideoId)) {
    return Object.freeze({ status: 'missing', track: null });
  }

  const match = ownData(tracksByVideoId, videoId);
  if (!match.ok) {
    return Object.freeze({ status: 'invalid', track: null });
  }
  if (!match.present) {
    return Object.freeze({ status: 'missing', track: null });
  }

  const track = normalizeTrack(match.value);
  return track
    ? Object.freeze({ status: 'track', track })
    : Object.freeze({ status: 'invalid', track: null });
}

function candidateTerms(fields) {
  const terms = [fields.name, fields.detail];
  let paramsAreArray;
  try {
    paramsAreArray = Array.isArray(fields.params);
  } catch (_error) {
    return INVALID;
  }

  if (!paramsAreArray) {
    terms.push(fields.params);
    return terms;
  }

  const length = arrayLength(fields.params);
  if (length === null) {
    return INVALID;
  }
  for (let index = 0; index < length; index += 1) {
    const slot = ownData(fields.params, String(index));
    if (!slot.ok || !slot.present) {
      return INVALID;
    }
    terms.push(slot.value);
  }
  return terms;
}

function emptyStep() {
  return Object.freeze({
    order: '',
    name: '',
    detail: '',
    imageKey: '',
    status: 'unreviewed',
    startSeconds: null,
    candidates: EMPTY
  });
}

function projectStep(step, track) {
  const fields = ownFields(step, ['order', 'name', 'detail', 'params', 'imageKey']);
  if (!fields) {
    return emptyStep();
  }

  const terms = candidateTerms(fields);
  if (terms === INVALID) {
    return emptyStep();
  }
  return Object.freeze({
    order: typeof fields.order === 'number' && Number.isFinite(fields.order) ? fields.order : '',
    name: safeText(fields.name),
    detail: safeText(fields.detail),
    imageKey: safeText(fields.imageKey),
    status: 'unreviewed',
    startSeconds: null,
    candidates: track ? candidatesFromTrack(track, terms) : EMPTY
  });
}

function projectSteps(sourceSteps, track) {
  const length = arrayLength(sourceSteps);
  if (length === null || length === 0) {
    return EMPTY;
  }

  const steps = [];
  for (let index = 0; index < length; index += 1) {
    const slot = ownData(sourceSteps, String(index));
    steps.push(!slot.ok || !slot.present ? emptyStep() : projectStep(slot.value, track));
  }
  return Object.freeze(steps);
}

function buildReviewQueue(records, tracksByVideoId) {
  const length = arrayLength(records);
  if (length === null) {
    return EMPTY;
  }

  const queue = [];
  for (let index = 0; index < length; index += 1) {
    const slot = ownData(records, String(index));
    if (!slot.ok || !slot.present) {
      continue;
    }
    const fields = ownFields(slot.value, ['id', 'videoId', 'title', 'steps']);
    if (!fields) {
      continue;
    }

    const videoId = safeText(fields.videoId);
    const subtitle = trackForVideo(videoId, tracksByVideoId);
    const steps = projectSteps(fields.steps, subtitle.track);

    queue.push(Object.freeze({
      recordId: safeText(fields.id),
      videoId,
      title: safeText(fields.title),
      subtitleStatus: subtitle.status,
      steps
    }));
  }

  return queue.length === 0 ? EMPTY : Object.freeze(queue);
}

module.exports = Object.freeze({
  buildReviewQueue,
  candidateCues,
  tokenize
});
