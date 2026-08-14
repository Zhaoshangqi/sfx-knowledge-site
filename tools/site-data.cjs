const { types } = require('node:util');

const MARKERS = Object.freeze({
  records: '    const records = ',
  imageManifest: '    const imageManifest = ',
  pluginReferenceCatalog: '    const pluginReferenceCatalog = '
});
const MARKER_NAMES = Object.freeze(Object.keys(MARKERS));
const REGEX_PREFIX_KEYWORDS = new Set([
  'await', 'case', 'delete', 'do', 'else', 'in', 'instanceof', 'new',
  'of', 'return', 'throw', 'typeof', 'void', 'yield'
]);
const CONTROL_PAREN_KEYWORDS = new Set(['catch', 'for', 'if', 'switch', 'while', 'with']);

function isTagBoundary(character) {
  return character === undefined
    || character === '>'
    || character === '/'
    || character === ' '
    || character === '\t'
    || character === '\r'
    || character === '\n'
    || character === '\f';
}

function hasTagName(html, index, name) {
  return html.slice(index, index + name.length).toLowerCase() === name
    && isTagBoundary(html[index + name.length]);
}

function isScriptStartTag(html, index) {
  return html[index] === '<' && hasTagName(html, index + 1, 'script');
}

function isScriptEndTag(html, index) {
  return html[index] === '<' && html[index + 1] === '/'
    && hasTagName(html, index + 2, 'script');
}

function findTagEnd(html, start) {
  let quote = '';
  for (let index = start + 1; index < html.length; index += 1) {
    const character = html[index];
    if (quote) {
      if (character === quote) {
        quote = '';
      }
    } else if (character === "'" || character === '"') {
      quote = character;
    } else if (character === '>') {
      return index;
    }
  }
  return -1;
}

function isSelfClosingTag(html, start, end) {
  let index = end - 1;
  while (index > start && /\s/.test(html[index])) {
    index -= 1;
  }
  return html[index] === '/';
}

function isIdentifierStart(character) {
  if (!character) {
    return false;
  }
  const code = character.charCodeAt(0);
  return character === '$' || character === '_' || code > 127
    || (code >= 65 && code <= 90) || (code >= 97 && code <= 122);
}

function isIdentifierPart(character) {
  if (!character) {
    return false;
  }
  const code = character.charCodeAt(0);
  return isIdentifierStart(character) || (code >= 48 && code <= 57);
}

function recordLineMarker(html, index, matches) {
  if (index !== 0 && html[index - 1] !== '\n') {
    return;
  }
  for (const name of MARKER_NAMES) {
    if (html.startsWith(MARKERS[name], index)) {
      matches[name].push(index);
    }
  }
}

function scanScriptContent(html, start, matches) {
  let state = 'code';
  let canStartRegex = true;
  let regexCharacterClass = false;
  let pendingControlParen = false;
  let pendingStatementBlock = false;
  const parenContexts = [];
  const braceContexts = [];

  for (let index = start; index < html.length;) {
    const character = html[index];
    const next = html[index + 1];

    if (state === 'code') {
      if (isScriptEndTag(html, index)) {
        const end = findTagEnd(html, index);
        return end === -1 ? html.length : end + 1;
      }
      recordLineMarker(html, index, matches);

      if (/\s/.test(character)) {
        index += 1;
      } else if (character === '/' && next === '/') {
        state = 'line-comment';
        index += 2;
      } else if (character === '/' && next === '*') {
        state = 'block-comment';
        index += 2;
      } else if (character === '/' && canStartRegex) {
        state = 'regex';
        regexCharacterClass = false;
        pendingStatementBlock = false;
        index += 1;
      } else if (character === '/') {
        canStartRegex = true;
        pendingStatementBlock = false;
        index += 1;
      } else if (character === "'") {
        state = 'single-string';
        pendingStatementBlock = false;
        index += 1;
      } else if (character === '"') {
        state = 'double-string';
        pendingStatementBlock = false;
        index += 1;
      } else if (character === '`') {
        state = 'template-string';
        pendingStatementBlock = false;
        index += 1;
      } else if (isIdentifierStart(character)) {
        let end = index + 1;
        while (isIdentifierPart(html[end])) {
          end += 1;
        }
        const word = html.slice(index, end);
        pendingControlParen = CONTROL_PAREN_KEYWORDS.has(word);
        pendingStatementBlock = false;
        canStartRegex = pendingControlParen || REGEX_PREFIX_KEYWORDS.has(word);
        index = end;
      } else if (character >= '0' && character <= '9') {
        let end = index + 1;
        while (html[end] && /[A-Za-z0-9_.]/.test(html[end])) {
          end += 1;
        }
        canStartRegex = false;
        pendingStatementBlock = false;
        index = end;
      } else if (character === '(') {
        parenContexts.push(pendingControlParen ? 'control' : 'group');
        pendingControlParen = false;
        pendingStatementBlock = false;
        canStartRegex = true;
        index += 1;
      } else if (character === ')') {
        const closesControl = parenContexts.pop() === 'control';
        canStartRegex = closesControl;
        pendingStatementBlock = closesControl;
        index += 1;
      } else if (character === '{') {
        braceContexts.push(pendingStatementBlock ? 'statement' : 'expression');
        pendingStatementBlock = false;
        canStartRegex = true;
        index += 1;
      } else if (character === '}') {
        canStartRegex = braceContexts.pop() === 'statement';
        pendingStatementBlock = false;
        index += 1;
      } else if (character === ']') {
        canStartRegex = false;
        pendingStatementBlock = false;
        index += 1;
      } else if (character === '.') {
        canStartRegex = false;
        pendingStatementBlock = false;
        index += 1;
      } else if ((character === '+' || character === '-') && next === character) {
        canStartRegex = false;
        pendingStatementBlock = false;
        index += 2;
      } else {
        canStartRegex = true;
        pendingStatementBlock = false;
        index += 1;
      }
      continue;
    }

    if (state === 'line-comment') {
      if (character === '\n') {
        state = 'code';
      }
      index += 1;
      continue;
    }

    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        state = 'code';
        index += 2;
      } else {
        index += 1;
      }
      continue;
    }

    if (character === '\\') {
      index += 2;
    } else if (state === 'regex') {
      if (character === '[' && !regexCharacterClass) {
        regexCharacterClass = true;
      } else if (character === ']' && regexCharacterClass) {
        regexCharacterClass = false;
      } else if (character === '/' && !regexCharacterClass) {
        state = 'code';
        canStartRegex = false;
      }
      index += 1;
    } else if (
      (state === 'single-string' && character === "'")
      || (state === 'double-string' && character === '"')
      || (state === 'template-string' && character === '`')
    ) {
      state = 'code';
      canStartRegex = false;
      index += 1;
    } else {
      index += 1;
    }
  }

  return html.length;
}

