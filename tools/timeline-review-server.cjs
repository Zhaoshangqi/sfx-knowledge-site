'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { types } = require('node:util');

const { renderReviewPage } = require('./timeline-review-page.cjs');
const siteData = require('./site-data.cjs');
const reviewData = require('./timeline-review-data.cjs');
const knowledgeModel = require('../src/knowledge-model.js');
const videoTimeline = require('../src/video-timeline.js');
const publicEffectUseManifest = require('./data/public-effect-use-ids.json');

const MAX_BODY_BYTES = 2 * 1024 * 1024;
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const RECORD_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const USE_ID_PATTERN = /^[A-Za-z0-9:_-]+$/;
const REVIEW_STATUSES = new Set(['unreviewed', 'in-progress', 'reviewed']);
const ITEM_STATUSES = new Set(['unreviewed', 'reviewed']);
const REVIEW_KEYS = Object.freeze(['records']);
const RECORD_KEYS = Object.freeze([
  'recordId',
  'videoId',
  'durationSeconds',
  'status',
  'steps',
  'cases'
]);
const STEP_KEYS = Object.freeze(['order', 'name', 'status', 'startSeconds']);
const CASE_KEYS = Object.freeze([
  'useId',
  'stepIndex',
  'status',
  'startSeconds',
  'screenshotReviewed',
  'screenshotKey'
]);

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

class ClosedError extends Error {}

function reject(pathName, message) {
  throw new TypeError(`${pathName} ${message}`);
}

function isPlainDataObject(value) {
  if (value === null || typeof value !== 'object' || types.isProxy(value) || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function dataFields(value, expectedKeys, pathName) {
  if (!isPlainDataObject(value)) {
    reject(pathName, 'must be a plain data object with a standard prototype');
  }

  const expected = new Set(expectedKeys);
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    if (typeof key !== 'string') {
      reject(pathName, 'must not contain symbol keys');
    }
    if (!expected.has(key)) {
      reject(pathName, `contains unknown key ${JSON.stringify(key)}`);
    }
  }

  const fields = Object.create(null);
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor) {
      reject(pathName, `is missing required key ${JSON.stringify(key)}`);
    }
    if (!Object.hasOwn(descriptor, 'value')) {
      reject(`${pathName}.${key}`, 'must not be an accessor');
    }
    if (!descriptor.enumerable) {
      reject(`${pathName}.${key}`, 'must be enumerable');
    }
    fields[key] = descriptor.value;
  }
  return fields;
}

function denseArray(value, pathName) {
  if (!Array.isArray(value) || types.isProxy(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    reject(pathName, 'must be a dense array using Array.prototype');
  }

  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  const length = lengthDescriptor && lengthDescriptor.value;
  let count = 0;
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') {
      continue;
    }
    if (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/.test(key)) {
      reject(pathName, 'must not contain extra keys');
    }
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index >= length) {
      reject(pathName, 'contains an invalid array index');
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!Object.hasOwn(descriptor, 'value')) {
      reject(`${pathName}[${key}]`, 'must not be an accessor');
    }
    if (!descriptor.enumerable) {
      reject(`${pathName}[${key}]`, 'must be enumerable');
    }
    count += 1;
  }
  if (count !== length) {
    reject(pathName, 'must be a dense array without holes');
  }

  const entries = [];
  for (let index = 0; index < length; index += 1) {
    entries.push(Object.getOwnPropertyDescriptor(value, String(index)).value);
  }
  return entries;
}

function nonblankString(value, pathName) {
  if (typeof value !== 'string' || !value.trim()) {
    reject(pathName, 'must be a nonblank string');
  }
  return value.trim();
}

function nullableStart(value, pathName) {
  if (value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0) {
    reject(pathName, 'must be null or a nonnegative integer');
  }
  return value;
}

function validateItemStatus(status, startSeconds, pathName) {
  if (!ITEM_STATUSES.has(status)) {
    reject(`${pathName}.status`, 'must be unreviewed or reviewed');
  }
  if (status === 'reviewed' && startSeconds === null) {
    reject(pathName, 'is reviewed but startSeconds is null');
  }
}

