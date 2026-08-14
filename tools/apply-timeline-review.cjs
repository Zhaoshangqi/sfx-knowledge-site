'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const knowledgeModel = require('../src/knowledge-model.js');
const siteData = require('./site-data.cjs');
const publicEffectUseManifest = require('./data/public-effect-use-ids.json');
const { MAX_BODY_BYTES, validateReview } = require('./timeline-review-server.cjs');

const REPORT_KEYS = Object.freeze([
  'recordsReviewed',
  'stepsTimed',
  'publicCasesMapped',
  'screenshotCasesReviewed',
  'failures',
  'changedRecordIds'
]);

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function normalizePublicUseIds(value) {
  const values = value instanceof Set ? Array.from(value) : value;
  if (!Array.isArray(values)) {
    throw new TypeError('publicUseIds must be an array or Set');
  }
  const seen = new Set();
  return values.map((id, index) => {
    if (typeof id !== 'string' || !id.trim()) {
      throw new TypeError(`publicUseIds[${index}] must be a nonblank string`);
    }
    const normalized = id.trim();
    if (seen.has(normalized)) {
      throw new Error(`duplicate public effect use ID: ${normalized}`);
    }
    seen.add(normalized);
    return normalized;
  });
}

function sourceStepIdentity(step, index) {
  return {
    order: Number.isInteger(step && step.order) && step.order > 0 ? step.order : index + 1,
    name: typeof (step && step.name) === 'string' && step.name.trim()
      ? step.name.trim()
      : `Step ${index + 1}`
  };
}

function publicUsesByRecord(records, publicUseIds) {
  const allUses = knowledgeModel.buildEffectUses(records);
  const useById = new Map();
  for (const use of allUses) {
    const id = use && typeof use.id === 'string' ? use.id.trim() : '';
    if (!id) continue;
    if (useById.has(id)) {
      throw new Error(`duplicate projected effect use ID: ${id}`);
    }
    useById.set(id, use);
  }

  const result = new Map();
  for (const id of publicUseIds) {
    const use = useById.get(id);
    if (!use) {
      throw new Error(`unresolved public effect use ID: ${id}`);
    }
    const recordId = String(use.sourceRecordId || '').trim();
    if (!result.has(recordId)) result.set(recordId, []);
    result.get(recordId).push(use);
  }
  return result;
}

function assertRecordIdentity(record, reviewRecord, recordIndex, expectedUses) {
  const recordId = typeof (record && record.id) === 'string' ? record.id.trim() : '';
  const videoId = typeof (record && record.videoId) === 'string' ? record.videoId.trim() : '';
  if (reviewRecord.recordId !== recordId || reviewRecord.videoId !== videoId) {
    throw new Error(`record identity mismatch at record ${recordIndex}`);
  }

  const steps = Array.isArray(record.steps) ? record.steps : [];
  if (reviewRecord.steps.length !== steps.length) {
    throw new Error(`step identity mismatch for ${recordId}: expected ${steps.length} steps`);
  }
  for (let stepIndex = 0; stepIndex < steps.length; stepIndex += 1) {
    const expected = sourceStepIdentity(steps[stepIndex], stepIndex);
    const actual = reviewRecord.steps[stepIndex];
    if (actual.order !== expected.order || actual.name !== expected.name) {
      throw new Error(`step identity mismatch for ${recordId} at step ${stepIndex}`);
    }
  }

  if (reviewRecord.cases.length !== expectedUses.length) {
    throw new Error(`public case identity mismatch for ${recordId}: expected ${expectedUses.length} cases`);
  }
  for (let caseIndex = 0; caseIndex < expectedUses.length; caseIndex += 1) {
    if (reviewRecord.cases[caseIndex].useId !== expectedUses[caseIndex].id) {
      throw new Error(`public case identity mismatch for ${recordId} at case ${caseIndex}`);
    }
  }
}