function looksLikeHtmlTag(html, index) {
  const next = html[index + 1];
  return next === '!' || next === '?' || /[A-Za-z]/.test(next)
    || (next === '/' && /[A-Za-z]/.test(html[index + 2]));
}

function locateMarkers(html) {
  const matches = Object.fromEntries(MARKER_NAMES.map((name) => [name, []]));

  for (let index = 0; index < html.length;) {
    if (html.startsWith('<!--', index)) {
      const end = html.indexOf('-->', index + 4);
      index = end === -1 ? html.length : end + 3;
      continue;
    }
    if (isScriptStartTag(html, index)) {
      const tagEnd = findTagEnd(html, index);
      if (tagEnd === -1) {
        break;
      }
      if (isSelfClosingTag(html, index, tagEnd)) {
        index = tagEnd + 1;
      } else {
        index = scanScriptContent(html, tagEnd + 1, matches);
      }
      continue;
    }
    if (html[index] === '<' && looksLikeHtmlTag(html, index)) {
      const tagEnd = findTagEnd(html, index);
      index = tagEnd === -1 ? html.length : tagEnd + 1;
      continue;
    }
    index += 1;
  }

  for (const name of MARKER_NAMES) {
    if (matches[name].length === 0) {
      throw new Error(`Missing ${name} marker`);
    }
    if (matches[name].length > 1) {
      throw new Error(`Duplicate ${name} marker`);
    }
  }

  return Object.fromEntries(MARKER_NAMES.map((name) => [name, matches[name][0]]));
}

function parseSection(html, markerName, markerIndex, nextMarkerIndex) {
  const literalStart = markerIndex + MARKERS[markerName].length;
  const section = html.slice(literalStart, nextMarkerIndex);
  const boundary = section.match(/;[ \t\r\n]*$/);
  if (!boundary) {
    throw new Error(`Malformed ${markerName} boundary: expected a terminating semicolon`);
  }

  const literalEnd = literalStart + boundary.index;
  const literal = html.slice(literalStart, literalEnd);
  try {
    return {
      value: JSON.parse(literal),
      literalStart,
      literalEnd
    };
  } catch (error) {
    throw new Error(`Malformed ${markerName} JSON: ${error.message}`);
  }
}

function inspect(html) {
  if (typeof html !== 'string') {
    throw new TypeError('html must be a string');
  }

  const {
    records: recordsIndex,
    imageManifest: imageManifestIndex,
    pluginReferenceCatalog: pluginReferenceCatalogIndex
  } = locateMarkers(html);
  if (!(recordsIndex < imageManifestIndex && imageManifestIndex < pluginReferenceCatalogIndex)) {
    throw new Error('Site data markers are out of order');
  }

  const recordsSection = parseSection(html, 'records', recordsIndex, imageManifestIndex);
  const imageManifestSection = parseSection(
    html,
    'imageManifest',
    imageManifestIndex,
    pluginReferenceCatalogIndex
  );
  if (!Array.isArray(recordsSection.value)) {
    throw new TypeError('records must be an array');
  }
  if (
    imageManifestSection.value === null
    || typeof imageManifestSection.value !== 'object'
    || Array.isArray(imageManifestSection.value)
    || Object.getPrototypeOf(imageManifestSection.value) !== Object.prototype
  ) {
    throw new TypeError('imageManifest must be a non-null plain JSON object');
  }

  return {
    records: recordsSection.value,
    imageManifest: imageManifestSection.value,
    recordsLiteralStart: recordsSection.literalStart,
    recordsLiteralEnd: recordsSection.literalEnd,
    recordsBlockEnd: imageManifestIndex
  };
}

