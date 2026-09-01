'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { types } = require('node:util');

const projectLearningMap = require('../src/learning-map.js').project;

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const ENTRY_KEYS = Object.freeze(['videoId', 'reviewed', 'reviewedAt', 'learningMap', 'steps']);
const LEARNING_MAP_KEYS = Object.freeze([
  'version', 'goal', 'roles', 'decisions', 'sequence', 'chapters'
]);
const ROLE_KEYS = Object.freeze(['name', 'description']);
const CHAPTER_KEYS = Object.freeze(['id', 'title', 'question', 'summary', 'stepOrders']);
const STEP_KEYS = Object.freeze(['order', 'learning']);
const LEARNING_KEYS = Object.freeze(['input', 'problem', 'action', 'result']);

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function relativePath(root, filename) {
  return path.relative(root, filename).split(path.sep).join('/');
}

function dataVideoId(value) {
  if (!value || typeof value !== 'object') return '';
  try {
    const descriptor = Object.getOwnPropertyDescriptor(value, 'videoId');
    return descriptor && Object.hasOwn(descriptor, 'value') && typeof descriptor.value === 'string'
      ? descriptor.value
      : '';
  } catch (_error) {
    return '';
  }
}

function contextLabel(context, videoId) {
  const filename = context && context.path ? context.path : '<memory>';
  return `[videoId ${videoId || 'unknown'}] [path ${filename}]`;
}

function invalid(context, videoId, field, reason, ErrorType = Error) {
  throw new ErrorType(`${contextLabel(context, videoId)} ${field} ${reason}`);
}

function cloneArray(value, field, context, videoId, ancestors) {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    invalid(context, videoId, field, 'must be plain data using Array.prototype', TypeError);
  }

  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
  const length = lengthDescriptor && lengthDescriptor.value;
  if (!Number.isSafeInteger(length) || length < 0) {
    invalid(context, videoId, field, 'must have a valid array length', TypeError);
  }

  const result = new Array(length);
  let elementCount = 0;
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') continue;
    if (typeof key !== 'string') {
      invalid(context, videoId, field, 'must not contain symbol keys', TypeError);
    }
    const index = Number(key);
    if (!Number.isSafeInteger(index) || index < 0 || index >= length || String(index) !== key) {
      invalid(context, videoId, field, `must not contain extra array key ${JSON.stringify(key)}`, TypeError);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      invalid(context, videoId, `${field}[${key}]`, 'must not be an accessor', TypeError);
    }
    if (!descriptor.enumerable) {
      invalid(context, videoId, `${field}[${key}]`, 'must be enumerable plain data', TypeError);
    }
    result[index] = cloneData(descriptor.value, `${field}[${key}]`, context, videoId, ancestors);
    elementCount += 1;
  }

  if (elementCount !== length) {
    invalid(context, videoId, field, 'must be a dense array without holes', TypeError);
  }
  return result;
}

function cloneObject(value, field, context, videoId, ancestors) {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    invalid(context, videoId, field, 'must be a plain data object', TypeError);
  }

  const result = Object.create(prototype);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') {
      invalid(context, videoId, field, 'must not contain symbol keys', TypeError);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !Object.hasOwn(descriptor, 'value')) {
      invalid(context, videoId, `${field}.${key}`, 'must not be an accessor', TypeError);
    }
    if (!descriptor.enumerable) {
      invalid(context, videoId, `${field}.${key}`, 'must be enumerable plain data', TypeError);
    }
    Object.defineProperty(result, key, {
      value: cloneData(descriptor.value, `${field}.${key}`, context, videoId, ancestors),
      enumerable: true,
      writable: true,
      configurable: true
    });
  }
  return result;
}

function cloneData(value, field, context, videoId, ancestors = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      invalid(context, videoId, field, 'must be a finite JSON number', TypeError);
    }
    return value;
  }
  if (typeof value !== 'object') {
    invalid(context, videoId, field, `must be plain data, not ${typeof value}`, TypeError);
  }
  if (types.isProxy(value)) {
    invalid(context, videoId, field, 'must not be a proxy', TypeError);
  }
  if (ancestors.has(value)) {
    invalid(context, videoId, field, 'must not contain cycles', TypeError);
  }

  ancestors.add(value);
  try {
    return Array.isArray(value)
      ? cloneArray(value, field, context, videoId, ancestors)
      : cloneObject(value, field, context, videoId, ancestors);
  } finally {
    ancestors.delete(value);
  }
}