function validateStep(value, pathName, durationSeconds, orders) {
  const fields = dataFields(value, STEP_KEYS, pathName);
  if (!Number.isInteger(fields.order) || fields.order <= 0) {
    reject(`${pathName}.order`, 'must be a positive integer');
  }
  if (orders.has(fields.order)) {
    reject(`${pathName}.order`, `has duplicate step order ${fields.order}`);
  }
  orders.add(fields.order);
  const name = nonblankString(fields.name, `${pathName}.name`);
  const startSeconds = nullableStart(fields.startSeconds, `${pathName}.startSeconds`);
  validateItemStatus(fields.status, startSeconds, pathName);
  if (durationSeconds !== null && startSeconds !== null && startSeconds >= durationSeconds) {
    reject(`${pathName}.startSeconds`, 'must be less than durationSeconds');
  }
  return Object.freeze({
    order: fields.order,
    name,
    status: fields.status,
    startSeconds
  });
}

function validateCase(value, pathName, durationSeconds, useIds, stepCount) {
  const fields = dataFields(value, CASE_KEYS, pathName);
  const useId = nonblankString(fields.useId, `${pathName}.useId`);
  if (!USE_ID_PATTERN.test(useId)) {
    reject(`${pathName}.useId`, 'contains unsupported characters');
  }
  if (useIds.has(useId)) {
    reject(`${pathName}.useId`, `has duplicate useId ${JSON.stringify(useId)}`);
  }
  useIds.add(useId);

  let stepIndex = fields.stepIndex;
  if (stepIndex !== null && (!Number.isInteger(stepIndex) || stepIndex < 0)) {
    reject(`${pathName}.stepIndex`, 'must be null or a nonnegative integer');
  }
  if (stepIndex !== null && stepIndex >= stepCount) {
    reject(`${pathName}.stepIndex`, 'must reference an existing step');
  }
  const startSeconds = nullableStart(fields.startSeconds, `${pathName}.startSeconds`);
  validateItemStatus(fields.status, startSeconds, pathName);
  if (durationSeconds !== null && startSeconds !== null && startSeconds >= durationSeconds) {
    reject(`${pathName}.startSeconds`, 'must be less than durationSeconds');
  }
  if (typeof fields.screenshotReviewed !== 'boolean') {
    reject(`${pathName}.screenshotReviewed`, 'must be a boolean');
  }
  if (fields.screenshotKey !== null && typeof fields.screenshotKey !== 'string') {
    reject(`${pathName}.screenshotKey`, 'must be null or a string');
  }
  if (fields.status === 'reviewed' && fields.screenshotReviewed !== true) {
    reject(pathName, 'is reviewed but screenshotReviewed is false');
  }
  if (fields.status === 'reviewed' && stepIndex === null) {
    reject(pathName, 'is reviewed but has no owning stepIndex');
  }
  const screenshotKey = typeof fields.screenshotKey === 'string' && fields.screenshotKey.trim()
    ? fields.screenshotKey.trim()
    : null;

  return Object.freeze({
    useId,
    stepIndex,
    status: fields.status,
    startSeconds,
    screenshotReviewed: fields.screenshotReviewed,
    screenshotKey
  });
}

