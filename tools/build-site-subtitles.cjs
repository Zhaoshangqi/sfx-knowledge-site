'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_ARGUMENTS = [
  '--video-id',
  '--input',
  '--language',
  '--source',
  '--review-status',
  '--updated-at',
  '--output'
];
const SHORT_CUE_SECONDS = 1;
const ADJACENT_GAP_SECONDS = 0.35;
const ROLLING_GAP_SECONDS = 0.2;
const MIN_ROLLING_OVERLAP = 4;
const MIN_ROLLING_OVERLAP_RATIO = 0.4;
const MAX_MERGED_SECONDS = 8;
const MAX_DISPLAY_TEXT_LENGTH = 48;
const MAX_MERGED_TEXT_LENGTH = MAX_DISPLAY_TEXT_LENGTH;

function malformedTimestamp(value) {
  return new Error('Malformed WebVTT timestamp: ' + String(value));
}

function parseTimestamp(value) {
  if (typeof value !== 'string') throw malformedTimestamp(value);

  const match = /^(?:(\d{2,}):)?([0-5]\d):([0-5]\d)\.(\d{3})$/.exec(value);
  if (!match) throw malformedTimestamp(value);

  const hours = match[1] === undefined ? 0 : Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  const milliseconds = Number(match[4]);
  return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"'
  };

  return value.replace(/&(?:#(\d+)|#x([\da-f]+)|([a-z]+));/gi, (entity, decimal, hex, name) => {
    if (decimal !== undefined || hex !== undefined) {
      const codePoint = Number.parseInt(decimal === undefined ? hex : decimal, hex === undefined ? 10 : 16);
      if (Number.isInteger(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff &&
          !(codePoint >= 0xd800 && codePoint <= 0xdfff)) {
        return String.fromCodePoint(codePoint);
      }
      return entity;
    }

    const decoded = named[name.toLowerCase()];
    return decoded === undefined ? entity : decoded;
  });
}

function cleanCueText(lines) {
  return decodeHtmlEntities(lines.join(' ')
    .replace(/<(?:\d{2,}:)?[0-5]\d:[0-5]\d\.\d{3}>/g, '')
    .replace(/<[^>]*>/g, ''))
    .replace(/\s+/g, ' ')
    .trim();
}

function parseVtt(text) {
  if (typeof text !== 'string') throw new TypeError('WebVTT input must be a string');

  const normalized = text.replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
  const firstLine = normalized.split('\n', 1)[0];
  if (!/^WEBVTT(?:[ \t].*)?$/.test(firstLine)) {
    throw new Error('Missing or invalid WEBVTT signature');
  }
  const blocks = normalized.split(/\n{2,}/);
  const cues = [];

  blocks.forEach((block, blockIndex) => {
    const lines = block.split('\n');
    if (blockIndex === 0) {
      if (lines.slice(1).some((line) => line.includes('-->'))) {
        throw new Error('Malformed WebVTT header: cues require a blank separator');
      }
      return;
    }

    const firstContentLine = lines.find((line) => line.trim())?.trim() || '';
    if (!firstContentLine) return;
    if (/^(?:NOTE(?:\s|$)|STYLE$|REGION$)/.test(firstContentLine)) return;

    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1) {
      throw new Error('Unexpected WebVTT block: ' + firstContentLine);
    }
    if (timingIndex > 1 || (timingIndex === 1 && !lines[0].trim())) {
      throw new Error('Malformed WebVTT cue block: timing line must be first or follow one identifier');
    }

    const timing = /^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/.exec(lines[timingIndex].trim());
    if (!timing) throw new Error('Malformed WebVTT cue timing: ' + lines[timingIndex]);

    const start = parseTimestamp(timing[1]);
    const end = parseTimestamp(timing[2]);
    if (end <= start) {
      throw new Error('WebVTT cue end must be after start: ' + lines[timingIndex]);
    }

    cues.push({
      start,
      end,
      text: cleanCueText(lines.slice(timingIndex + 1))
    });
  });

  return cues;
}

function normalizeText(value) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

function isBracketOnlyNoise(text) {
  const withoutMarkers = text
    .replace(/(?:\[|【|\(|（)?\s*(?:music|applause|音乐|掌声)\s*(?:\]|】|\)|）)?/gi, '')
    .replace(/[\s，,。.!！？?、；;：:和与及\[\]【】()（）]+/g, '');
  return withoutMarkers === '';
}

function longestSuffixPrefixOverlap(previous, current) {
  const maximum = Math.min(previous.length, current.length);
  for (let length = maximum; length > 0; length -= 1) {
    if (previous.slice(previous.length - length) === current.slice(0, length)) {
      return length;
    }
  }
  return 0;
}