function requireExactKeys(value, expected, field, context, videoId) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    invalid(context, videoId, field, 'must be an object');
  }
  const expectedSet = new Set(expected);
  for (const key of Object.keys(value)) {
    if (!expectedSet.has(key)) invalid(context, videoId, `${field}.${key}`, 'is not allowed');
  }
  for (const key of expected) {
    if (!Object.hasOwn(value, key)) invalid(context, videoId, `${field}.${key}`, 'is required');
  }
}

function isRealDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function validateShape(entry, context) {
  const hintedVideoId = dataVideoId(entry);
  const safeEntry = cloneData(entry, 'entry', context, hintedVideoId);
  const videoId = safeEntry.videoId;

  requireExactKeys(safeEntry, ENTRY_KEYS, 'entry', context, videoId);
  if (typeof videoId !== 'string' || !VIDEO_ID_PATTERN.test(videoId)) {
    invalid(context, videoId, 'entry.videoId', 'must be an 11-character videoId');
  }
  if (safeEntry.reviewed !== true) {
    invalid(context, videoId, 'entry.reviewed', 'must be strictly true');
  }
  if (!isRealDate(safeEntry.reviewedAt)) {
    invalid(context, videoId, 'entry.reviewedAt', 'must be a real YYYY-MM-DD date');
  }

  requireExactKeys(safeEntry.learningMap, LEARNING_MAP_KEYS, 'entry.learningMap', context, videoId);
  if (!Array.isArray(safeEntry.learningMap.roles)) {
    invalid(context, videoId, 'entry.learningMap.roles', 'must be an array');
  }
  safeEntry.learningMap.roles.forEach((role, index) => {
    requireExactKeys(role, ROLE_KEYS, `entry.learningMap.roles[${index}]`, context, videoId);
  });
  if (!Array.isArray(safeEntry.learningMap.decisions)) {
    invalid(context, videoId, 'entry.learningMap.decisions', 'must be an array');
  }
  if (!Array.isArray(safeEntry.learningMap.chapters)) {
    invalid(context, videoId, 'entry.learningMap.chapters', 'must be an array');
  }
  safeEntry.learningMap.chapters.forEach((chapter, index) => {
    requireExactKeys(chapter, CHAPTER_KEYS, `entry.learningMap.chapters[${index}]`, context, videoId);
  });

  if (!Array.isArray(safeEntry.steps)) {
    invalid(context, videoId, 'entry.steps', 'must be an array');
  }
  safeEntry.steps.forEach((step, index) => {
    requireExactKeys(step, STEP_KEYS, `entry.steps[${index}]`, context, videoId);
    requireExactKeys(step.learning, LEARNING_KEYS, `entry.steps[${index}].learning`, context, videoId);
  });
  return safeEntry;
}

function discover(root, options = {}) {
  const fsImpl = options.fsImpl || fs;
  const resolvedRoot = path.resolve(root);
  if (!fsImpl.existsSync(resolvedRoot)) return [];

  const filenames = [];
  function visit(directory) {
    const entries = fsImpl.readdirSync(directory, { withFileTypes: true })
      .slice()
      .sort((left, right) => compareText(left.name, right.name));
    for (const entry of entries) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        visit(filename);
      } else if (entry.isFile() && path.extname(entry.name) === '.json') {
        filenames.push(filename);
      }
    }
  }
  visit(resolvedRoot);

  return filenames
    .map((filename) => {
      const relative = relativePath(resolvedRoot, filename);
      return {
        path: filename,
        relativePath: relative,
        category: relative.split('/')[0] || ''
      };
    })
    .sort((left, right) => compareText(left.relativePath, right.relativePath));
}

function recordIndex(records) {
  if (!Array.isArray(records)) throw new TypeError('records must be an array');
  const index = new Map();
  records.forEach((record, position) => {
    const videoId = dataVideoId(record);
    if (!VIDEO_ID_PATTERN.test(videoId)) {
      throw new Error(`[site record ${position}] videoId must be an 11-character videoId`);
    }
    if (index.has(videoId)) throw new Error(`[videoId ${videoId}] duplicate site videoId`);
    index.set(videoId, record);
  });
  return index;
}

