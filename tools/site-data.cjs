const { types } = require('node:util');

const MARKERS = Object.freeze({
  records: '    const records = ',
  imageManifest: '    const imageManifest = ',
  pluginReferenceCatalog: '    const pluginReferenceCatalog = '
});
const MARKER_NAMES = Object.freeze(Object.keys(MARKERS));

function locateMarkers(html) {
  const matches = Object.fromEntries(MARKER_NAMES.map((name) => [name, []]));
  let state = 'code';

  for (let index = 0; index < html.length; index += 1) {
    const character = html[index];
    const next = html[index + 1];

    if (state === 'code') {
      if (index === 0 || html[index - 1] === '\n') {
        for (const name of MARKER_NAMES) {
          if (html.startsWith(MARKERS[name], index)) {
            matches[name].push(index);
          }
        }
      }

      if (character === '/' && next === '/') {
        state = 'line-comment';
        index += 1;
      } else if (character === '/' && next === '*') {
        state = 'block-comment';
        index += 1;
      } else if (character === "'") {
        state = 'single-string';
      } else if (character === '"') {
        state = 'double-string';
      } else if (character === '`') {
        state = 'template-string';
      }
      continue;
    }

    if (state === 'line-comment') {
      if (character === '\n') {
        state = 'code';
      }
      continue;
    }

    if (state === 'block-comment') {
      if (character === '*' && next === '/') {
        state = 'code';
        index += 1;
      }
      continue;
    }

    if (character === '\\') {
      index += 1;
    } else if (
      (state === 'single-string' && character === "'")
      || (state === 'double-string' && character === '"')
      || (state === 'template-string' && character === '`')
    ) {
      state = 'code';
    }
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