function validateRecord(value, pathName, seenRecordIds, seenVideoIds, seenUseIds) {
  const fields = dataFields(value, RECORD_KEYS, pathName);
  const recordId = nonblankString(fields.recordId, `${pathName}.recordId`);
  const videoId = nonblankString(fields.videoId, `${pathName}.videoId`);
  if (!RECORD_ID_PATTERN.test(recordId)) {
    reject(`${pathName}.recordId`, 'contains unsupported characters');
  }
  if (!VIDEO_ID_PATTERN.test(videoId)) {
    reject(`${pathName}.videoId`, 'must be an 11-character YouTube video ID');
  }
  if (seenRecordIds.has(recordId)) {
    reject(`${pathName}.recordId`, `has duplicate recordId ${JSON.stringify(recordId)}`);
  }
  if (seenVideoIds.has(videoId)) {
    reject(`${pathName}.videoId`, `has duplicate videoId ${JSON.stringify(videoId)}`);
  }
  seenRecordIds.add(recordId);
  seenVideoIds.add(videoId);

  const durationSeconds = fields.durationSeconds;
  if (
    durationSeconds !== null
    && (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0)
  ) {
    reject(`${pathName}.durationSeconds`, 'must be null or a finite number greater than zero');
  }
  if (!REVIEW_STATUSES.has(fields.status)) {
    reject(`${pathName}.status`, 'must be unreviewed, in-progress, or reviewed');
  }
  if (fields.status === 'reviewed' && durationSeconds === null) {
    reject(pathName, 'is reviewed but durationSeconds is null');
  }

  const stepValues = denseArray(fields.steps, `${pathName}.steps`);
  const orders = new Set();
  const steps = stepValues.map((step, index) => (
    validateStep(step, `${pathName}.steps[${index}]`, durationSeconds, orders)
  ));
  const caseValues = denseArray(fields.cases, `${pathName}.cases`);
  const cases = caseValues.map((reviewCase, index) => (
    validateCase(
      reviewCase,
      `${pathName}.cases[${index}]`,
      durationSeconds,
      seenUseIds,
      steps.length
    )
  ));
  const items = steps.concat(cases);
  const expectedStatus = items.length > 0 && items.every((item) => item.status === 'reviewed')
    ? 'reviewed'
    : items.some((item) => item.status === 'reviewed' || item.startSeconds !== null)
      ? 'in-progress'
      : 'unreviewed';
  if (fields.status !== expectedStatus) {
    reject(`${pathName}.status`, `does not match item-derived record status ${expectedStatus}`);
  }

  return Object.freeze({
    recordId,
    videoId,
    durationSeconds,
    status: fields.status,
    steps: Object.freeze(steps),
    cases: Object.freeze(cases)
  });
}

function validateReview(value) {
  const fields = dataFields(value, REVIEW_KEYS, 'review');
  const recordValues = denseArray(fields.records, 'review.records');
  const seenRecordIds = new Set();
  const seenVideoIds = new Set();
  const seenUseIds = new Set();
  const records = recordValues.map((record, index) => (
    validateRecord(
      record,
      `review.records[${index}]`,
      seenRecordIds,
      seenVideoIds,
      seenUseIds
    )
  ));
  return Object.freeze({ records: Object.freeze(records) });
}

function secureTokenEqual(expected, actual) {
  const expectedHash = crypto.createHash('sha256').update(String(expected), 'utf8').digest();
  const actualHash = crypto.createHash('sha256').update(typeof actual === 'string' ? actual : '', 'utf8').digest();
  return crypto.timingSafeEqual(expectedHash, actualHash) && typeof actual === 'string';
}

function securityHeaders(nonce) {
  const headers = {
    'cache-control': 'no-store',
    'content-security-policy': [
      "default-src 'none'",
      `script-src 'nonce-${nonce}' https://www.youtube.com`,
      `style-src 'nonce-${nonce}'`,
      "connect-src 'self'",
      'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
      "base-uri 'none'",
      "form-action 'none'",
      "frame-ancestors 'none'"
    ].join('; '),
    'cross-origin-opener-policy': 'same-origin',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY'
  };
  return headers;
}

function send(response, status, body, contentType, nonce = '') {
  const headers = securityHeaders(nonce);
  if (contentType) {
    headers['content-type'] = contentType;
  }
  response.writeHead(status, headers);
  response.end(body);
}

function sendJson(response, status, value) {
  send(response, status, JSON.stringify(value), 'application/json; charset=utf-8');
}

function readBody(request) {
  const declared = request.headers['content-length'];
  if (declared !== undefined) {
    if (!/^\d+$/.test(declared)) {
      throw new HttpError(400, 'Invalid Content-Length');
    }
    if (Number(declared) > MAX_BODY_BYTES) {
      request.resume();
      throw new HttpError(413, 'Request body is too large');
    }
  }

  return new Promise((resolve, rejectPromise) => {
    const chunks = [];
    let bytes = 0;
    let settled = false;

    function fail(error) {
      if (settled) {
        return;
      }
      settled = true;
      rejectPromise(error);
    }

    request.on('data', (chunk) => {
      if (settled) {
        return;
      }
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        request.resume();
        fail(new HttpError(413, 'Request body is too large'));
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (!settled) {
        settled = true;
        resolve(Buffer.concat(chunks, bytes).toString('utf8'));
      }
    });
    request.on('aborted', () => fail(new HttpError(400, 'Request was aborted')));
    request.on('error', () => fail(new HttpError(400, 'Request could not be read')));
  });
}

