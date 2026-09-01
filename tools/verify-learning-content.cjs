'use strict';

const fs = require('node:fs');
const path = require('node:path');

const catalog = require('./learning-map-catalog.cjs');
const siteData = require('./site-data.cjs');
const subtitleApi = require('../src/video-subtitles.js');

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const CATEGORY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PROBLEM_PREFIX = '视频未单独说明处理前问题';
const COURSE_TONE = /练习|作业|打卡|建议你/u;
const PARAMETER_TONE = /参数设置|设置为/u;
const PARAMETER_VALUE = /\d+(?:\.\d+)?(?:\s*(?:-|\u2013|\u2014|~|〜|至)\s*\d+(?:\.\d+)?)?\s*(?:k?hz|mhz|ms|s|db|%|％|赫兹|毫秒)(?![A-Za-z])/iu;
const RATIO_VALUE = /\b\d+(?:\.\d+)?\s*:\s*\d+(?:\.\d+)?\b/u;
const PLACEHOLDER_TONE = /自动生成|待补充|未知输入/u;
const BOILERPLATE_TONE = /进行处理|得到更好效果|提升整体质感/u;
const LATIN_STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is',
  'it', 'of', 'on', 'or', 'that', 'the', 'this', 'to', 'use', 'using', 'with',
  'also', 'additionally', 'furthermore'
]);
const CJK_STOP_WORDS = new Set([
  '一些', '一种', '不同', '东西', '主要', '之后', '之前', '也是', '什么',
  '从而', '使用', '内容', '再次', '可以', '同时', '后来', '因为', '声音',
  '加入', '处理', '如果', '已经', '得到', '效果', '整体', '时候', '更好', '有些',
  '这个', '这些', '进行', '进行处理', '那个', '需要', '问题'
]);
const STRUCTURE_TERMS = /分层|分组|骨架/gu;
const VISUAL_CONTEXT_TERMS = /成片|画面/u;
const SUPPORT_SCAFFOLDING = Object.freeze([
  '并且', '另外', '此外', '随后', '然后', '同时', '以及', '而且', '但是',
  '只是', '仍然', '已经', '改用', '打开',
  '负责', '承担', '职责', '作用', '用于', '作为', '保留', '保持',
  '获得', '形成', '成为', '增加', '加入', '调整', '改变', '控制',
  '产生', '进行', '执行', '重新', '继续', '把', '将', '让', '给', '用', '只'
]);
const COMMA_CLAUSE_CONNECTORS =
  /[，,]\s*(?=(?:但(?:是)?|却|而(?:且)?|同时|并且|并|另外|此外|再|随后|然后|改用|打开|执行|and\b|but\b|also\b|however\b|then\b))/giu;
const CLAUSE_CONNECTORS =
  /并且|另外|此外|然后|接着|随后|并(?=打开|改用|启用|执行|进行|加入|使用|调整|改变|控制|移除|保留|把|将|让|用|逐层)|同时(?=打开|改用|启用|执行|进行|加入|使用|调整|改变|控制|移除|保留|把|将|让|用|获得)|再(?=改用|打开|启用|执行|进行|加入|使用|调整|改变|控制|移除|保留|以)/gu;
const ENGLISH_CLAUSE_CONNECTORS =
  /\b(?:and\s+then|then|but|while|however|additionally|furthermore)\b/giu;
const CJK_NAMED_PHRASE =
  /[\p{Script=Han}]{2,}(?:协议|算法|引擎|插件|模块|系统|平台|产品|模型|预设|模式)/gu;
const ENGLISH_NAMED_PHRASE =
  /\b(?:[a-z][a-z0-9+_-]*\s+){1,4}(?:protocol|algorithm|engine|plugin|module|system|platform|product|model|preset)\b/giu;
const LATIN_NAMED_PHRASE =
  /\b(?:[A-Z][A-Za-z0-9]*(?:[-+][A-Za-z0-9]+)+|[A-Z][a-z]+(?:[A-Z][A-Za-z0-9]*)+|[A-Z]+[A-Z0-9]*\d[A-Z0-9]*)(?:\s+(?:Jr\.?|Pro|\d+(?:\.\d+)?))?\b/g;
const LATIN_VERSIONED_PRODUCT =
  /\b([a-z][a-z0-9]*(?:[-+][a-z]+)+)[\s-]*(\d+(?:\.\d+)?)\b/giu;
