'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseVtt, buildTrack } = require('./build-site-subtitles.cjs');

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const LANGUAGE_PATTERN = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const SOURCE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CATALOG_START = '/* SUBTITLE_CATALOG_START */';
const CATALOG_END = '/* SUBTITLE_CATALOG_END */';
const INVENTORY_FILENAME = 'public-caption-inventory.json';
const PUBLIC_SOURCE = 'site-owned-from-public-captions';
const LOCAL_SOURCE = 'site-owned-from-local-transcription';
const LANGUAGES = ['zh-Hans', 'en-orig'];
let temporarySequence = 0;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function isRealDate(value) {
  if (typeof value !== 'string') return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;
}

function normalizeCase(filename) {
  return process.platform === 'win32' ? filename.toLowerCase() : filename;
}

function nativeRealpath(fsImpl, filename) {
  const realpath = fsImpl.realpathSync.native || fsImpl.realpathSync;
  return realpath(filename);
}

function projectedRealpath(fsImpl, filename) {
  const resolved = path.resolve(filename);
  let cursor = resolved;
  const suffix = [];

  while (!fsImpl.existsSync(cursor)) {
    const parent = path.dirname(cursor);
    if (parent === cursor) throw new Error('No existing ancestor for path: ' + resolved);
    suffix.unshift(path.basename(cursor));
    cursor = parent;
  }

  return path.join(nativeRealpath(fsImpl, cursor), ...suffix);
}

function isWithin(root, candidate) {
  const normalizedRoot = normalizeCase(path.resolve(root));
  const normalizedCandidate = normalizeCase(path.resolve(candidate));
  return normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(normalizedRoot + path.sep);
}

function assertPathWithinRoot(fsImpl, root, candidate, label, mustExist) {
  const resolvedRoot = path.resolve(root);
  if (!fsImpl.existsSync(resolvedRoot) || !fsImpl.statSync(resolvedRoot).isDirectory()) {
    throw new Error(label + ' root is not a directory: ' + resolvedRoot);
  }

  const realRoot = nativeRealpath(fsImpl, resolvedRoot);
  const resolvedCandidate = path.resolve(candidate);
  if (mustExist && !fsImpl.existsSync(resolvedCandidate)) {
    throw new Error(label + ' path does not exist: ' + resolvedCandidate);
  }
  const realCandidate = mustExist
    ? nativeRealpath(fsImpl, resolvedCandidate)
    : projectedRealpath(fsImpl, resolvedCandidate);

  if (!isWithin(realRoot, realCandidate)) {
    throw new Error('Path is outside ' + label + ' root: ' + resolvedCandidate);
  }
  return resolvedCandidate;
}

function atomicWriteFile(options) {
  const fsImpl = options.fsImpl || fs;
  const target = assertPathWithinRoot(
    fsImpl,
    options.root,
    options.target,
    options.label || 'output',
    false
  );
  if (!options.force && fsImpl.existsSync(target)) {
    throw new Error('Output already exists; pass --force to replace it: ' + target);
  }

  temporarySequence += 1;
  const temporary = path.join(
    path.dirname(target),
    '.' + path.basename(target) + '.' + process.pid + '.' + temporarySequence + '.tmp'
  );
  let ownsTemporary = false;

  try {
    fsImpl.writeFileSync(temporary, options.content, { encoding: 'utf8', flag: 'wx' });
    ownsTemporary = true;
    fsImpl.renameSync(temporary, target);
    ownsTemporary = false;
  } finally {
    if (ownsTemporary && fsImpl.existsSync(temporary)) {
      fsImpl.rmSync(temporary, { force: true });
    }
  }
  return target;
}

function validateRecords(records) {
  if (!Array.isArray(records)) throw new Error('Site records must be an array');
  const seen = new Set();

  records.forEach((record, index) => {
    if (!isObject(record)) throw new Error('Invalid site record at index ' + index);
    if (!VIDEO_ID_PATTERN.test(record.videoId || '')) {
      throw new Error('Invalid site record videoId at index ' + index);
    }
    if (seen.has(record.videoId)) {
      throw new Error('Duplicate record videoId: ' + record.videoId);
    }
    seen.add(record.videoId);
  });
  return records;
}