function parsePort(value) {
  const port = value === undefined ? 0 : value;
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new TypeError('port must be an integer from 0 through 65535');
  }
  return port;
}

async function startReviewServer(options = {}) {
  const port = parsePort(options.port);
  const token = options.token === undefined
    ? crypto.randomBytes(32).toString('base64url')
    : nonblankString(options.token, 'token');
  const queue = Array.isArray(options.queue) ? options.queue : [];
  let review = validateReview(options.review === undefined ? { records: [] } : options.review);
  if (typeof options.writeState !== 'function') {
    throw new TypeError('writeState must be a function');
  }
  const writeState = options.writeState;
  let closed = false;
  let closePromise = null;
  let writeTail = Promise.resolve();
  let origin = '';

  function enqueueWrite(nextReview) {
    const operation = writeTail.then(async () => {
      if (closed) {
        throw new ClosedError('Review server is closed');
      }
      await writeState(nextReview);
      review = nextReview;
    });
    writeTail = operation.catch(() => {});
    return operation;
  }

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url || '/', origin || 'http://127.0.0.1');
      const isApi = requestUrl.pathname.startsWith('/api/');
      if (isApi && !secureTokenEqual(token, requestUrl.searchParams.get('token'))) {
        sendJson(response, 403, { error: 'Forbidden' });
        return;
      }

      if (requestUrl.pathname === '/') {
        if (request.method !== 'GET') {
          response.setHeader('allow', 'GET');
          sendJson(response, 405, { error: 'Method Not Allowed' });
          return;
        }
        const nonce = crypto.randomBytes(18).toString('base64url');
        const html = renderReviewPage({ nonce, title: options.title || 'Timeline Review Workbench' });
        send(response, 200, html, 'text/html; charset=utf-8', nonce);
        return;
      }

      if (requestUrl.pathname === '/api/queue') {
        if (request.method !== 'GET') {
          response.setHeader('allow', 'GET');
          sendJson(response, 405, { error: 'Method Not Allowed' });
          return;
        }
        sendJson(response, 200, queue);
        return;
      }

      if (requestUrl.pathname === '/api/review' && request.method === 'GET') {
        sendJson(response, 200, review);
        return;
      }

      if (requestUrl.pathname === '/api/review' && request.method === 'POST') {
        if (request.headers.origin !== origin) {
          sendJson(response, 403, { error: 'Forbidden' });
          return;
        }
        const mediaType = String(request.headers['content-type'] || '').split(';', 1)[0].trim().toLowerCase();
        if (mediaType !== 'application/json') {
          sendJson(response, 415, { error: 'Content-Type must be application/json' });
          return;
        }

        const rawBody = await readBody(request);
        let parsed;
        try {
          parsed = JSON.parse(rawBody);
        } catch (_error) {
          throw new HttpError(400, 'Malformed JSON');
        }
        let nextReview;
        try {
          nextReview = validateReview(parsed);
        } catch (error) {
          throw new HttpError(400, error.message);
        }
        try {
          await enqueueWrite(nextReview);
        } catch (error) {
          if (error instanceof ClosedError) {
            throw new HttpError(503, 'Review server is closing');
          }
          throw new HttpError(500, 'Review state could not be persisted');
        }
        sendJson(response, 200, review);
        return;
      }

      if (requestUrl.pathname === '/api/review') {
        response.setHeader('allow', 'GET, POST');
        sendJson(response, 405, { error: 'Method Not Allowed' });
        return;
      }

      sendJson(response, 404, { error: 'Not Found' });
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof HttpError ? error.message : 'Internal Server Error';
      if (!response.headersSent) {
        sendJson(response, status, { error: message });
      } else {
        response.destroy();
      }
    }
  });

  await new Promise((resolve, rejectPromise) => {
    function onError(error) {
      server.off('listening', onListening);
      rejectPromise(error);
    }
    function onListening() {
      server.off('error', onError);
      resolve();
    }
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });

  const bound = server.address();
  const address = Object.freeze({ address: bound.address, family: bound.family, port: bound.port });
  origin = `http://127.0.0.1:${address.port}`;

  function close() {
    if (closePromise) {
      return closePromise;
    }
    closed = true;
    closePromise = new Promise((resolve, rejectPromise) => {
      server.close((error) => {
        if (error) {
          rejectPromise(error);
        } else {
          resolve();
        }
      });
      if (typeof server.closeIdleConnections === 'function') {
        server.closeIdleConnections();
      }
    });
    return closePromise;
  }

  return Object.freeze({ address, url: origin, token, close });
}