const MINIMUM_NAMED_PHRASE_COVERAGE = 0.6;

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
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
    if (new Set(selected).size !== selected.length) throw new Error('Duplicate videoId in --videos');
    videos = selected;
  }
  return { category, videos };
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function usefulCjkToken(token) {
  return token.length >= 2 && !CJK_STOP_WORDS.has(token);
}

function extractLatinProductVersions(value) {
  const tokens = [];
  const text = String(value || '').replace(
    LATIN_VERSIONED_PRODUCT,
    (_match, family, version) => {
      tokens.push(`${family.toLowerCase()}@${version}`);
      return ' ';
    }
  );
  return { text, tokens };
}

function normalizeTokens(value) {
  const extracted = extractLatinProductVersions(
    String(value || '').normalize('NFKC').toLowerCase()
  );
  const text = extracted.text;
  const tokens = new Set(extracted.tokens);
  if (STRUCTURE_TERMS.test(text)) tokens.add('structure');
  STRUCTURE_TERMS.lastIndex = 0;
  if (VISUAL_CONTEXT_TERMS.test(text)) tokens.add('visual-context');
  const latinMatches = text.match(/[a-z][a-z0-9]*(?:[-+][a-z0-9]+)*/g) || [];
  for (const token of latinMatches) {
    if (token.length >= 2 && !LATIN_STOP_WORDS.has(token)) tokens.add(token);
  }

  const cjkRuns = text.match(/[\p{Script=Han}]+/gu) || [];
  for (const run of cjkRuns) {
    const characters = Array.from(run);
    const maximum = Math.min(4, characters.length);
    for (let size = 2; size <= maximum; size += 1) {
      for (let start = 0; start + size <= characters.length; start += 1) {
        const token = characters.slice(start, start + size).join('');
        if (usefulCjkToken(token)) tokens.add(token);
      }
    }
  }
  return Object.freeze([...tokens].sort(compareText));
}

function collectStrings(value, output) {
  if (typeof value === 'string') {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => collectStrings(item, output));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const key of Object.keys(value)) collectStrings(value[key], output);
}

function stepIndexFor(step, record) {
  if (!record || !Array.isArray(record.steps)) return -1;
  const referenceIndex = record.steps.indexOf(step);
  if (referenceIndex >= 0) return referenceIndex;
  if (!step || !Number.isInteger(step.order)) return -1;
  return record.steps.findIndex((candidate) => candidate && candidate.order === step.order);
}

function stringsForStep(step, context, purposeOnly = false) {
  const record = context && context.record;
  const stepIndex = stepIndexFor(step, record);
  const strings = [];
  if (!step || stepIndex < 0) return strings;
  collectStrings(step.name, strings);
  collectStrings(step.detail, strings);
  collectStrings(step.materials, strings);

  const effectUses = Array.isArray(record.effectUses) ? record.effectUses : [];
  for (const effectUse of effectUses) {
    if (!effectUse || effectUse.stepIndex !== stepIndex) continue;
    if (purposeOnly) {
      collectStrings(effectUse.target, strings);
      collectStrings(effectUse.purpose, strings);
      collectStrings(effectUse.result, strings);
    } else {
      collectStrings(effectUse, strings);
    }
  }

  return strings;
}

function evidenceTokensForStep(step, context = {}) {
  return normalizeTokens(stringsForStep(step, context).join('\n'));
}

function addFailure(failures, message) {
  if (!failures.includes(message)) failures.push(message);
}

function fieldFailure(failures, videoId, field, reason) {
  addFailure(failures, `[videoId ${videoId}] [field ${field}] ${reason}`);
}

function stepFailure(failures, videoId, order, field, reason) {
  addFailure(failures, `[videoId ${videoId}] [step order ${order}] ${field} ${reason}`);
}

function inspectEmpty(value, field, videoId, failures) {
  if (typeof value === 'string') {
    if (!value.trim()) fieldFailure(failures, videoId, field, 'is empty or whitespace-only');
    return;
  }
  if (value === null || typeof value === 'undefined') {
    fieldFailure(failures, videoId, field, 'is empty');
    return;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) fieldFailure(failures, videoId, field, 'must not be empty');
    value.forEach((item, index) => inspectEmpty(item, `${field}[${index}]`, videoId, failures));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const key of Object.keys(value)) inspectEmpty(value[key], `${field}.${key}`, videoId, failures);
}