function assertReviewCompleteness(reviewRecord) {
  if (reviewRecord.status === 'unreviewed') return false;

  const candidateItem = reviewRecord.steps.concat(reviewRecord.cases).find((item) => (
    item.status === 'unreviewed' && item.startSeconds !== null
  ));
  if (candidateItem) {
    throw new Error(`human confirmation required before applying ${reviewRecord.recordId}`);
  }
  if (reviewRecord.steps.some((step) => step.status !== 'reviewed')) {
    throw new Error(`all steps must be reviewed before applying ${reviewRecord.recordId}`);
  }
  if (reviewRecord.cases.some((reviewCase) => reviewCase.status !== 'reviewed')) {
    throw new Error(`all public cases must be reviewed before applying ${reviewRecord.recordId}`);
  }
  if (reviewRecord.status !== 'reviewed') {
    throw new Error(`reviewed status required before applying ${reviewRecord.recordId}`);
  }
  return true;
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function applyCase(record, use, reviewCase, stepStartSeconds) {
  const effectUses = Array.isArray(record.effectUses) ? record.effectUses : [];
  let targetIndex = -1;

  if (!use.legacy) {
    targetIndex = effectUses.findIndex((candidate) => (
      candidate && typeof candidate === 'object' && !Array.isArray(candidate)
      && candidate.id === use.id
    ));
    if (targetIndex === -1) {
      throw new Error(`explicit public effect use disappeared: ${use.id}`);
    }
  }

  let target;
  if (use.legacy) {
    const pluginIndex = use.sourcePluginIndexes[0];
    const plugin = Array.isArray(record.plugins) ? record.plugins[pluginIndex] : null;
    if (!plugin || typeof plugin !== 'object' || Array.isArray(plugin)) {
      throw new Error(`legacy public effect source disappeared: ${use.id}`);
    }
    target = cloneJson(plugin);
    target.id = use.id;
    target.replacesPluginIndexes = use.sourcePluginIndexes.slice();
    targetIndex = effectUses.length;
  } else {
    target = cloneJson(effectUses[targetIndex]);
  }

  target.stepIndex = reviewCase.stepIndex;
  if (reviewCase.startSeconds === stepStartSeconds) {
    delete target.startSeconds;
  } else {
    target.startSeconds = reviewCase.startSeconds;
  }
  target.screenshotReviewed = true;
  target.screenshotKey = reviewCase.screenshotKey;

  if (!Array.isArray(record.effectUses)) record.effectUses = effectUses;
  if (targetIndex === effectUses.length) effectUses.push(target);
  else effectUses[targetIndex] = target;
}

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function applyReview(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('applyReview options must be an object');
  }
  const records = options.records;
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }
  const reviewedAt = options.reviewedAt;
  if (typeof reviewedAt !== 'string' || !validDate(reviewedAt)) {
    throw new TypeError('reviewedAt must be a real YYYY-MM-DD date');
  }

  const review = validateReview(options.review);
  if (review.records.length !== records.length) {
    throw new Error(`record identity mismatch: expected ${records.length} review records`);
  }
  const publicUseIds = normalizePublicUseIds(
    options.publicUseIds === undefined ? publicEffectUseManifest.useIds : options.publicUseIds
  );
  const expectedByRecord = publicUsesByRecord(records, publicUseIds);

  for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
    const record = records[recordIndex];
    const recordId = typeof (record && record.id) === 'string' ? record.id.trim() : '';
    assertRecordIdentity(
      record,
      review.records[recordIndex],
      recordIndex,
      expectedByRecord.get(recordId) || []
    );
  }

  for (const reviewRecord of review.records) {
    assertReviewCompleteness(reviewRecord);
  }

  const resultRecords = cloneJson(records);
  const report = {
    recordsReviewed: 0,
    stepsTimed: 0,
    publicCasesMapped: 0,
    screenshotCasesReviewed: 0,
    failures: [],
    changedRecordIds: []
  };

  for (let recordIndex = 0; recordIndex < resultRecords.length; recordIndex += 1) {
    const reviewRecord = review.records[recordIndex];
    if (reviewRecord.status === 'unreviewed') continue;

    const record = resultRecords[recordIndex];
    const expectedUses = expectedByRecord.get(reviewRecord.recordId) || [];
    record.timeline = {
      durationSeconds: reviewRecord.durationSeconds,
      reviewedAt,
      source: 'youtube-player'
    };
    for (let stepIndex = 0; stepIndex < record.steps.length; stepIndex += 1) {
      record.steps[stepIndex].startSeconds = reviewRecord.steps[stepIndex].startSeconds;
    }
    for (let caseIndex = 0; caseIndex < reviewRecord.cases.length; caseIndex += 1) {
      const reviewCase = reviewRecord.cases[caseIndex];
      applyCase(
        record,
        expectedUses[caseIndex],
        reviewCase,
        reviewRecord.steps[reviewCase.stepIndex].startSeconds
      );
    }

    report.recordsReviewed += 1;
    report.stepsTimed += reviewRecord.steps.length;
    report.publicCasesMapped += reviewRecord.cases.length;
    report.screenshotCasesReviewed += reviewRecord.cases.filter((item) => item.screenshotReviewed).length;
    if (!sameJson(records[recordIndex], record)) {
      report.changedRecordIds.push(reviewRecord.recordId);
    }
  }

  return { records: resultRecords, report };
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
  for (const component of relative ? relative.split(path.sep) : []) {
    current = path.join(current, component);
    if (fsImpl.existsSync(current) && fsImpl.lstatSync(current).isSymbolicLink()) {
      throw new Error(`symbolic-link path component is not allowed: ${current}`);
    }
  }
}