function joinCueText(left, right) {
  if (!left) return right;
  if (!right) return left;
  return left + ' ' + right;
}

function codePointLength(text) {
  return Array.from(text).length;
}

function splitTextForDisplay(text) {
  const remaining = Array.from(text);
  const parts = [];
  const minimumBoundary = Math.floor(MAX_DISPLAY_TEXT_LENGTH * 0.6);

  while (remaining.length > MAX_DISPLAY_TEXT_LENGTH) {
    let cut = MAX_DISPLAY_TEXT_LENGTH;
    for (let index = MAX_DISPLAY_TEXT_LENGTH; index >= minimumBoundary; index -= 1) {
      if (/[\s，。！？；：、,.!?;:]/u.test(remaining[index - 1])) {
        cut = index;
        break;
      }
    }

    const part = remaining.splice(0, cut).join('').trim();
    if (part) parts.push(part);
    while (remaining[0] && /\s/u.test(remaining[0])) remaining.shift();
  }

  const tail = remaining.join('').trim();
  if (tail) parts.push(tail);
  return parts;
}

function splitCueForDisplay(cue) {
  const parts = splitTextForDisplay(cue.text);
  if (parts.length <= 1) return [cue];

  const weights = parts.map(codePointLength);
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const duration = cue.end - cue.start;
  let consumedWeight = 0;

  return parts.map((text, index) => {
    const start = index === 0
      ? cue.start
      : cue.start + (duration * consumedWeight / totalWeight);
    consumedWeight += weights[index];
    const end = index === parts.length - 1
      ? cue.end
      : cue.start + (duration * consumedWeight / totalWeight);
    return { start, end, text };
  });
}

function compactCues(cues) {
  if (!Array.isArray(cues)) throw new TypeError('cues must be an array');

  const sorted = cues.map((cue, index) => {
    if (!cue || typeof cue !== 'object' || Array.isArray(cue) ||
        !Number.isFinite(cue.start) || cue.start < 0 ||
        !Number.isFinite(cue.end) || cue.end <= cue.start ||
        typeof cue.text !== 'string') {
      throw new Error('Invalid cue at index ' + index);
    }
    return {
      start: cue.start,
      end: cue.end,
      text: normalizeText(cue.text),
      index
    };
  }).sort((left, right) => (
    left.start - right.start ||
    left.end - right.end ||
    left.index - right.index
  ));

  const deduplicated = [];
  let previousSourceText = '';
  let previousSourceEnd = -Infinity;

  sorted.forEach((cue) => {
    if (!cue.text || isBracketOnlyNoise(cue.text)) return;

    let overlap = previousSourceText && cue.start - previousSourceEnd <= ROLLING_GAP_SECONDS
      ? longestSuffixPrefixOverlap(previousSourceText, cue.text)
      : 0;
    const shorterLength = Math.min(previousSourceText.length, cue.text.length);
    if (overlap < MIN_ROLLING_OVERLAP ||
        overlap / shorterLength < MIN_ROLLING_OVERLAP_RATIO) overlap = 0;
    const text = normalizeText(cue.text.slice(overlap));
    previousSourceText = cue.text;
    previousSourceEnd = cue.end;

    if (!text) {
      const previous = deduplicated[deduplicated.length - 1];
      if (previous) previous.end = Math.max(previous.end, cue.end);
      return;
    }

    deduplicated.push({ start: cue.start, end: cue.end, text });
  });

  const nonoverlapping = [];
  deduplicated.forEach((cue, index) => {
    const next = deduplicated[index + 1];
    const end = next ? Math.min(cue.end, next.start) : cue.end;
    if (end > cue.start) nonoverlapping.push({ start: cue.start, end, text: cue.text });
  });

  const displayCues = nonoverlapping.flatMap(splitCueForDisplay);
  const merged = [];
  displayCues.forEach((cue) => {
    const previous = merged[merged.length - 1];
    const previousIsShort = previous && previous.end - previous.start < SHORT_CUE_SECONDS;
    const cueIsShort = cue.end - cue.start < SHORT_CUE_SECONDS;
    const gap = previous ? cue.start - previous.end : Infinity;

    const mergedText = previous ? joinCueText(previous.text, cue.text) : cue.text;
    const staysReadable = previous &&
      cue.end - previous.start <= MAX_MERGED_SECONDS &&
      codePointLength(mergedText) <= MAX_MERGED_TEXT_LENGTH;

    if (previous && gap <= ADJACENT_GAP_SECONDS &&
        (previousIsShort || cueIsShort) && staysReadable) {
      previous.end = cue.end;
      previous.text = mergedText;
    } else {
      merged.push({ start: cue.start, end: cue.end, text: cue.text });
    }
  });

  if (merged.length > 1) {
    const last = merged[merged.length - 1];
    const previous = merged[merged.length - 2];
    const mergedText = joinCueText(previous.text, last.text);
    if (last.end - last.start < SHORT_CUE_SECONDS &&
        last.start - previous.end <= ADJACENT_GAP_SECONDS &&
        last.end - previous.start <= MAX_MERGED_SECONDS &&
        codePointLength(mergedText) <= MAX_MERGED_TEXT_LENGTH) {
      previous.end = last.end;
      previous.text = mergedText;
      merged.pop();
    }
  }

  return merged;
}

function isRealDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.getUTCFullYear() === Number(match[1]) &&
    date.getUTCMonth() === Number(match[2]) - 1 &&
    date.getUTCDate() === Number(match[3]);
}

function buildTrack(options) {
  if (!options || typeof options !== 'object' || Array.isArray(options)) {
    throw new TypeError('options must be an object');
  }

  const videoId = typeof options.videoId === 'string' ? options.videoId.trim() : '';
  const language = typeof options.language === 'string' ? options.language.trim() : '';
  const source = typeof options.source === 'string' ? options.source.trim() : '';
  const reviewStatus = options.reviewStatus;
  const updatedAt = typeof options.updatedAt === 'string' ? options.updatedAt.trim() : '';

  if (!/^[A-Za-z0-9_-]{11}$/.test(videoId)) throw new Error('Invalid videoId');
  if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(language)) throw new Error('Invalid language');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(source)) throw new Error('Invalid source');
  if (reviewStatus !== 'draft' && reviewStatus !== 'reviewed') throw new Error('Invalid reviewStatus');
  if (!isRealDate(updatedAt)) throw new Error('Invalid updatedAt');

  const compacted = compactCues(options.cues);
  if (compacted.length === 0) throw new Error('Invalid cues: at least one spoken cue is required');

  return {
    videoId,
    language,
    source,
    reviewStatus,
    updatedAt,
    cues: compacted
  };
}

function parseArguments(args) {
  const values = Object.create(null);

  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (!REQUIRED_ARGUMENTS.includes(name)) throw new Error('Unknown argument: ' + name);
    if (Object.prototype.hasOwnProperty.call(values, name)) throw new Error('Duplicate argument: ' + name);
    if (index + 1 >= args.length || REQUIRED_ARGUMENTS.includes(args[index + 1])) {
      throw new Error('Missing value for argument: ' + name);
    }
    values[name] = args[index + 1];
    index += 1;
  }

  REQUIRED_ARGUMENTS.forEach((name) => {
    if (!Object.prototype.hasOwnProperty.call(values, name)) {
      throw new Error('Missing required argument: ' + name);
    }
  });

  return values;
}

function canonicalPath(value) {
  const resolved = path.resolve(value);
  let canonical = resolved;

  try {
    canonical = fs.realpathSync.native(resolved);
  } catch (error) {
    try {
      canonical = path.join(fs.realpathSync.native(path.dirname(resolved)), path.basename(resolved));
    } catch (directoryError) {
      canonical = resolved;
    }
  }

  return process.platform === 'win32' ? canonical.toLowerCase() : canonical;
}

function runCli(args) {
  const values = parseArguments(args);
  const inputPath = path.resolve(values['--input']);
  const outputPath = path.resolve(values['--output']);
  if (canonicalPath(inputPath) === canonicalPath(outputPath)) {
    throw new Error('Input and output must use different paths');
  }

  const input = fs.readFileSync(inputPath, 'utf8');
  const track = buildTrack({
    videoId: values['--video-id'],
    language: values['--language'],
    source: values['--source'],
    reviewStatus: values['--review-status'],
    updatedAt: values['--updated-at'],
    cues: parseVtt(input)
  });
  const output = JSON.stringify(track, null, 2) + '\n';
  const temporaryPath = outputPath + '.' + process.pid + '.' + Date.now() + '.tmp';

  try {
    fs.writeFileSync(temporaryPath, output, 'utf8');
    fs.renameSync(temporaryPath, outputPath);
  } finally {
    if (fs.existsSync(temporaryPath)) fs.rmSync(temporaryPath, { force: true });
  }
  return 0;
}

if (require.main === module) {
  try {
    runCli(process.argv.slice(2));
  } catch (error) {
    console.error('Error: ' + error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  parseTimestamp,
  parseVtt,
  compactCues,
  buildTrack,
  runCli
};