function learningTextFields(entry) {
  const fields = [];
  const learningMap = entry && entry.learningMap;
  if (isPlainObject(learningMap)) {
    fields.push(['learningMap.goal', learningMap.goal]);
    fields.push(['learningMap.sequence', learningMap.sequence]);
    if (Array.isArray(learningMap.roles)) {
      learningMap.roles.forEach((role, index) => {
        fields.push([`learningMap.roles[${index}].name`, role && role.name]);
        fields.push([`learningMap.roles[${index}].description`, role && role.description]);
      });
    }
    if (Array.isArray(learningMap.decisions)) {
      learningMap.decisions.forEach((decision, index) => {
        fields.push([`learningMap.decisions[${index}]`, decision]);
      });
    }
    if (Array.isArray(learningMap.chapters)) {
      learningMap.chapters.forEach((chapter, index) => {
        fields.push([`learningMap.chapters[${index}].title`, chapter && chapter.title]);
        fields.push([`learningMap.chapters[${index}].question`, chapter && chapter.question]);
        fields.push([`learningMap.chapters[${index}].summary`, chapter && chapter.summary]);
      });
    }
  }
  if (Array.isArray(entry && entry.steps)) {
    entry.steps.forEach((step, index) => {
      const order = step && step.order;
      const learning = step && step.learning;
      for (const name of ['input', 'problem', 'action', 'result']) {
        fields.push([`steps[${index}].learning.${name}`, learning && learning[name], order, name]);
      }
    });
  }
  return fields;
}

function lintTone(entry, videoId, failures) {
  for (const [field, raw, order, shortField] of learningTextFields(entry)) {
    if (typeof raw !== 'string') continue;
    const text = raw.trim();
    const report = (reason) => {
      if (Number.isInteger(order)) stepFailure(failures, videoId, order, `learning.${shortField}`, reason);
      else fieldFailure(failures, videoId, field, reason);
    };
    const courseMatch = text.match(COURSE_TONE);
    const parameterToneMatch = text.match(PARAMETER_TONE);
    const parameterValueMatch = text.match(PARAMETER_VALUE) || text.match(RATIO_VALUE);
    const placeholderMatch = text.match(PLACEHOLDER_TONE);
    const boilerplateMatch = text.match(BOILERPLATE_TONE);
    if (courseMatch) report(`uses course or exercise wording ${JSON.stringify(courseMatch[0])}`);
    if (parameterToneMatch) {
      report(`uses parameter-table wording ${JSON.stringify(parameterToneMatch[0])}`);
    }
    if (parameterValueMatch) {
      report(`uses a numeric parameter-table value or range ${JSON.stringify(parameterValueMatch[0])}`);
    }
    if (placeholderMatch) {
      report(`uses placeholder or generated wording ${JSON.stringify(placeholderMatch[0])}`);
    }
    if (boilerplateMatch) {
      report(`uses unsupported boilerplate wording ${JSON.stringify(boilerplateMatch[0])}`);
    }
  }
}

function comparableText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\p{P}\p{S}\s]+/gu, '');
}

function verifyChapterSummaries(entry, videoId, failures) {
  const chapters = entry && entry.learningMap && entry.learningMap.chapters;
  if (!Array.isArray(chapters)) return;
  const seen = new Map();
  chapters.forEach((chapter, index) => {
    const normalized = comparableText(chapter && chapter.summary);
    if (!normalized) return;
    if (seen.has(normalized)) {
      fieldFailure(
        failures,
        videoId,
        `learningMap.chapters[${index}].summary`,
        `duplicates chapter summary at index ${seen.get(normalized)}`
      );
    } else {
      seen.set(normalized, index);
    }
  });
}

function imageOwnerIndex(records) {
  const result = new Map();
  if (!Array.isArray(records)) return result;
  records.forEach((record) => {
    if (!record || !Array.isArray(record.steps)) return;
    record.steps.forEach((step, stepIndex) => {
      if (!step || typeof step.imageKey !== 'string' || !step.imageKey.trim()) return;
      if (!result.has(step.imageKey)) result.set(step.imageKey, []);
      result.get(step.imageKey).push({
        videoId: record.videoId,
        recordId: record.id,
        stepIndex,
        stepOrder: step.order
      });
    });
  });
  return result;
}