function extractRecords(indexHtml) {
  if (typeof indexHtml !== 'string') throw new TypeError('indexHtml must be a string');
  const pattern = /\bconst\s+records\s*=\s*([\s\S]*?);\r?\n\r?\n\s*const\s+imageManifest\b/g;
  const matches = [...indexHtml.matchAll(pattern)];
  if (matches.length !== 1) {
    throw new Error('Expected exactly one index.html records block');
  }

  let records;
  try {
    records = JSON.parse(matches[0][1]);
  } catch (error) {
    throw new Error('Malformed index.html records JSON: ' + error.message);
  }
  return validateRecords(records);
}

function describeVttFile(inputRoot, inputPath) {
  const filename = path.basename(inputPath);
  const parts = filename.split('.');
  if (parts.length < 2 || parts.at(-1).toLowerCase() !== 'vtt' ||
      !VIDEO_ID_PATTERN.test(parts[0])) {
    throw new Error('Invalid VTT filename: ' + filename);
  }

  const videoId = parts[0];
  const tokens = parts.slice(1, -1).map((token) => token.toLowerCase());
  const relativeParts = path.relative(inputRoot, inputPath)
    .split(path.sep)
    .slice(0, -1)
    .map((part) => part.toLowerCase());
  const isEnglish = tokens.includes('en-orig') || tokens.includes('en');
  const isLocal = tokens.includes('local') ||
    relativeParts.includes('local-transcriptions') ||
    relativeParts.includes('local-transcription');
  const isPublicChinese = tokens.length === 0 ||
    tokens.includes('zh-hans') ||
    tokens.includes('zh-cn');

  if (isEnglish) return { videoId, importable: false, rank: 0 };
  if (!isLocal && !isPublicChinese) {
    throw new Error('Unsupported VTT filename language/source: ' + filename);
  }

  return {
    videoId,
    importable: true,
    language: 'zh-CN',
    source: isLocal || tokens.length === 0 ? LOCAL_SOURCE : PUBLIC_SOURCE,
    reviewStatus: 'draft',
    rank: isLocal || tokens.length === 0 ? 2 : 1
  };
}

function importVtt(options) {
  if (!isObject(options)) throw new TypeError('options must be an object');
  const fsImpl = options.fsImpl || fs;
  const inputRoot = path.resolve(options.inputRoot || '');
  const outputRoot = path.resolve(options.outputRoot || '');
  const inputPath = assertPathWithinRoot(
    fsImpl,
    inputRoot,
    options.inputPath,
    'input',
    true
  );
  const descriptor = describeVttFile(inputRoot, inputPath);
  const expectedVideoId = options.videoId || descriptor.videoId;
  if (descriptor.videoId !== expectedVideoId) {
    throw new Error(
      'VTT filename videoId ' + descriptor.videoId +
      ' does not match track videoId ' + expectedVideoId
    );
  }

  const outputPath = assertPathWithinRoot(
    fsImpl,
    outputRoot,
    options.outputPath || path.join(outputRoot, expectedVideoId + '.json'),
    'output',
    false
  );
  if (path.basename(outputPath) !== expectedVideoId + '.json') {
    throw new Error('Output filename videoId does not match track videoId: ' + outputPath);
  }

  const language = options.language || descriptor.language;
  const source = options.source || descriptor.source;
  const reviewStatus = options.reviewStatus || descriptor.reviewStatus;
  if (!language || !source || !reviewStatus) {
    throw new Error('VTT file is not an importable Chinese subtitle source: ' + inputPath);
  }

  const parsed = parseVtt(fsImpl.readFileSync(inputPath, 'utf8'));
  const subtitleTrack = buildTrack({
    videoId: expectedVideoId,
    language,
    source,
    reviewStatus,
    updatedAt: options.updatedAt,
    cues: parsed
  });
  if (subtitleTrack.videoId !== descriptor.videoId) {
    throw new Error('VTT filename videoId does not match track videoId');
  }

  atomicWriteFile({
    fsImpl,
    root: outputRoot,
    target: outputPath,
    content: JSON.stringify(subtitleTrack, null, 2) + '\n',
    force: options.force === true,
    label: 'output'
  });
  return { track: subtitleTrack, outputPath };
}

