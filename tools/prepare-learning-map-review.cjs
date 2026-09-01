'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const siteData = require('./site-data.cjs');
const defaultSubtitleApi = require('../src/video-subtitles.js');

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const CATEGORY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROBLEM_PREFIX = '视频未单独说明处理前问题';
const STEP_REVIEW_KEYS = Object.freeze(['effectUses', 'subtitle', 'image']);
let temporarySequence = 0;

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function parseArguments(args) {
  if (!Array.isArray(args)) throw new TypeError('args must be an array');
  let category = null;
  let videos = null;
  const seen = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument !== '--category' && argument !== '--videos') {
      throw new Error(`Unknown argument: ${argument}`);
    }
    if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
    seen.add(argument);
    if (index + 1 >= args.length || String(args[index + 1]).startsWith('--')) {
      throw new Error(`Missing value for argument: ${argument}`);
    }

    const value = args[index + 1];
    index += 1;
    if (argument === '--category') {
      if (typeof value !== 'string' || !CATEGORY_PATTERN.test(value)) {
        throw new Error(`Invalid category: ${value}`);
      }
      category = value;
      continue;
    }

    const selected = typeof value === 'string' ? value.split(',') : [];
    if (selected.length === 0 || selected.some((videoId) => !VIDEO_ID_PATTERN.test(videoId))) {
      throw new Error(`Invalid --videos value: ${value}`);
    }
    if (new Set(selected).size !== selected.length) {
      throw new Error('Duplicate videoId in --videos');
    }
    videos = selected;
  }

  return { category, videos };
}

function selectRecords(records, parsed) {
  if (!Array.isArray(records)) throw new TypeError('site records must be an array');
  const recordsById = new Map(records.map((record) => [record && record.videoId, record]));
  if (parsed.videos) {
    const unknown = parsed.videos.filter((videoId) => !recordsById.has(videoId));
    if (unknown.length > 0) {
      throw new Error(`Unknown site videoId(s) requested: ${unknown.join(', ')}`);
    }
  }

  const selectedIds = parsed.videos ? new Set(parsed.videos) : null;
  const selected = records.filter((record) => (
    (!parsed.category || record.category === parsed.category) &&
    (!selectedIds || selectedIds.has(record.videoId))
  ));
  if (selected.length === 0) {
    throw new Error('No records match the requested selection');
  }
  return selected;
}

function validateCue(cue, index, previousEnd) {
  if (!isPlainObject(cue)) throw new Error(`subtitle cue ${index} must be an object`);
  if (typeof cue.start !== 'number' || !Number.isFinite(cue.start) || cue.start < 0) {
    throw new Error(`subtitle cue ${index}.start must be a finite non-negative number`);
  }
  if (typeof cue.end !== 'number' || !Number.isFinite(cue.end) || cue.end <= cue.start) {
    throw new Error(`subtitle cue ${index}.end must be after start`);
  }
  if (cue.start < previousEnd) throw new Error(`subtitle cue ${index} overlaps the previous cue`);
  requiredText(cue.text, `subtitle cue ${index}.text`);
  return cue.end;
}

function validateSubtitleTrack(track, entry, videoId) {
  if (!isPlainObject(track)) throw new Error(`[videoId ${videoId}] subtitle track must be an object`);
  for (const key of ['videoId', 'language', 'source', 'reviewStatus', 'updatedAt']) {
    if (track[key] !== entry[key]) {
      throw new Error(`[videoId ${videoId}] subtitle track ${key} does not match the site catalog`);
    }
  }
  if (!Array.isArray(track.cues) || track.cues.length === 0) {
    throw new Error(`[videoId ${videoId}] subtitle track cues must be a non-empty array`);
  }
  let previousEnd = -1;
  track.cues.forEach((cue, index) => {
    previousEnd = validateCue(cue, index, previousEnd);
  });
  return cloneJson(track);
}