function parse(html) {
  const data = inspect(html);
  return {
    records: data.records,
    imageManifest: data.imageManifest
  };
}

function rejectJsonValue(path, reason) {
  throw new TypeError(`${path} ${reason}`);
}

function validateArray(value, path, ancestors) {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    rejectJsonValue(path, 'must use Array.prototype');
  }
  if (Object.getOwnPropertyDescriptor(Array.prototype, 'toJSON')) {
    rejectJsonValue(path, 'must not inherit toJSON');
  }

  const length = Object.getOwnPropertyDescriptor(value, 'length').value;
  let elementCount = 0;
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') {
      continue;
    }
    if (typeof key === 'symbol') {
      rejectJsonValue(path, 'must not contain symbol keys');
    }
    if (key === 'toJSON') {
      rejectJsonValue(path, 'must not contain toJSON');
    }

    const index = Number(key);
    if (!Number.isInteger(index) || index < 0 || index >= length || String(index) !== key) {
      rejectJsonValue(path, `must not contain extra array key ${JSON.stringify(key)}`);
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!Object.hasOwn(descriptor, 'value')) {
      rejectJsonValue(`${path}[${key}]`, 'must not be an accessor');
    }
    if (!descriptor.enumerable) {
      rejectJsonValue(`${path}[${key}]`, 'must be enumerable');
    }
    elementCount += 1;
    validateJsonValue(descriptor.value, `${path}[${key}]`, ancestors);
  }

  if (elementCount !== length) {
    rejectJsonValue(path, 'must be a dense array without holes');
  }
}

function validateObject(value, path, ancestors) {
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    rejectJsonValue(path, 'must be a plain data object');
  }
  if (prototype === Object.prototype && Object.getOwnPropertyDescriptor(Object.prototype, 'toJSON')) {
    rejectJsonValue(path, 'must not inherit toJSON');
  }

  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') {
      rejectJsonValue(path, 'must not contain symbol keys');
    }
    if (key === 'toJSON') {
      rejectJsonValue(path, 'must not contain toJSON');
    }

    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!Object.hasOwn(descriptor, 'value')) {
      rejectJsonValue(`${path}.${key}`, 'must not be an accessor');
    }
    if (!descriptor.enumerable) {
      rejectJsonValue(`${path}.${key}`, 'must be enumerable');
    }
    validateJsonValue(descriptor.value, `${path}.${key}`, ancestors);
  }
}

function validateJsonValue(value, path, ancestors) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return;
  }
  if (typeof value === 'number') {
    if (Object.is(value, -0)) {
      rejectJsonValue(path, 'must not contain negative zero');
    }
    if (!Number.isFinite(value)) {
      rejectJsonValue(path, 'must be a finite number');
    }
    return;
  }
  if (typeof value !== 'object') {
    rejectJsonValue(path, `must not contain ${typeof value}`);
  }
  if (types.isProxy(value)) {
    rejectJsonValue(path, 'must not contain proxies');
  }
  if (ancestors.has(value)) {
    rejectJsonValue(path, 'must not contain cycles');
  }

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      validateArray(value, path, ancestors);
    } else {
      validateObject(value, path, ancestors);
    }
  } finally {
    ancestors.delete(value);
  }
}

function inferRecordsEol(html, start, end) {
  let hasLf = false;
  let hasCrlf = false;

  for (let index = start; index < end; index += 1) {
    if (html[index] === '\r') {
      if (html[index + 1] !== '\n') {
        throw new Error('records block contains unsupported EOL');
      }
      hasCrlf = true;
      index += 1;
    } else if (html[index] === '\n') {
      hasLf = true;
    }

    if (hasLf && hasCrlf) {
      throw new Error('records block contains mixed EOL');
    }
  }

  return hasCrlf ? '\r\n' : '\n';
}

function replaceRecords(html, records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  validateJsonValue(records, 'records', new WeakSet());
  const data = inspect(html);
  const newline = inferRecordsEol(html, data.recordsLiteralStart, data.recordsBlockEnd);
  const rawLiteral = JSON.stringify(records, null, 2).replace(/\n/g, newline);
  const currentLiteral = html.slice(data.recordsLiteralStart, data.recordsLiteralEnd);
  if (currentLiteral === rawLiteral && !/<\/script/i.test(currentLiteral)) {
    return html;
  }

  const literal = rawLiteral.replace(/</g, '\\u003c');
  return html.slice(0, data.recordsLiteralStart) + literal + html.slice(data.recordsLiteralEnd);
}

module.exports = Object.freeze({ parse, replaceRecords });