function mergeEntry(record, entry, options = {}) {
  const hintedVideoId = dataVideoId(entry) || dataVideoId(record);
  const context = { path: options.path || '<memory>' };
  const safeRecord = cloneData(record, 'record', context, hintedVideoId);
  const safeEntry = cloneData(entry, 'entry', context, hintedVideoId);
  const videoId = safeEntry.videoId || safeRecord.videoId || hintedVideoId;

  if (safeRecord.videoId !== safeEntry.videoId) {
    invalid(context, videoId, 'entry.videoId', `must match record.videoId ${safeRecord.videoId}`);
  }
  if (!Array.isArray(safeRecord.steps)) {
    invalid(context, videoId, 'record.steps', 'must be an array');
  }
  if (!Array.isArray(safeEntry.steps)) {
    invalid(context, videoId, 'entry.steps', 'must be an array');
  }

  const recordSteps = new Map();
  safeRecord.steps.forEach((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      invalid(context, videoId, `record.steps[${index}]`, 'must be an object');
    }
    if (!Object.hasOwn(step, 'order')) {
      invalid(context, videoId, `record.steps[${index}].order`, 'is missing');
    }
    if (!Number.isInteger(step.order) || step.order <= 0) {
      invalid(context, videoId, `record.steps[${index}].order`, 'must be a positive integer');
    }
    if (recordSteps.has(step.order)) {
      invalid(context, videoId, `record.steps[${index}].order`, `is a duplicate order ${step.order}`);
    }
    recordSteps.set(step.order, step);
  });

  const learningByOrder = new Map();
  safeEntry.steps.forEach((step, index) => {
    if (!step || typeof step !== 'object' || Array.isArray(step)) {
      invalid(context, videoId, `entry.steps[${index}]`, 'must be an object');
    }
    if (!Object.hasOwn(step, 'order')) {
      invalid(context, videoId, `entry.steps[${index}].order`, 'is missing');
    }
    if (!Number.isInteger(step.order) || step.order <= 0) {
      invalid(context, videoId, `entry.steps[${index}].order`, 'must be a positive integer');
    }
    if (learningByOrder.has(step.order)) {
      invalid(context, videoId, `entry.steps[${index}].order`, `is a duplicate order ${step.order}`);
    }
    if (!recordSteps.has(step.order)) {
      invalid(context, videoId, `entry.steps[${index}].order`, `is unknown order ${step.order}`);
    }
    learningByOrder.set(step.order, step.learning);
  });

  const missingOrders = [...recordSteps.keys()].filter((order) => !learningByOrder.has(order));
  if (missingOrders.length > 0) {
    invalid(context, videoId, 'entry.steps', `is missing order(s): ${missingOrders.join(', ')}`);
  }

  safeRecord.learningMap = cloneData(safeEntry.learningMap, 'entry.learningMap', context, videoId);
  safeRecord.steps.forEach((step) => {
    step.learning = cloneData(
      learningByOrder.get(step.order),
      `entry.steps[order=${step.order}].learning`,
      context,
      videoId
    );
  });
  return safeRecord;
}

function validateEntry(entry, options = {}) {
  const context = { path: options.path || '<memory>' };
  const safeEntry = validateShape(entry, context);
  const videoId = safeEntry.videoId;
  const record = options.record;

  if (!record) invalid(context, videoId, 'record', 'is required for validation');
  if (safeEntry.videoId !== dataVideoId(record)) {
    invalid(context, videoId, 'entry.videoId', `must match site record ${dataVideoId(record)}`);
  }
  if (typeof options.category === 'string' && options.category !== record.category) {
    invalid(
      context,
      videoId,
      'category',
      `${JSON.stringify(options.category)} must match site category ${JSON.stringify(record.category)}`
    );
  }

  const merged = mergeEntry(record, safeEntry, { path: context.path });
  if (!projectLearningMap(merged, { steps: merged.steps })) {
    invalid(context, videoId, 'entry.learningMap', 'cannot be projected by src/learning-map.js project');
  }
  return safeEntry;
}