function parseArguments(args) {
  if (!Array.isArray(args)) throw new TypeError('args must be an array');
  const values = Object.create(null);
  const valueFlags = new Set(['--index', '--review', '--report']);
  const modeFlags = new Set(['--dry-run', '--write']);
  for (let index = 0; index < args.length;) {
    const flag = args[index];
    if (modeFlags.has(flag)) {
      if (Object.hasOwn(values, flag)) throw new Error(`Invalid or duplicate argument: ${flag}`);
      values[flag] = true;
      index += 1;
      continue;
    }
    if (!valueFlags.has(flag) || args[index + 1] === undefined || Object.hasOwn(values, flag)) {
      throw new Error(`Invalid or duplicate argument: ${flag || '(missing)'}`);
    }
    values[flag] = args[index + 1];
    index += 2;
  }
  if (!values['--index'] || !values['--review']) {
    throw new Error('Both --index and --review are required');
  }
  if (Boolean(values['--dry-run']) === Boolean(values['--write'])) {
    throw new Error('Choose exactly one of --dry-run or --write');
  }
  return {
    indexPath: values['--index'],
    reviewPath: values['--review'],
    reportPath: values['--report'] || null,
    write: Boolean(values['--write'])
  };
}

function atomicWrite(fsImpl, target, content) {
  const temporary = path.join(
    path.dirname(target),
    `.${path.basename(target)}.${process.pid}.${crypto.randomBytes(8).toString('hex')}.tmp`
  );
  let descriptor;
  try {
    descriptor = fsImpl.openSync(temporary, 'wx');
    fsImpl.writeFileSync(descriptor, content, { encoding: 'utf8' });
    if (typeof fsImpl.fsyncSync === 'function') fsImpl.fsyncSync(descriptor);
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
}

async function runCli(args, dependencies = {}) {
  const fsImpl = dependencies.fs || fs;
  const stdout = dependencies.stdout || process.stdout;
  const parsed = parseArguments(args);
  const indexPath = path.resolve(parsed.indexPath);
  const repoRoot = path.dirname(indexPath);
  const reviewPath = path.resolve(parsed.reviewPath);
  const expectedIndex = path.join(repoRoot, 'index.html');
  const expectedReview = path.join(repoRoot, '.work', 'timeline-review', 'review.json');
  const expectedReport = path.join(repoRoot, '.work', 'timeline-review', 'apply-report.json');
  const reportPath = parsed.reportPath ? path.resolve(parsed.reportPath) : null;

  if (!samePath(indexPath, expectedIndex)) {
    throw new Error('index path must be the repository index.html');
  }
  if (!samePath(reviewPath, expectedReview)) {
    throw new Error('review path must be the fixed .work/timeline-review/review.json');
  }
  if (reportPath && !samePath(reportPath, expectedReport)) {
    throw new Error('report path must be the fixed .work/timeline-review/apply-report.json');
  }
  assertNoSymlinkComponents(fsImpl, repoRoot, indexPath);
  assertNoSymlinkComponents(fsImpl, repoRoot, reviewPath);
  if (reportPath) assertNoSymlinkComponents(fsImpl, repoRoot, reportPath);

  const reviewStat = fsImpl.statSync(reviewPath);
  if (!reviewStat.isFile() || reviewStat.size > MAX_BODY_BYTES) {
    throw new Error(`review file must be no larger than ${MAX_BODY_BYTES} bytes`);
  }
  const html = fsImpl.readFileSync(indexPath, 'utf8');
  const review = JSON.parse(fsImpl.readFileSync(reviewPath, 'utf8'));
  const records = siteData.parse(html).records;
  const reviewedAt = dependencies.reviewedAt || new Date().toISOString().slice(0, 10);
  const result = applyReview({
    records,
    review,
    publicUseIds: dependencies.publicUseIds,
    reviewedAt
  });

  if (parsed.write) {
    const updatedHtml = siteData.replaceRecords(html, result.records);
    atomicWrite(fsImpl, indexPath, updatedHtml);
  }
  if (reportPath) {
    atomicWrite(fsImpl, reportPath, `${JSON.stringify(result.report, null, 2)}\n`);
  }
  stdout.write(`${parsed.write ? 'Applied' : 'Dry run'}: ${JSON.stringify(result.report)}\n`);
  return result;
}

const api = Object.freeze({ applyReview, validateReview, runCli, REPORT_KEYS });
module.exports = api;

if (require.main === module) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