function effectIdIndex(records) {
  const result = new Map();
  if (!Array.isArray(records)) return result;
  records.forEach((record) => {
    if (!record || !Array.isArray(record.effectUses)) return;
    record.effectUses.forEach((effectUse, effectIndex) => {
      if (!effectUse || typeof effectUse.id !== 'string' || !effectUse.id.trim()) return;
      if (!result.has(effectUse.id)) result.set(effectUse.id, []);
      result.get(effectUse.id).push({
        videoId: record.videoId,
        recordId: record.id,
        effectIndex
      });
    });
  });
  return result;
}

function manifestIdentityMatches(key, manifestEntry) {
  if (!isPlainObject(manifestEntry)) return false;
  const paths = [manifestEntry.preview, manifestEntry.full].filter((value) => typeof value === 'string');
  return paths.length > 0 && paths.every((filename) => (
    path.basename(filename, path.extname(filename)) === key
  ));
}

function productAliases(effectUse) {
  if (!effectUse || typeof effectUse.name !== 'string') return [];
  const aliases = new Set();
  const full = comparableText(effectUse.name);
  if (full.length >= 3) aliases.add(full);
  const vendor = typeof effectUse.vendor === 'string' ? comparableText(effectUse.vendor) : '';
  if (vendor && full.startsWith(vendor)) {
    const product = full.slice(vendor.length);
    if (product.length >= 3) aliases.add(product);
  }
  return [...aliases];
}

function verifyProductIdentity(entry, context, failures) {
  const record = context.record;
  if (!record || !Array.isArray(record.steps) || !Array.isArray(record.effectUses)) return;
  const effectsByStep = new Map();
  record.effectUses.forEach((effectUse) => {
    if (!effectUse || !Number.isInteger(effectUse.stepIndex)) return;
    if (!effectsByStep.has(effectUse.stepIndex)) effectsByStep.set(effectUse.stepIndex, []);
    effectsByStep.get(effectUse.stepIndex).push(effectUse);
  });

  entry.steps.forEach((entryStep) => {
    const stepIndex = record.steps.findIndex((step) => step && step.order === entryStep.order);
    if (stepIndex < 0 || !entryStep.learning) return;
    const evidenceCompact = comparableText(stringsForStep(record.steps[stepIndex], context).join('\n'));
    for (const field of ['input', 'problem', 'action', 'result']) {
      const text = comparableText(entryStep.learning[field]);
      if (!text) continue;
      record.effectUses.forEach((effectUse) => {
        if (!effectUse || effectUse.stepIndex === stepIndex) return;
        for (const alias of productAliases(effectUse)) {
          if (text.includes(alias) && !evidenceCompact.includes(alias)) {
            stepFailure(
              failures,
              entry.videoId,
              entryStep.order,
              `learning.${field}`,
              `drifts to unsupported product identity ${JSON.stringify(effectUse.name)}`
            );
          }
        }
      });
    }
  });
}