function isInside(base, target) {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function loadSubtitle(root, record, fsImpl, subtitleApi) {
  const entry = subtitleApi && typeof subtitleApi.entryFor === 'function'
    ? subtitleApi.entryFor(record.videoId)
    : null;
  if (!entry) {
    return {
      status: 'missing',
      catalog: null,
      track: null,
      reason: 'Subtitle catalog entry is missing.'
    };
  }

  if (entry.contentStatus === 'missing' || entry.contentStatus === 'no-speech') {
    return {
      status: entry.contentStatus,
      catalog: cloneJson(entry),
      track: null,
      reason: entry.reason || entry.auditNote || null
    };
  }
  if (entry.contentStatus !== 'track') {
    throw new Error(`[videoId ${record.videoId}] unknown subtitle status ${entry.contentStatus}`);
  }

  const assetPath = path.resolve(root, entry.asset);
  if (!isInside(root, assetPath)) {
    throw new Error(`[videoId ${record.videoId}] subtitle asset escapes the repository`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fsImpl.readFileSync(assetPath, 'utf8'));
  } catch (error) {
    throw new Error(`[videoId ${record.videoId}] invalid local subtitle JSON: ${error.message}`);
  }
  return {
    status: 'track',
    catalog: cloneJson(entry),
    track: validateSubtitleTrack(parsed, entry, record.videoId),
    reason: null
  };
}

function imageOwners(records) {
  const owners = new Map();
  records.forEach((record) => {
    if (!record || !Array.isArray(record.steps)) return;
    record.steps.forEach((step, stepIndex) => {
      if (!step || typeof step.imageKey !== 'string' || !step.imageKey.trim()) return;
      if (!owners.has(step.imageKey)) owners.set(step.imageKey, []);
      owners.get(step.imageKey).push({
        recordId: record.id,
        videoId: record.videoId,
        stepIndex,
        stepOrder: step.order
      });
    });
  });
  return owners;
}

function imageEvidence(key, owners, manifest, label) {
  if (typeof key !== 'string' || !key.trim()) {
    return { key: null, owners: [], manifest: null };
  }
  if (!Object.prototype.hasOwnProperty.call(manifest, key)) {
    throw new Error(`${label} imageKey ${JSON.stringify(key)} is missing from imageManifest`);
  }
  return {
    key,
    owners: cloneJson(owners.get(key) || []),
    manifest: cloneJson(manifest[key])
  };
}

function orderedEffectUse(effectUse, record, step, stepIndex, screenshot) {
  const effect = {};
  const orderedKeys = ['id', 'name', 'vendor', 'category'];
  for (const key of orderedKeys) {
    if (Object.prototype.hasOwnProperty.call(effectUse, key)) effect[key] = cloneJson(effectUse[key]);
  }
  effect.recordId = record.id;
  effect.videoId = record.videoId;
  effect.stepIndex = stepIndex;
  effect.stepOrder = step ? step.order : null;
  for (const key of ['screenshotKey', 'timestamp', 'startSeconds']) {
    effect[key] = Object.prototype.hasOwnProperty.call(effectUse, key)
      ? cloneJson(effectUse[key])
      : null;
  }
  for (const key of Object.keys(effectUse)) {
    if (!Object.prototype.hasOwnProperty.call(effect, key)) effect[key] = cloneJson(effectUse[key]);
  }
  effect.screenshot = screenshot;
  return effect;
}

function effectEvidence(record, owners, imageManifest) {
  if (!Array.isArray(record.effectUses)) return [];
  return record.effectUses.map((effectUse, effectIndex) => {
    if (!isPlainObject(effectUse)) {
      throw new Error(`[videoId ${record.videoId}] effectUses[${effectIndex}] must be an object`);
    }
    const stepIndex = effectUse.stepIndex;
    if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= record.steps.length) {
      throw new Error(`[videoId ${record.videoId}] effectUses[${effectIndex}].stepIndex is invalid`);
    }
    const step = record.steps[stepIndex];
    if (Object.prototype.hasOwnProperty.call(effectUse, 'stepOrder') && effectUse.stepOrder !== step.order) {
      throw new Error(`[videoId ${record.videoId}] effectUses[${effectIndex}].stepOrder does not match its step`);
    }

    let screenshot;
    if (effectUse.screenshotKey === null || typeof effectUse.screenshotKey === 'undefined') {
      screenshot = { key: null, owners: [], manifest: null };
    } else {
      if (effectUse.screenshotKey !== step.imageKey) {
        throw new Error(
          `[videoId ${record.videoId}] effectUses[${effectIndex}].screenshotKey does not match step order ${step.order}`
        );
      }
      screenshot = imageEvidence(
        effectUse.screenshotKey,
        owners,
        imageManifest,
        `[videoId ${record.videoId}] effectUses[${effectIndex}]`
      );
      if (!screenshot.owners.some((owner) => (
        owner.videoId === record.videoId && owner.stepIndex === stepIndex && owner.stepOrder === step.order
      ))) {
        throw new Error(
          `[videoId ${record.videoId}] effectUses[${effectIndex}].screenshotKey has no matching step owner`
        );
      }
    }
    return orderedEffectUse(effectUse, record, step, stepIndex, screenshot);
  });
}