function exactKeys(value, allowed) {
  const actual = Object.keys(value).sort();
  const expected = [...allowed].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

function validateTrack(rawTrack, filename) {
  const invalid = () => new Error('Invalid subtitle track JSON: ' + filename);
  if (!isObject(rawTrack) || !exactKeys(rawTrack, [
    'videoId',
    'language',
    'source',
    'reviewStatus',
    'updatedAt',
    'cues'
  ])) throw invalid();
  if (!VIDEO_ID_PATTERN.test(rawTrack.videoId) ||
      !LANGUAGE_PATTERN.test(rawTrack.language || '') ||
      !SOURCE_PATTERN.test(rawTrack.source || '') ||
      (rawTrack.reviewStatus !== 'draft' && rawTrack.reviewStatus !== 'reviewed') ||
      !isRealDate(rawTrack.updatedAt) ||
      !Array.isArray(rawTrack.cues) || rawTrack.cues.length === 0) {
    throw invalid();
  }

  let previousEnd = -1;
  rawTrack.cues.forEach((cue) => {
    if (!isObject(cue) || !exactKeys(cue, ['start', 'end', 'text']) ||
        !Number.isFinite(cue.start) || cue.start < 0 ||
        !Number.isFinite(cue.end) || cue.end <= cue.start ||
        typeof cue.text !== 'string' || !cue.text.trim() || cue.text !== cue.text.trim() ||
        cue.start < previousEnd) {
      throw invalid();
    }
    previousEnd = cue.end;
  });
  return rawTrack;
}

function loadTracks(options) {
  const fsImpl = options.fsImpl || fs;
  if (Array.isArray(options.tracks)) return options.tracks;
  if (!options.tracksRoot) return [];

  const tracksRoot = path.resolve(options.tracksRoot);
  assertPathWithinRoot(fsImpl, tracksRoot, tracksRoot, 'tracks', true);
  const files = fsImpl.readdirSync(tracksRoot, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name, 'en'));
  const tracks = [];

  files.forEach((entry) => {
    if (entry.isDirectory()) {
      throw new Error('Subtitle track directory must be flat: ' + entry.name);
    }
    if (path.extname(entry.name).toLowerCase() !== '.json') return;
    if (entry.isSymbolicLink()) {
      throw new Error('Subtitle JSON symlinks are not allowed: ' + entry.name);
    }

    const filename = path.join(tracksRoot, entry.name);
    assertPathWithinRoot(fsImpl, tracksRoot, filename, 'tracks', true);
    let rawTrack;
    try {
      rawTrack = JSON.parse(fsImpl.readFileSync(filename, 'utf8'));
    } catch (error) {
      throw new Error('Malformed subtitle JSON ' + entry.name + ': ' + error.message);
    }
    tracks.push({ filename: entry.name, track: rawTrack });
  });
  return tracks;
}

function validateOverrides(rawOverrides) {
  if (!isObject(rawOverrides)) throw new Error('Subtitle overrides must be an object');
  const overrides = new Map();

  Object.keys(rawOverrides).sort().forEach((videoId) => {
    const entry = rawOverrides[videoId];
    if (!VIDEO_ID_PATTERN.test(videoId) || !isObject(entry)) {
      throw new Error('Invalid subtitle override for videoId: ' + videoId);
    }
    const allowed = new Set(['contentStatus', 'updatedAt', 'auditNote', 'reason']);
    if (Object.keys(entry).some((key) => !allowed.has(key)) ||
        (entry.contentStatus !== 'no-speech' && entry.contentStatus !== 'missing') ||
        !isRealDate(entry.updatedAt)) {
      throw new Error('Invalid subtitle override for videoId: ' + videoId);
    }

    const auditNote = hasOwn(entry, 'auditNote') ? entry.auditNote : undefined;
    const reason = hasOwn(entry, 'reason') ? entry.reason : undefined;
    if ((auditNote !== undefined && (typeof auditNote !== 'string' || !auditNote.trim())) ||
        (reason !== undefined && (typeof reason !== 'string' || !reason.trim())) ||
        (auditNote === undefined && reason === undefined)) {
      throw new Error('Invalid evidence-bearing subtitle override for videoId: ' + videoId);
    }

    const normalized = {
      contentStatus: entry.contentStatus,
      updatedAt: entry.updatedAt
    };
    if (auditNote !== undefined) normalized.auditNote = auditNote.trim();
    if (reason !== undefined) normalized.reason = reason.trim();
    overrides.set(videoId, normalized);
  });
  return overrides;
}

function sourceKind(source) {
  if (source === PUBLIC_SOURCE || source.includes('public-caption')) return 'public';
  if (source === LOCAL_SOURCE || source.includes('local-transcription')) return 'local';
  throw new Error('Invalid subtitle track source classification: ' + source);
}