function samePath(left, right) {
  const normalize = (value) => {
    const resolved = path.resolve(value);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
  };
  return normalize(left) === normalize(right);
}

function assertNoSymlinkComponents(fsImpl, root, target) {
  const rootPath = path.resolve(root);
  const targetPath = path.resolve(target);
  const relative = path.relative(rootPath, targetPath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('target must stay inside the repository root');
  }

  let current = rootPath;
  const components = relative ? relative.split(path.sep) : [];
  for (const component of components) {
    current = path.join(current, component);
    if (!fsImpl.existsSync(current)) {
      continue;
    }
    const stat = fsImpl.lstatSync(current);
    if (stat.isSymbolicLink()) {
      throw new Error(`symbolic-link path component is not allowed: ${current}`);
    }
  }
}

function atomicReviewWriter(fsImpl, repoRoot, workPath) {
  const expectedWork = path.join(repoRoot, '.work', 'timeline-review');
  if (!samePath(workPath, expectedWork)) {
    throw new Error('work path must be the fixed .work/timeline-review directory');
  }
  const target = path.join(expectedWork, 'review.json');

  return async function writeReview(state) {
    const normalized = validateReview(state);
    assertNoSymlinkComponents(fsImpl, repoRoot, expectedWork);
    fsImpl.mkdirSync(expectedWork, { recursive: true });
    assertNoSymlinkComponents(fsImpl, repoRoot, expectedWork);
    const temporary = path.join(
      expectedWork,
      `.review.json.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`
    );
    const content = JSON.stringify(normalized, null, 2) + '\n';
    let descriptor;
    try {
      descriptor = fsImpl.openSync(temporary, 'wx');
      fsImpl.writeFileSync(descriptor, content, { encoding: 'utf8' });
      if (typeof fsImpl.fsyncSync === 'function') {
        fsImpl.fsyncSync(descriptor);
      }
      fsImpl.closeSync(descriptor);
      descriptor = undefined;
      fsImpl.renameSync(temporary, target);
    } catch (error) {
      if (descriptor !== undefined) {
        try { fsImpl.closeSync(descriptor); } catch (_closeError) {}
      }
      try { fsImpl.unlinkSync(temporary); } catch (_unlinkError) {}
      throw error;
    }
  };
}

function parseArguments(args) {
  if (!Array.isArray(args)) {
    throw new TypeError('args must be an array');
  }
  const values = Object.create(null);
  const known = new Set(['--index', '--work', '--port']);
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (!known.has(flag) || value === undefined || Object.hasOwn(values, flag)) {
      throw new Error(`Invalid or duplicate argument: ${flag || '(missing)'}`);
    }
    values[flag] = value;
  }
  if (!values['--index'] || !values['--work']) {
    throw new Error('Both --index and --work are required');
  }
  const port = values['--port'] === undefined ? 0 : Number(values['--port']);
  return { indexPath: values['--index'], workPath: values['--work'], port: parsePort(port) };
}

function existingTracks(fsImpl, repoRoot, records) {
  const tracks = Object.create(null);
  for (const record of records) {
    const videoId = record && typeof record.videoId === 'string' ? record.videoId : '';
    if (!VIDEO_ID_PATTERN.test(videoId)) {
      continue;
    }
    const subtitlePath = path.join(repoRoot, 'assets', 'subtitles', `${videoId}.json`);
    if (fsImpl.existsSync(subtitlePath)) {
      tracks[videoId] = JSON.parse(fsImpl.readFileSync(subtitlePath, 'utf8'));
    }
  }
  return tracks;
}