function subtitleWindow(record, stepIndex) {
  const step = record.steps[stepIndex];
  if (typeof step.startSeconds !== 'number' || !Number.isFinite(step.startSeconds) || step.startSeconds < 0) {
    return null;
  }
  const seconds = step.startSeconds;
  const starts = record.steps
    .map((candidate) => candidate && candidate.startSeconds)
    .filter((value) => typeof value === 'number' && Number.isFinite(value) && value >= 0)
    .sort((left, right) => left - right);
  const previous = starts.filter((value) => value < seconds).pop();
  const next = starts.find((value) => value > seconds);
  const start = Math.max(0, seconds - 15, previous === undefined ? 0 : (previous + seconds) / 2);
  const end = Math.min(seconds + 20, next === undefined ? seconds + 20 : (seconds + next) / 2);
  return { start, end };
}

function subtitleEvidenceForStep(record, stepIndex, subtitle) {
  const window = subtitleWindow(record, stepIndex);
  if (subtitle.status !== 'track') {
    return {
      status: subtitle.status,
      window,
      cues: [],
      reason: subtitle.reason || null
    };
  }
  const cues = window
    ? subtitle.track.cues.filter((cue) => cue.end >= window.start && cue.start <= window.end)
    : [];
  return {
    status: 'track',
    window,
    cues: cloneJson(cues),
    reason: window ? null : 'Step has no public startSeconds.'
  };
}