function verifyScreenshotIdentity(context, videoId, failures) {
  const record = context.record;
  const manifest = context.imageManifest;
  if (!record || !Array.isArray(record.steps)) {
    fieldFailure(failures, videoId, 'context.record.steps', 'is required');
    return;
  }
  if (!isPlainObject(manifest)) {
    fieldFailure(failures, videoId, 'context.imageManifest', 'is required');
    return;
  }
  const records = Array.isArray(context.records) ? context.records : [record];
  const owners = imageOwnerIndex(records);
  const effectIds = effectIdIndex(records);
  const sourceRecord = records.find((candidate) => (
    candidate && candidate.id === record.id && candidate.videoId === videoId
  ));
  record.steps.forEach((step, stepIndex) => {
    const order = step && step.order;
    const key = step && step.imageKey;
    if (key === null || typeof key === 'undefined') return;
    if (typeof key !== 'string' || !key.trim()) {
      stepFailure(failures, videoId, order, 'imageKey', 'must be missing, null, or a non-empty string');
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(manifest, key)) {
      stepFailure(failures, videoId, order, 'imageKey', `${JSON.stringify(key)} is missing from image manifest`);
      return;
    }
    if (!manifestIdentityMatches(key, manifest[key])) {
      stepFailure(failures, videoId, order, 'imageKey', `${JSON.stringify(key)} drifts from manifest asset identity`);
    }
    const keyOwners = owners.get(key) || [];
    if (!keyOwners.some((owner) => (
      owner.videoId === videoId && owner.stepIndex === stepIndex && owner.stepOrder === order
    ))) {
      stepFailure(failures, videoId, order, 'imageKey', `${JSON.stringify(key)} has no exact step owner`);
    }
    if (keyOwners.some((owner) => owner.videoId !== videoId)) {
      stepFailure(failures, videoId, order, 'imageKey', `${JSON.stringify(key)} is owned by another video`);
    }
  });

  const effectUses = Array.isArray(record.effectUses) ? record.effectUses : [];
  effectUses.forEach((effectUse, effectIndex) => {
    const field = `effectUses[${effectIndex}]`;
    if (!effectUse || !isPlainObject(effectUse)) {
      fieldFailure(failures, videoId, field, 'must be an object');
      return;
    }
    if (typeof effectUse.id !== 'string' || !effectUse.id.trim()) {
      fieldFailure(failures, videoId, `${field}.id`, 'must be a non-empty string');
    } else {
      const sourceEffect = sourceRecord && Array.isArray(sourceRecord.effectUses)
        ? sourceRecord.effectUses[effectIndex]
        : null;
      if (sourceEffect && effectUse.id !== sourceEffect.id) {
        fieldFailure(failures, videoId, `${field}.id`, 'changed from the existing site source identity');
      }
      const idOwners = effectIds.get(effectUse.id) || [];
      const hasExactOwner = idOwners.some((owner) => (
        owner.videoId === videoId &&
        owner.recordId === record.id &&
        owner.effectIndex === effectIndex
      ));
      if (idOwners.length !== 1 || !hasExactOwner) {
        fieldFailure(failures, videoId, `${field}.id`, 'must be unique across existing site effects');
      }
    }
    if (typeof effectUse.name !== 'string' || !effectUse.name.trim()) {
      fieldFailure(failures, videoId, `${field}.name`, 'must identify the effect product');
    }
    if (!Number.isInteger(effectUse.stepIndex) || effectUse.stepIndex < 0 || effectUse.stepIndex >= record.steps.length) {
      fieldFailure(failures, videoId, `${field}.stepIndex`, 'does not identify a site step');
      return;
    }
    const step = record.steps[effectUse.stepIndex];
    if (Object.prototype.hasOwnProperty.call(effectUse, 'stepOrder') && effectUse.stepOrder !== step.order) {
      fieldFailure(failures, videoId, `${field}.stepOrder`, 'does not match step order');
    }
    if (!Object.prototype.hasOwnProperty.call(effectUse, 'screenshotKey') ||
        typeof effectUse.screenshotKey === 'undefined') {
      fieldFailure(
        failures,
        videoId,
        `${field}.screenshotKey`,
        'must be present as null or a non-empty string'
      );
      return;
    }
    const screenshotKey = effectUse.screenshotKey;
    if (screenshotKey === null) return;
    if (typeof screenshotKey !== 'string') {
      fieldFailure(failures, videoId, `${field}.screenshotKey`, 'must be null or a non-empty string');
      return;
    }
    if (!screenshotKey.trim()) {
      fieldFailure(failures, videoId, `${field}.screenshotKey`, 'must be null or a non-empty string');
      return;
    }
    if (screenshotKey !== step.imageKey) {
      fieldFailure(
        failures,
        videoId,
        `${field}.screenshotKey`,
        `does not match step order ${step.order} image identity`
      );
      return;
    }
    if (!Object.prototype.hasOwnProperty.call(manifest, screenshotKey)) {
      fieldFailure(failures, videoId, `${field}.screenshotKey`, 'is missing from image manifest');
    }
    const keyOwners = owners.get(screenshotKey) || [];
    const hasExactOwner = keyOwners.some((owner) => (
      owner.recordId === record.id &&
      owner.videoId === videoId &&
      owner.stepIndex === effectUse.stepIndex &&
      owner.stepOrder === step.order
    ));
    if (!hasExactOwner || keyOwners.length !== 1) {
      fieldFailure(
        failures,
        videoId,
        `${field}.screenshotKey`,
        'does not have exactly one matching record and step owner'
      );
    }
  });
}