function buildCatalog(options) {
  if (!isObject(options)) throw new TypeError('options must be an object');
  const records = validateRecords(options.records);
  const recordIds = new Set(records.map((record) => record.videoId));
  const tracks = loadTracks(options);
  const tracksById = new Map();

  tracks.forEach((item) => {
    if (!isObject(item) || typeof item.filename !== 'string') {
      throw new Error('Invalid subtitle track input');
    }
    const filenameMatch = /^([A-Za-z0-9_-]{11})\.json$/.exec(item.filename);
    if (!filenameMatch) throw new Error('Invalid subtitle JSON filename: ' + item.filename);
    const subtitleTrack = validateTrack(item.track, item.filename);
    if (filenameMatch[1] !== subtitleTrack.videoId) {
      throw new Error(
        'Subtitle filename videoId ' + filenameMatch[1] +
        ' does not match track videoId ' + subtitleTrack.videoId
      );
    }
    if (!recordIds.has(subtitleTrack.videoId)) {
      throw new Error('Orphan subtitle JSON: ' + item.filename);
    }
    if (tracksById.has(subtitleTrack.videoId)) {
      throw new Error('Duplicate subtitle track for videoId: ' + subtitleTrack.videoId);
    }
    sourceKind(subtitleTrack.source);
    tracksById.set(subtitleTrack.videoId, subtitleTrack);
  });

  const overrides = validateOverrides(options.overrides || {});
  overrides.forEach((entry, videoId) => {
    if (!recordIds.has(videoId)) throw new Error('Orphan subtitle override: ' + videoId);
    if (tracksById.has(videoId)) throw new Error('Subtitle override cannot shadow track: ' + videoId);
  });

  const report = {
    total: records.length,
    tracks: 0,
    publicCaptions: 0,
    localTranscriptions: 0,
    noSpeech: 0,
    missing: 0,
    cues: 0
  };
  const catalog = records.map((record) => {
    const subtitleTrack = tracksById.get(record.videoId);
    if (subtitleTrack) {
      report.tracks += 1;
      report.cues += subtitleTrack.cues.length;
      if (sourceKind(subtitleTrack.source) === 'public') report.publicCaptions += 1;
      else report.localTranscriptions += 1;
      return {
        videoId: subtitleTrack.videoId,
        language: subtitleTrack.language,
        source: subtitleTrack.source,
        reviewStatus: subtitleTrack.reviewStatus,
        updatedAt: subtitleTrack.updatedAt,
        contentStatus: 'track',
        asset: 'assets/subtitles/' + subtitleTrack.videoId + '.json'
      };
    }

    const override = overrides.get(record.videoId);
    if (override) {
      report[override.contentStatus === 'no-speech' ? 'noSpeech' : 'missing'] += 1;
      return { videoId: record.videoId, ...override };
    }

    report.missing += 1;
    return {
      videoId: record.videoId,
      contentStatus: 'missing',
      reason: 'no-subtitle-track-or-approved-override'
    };
  });

  return { catalog, report };
}

function replaceCatalogBlock(moduleText, catalog) {
  const firstStart = moduleText.indexOf(CATALOG_START);
  const firstEnd = moduleText.indexOf(CATALOG_END);
  if (firstStart === -1 || firstEnd === -1 || firstEnd < firstStart ||
      moduleText.indexOf(CATALOG_START, firstStart + CATALOG_START.length) !== -1 ||
      moduleText.indexOf(CATALOG_END, firstEnd + CATALOG_END.length) !== -1) {
    throw new Error('Expected exactly one bounded subtitle catalog marker block');
  }

  const lineStart = moduleText.lastIndexOf('\n', firstStart) + 1;
  const prefix = moduleText.slice(lineStart, firstStart);
  if (!/^[\t ]*$/.test(prefix)) throw new Error('Invalid subtitle catalog marker indentation');
  const newline = moduleText.includes('\r\n') ? '\r\n' : '\n';
  const json = JSON.stringify(catalog, null, 2).replace(/\n/g, newline + prefix);
  const replacement = [
    prefix + CATALOG_START,
    prefix + 'var rawCatalog = ' + json + ';',
    prefix + CATALOG_END
  ].join(newline);

  return moduleText.slice(0, lineStart) + replacement +
    moduleText.slice(firstEnd + CATALOG_END.length);
}