function firstSentence(value) {
  const text = requiredText(value, 'record.summary').trim();
  const match = text.match(/^.*?[。！？.!?](?:[”’"']|$)?/u);
  return match ? match[0].trim() : text;
}

function draftRoles(materials) {
  return materials.slice(0, 3).map((material, index) => {
    const text = requiredText(material, `record.materials[${index}]`).trim();
    return { name: text, description: text };
  });
}

function chapterRanges(steps) {
  if (steps.length < 2) throw new Error('record.steps must contain at least two steps for a review draft');
  const chapterCount = Math.min(5, Math.max(2, Math.ceil(steps.length / 5)));
  const baseSize = Math.floor(steps.length / chapterCount);
  const remainder = steps.length % chapterCount;
  const chapters = [];
  let offset = 0;

  for (let chapterIndex = 0; chapterIndex < chapterCount; chapterIndex += 1) {
    const size = baseSize + (chapterIndex < remainder ? 1 : 0);
    const range = steps.slice(offset, offset + size);
    const first = range[0];
    const last = range[range.length - 1];
    chapters.push({
      id: `steps-${first.order}-${last.order}`,
      title: requiredText(first.name, `record.steps[${offset}].name`).trim(),
      question: requiredText(first.name, `record.steps[${offset}].name`).trim(),
      summary: requiredText(first.detail, `record.steps[${offset}].detail`).trim(),
      stepOrders: range.map((step) => step.order)
    });
    offset += size;
  }
  return chapters;
}

function draftLearning(step, index) {
  const materials = Array.isArray(step.materials) ? step.materials : [];
  const input = materials.find((material) => typeof material === 'string' && material.trim()) || step.name;
  const action = requiredText(step.detail, `record.steps[${index}].detail`).trim();
  const params = Array.isArray(step.params) ? step.params : [];
  const result = params.find((parameter) => typeof parameter === 'string' && parameter.trim()) || step.detail;
  return {
    input: requiredText(input, `record.steps[${index}] draft input`).trim(),
    problem: PROBLEM_PREFIX,
    action,
    result: requiredText(result, `record.steps[${index}] draft result`).trim()
  };
}

function draftFor(record) {
  if (!Array.isArray(record.coreIdeas)) throw new Error('record.coreIdeas must be an array');
  if (!Array.isArray(record.materials)) throw new Error('record.materials must be an array');
  if (!Array.isArray(record.steps)) throw new Error('record.steps must be an array');
  const steps = record.steps;
  return {
    videoId: record.videoId,
    reviewed: false,
    reviewedAt: null,
    learningMap: {
      version: 1,
      goal: firstSentence(record.summary),
      roles: draftRoles(record.materials),
      decisions: record.coreIdeas.slice(0, 3).map((idea, index) => (
        requiredText(idea, `record.coreIdeas[${index}]`).trim()
      )),
      sequence: steps.map((step, index) => requiredText(step.name, `record.steps[${index}].name`).trim()).join(' → '),
      chapters: chapterRanges(steps)
    },
    steps: steps.map((step, index) => ({ order: step.order, learning: draftLearning(step, index) }))
  };
}

function buildPacket(options) {
  if (!isPlainObject(options)) throw new TypeError('packet options must be an object');
  const record = options.record;
  if (!isPlainObject(record)) throw new TypeError('packet record must be an object');
  requiredText(record.id, 'record.id');
  if (!VIDEO_ID_PATTERN.test(record.videoId || '')) throw new Error('record.videoId must be an 11-character videoId');
  if (!CATEGORY_PATTERN.test(record.category || '')) throw new Error('record.category is invalid');
  if (!Array.isArray(record.steps)) throw new Error('record.steps must be an array');
  if (!isPlainObject(options.imageManifest)) throw new TypeError('imageManifest must be an object');
  const records = Array.isArray(options.records) ? options.records : [record];
  const owners = imageOwners(records);
  const effects = effectEvidence(record, owners, options.imageManifest);
  const effectsByStep = new Map();
  effects.forEach((effect) => {
    if (!effectsByStep.has(effect.stepIndex)) effectsByStep.set(effect.stepIndex, []);
    effectsByStep.get(effect.stepIndex).push(effect);
  });
  const subtitle = options.subtitle;
  if (!isPlainObject(subtitle) || !['track', 'missing', 'no-speech'].includes(subtitle.status)) {
    throw new Error(`[videoId ${record.videoId}] subtitle evidence has an invalid status`);
  }

  const images = [];
  const imagesByKey = new Map();
  record.steps.forEach((step, stepIndex) => {
    if (!isPlainObject(step)) throw new Error(`[videoId ${record.videoId}] step ${stepIndex} must be an object`);
    if (!Number.isInteger(step.order) || step.order <= 0) {
      throw new Error(`[videoId ${record.videoId}] step ${stepIndex}.order must be a positive integer`);
    }
    if (typeof step.imageKey === 'string' && step.imageKey.trim() && !imagesByKey.has(step.imageKey)) {
      const image = imageEvidence(
        step.imageKey,
        owners,
        options.imageManifest,
        `[videoId ${record.videoId}] step order ${step.order}`
      );
      imagesByKey.set(step.imageKey, image);
      images.push(image);
    }
  });

  const evidenceSteps = record.steps.map((step, stepIndex) => {
    for (const key of STEP_REVIEW_KEYS) {
      if (Object.prototype.hasOwnProperty.call(step, key)) {
        throw new Error(`[videoId ${record.videoId}] step order ${step.order} reserves field ${key}`);
      }
    }
    const result = cloneJson(step);
    result.effectUses = cloneJson(effectsByStep.get(stepIndex) || []);
    result.subtitle = subtitleEvidenceForStep(record, stepIndex, subtitle);
    result.image = typeof step.imageKey === 'string' && step.imageKey.trim()
      ? cloneJson(imagesByKey.get(step.imageKey))
      : { key: null, owners: [], manifest: null };
    return result;
  });

  const subtitleSummary = {
    status: subtitle.status,
    catalog: subtitle.catalog ? cloneJson(subtitle.catalog) : null,
    track: subtitle.status === 'track'
      ? {
          videoId: subtitle.track.videoId,
          language: subtitle.track.language,
          source: subtitle.track.source,
          reviewStatus: subtitle.track.reviewStatus,
          updatedAt: subtitle.track.updatedAt,
          cueCount: subtitle.track.cues.length
        }
      : null,
    reason: subtitle.reason || null
  };

  return {
    videoId: record.videoId,
    recordId: record.id,
    category: record.category,
    evidence: {
      identity: {
        id: record.id,
        videoId: record.videoId,
        title: requiredText(record.title, 'record.title'),
        source: requiredText(record.source, 'record.source'),
        url: requiredText(record.url, 'record.url')
      },
      summary: requiredText(record.summary, 'record.summary'),
      coreIdeas: cloneJson(record.coreIdeas),
      materials: cloneJson(record.materials),
      steps: evidenceSteps,
      effectUses: effects,
      images,
      subtitles: subtitleSummary
    },
    draft: draftFor(record)
  };
}

function serializePacket(packet) {
  return JSON.stringify(packet, null, 2) + '\n';
}

function temporaryPathFor(target) {
  temporarySequence += 1;
  const token = crypto.randomBytes(12).toString('hex');
  return path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.${temporarySequence}.${token}.tmp`
  );
}

function atomicWriteFile(options) {
  if (!isPlainObject(options)) throw new TypeError('atomic write options must be an object');
  const fsImpl = options.fsImpl || fs;
  const target = path.resolve(options.target);
  const temporary = temporaryPathFor(target);
  let descriptor;
  let ownsTemporary = false;
  let closeAttempted = false;

  try {
    if (typeof options.validateTarget === 'function') options.validateTarget();
    descriptor = fsImpl.openSync(temporary, 'wx');
    ownsTemporary = true;
    let operationError = null;
    let closeError = null;
    try {
      fsImpl.writeFileSync(descriptor, options.content, { encoding: 'utf8' });
      if (typeof fsImpl.fsyncSync === 'function') fsImpl.fsyncSync(descriptor);
    } catch (error) {
      operationError = error;
    }

    closeAttempted = true;
    try {
      fsImpl.closeSync(descriptor);
    } catch (error) {
      closeError = error;
    }
    descriptor = undefined;
    if (operationError) throw operationError;
    if (closeError) throw closeError;
    if (typeof options.validateTarget === 'function') options.validateTarget();
    fsImpl.renameSync(temporary, target);
    ownsTemporary = false;
    return target;
  } finally {
    if (descriptor !== undefined && !closeAttempted) {
      try { fsImpl.closeSync(descriptor); } catch (_error) {}
    }
    if (ownsTemporary && fsImpl.existsSync(temporary)) {
      fsImpl.rmSync(temporary, { force: true });
    }
  }
}

function realpath(fsImpl, filename) {
  const implementation = fsImpl.realpathSync && fsImpl.realpathSync.native
    ? fsImpl.realpathSync.native.bind(fsImpl.realpathSync)
    : fsImpl.realpathSync.bind(fsImpl);
  return implementation(filename);
}

function assertOrdinaryDirectory(fsImpl, directory, rootReal) {
  const stat = fsImpl.lstatSync(directory);
  if (stat.isSymbolicLink()) {
    throw new Error(`Refusing symlink, junction, or reparse-point output directory: ${directory}`);
  }
  if (!stat.isDirectory()) throw new Error(`Output path is not a directory: ${directory}`);
  const resolved = realpath(fsImpl, directory);
  if (!isInside(rootReal, resolved)) {
    throw new Error(`Output directory escapes the repository: ${directory}`);
  }
}

function ensureSafeTarget(root, category, videoId, fsImpl) {
  if (!CATEGORY_PATTERN.test(category)) throw new Error(`Invalid output category: ${category}`);
  if (!VIDEO_ID_PATTERN.test(videoId)) throw new Error(`Invalid output videoId: ${videoId}`);
  const resolvedRoot = path.resolve(root);
  const rootStat = fsImpl.lstatSync(resolvedRoot);
  if (rootStat.isSymbolicLink()) throw new Error(`Repository root must not be a symlink or junction: ${resolvedRoot}`);
  const rootReal = realpath(fsImpl, resolvedRoot);
  const segments = ['.work', 'learning-review', category];
  let current = resolvedRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    if (!fsImpl.existsSync(current)) fsImpl.mkdirSync(current);
    assertOrdinaryDirectory(fsImpl, current, rootReal);
  }

  const target = path.resolve(current, `${videoId}.json`);
  const fixedRoot = path.resolve(resolvedRoot, '.work', 'learning-review');
  if (!isInside(fixedRoot, target)) throw new Error(`Packet target escapes the fixed review directory: ${target}`);
  if (fsImpl.existsSync(target)) {
    const targetStat = fsImpl.lstatSync(target);
    if (targetStat.isSymbolicLink()) {
      throw new Error(`Refusing symlink, junction, or reparse-point packet target: ${target}`);
    }
    if (!targetStat.isFile()) throw new Error(`Packet target is not a regular file: ${target}`);
  }
  assertOrdinaryDirectory(fsImpl, path.dirname(target), rootReal);
  return target;
}

function emptyReport(parsed = { category: null, videos: null }) {
  return {
    mode: 'prepare',
    filter: { category: parsed.category, videos: parsed.videos },
    records: 0,
    steps: 0,
    packets: [],
    failures: []
  };
}

function emit(stdout, report) {
  stdout.write(JSON.stringify(report, null, 2) + '\n');
}

function relativePacketPath(root, target) {
  return path.relative(root, target).split(path.sep).join('/');
}

function runCli(args, options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const fsImpl = options.fsImpl || fs;
  const subtitleApi = options.subtitleApi || defaultSubtitleApi;
  const stdout = options.stdout || process.stdout;
  let parsed = { category: null, videos: null };
  let report = emptyReport(parsed);

  try {
    parsed = parseArguments(args);
    report = emptyReport(parsed);
    const html = fsImpl.readFileSync(path.join(root, 'index.html'), 'utf8');
    const parsedSite = siteData.parse(html);
    const selected = selectRecords(parsedSite.records, parsed);
    const prepared = selected.map((record) => {
      const subtitle = loadSubtitle(root, record, fsImpl, subtitleApi);
      const packet = buildPacket({
        record,
        records: parsedSite.records,
        imageManifest: parsedSite.imageManifest,
        subtitle
      });
      const validateTarget = () => ensureSafeTarget(
        root,
        record.category,
        record.videoId,
        fsImpl
      );
      return { record, packet, validateTarget };
    });

    for (const item of prepared) {
      const target = item.validateTarget();
      atomicWriteFile({
        fsImpl,
        target,
        content: serializePacket(item.packet),
        validateTarget: item.validateTarget
      });
      report.packets.push(relativePacketPath(root, target));
      report.records += 1;
      report.steps += item.record.steps.length;
    }
    emit(stdout, report);
    return { exitCode: 0, report };
  } catch (error) {
    report.failures.push(error && error.message ? error.message : String(error));
    emit(stdout, report);
    return { exitCode: 1, report };
  }
}

if (require.main === module) {
  const execution = runCli(process.argv.slice(2));
  process.exitCode = execution.exitCode;
}

module.exports = Object.freeze({
  parseArguments,
  buildPacket,
  serializePacket,
  atomicWriteFile,
  runCli
});