function intersects(tokens, evidenceSet) {
  return tokens.some((token) => evidenceSet.has(token));
}

function splitSubstantiveClauses(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(COMMA_CLAUSE_CONNECTORS, '\n')
    .replace(ENGLISH_CLAUSE_CONNECTORS, '\n')
    .replace(CLAUSE_CONNECTORS, '\n')
    .split(/[。！？.!?；;\n]+/u)
    .map((clause) => clause.replace(
      /^(?:同时|并且|并|另外|此外|再|随后|然后|但是|但|却|而且|而|且|and|but|also|however|then)\s*/iu,
      ''
    ).trim())
    .filter(Boolean);
}

function supportText(value) {
  let text = String(value || '').normalize('NFKC').toLowerCase();
  text = text.replace(STRUCTURE_TERMS, ' structure ');
  STRUCTURE_TERMS.lastIndex = 0;
  for (const phrase of SUPPORT_SCAFFOLDING) text = text.split(phrase).join(' ');
  return text.replace(/[的地得了]/gu, ' ');
}

function supportUnits(value) {
  const extracted = extractLatinProductVersions(
    String(value || '').normalize('NFKC').toLowerCase()
  );
  const text = supportText(extracted.text);
  const units = [...extracted.tokens];
  if (VISUAL_CONTEXT_TERMS.test(text)) units.push('visual-context');
  const latinMatches = text.match(/[a-z][a-z0-9]*(?:[-+][a-z0-9]+)*/g) || [];
  for (const token of latinMatches) {
    if (token.length >= 2 && !LATIN_STOP_WORDS.has(token)) units.push(token);
  }
  const cjkRuns = text.match(/[\p{Script=Han}]+/gu) || [];
  for (const run of cjkRuns) {
    const characters = Array.from(run);
    for (let index = 0; index + 1 < characters.length; index += 1) {
      const token = characters.slice(index, index + 2).join('');
      if (usefulCjkToken(token)) units.push(token);
    }
  }
  return units;
}

function namedPhrasesSupported(clause, evidenceSet) {
  const sourceText = String(clause || '').normalize('NFKC');
  const text = supportText(clause);
  const phrases = [
    ...(text.match(CJK_NAMED_PHRASE) || []),
    ...(text.match(ENGLISH_NAMED_PHRASE) || []),
    ...(sourceText.match(LATIN_NAMED_PHRASE) || [])
  ];
  for (const phrase of phrases) {
    const units = supportUnits(phrase);
    const supportedCount = units.filter((token) => evidenceSet.has(token)).length;
    if (units.length === 0 || supportedCount / units.length < MINIMUM_NAMED_PHRASE_COVERAGE) {
      return false;
    }
  }
  return true;
}

function supportedClauses(value, evidenceSet) {
  const clauses = splitSubstantiveClauses(value);
  let substantiveCount = 0;
  for (const clause of clauses) {
    const units = supportUnits(clause);
    if (units.length === 0) continue;
    substantiveCount += 1;
    if (!intersects(units, evidenceSet) || !namedPhrasesSupported(clause, evidenceSet)) {
      return false;
    }
  }
  return substantiveCount > 0;
}

function recordEvidenceTokens(context) {
  const record = context.record;
  if (!record) return new Set();
  const strings = [];
  collectStrings(record.summary, strings);
  collectStrings(record.coreIdeas, strings);
  collectStrings(record.materials, strings);
  if (Array.isArray(record.steps)) {
    record.steps.forEach((step) => {
      if (!step) return;
      collectStrings(step.name, strings);
      collectStrings(step.detail, strings);
      collectStrings(step.materials, strings);
    });
  }
  collectStrings(record.effectUses, strings);
  return new Set(normalizeTokens(strings.join('\n')));
}

function requireMapSupport(failures, videoId, field, text, evidence) {
  if (typeof text !== 'string' || !text.trim()) return;
  if (!supportedClauses(text, evidence)) {
    fieldFailure(failures, videoId, field, 'is unsupported by the selected record evidence');
  }
}