function initialReview(records, uses) {
  const usesByRecord = new Map();
  for (const use of uses) {
    if (!use || typeof use.sourceRecordId !== 'string') {
      continue;
    }
    if (!usesByRecord.has(use.sourceRecordId)) {
      usesByRecord.set(use.sourceRecordId, []);
    }
    usesByRecord.get(use.sourceRecordId).push(use);
  }

  const reviewRecords = records.map((record) => {
    const timeline = record && record.timeline;
    const durationSeconds = timeline && typeof timeline.durationSeconds === 'number'
      && Number.isFinite(timeline.durationSeconds) && timeline.durationSeconds > 0
      ? timeline.durationSeconds
      : null;
    const steps = (Array.isArray(record.steps) ? record.steps : []).map((step, index) => {
      const startSeconds = durationSeconds !== null && Number.isInteger(step && step.startSeconds)
        && step.startSeconds >= 0 && step.startSeconds < durationSeconds
        ? step.startSeconds
        : null;
      return {
        order: Number.isInteger(step && step.order) && step.order > 0 ? step.order : index + 1,
        name: typeof (step && step.name) === 'string' && step.name.trim()
          ? step.name.trim()
          : `Step ${index + 1}`,
        status: startSeconds === null ? 'unreviewed' : 'reviewed',
        startSeconds
      };
    });
    const cases = (usesByRecord.get(record.id) || []).map((use) => {
      const resolvedStart = videoTimeline.effectStart(record, use);
      const startSeconds = durationSeconds !== null && Number.isInteger(resolvedStart)
        && resolvedStart >= 0 && resolvedStart < durationSeconds
        ? resolvedStart
        : null;
      const screenshotReviewed = use.screenshotReviewed === true;
      return {
        useId: String(use.id || '').trim(),
        stepIndex: Number.isInteger(use.stepIndex) && use.stepIndex >= 0 && use.stepIndex < steps.length
          ? use.stepIndex
          : null,
        status: startSeconds !== null && screenshotReviewed ? 'reviewed' : 'unreviewed',
        startSeconds,
        screenshotReviewed,
        screenshotKey: typeof use.screenshotKey === 'string' && use.screenshotKey
          ? use.screenshotKey
          : null
      };
    });
    const items = steps.concat(cases);
    const status = durationSeconds !== null && items.length > 0
      && items.every((item) => item.status === 'reviewed')
      ? 'reviewed'
      : items.some((item) => item.startSeconds !== null || item.screenshotReviewed === true)
        ? 'in-progress'
        : 'unreviewed';
    return {
      recordId: String(record.id || '').trim(),
      videoId: String(record.videoId || '').trim(),
      durationSeconds,
      status,
      steps,
      cases
    };
  });
  return validateReview({ records: reviewRecords });
}

function selectPublicUses(uses, useIds) {
  if (!Array.isArray(uses) || !Array.isArray(useIds)) {
    throw new TypeError('public effect uses and IDs must be arrays');
  }
  const byId = new Map();
  for (const use of uses) {
    const id = use && typeof use.id === 'string' ? use.id.trim() : '';
    if (!id) {
      continue;
    }
    if (byId.has(id)) {
      throw new Error(`duplicate projected effect use ID: ${id}`);
    }
    byId.set(id, use);
  }

  const selected = [];
  const seen = new Set();
  for (const value of useIds) {
    const id = nonblankString(value, 'public use ID');
    if (seen.has(id)) {
      throw new Error(`duplicate public effect use ID: ${id}`);
    }
    seen.add(id);
    if (!byId.has(id)) {
      throw new Error(`unresolved public effect use ID: ${id}`);
    }
    selected.push(byId.get(id));
  }
  return selected;
}