function writeCatalog(options) {
  if (!isObject(options)) throw new TypeError('options must be an object');
  const fsImpl = options.fsImpl || fs;
  if (!Array.isArray(options.catalog) || !isObject(options.report)) {
    throw new Error('catalog and report are required');
  }
  const moduleRoot = path.resolve(options.moduleRoot || path.dirname(options.modulePath));
  const reportRoot = path.resolve(options.reportRoot || path.dirname(options.reportPath));
  const modulePath = assertPathWithinRoot(
    fsImpl,
    moduleRoot,
    options.modulePath,
    'module output',
    true
  );
  const reportPath = assertPathWithinRoot(
    fsImpl,
    reportRoot,
    options.reportPath,
    'report output',
    false
  );
  if (normalizeCase(projectedRealpath(fsImpl, modulePath)) ===
      normalizeCase(projectedRealpath(fsImpl, reportPath))) {
    throw new Error('Module and report outputs must use different paths');
  }

  const updatedModule = replaceCatalogBlock(
    fsImpl.readFileSync(modulePath, 'utf8'),
    options.catalog
  );
  const reportJson = JSON.stringify(options.report, null, 2) + '\n';

  atomicWriteFile({
    fsImpl,
    root: moduleRoot,
    target: modulePath,
    content: updatedModule,
    force: true,
    label: 'module output'
  });
  atomicWriteFile({
    fsImpl,
    root: reportRoot,
    target: reportPath,
    content: reportJson,
    force: true,
    label: 'report output'
  });
  return { modulePath, reportPath };
}

function captionPath(workRoot, videoId, language) {
  return path.join(workRoot, videoId + '.' + language + '.vtt');
}

function captionExists(fsImpl, workRoot, videoId, language) {
  const filename = captionPath(workRoot, videoId, language);
  if (!fsImpl.existsSync(filename)) return false;
  assertPathWithinRoot(fsImpl, workRoot, filename, 'fetch work', true);
  const stat = fsImpl.statSync(filename);
  return stat.isFile() && stat.size > 0;
}

function runnerFailureText(result) {
  const error = result && result.error
    ? (result.error.message || String(result.error))
    : '';
  return [result && result.stdout, result && result.stderr, error]
    .filter((value) => value !== undefined && value !== null)
    .join('\n');
}

function languageFailed(result, language) {
  if (!result) return true;
  if (result.error || (typeof result.status === 'number' && result.status !== 0)) return true;
  const failureText = runnerFailureText(result);
  const failurePattern = /HTTP Error|\b429\b|unable to download|\berror\b|\bfailed\b/i;
  if (!failurePattern.test(failureText)) return false;
  const lines = failureText.split(/\r?\n/);
  const specific = lines.some((line) => line.includes(language) && failurePattern.test(line));
  return specific || !LANGUAGES.some((candidate) => failureText.includes(candidate));
}

function languageFailureReason(result, language) {
  const failureText = runnerFailureText(result);
  const languageLines = failureText
    .split(/\r?\n/)
    .filter((line) => line.includes(language));
  const relevantText = languageLines.length ? languageLines.join('\n') : failureText;
  const httpStatus = /HTTP(?: Error)?\s+(\d{3})/i.exec(relevantText);
  if (httpStatus) return 'http-' + httpStatus[1];
  if (result && result.error) return 'runner-error';
  if (result && typeof result.status === 'number' && result.status !== 0) {
    return 'subprocess-exit-' + result.status;
  }
  return 'yt-dlp-error';
}