function verifyMapSupport(entry, context, failures) {
  const learningMap = entry && entry.learningMap;
  const record = context.record;
  if (!isPlainObject(learningMap) || !record || !Array.isArray(record.steps)) return;
  const globalEvidence = recordEvidenceTokens(context);
  requireMapSupport(failures, entry.videoId, 'learningMap.goal', learningMap.goal, globalEvidence);
  requireMapSupport(failures, entry.videoId, 'learningMap.sequence', learningMap.sequence, globalEvidence);

  if (Array.isArray(learningMap.roles)) {
    learningMap.roles.forEach((role, index) => {
      requireMapSupport(
        failures,
        entry.videoId,
        `learningMap.roles[${index}].name`,
        role && role.name,
        globalEvidence
      );
      requireMapSupport(
        failures,
        entry.videoId,
        `learningMap.roles[${index}].description`,
        role && role.description,
        globalEvidence
      );
    });
  }
  if (Array.isArray(learningMap.decisions)) {
    learningMap.decisions.forEach((decision, index) => {
      requireMapSupport(
        failures,
        entry.videoId,
        `learningMap.decisions[${index}]`,
        decision,
        globalEvidence
      );
    });
  }

  const stepsByOrder = new Map(record.steps.map((step) => [step.order, step]));
  if (Array.isArray(learningMap.chapters)) {
    learningMap.chapters.forEach((chapter, index) => {
      requireMapSupport(
        failures,
        entry.videoId,
        `learningMap.chapters[${index}].title`,
        chapter && chapter.title,
        globalEvidence
      );
      requireMapSupport(
        failures,
        entry.videoId,
        `learningMap.chapters[${index}].question`,
        chapter && chapter.question,
        globalEvidence
      );
      if (!chapter || !Array.isArray(chapter.stepOrders)) return;
      const chapterTokens = new Set();
      chapter.stepOrders.forEach((order) => {
        const step = stepsByOrder.get(order);
        if (!step) return;
        evidenceTokensForStep(step, context).forEach((token) => chapterTokens.add(token));
      });
      requireMapSupport(
        failures,
        entry.videoId,
        `learningMap.chapters[${index}].summary`,
        chapter.summary,
        chapterTokens
      );
    });
  }
}

function verifyStepSupport(entry, context, failures) {
  const record = context.record;
  if (!record || !Array.isArray(record.steps) || !Array.isArray(entry.steps)) return;
  const recordSteps = new Map(record.steps.map((step) => [step.order, step]));
  entry.steps.forEach((entryStep) => {
    if (!entryStep || !entryStep.learning) return;
    const step = recordSteps.get(entryStep.order);
    if (!step) return;
    const evidence = new Set(evidenceTokensForStep(step, context));
    for (const field of ['input', 'action', 'result']) {
      if (!supportedClauses(entryStep.learning[field], evidence)) {
        stepFailure(
          failures,
          entry.videoId,
          entryStep.order,
          `learning.${field}`,
          'is unsupported by this step evidence'
        );
      }
    }

    const problem = typeof entryStep.learning.problem === 'string'
      ? entryStep.learning.problem.trim()
      : '';
    if (!problem) return;
    if (problem.startsWith(PROBLEM_PREFIX)) {
      const suffix = problem.slice(PROBLEM_PREFIX.length).replace(/^[：:，,。\s]+/u, '').trim();
      if (suffix) {
        const purpose = new Set(normalizeTokens(stringsForStep(step, context, true).join('\n')));
        if (!supportedClauses(suffix, purpose)) {
          stepFailure(
            failures,
            entry.videoId,
            entryStep.order,
            'learning.problem',
            'has an unsupported transparent-prefix purpose suffix'
          );
        }
      }
    } else if (!supportedClauses(problem, evidence)) {
      stepFailure(
        failures,
        entry.videoId,
        entryStep.order,
        'learning.problem',
        `is unsupported; use exact prefix ${JSON.stringify(PROBLEM_PREFIX)} when the problem is not evidenced`
      );
    }
  });
}