function assertReviewIdentity(review, expected) {
  if (review.records.length !== expected.records.length) {
    throw new Error('existing review identity does not match the current site record count');
  }
  for (let recordIndex = 0; recordIndex < expected.records.length; recordIndex += 1) {
    const actualRecord = review.records[recordIndex];
    const expectedRecord = expected.records[recordIndex];
    if (
      actualRecord.recordId !== expectedRecord.recordId
      || actualRecord.videoId !== expectedRecord.videoId
    ) {
      throw new Error(`existing review identity does not match the current site at record ${recordIndex}`);
    }
    if (actualRecord.steps.length !== expectedRecord.steps.length) {
      throw new Error(`existing review step identity does not match the current site for ${actualRecord.recordId}`);
    }
    for (let stepIndex = 0; stepIndex < expectedRecord.steps.length; stepIndex += 1) {
      const actualStep = actualRecord.steps[stepIndex];
      const expectedStep = expectedRecord.steps[stepIndex];
      if (actualStep.order !== expectedStep.order || actualStep.name !== expectedStep.name) {
        throw new Error(`existing review step identity does not match the current site for ${actualRecord.recordId}`);
      }
    }
    if (actualRecord.cases.length !== expectedRecord.cases.length) {
      throw new Error(`existing review case identity does not match the curated public cases for ${actualRecord.recordId}`);
    }
    for (let caseIndex = 0; caseIndex < expectedRecord.cases.length; caseIndex += 1) {
      if (actualRecord.cases[caseIndex].useId !== expectedRecord.cases[caseIndex].useId) {
        throw new Error(`existing review case identity does not match the curated public cases for ${actualRecord.recordId}`);
      }
    }
  }
}

async function runCli(args, dependencies = {}) {
  const fsImpl = dependencies.fs || fs;
  const startServer = dependencies.startServer || startReviewServer;
  const parseSiteData = dependencies.parseSiteData || siteData.parse;
  const buildReviewQueue = dependencies.buildReviewQueue || reviewData.buildReviewQueue;
  const buildEffectUses = dependencies.buildEffectUses || knowledgeModel.buildEffectUses;
  const publicUseIds = dependencies.publicUseIds || publicEffectUseManifest.useIds;
  const stdout = dependencies.stdout || process.stdout;
  const parsed = parseArguments(args);
  const indexPath = path.resolve(parsed.indexPath);
  const repoRoot = path.dirname(indexPath);
  const workPath = path.resolve(parsed.workPath);
  const expectedIndex = path.join(repoRoot, 'index.html');
  const expectedWork = path.join(repoRoot, '.work', 'timeline-review');
  if (!samePath(indexPath, expectedIndex)) {
    throw new Error('index path must be the repository index.html');
  }
  if (!samePath(workPath, expectedWork)) {
    throw new Error('work path must be the fixed .work/timeline-review directory');
  }
  assertNoSymlinkComponents(fsImpl, repoRoot, indexPath);
  assertNoSymlinkComponents(fsImpl, repoRoot, workPath);

  const html = fsImpl.readFileSync(indexPath, 'utf8');
  const { records } = parseSiteData(html);
  const tracks = existingTracks(fsImpl, repoRoot, records);
  const queue = buildReviewQueue(records, tracks);
  const publicUses = selectPublicUses(buildEffectUses(records), publicUseIds);
  const generatedReview = initialReview(records, publicUses);
  const reviewPath = path.join(workPath, 'review.json');
  let review = generatedReview;
  if (fsImpl.existsSync(reviewPath)) {
    assertNoSymlinkComponents(fsImpl, repoRoot, reviewPath);
    review = validateReview(JSON.parse(fsImpl.readFileSync(reviewPath, 'utf8')));
    assertReviewIdentity(review, generatedReview);
  }
  const writeState = atomicReviewWriter(fsImpl, repoRoot, workPath);
  const fixture = await startServer({
    port: parsed.port,
    queue,
    review,
    writeState,
    title: 'SFX Timeline Review Workbench'
  });
  if (fixture && fixture.url) {
    stdout.write(`Timeline review: ${fixture.url}/?token=${fixture.token}\n`);
  }
  return fixture;
}

const api = Object.freeze({ MAX_BODY_BYTES, startReviewServer, validateReview, runCli });
module.exports = api;

if (require.main === module) {
  runCli(process.argv.slice(2)).then((fixture) => {
    const stop = async () => {
      try {
        await fixture.close();
        process.exitCode = 0;
      } catch (error) {
        process.stderr.write(`${error.stack || error.message}\n`);
        process.exitCode = 1;
      }
    };
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
  }).catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