function load(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('load options must be an object');
  }
  const fsImpl = options.fsImpl || fs;
  const recordsById = recordIndex(options.records);
  const descriptors = discover(options.root, { fsImpl });
  const seen = new Map();
  const loaded = [];

  for (const descriptor of descriptors) {
    let parsed;
    try {
      parsed = JSON.parse(fsImpl.readFileSync(descriptor.path, 'utf8'));
    } catch (error) {
      throw new Error(`[path ${descriptor.path}] invalid JSON: ${error.message}`);
    }

    const videoId = dataVideoId(parsed);
    const expectedFilename = `${videoId}.json`;
    if (!videoId || path.basename(descriptor.path) !== expectedFilename) {
      throw new Error(
        `${contextLabel({ path: descriptor.path }, videoId)} filename must equal entry.videoId + .json (${expectedFilename})`
      );
    }
    if (!recordsById.has(videoId)) {
      throw new Error(`${contextLabel({ path: descriptor.path }, videoId)} unknown site videoId`);
    }
    if (seen.has(videoId)) {
      throw new Error(
        `${contextLabel({ path: descriptor.path }, videoId)} duplicate catalog videoId; first path ${seen.get(videoId)}`
      );
    }
    const record = recordsById.get(videoId);
    if (descriptor.category !== record.category) {
      throw new Error(
        `${contextLabel({ path: descriptor.path }, videoId)} category ${JSON.stringify(descriptor.category)} ` +
        `must match site category ${JSON.stringify(record.category)}`
      );
    }

    const validated = validateEntry(parsed, {
      record,
      path: descriptor.path,
      category: descriptor.category
    });
    seen.set(videoId, descriptor.path);
    loaded.push({ ...descriptor, entry: validated });
  }
  return loaded;
}

function validateCoverage(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('coverage options must be an object');
  }
  const records = options.records;
  const entries = options.entries;
  if (!Array.isArray(records)) throw new TypeError('coverage records must be an array');
  if (!Array.isArray(entries)) throw new TypeError('coverage entries must be an array');

  const recordsById = recordIndex(records);
  const coveredIds = new Set();
  entries.forEach((descriptor, index) => {
    const entry = descriptor && descriptor.entry;
    const videoId = dataVideoId(entry);
    if (!recordsById.has(videoId)) {
      throw new Error(`[entry ${index}] unknown selected videoId ${videoId || 'unknown'}`);
    }
    if (coveredIds.has(videoId)) throw new Error(`[videoId ${videoId}] duplicate selected catalog entry`);
    coveredIds.add(videoId);
  });

  const missingVideoIds = records
    .map((record) => record.videoId)
    .filter((videoId) => !coveredIds.has(videoId));
  const totalSteps = records.reduce((total, record) => {
    if (!Array.isArray(record.steps)) throw new Error(`[videoId ${record.videoId}] record.steps must be an array`);
    return total + record.steps.length;
  }, 0);
  const coveredSteps = records.reduce((total, record) => (
    total + (coveredIds.has(record.videoId) ? record.steps.length : 0)
  ), 0);
  const incomplete = missingVideoIds.length > 0;
  const coverage = {
    coverage: incomplete ? (options.allowIncomplete ? 'incomplete-allowed' : 'incomplete') : 'complete',
    records: { covered: coveredIds.size, total: records.length },
    steps: { covered: coveredSteps, total: totalSteps },
    missingVideoIds
  };

  if (incomplete && !options.allowIncomplete) {
    const error = new Error(
      `Learning-map coverage incomplete; missing catalog videoIds: ${missingVideoIds.join(', ')}`
    );
    error.coverageReport = coverage;
    throw error;
  }
  return coverage;
}

function build(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('build options must be an object');
  }
  const coverage = validateCoverage(options);
  const entriesById = new Map(options.entries.map((descriptor) => [
    descriptor.entry.videoId,
    descriptor
  ]));
  const records = options.records.map((record) => {
    const descriptor = entriesById.get(record.videoId);
    return descriptor
      ? mergeEntry(record, descriptor.entry, { path: descriptor.path })
      : cloneData(record, 'record', { path: '<site records>' }, record.videoId);
  });
  return { records, coverage };
}

module.exports = Object.freeze({
  discover,
  load,
  validateEntry,
  mergeEntry,
  validateCoverage,
  build
});