function verifyEntry(entry, context = {}) {
  const videoId = entry && typeof entry.videoId === 'string'
    ? entry.videoId
    : context.record && context.record.videoId || 'unknown';
  const failures = [];
  const warnings = [];
  const record = context.record;
  const result = {
    videoId,
    steps: Array.isArray(record && record.steps) ? record.steps.length : 0,
    warnings,
    failures
  };

  try {
    catalog.validateEntry(entry, {
      record,
      category: record && record.category,
      path: context.path || '<memory>'
    });
  } catch (error) {
    addFailure(failures, `[videoId ${videoId}] catalog validation: ${error.message}`);
  }

  if (!entry || !isPlainObject(entry)) return result;
  if (entry.learningMap) inspectEmpty(entry.learningMap, 'learningMap', videoId, failures);
  if (entry.steps) inspectEmpty(entry.steps, 'steps', videoId, failures);
  lintTone(entry, videoId, failures);
  verifyChapterSummaries(entry, videoId, failures);
  verifyScreenshotIdentity(context, videoId, failures);
  if (Array.isArray(entry.steps)) {
    verifyMapSupport(entry, context, failures);
    verifyProductIdentity(entry, context, failures);
    verifyStepSupport(entry, context, failures);
  }
  return result;
}

function selectRecords(records, parsed) {
  const recordsById = new Map(records.map((record) => [record.videoId, record]));
  if (parsed.videos) {
    const unknown = parsed.videos.filter((videoId) => !recordsById.has(videoId));
    if (unknown.length > 0) throw new Error(`Unknown site videoId(s) requested: ${unknown.join(', ')}`);
  }
  const selectedIds = parsed.videos ? new Set(parsed.videos) : null;
  const selected = records.filter((record) => (
    (!parsed.category || record.category === parsed.category) &&
    (!selectedIds || selectedIds.has(record.videoId))
  ));
  if (selected.length === 0) throw new Error('No records match the requested selection');
  return selected;
}

function isInside(base, target) {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function subtitleTrackFor(root, record, fsImpl) {
  const entry = subtitleApi.entryFor(record.videoId);
  if (!entry || entry.contentStatus !== 'track') return null;
  const filename = path.resolve(root, entry.asset);
  if (!isInside(root, filename)) throw new Error(`[videoId ${record.videoId}] subtitle asset escapes repository`);
  const track = JSON.parse(fsImpl.readFileSync(filename, 'utf8'));
  if (!track || track.videoId !== record.videoId || !Array.isArray(track.cues)) {
    throw new Error(`[videoId ${record.videoId}] invalid local subtitle track`);
  }
  return track;
}

function emptyReport(parsed = { category: null, videos: null }) {
  return {
    mode: 'verify',
    filter: { category: parsed.category, videos: parsed.videos },
    records: 0,
    steps: 0,
    warnings: 0,
    failures: 0,
    details: []
  };
}

function emit(stdout, report) {
  stdout.write(JSON.stringify(report, null, 2) + '\n');
}

function runCli(args, options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '..'));
  const fsImpl = options.fsImpl || fs;
  const stdout = options.stdout || process.stdout;
  let parsed = { category: null, videos: null };
  let report = emptyReport(parsed);

  try {
    parsed = parseArguments(args);
    report = emptyReport(parsed);
    const html = fsImpl.readFileSync(path.join(root, 'index.html'), 'utf8');
    const parsedSite = siteData.parse(html);
    const selected = selectRecords(parsedSite.records, parsed);
    const loaded = catalog.load({
      root: path.join(root, 'content', 'learning-maps'),
      records: parsedSite.records,
      fsImpl
    });
    const entriesById = new Map(loaded.map((descriptor) => [descriptor.entry.videoId, descriptor]));
    report.records = selected.length;
    report.steps = selected.reduce((total, record) => total + record.steps.length, 0);

    for (const record of selected) {
      const descriptor = entriesById.get(record.videoId);
      if (!descriptor) {
        report.details.push(`[videoId ${record.videoId}] catalog entry is missing`);
        continue;
      }
      const result = verifyEntry(descriptor.entry, {
        record,
        records: parsedSite.records,
        imageManifest: parsedSite.imageManifest,
        subtitleTrack: subtitleTrackFor(root, record, fsImpl),
        path: descriptor.relativePath
      });
      report.details.push(...result.warnings.map((warning) => `WARNING ${warning}`));
      report.details.push(...result.failures);
      report.warnings += result.warnings.length;
    }
    report.failures = report.details.filter((detail) => !detail.startsWith('WARNING ')).length;
    emit(stdout, report);
    return { exitCode: report.failures === 0 ? 0 : 1, report };
  } catch (error) {
    report.details.push(error && error.message ? error.message : String(error));
    report.failures = report.details.filter((detail) => !detail.startsWith('WARNING ')).length;
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
  normalizeTokens,
  evidenceTokensForStep,
  verifyEntry,
  runCli
});