function fetchPublic(options) {
  if (!isObject(options)) throw new TypeError('options must be an object');
  const records = validateRecords(options.records);
  const fsImpl = options.fsImpl || fs;
  const runner = options.runner || spawnSync;
  const workRoot = path.resolve(options.workRoot || '');
  if (!fsImpl.existsSync(workRoot)) fsImpl.mkdirSync(workRoot, { recursive: true });
  assertPathWithinRoot(fsImpl, workRoot, workRoot, 'fetch work', true);
  const results = new Map();
  let attempted = 0;
  let skipped = 0;

  records.forEach((record) => {
    const complete = LANGUAGES.every((language) => (
      captionExists(fsImpl, workRoot, record.videoId, language)
    ));
    if (complete) {
      skipped += 1;
      results.set(record.videoId, null);
      return;
    }

    attempted += 1;
    const url = 'https://www.youtube.com/watch?v=' + record.videoId;
    const args = [
      '--skip-download',
      '--write-auto-subs',
      '--sub-langs', 'zh-Hans,en-orig',
      '--sub-format', 'vtt',
      '--ignore-errors',
      '--no-overwrites',
      '--sleep-requests', '1',
      '--sleep-subtitles', '2',
      '--retries', '5',
      '--extractor-retries', '5',
      '--retry-sleep', 'http:exp=1:20',
      '--output', path.join(workRoot, '%(id)s.%(ext)s'),
      url
    ];
    let result;
    try {
      result = runner('yt-dlp', args, {
        cwd: workRoot,
        encoding: 'utf8',
        shell: false,
        windowsHide: true
      });
    } catch (error) {
      result = { status: null, stdout: '', stderr: '', error };
    }
    results.set(record.videoId, result || { status: null, error: new Error('Runner returned no result') });
  });

  const summary = {
    'zh-Hans': { found: 0, missing: 0, failed: 0 },
    'en-orig': { found: 0, missing: 0, failed: 0 }
  };
  const videos = records.map((record) => {
    const result = results.get(record.videoId);
    const languages = {};
    LANGUAGES.forEach((language) => {
      const filename = record.videoId + '.' + language + '.vtt';
      let status;
      if (captionExists(fsImpl, workRoot, record.videoId, language)) status = 'found';
      else if (result && languageFailed(result, language)) status = 'failed';
      else status = 'missing';
      summary[language][status] += 1;
      languages[language] = { status, file: filename };
      if (status === 'failed') {
        languages[language].reason = languageFailureReason(result, language);
      } else if (status === 'missing') {
        languages[language].reason = 'not-produced';
      }
    });
    return {
      videoId: record.videoId,
      url: 'https://www.youtube.com/watch?v=' + record.videoId,
      attempted: result !== null,
      languages
    };
  });
  const inventory = {
    total: records.length,
    attempted,
    skipped,
    summary,
    videos
  };

  atomicWriteFile({
    fsImpl,
    root: workRoot,
    target: path.join(workRoot, INVENTORY_FILENAME),
    content: JSON.stringify(inventory, null, 2) + '\n',
    force: true,
    label: 'fetch work'
  });
  return inventory;
}

function parseCommandArguments(args, command, valueNames, booleanNames = []) {
  const values = Object.create(null);
  const allowedValues = new Set(valueNames);
  const allowedBooleans = new Set(booleanNames);

  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (allowedBooleans.has(name)) {
      if (hasOwn(values, name)) throw new Error('Duplicate argument: ' + name);
      values[name] = true;
      continue;
    }
    if (!allowedValues.has(name)) throw new Error('Unknown ' + command + ' argument: ' + name);
    if (hasOwn(values, name)) throw new Error('Duplicate argument: ' + name);
    if (index + 1 >= args.length || args[index + 1].startsWith('--')) {
      throw new Error('Missing value for argument: ' + name);
    }
    values[name] = args[index + 1];
    index += 1;
  }

  valueNames.forEach((name) => {
    if (!hasOwn(values, name)) throw new Error('Missing required argument: ' + name);
  });
  return values;
}

function discoverVttFiles(inputRoot, fsImpl) {
  const found = [];
  function walk(directory) {
    assertPathWithinRoot(fsImpl, inputRoot, directory, 'input', true);
    fsImpl.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, 'en'))
      .forEach((entry) => {
        const filename = path.join(directory, entry.name);
        if (entry.isSymbolicLink()) {
          if (path.extname(entry.name).toLowerCase() === '.vtt') found.push(filename);
          return;
        }
        if (entry.isDirectory()) walk(filename);
        else if (path.extname(entry.name).toLowerCase() === '.vtt') found.push(filename);
      });
  }
  walk(inputRoot);
  return found;
}

