'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const catalog = require('./learning-map-catalog.cjs');
const siteData = require('./site-data.cjs');

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
let temporarySequence = 0;

function parseArguments(args) {
  if (!Array.isArray(args)) throw new TypeError('args must be an array');
  let mode = null;
  let allowIncomplete = false;
  let category = null;
  let videos = null;
  const seen = new Set();

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (seen.has(argument)) throw new Error(`Duplicate argument: ${argument}`);
    seen.add(argument);

    if (argument === '--check' || argument === '--write') {
      const candidate = argument.slice(2);
      if (mode && mode !== candidate) throw new Error('--check and --write are mutually exclusive');
      mode = candidate;
      continue;
    }
    if (argument === '--allow-incomplete') {
      allowIncomplete = true;
      continue;
    }
    if (argument === '--category' || argument === '--videos') {
      if (index + 1 >= args.length || args[index + 1].startsWith('--')) {
        throw new Error(`Missing value for argument: ${argument}`);
      }
      const value = args[index + 1];
      index += 1;
      if (argument === '--category') {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw new Error(`Invalid category: ${value}`);
        category = value;
      } else {
        const selected = value.split(',');
        if (selected.length === 0 || selected.some((videoId) => !VIDEO_ID_PATTERN.test(videoId))) {
          throw new Error(`Invalid --videos value: ${value}`);
        }
        if (new Set(selected).size !== selected.length) throw new Error('Duplicate videoId in --videos');
        videos = selected;
      }
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }

  if (!mode) throw new Error('Exactly one mode is required: --check or --write');
  if (allowIncomplete && mode !== 'check') throw new Error('--allow-incomplete is only valid with --check');
  if (mode === 'write' && (category || videos)) throw new Error('--write does not allow category or videos filters');
  return { mode, allowIncomplete, category, videos };
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
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('atomic write options must be an object');
  }
  const fsImpl = options.fsImpl || fs;
  const target = path.resolve(options.target);
  const temporary = temporaryPathFor(target);
  let descriptor;
  let ownsTemporary = false;
  let closeAttempted = false;

  try {
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

function emptyReport(mode = 'invalid') {
  return {
    mode,
    coverage: 'invalid',
    records: { covered: 0, total: 0 },
    steps: { covered: 0, total: 0 },
    warnings: [],
    failures: []
  };
}

function selectedRecords(records, parsed) {
  const recordsById = new Map(records.map((record) => [record.videoId, record]));
  if (parsed.videos) {
    const unknown = parsed.videos.filter((videoId) => !recordsById.has(videoId));
    if (unknown.length > 0) throw new Error(`Unknown site videoId(s) requested: ${unknown.join(', ')}`);
  }

  const selectedVideoIds = parsed.videos ? new Set(parsed.videos) : null;
  const selected = records.filter((record) => (
    (!parsed.category || record.category === parsed.category) &&
    (!selectedVideoIds || selectedVideoIds.has(record.videoId))
  ));
  if (selected.length === 0) {
    const filters = [];
    if (parsed.category) filters.push(`category ${JSON.stringify(parsed.category)}`);
    if (parsed.videos) filters.push(`videos ${parsed.videos.join(',')}`);
    const detail = filters.length > 0 ? ` for ${filters.join(' and ')}` : '';
    throw new Error(`No records match the requested selection${detail}`);
  }
  return selected;
}

function emit(stdout, report) {
  stdout.write(JSON.stringify(report, null, 2) + '\n');
}

function runCli(args, options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const fsImpl = options.fsImpl || fs;
  const stdout = options.stdout || process.stdout;
  let parsed;
  let report = emptyReport();

  try {
    parsed = parseArguments(args);
    report = emptyReport(parsed.mode);
    const indexPath = path.join(root, 'index.html');
    const html = fsImpl.readFileSync(indexPath, 'utf8');
    const records = siteData.parse(html).records;
    const entries = catalog.load({
      root: path.join(root, 'content', 'learning-maps'),
      records,
      fsImpl
    });
    const selected = selectedRecords(records, parsed);
    const selectedIds = new Set(selected.map((record) => record.videoId));
    const selectedEntries = entries.filter((descriptor) => selectedIds.has(descriptor.entry.videoId));
    const preview = catalog.validateCoverage({
      records: selected,
      entries: selectedEntries,
      allowIncomplete: true
    });

    report.records = preview.records;
    report.steps = preview.steps;
    if (preview.missingVideoIds.length > 0 && !parsed.allowIncomplete) {
      report.coverage = 'incomplete';
      report.failures.push(
        `Learning-map coverage incomplete; missing catalog videoIds: ${preview.missingVideoIds.join(', ')}`
      );
      emit(stdout, report);
      return { exitCode: 1, report };
    }

    const built = catalog.build({
      records: selected,
      entries: selectedEntries,
      allowIncomplete: parsed.allowIncomplete
    });
    report.coverage = built.coverage.coverage;
    if (built.coverage.coverage === 'incomplete-allowed') {
      report.warnings.push(
        `Incomplete learning-map coverage: ${built.coverage.records.covered}/${built.coverage.records.total} records, ` +
        `${built.coverage.steps.covered}/${built.coverage.steps.total} steps; missing videoIds: ` +
        built.coverage.missingVideoIds.join(', ')
      );
    }

    if (parsed.mode === 'write') {
      const updatedHtml = siteData.replaceRecords(html, built.records);
      atomicWriteFile({ fsImpl, target: indexPath, content: updatedHtml });
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

module.exports = Object.freeze({ parseArguments, atomicWriteFile, runCli });