function runImport(values, dependencies) {
  const fsImpl = dependencies.fsImpl || fs;
  const inputRoot = path.resolve(values['--input']);
  const outputRoot = path.resolve(values['--output']);
  if (!fsImpl.existsSync(inputRoot) || !fsImpl.statSync(inputRoot).isDirectory()) {
    throw new Error('Input root is not a directory: ' + inputRoot);
  }
  if (!fsImpl.existsSync(outputRoot)) fsImpl.mkdirSync(outputRoot, { recursive: true });
  if (!fsImpl.statSync(outputRoot).isDirectory()) {
    throw new Error('Output root is not a directory: ' + outputRoot);
  }

  const selected = new Map();
  discoverVttFiles(inputRoot, fsImpl).forEach((inputPath) => {
    assertPathWithinRoot(fsImpl, inputRoot, inputPath, 'input', true);
    const descriptor = describeVttFile(inputRoot, inputPath);
    if (!descriptor.importable) return;
    const previous = selected.get(descriptor.videoId);
    if (!previous || descriptor.rank > previous.descriptor.rank) {
      selected.set(descriptor.videoId, { inputPath, descriptor });
    } else if (descriptor.rank === previous.descriptor.rank) {
      throw new Error('Duplicate VTT source for videoId: ' + descriptor.videoId);
    }
  });

  [...selected.values()]
    .sort((left, right) => left.descriptor.videoId.localeCompare(right.descriptor.videoId, 'en'))
    .forEach(({ inputPath, descriptor }) => {
      const outputPath = assertPathWithinRoot(
        fsImpl,
        outputRoot,
        path.join(outputRoot, descriptor.videoId + '.json'),
        'output',
        false
      );
      if (values['--force'] !== true && fsImpl.existsSync(outputPath)) return;
      importVtt({
        inputRoot,
        outputRoot,
        inputPath,
        outputPath,
        videoId: descriptor.videoId,
        language: descriptor.language,
        source: descriptor.source,
        reviewStatus: descriptor.reviewStatus,
        updatedAt: values['--updated-at'],
        force: values['--force'] === true,
        fsImpl
      });
    });
}

function readJson(fsImpl, filename, label) {
  try {
    return JSON.parse(fsImpl.readFileSync(filename, 'utf8'));
  } catch (error) {
    throw new Error('Malformed ' + label + ' JSON: ' + error.message);
  }
}

function runCli(args, dependencies = {}) {
  if (!Array.isArray(args) || args.length === 0) throw new Error('Missing command');
  const command = args[0];
  const rest = args.slice(1);
  const fsImpl = dependencies.fsImpl || fs;

  if (command === 'import') {
    const values = parseCommandArguments(
      rest,
      command,
      ['--input', '--output', '--updated-at'],
      ['--force']
    );
    runImport(values, dependencies);
    return 0;
  }

  if (command === 'catalog') {
    const values = parseCommandArguments(rest, command, [
      '--index',
      '--tracks',
      '--overrides',
      '--module',
      '--report'
    ]);
    const indexPath = path.resolve(values['--index']);
    const tracksRoot = path.resolve(values['--tracks']);
    const overridesPath = path.resolve(values['--overrides']);
    const modulePath = path.resolve(values['--module']);
    const reportPath = path.resolve(values['--report']);
    const reportRoot = path.dirname(reportPath);
    if (!fsImpl.existsSync(reportRoot)) fsImpl.mkdirSync(reportRoot, { recursive: true });
    const built = buildCatalog({
      records: extractRecords(fsImpl.readFileSync(indexPath, 'utf8')),
      tracksRoot,
      overrides: readJson(fsImpl, overridesPath, 'subtitle overrides'),
      fsImpl
    });
    writeCatalog({
      modulePath,
      reportPath,
      moduleRoot: path.dirname(modulePath),
      reportRoot,
      catalog: built.catalog,
      report: built.report,
      fsImpl
    });
    if (typeof dependencies.emit === 'function') {
      dependencies.emit(JSON.stringify(built.report));
    }
    return 0;
  }

  if (command === 'fetch-public') {
    const values = parseCommandArguments(rest, command, ['--index', '--work']);
    const indexPath = path.resolve(values['--index']);
    const workRoot = path.resolve(values['--work']);
    const inventory = fetchPublic({
      records: extractRecords(fsImpl.readFileSync(indexPath, 'utf8')),
      workRoot,
      runner: dependencies.runner,
      fsImpl
    });
    if (typeof dependencies.emit === 'function') {
      dependencies.emit(JSON.stringify(inventory, null, 2));
    }
    return 0;
  }

  throw new Error('Unknown command: ' + command);
}

if (require.main === module) {
  try {
    runCli(process.argv.slice(2), {
      emit(value) {
        console.log(value);
      }
    });
  } catch (error) {
    console.error('Error: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  extractRecords,
  importVtt,
  buildCatalog,
  writeCatalog,
  fetchPublic,
  runCli
};
