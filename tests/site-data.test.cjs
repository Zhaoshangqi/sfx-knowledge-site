const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const siteData = require('../tools/site-data.cjs');

const RECORDS_MARKER = '    const records = ';
const IMAGE_MANIFEST_MARKER = '    const imageManifest = ';
const PLUGIN_CATALOG_MARKER = '    const pluginReferenceCatalog = ';

const defaultRecords = [{ id: 'record-1', title: 'First record' }];
const defaultImageManifest = {
  hero: { preview: 'assets/hero-preview.webp', full: 'assets/hero.webp' }
};
const defaultPluginCatalog = [{ title: 'Example Plugin' }];

function prettyJson(value, newline) {
  return JSON.stringify(value, null, 2).replace(/\n/g, newline);
}

function fixture(options = {}) {
  const newline = options.newline || '\n';
  const declarations = {
    records: RECORDS_MARKER + (options.recordsLiteral ?? prettyJson(options.records ?? defaultRecords, newline)) + ';',
    imageManifest: IMAGE_MANIFEST_MARKER
      + (options.imageManifestLiteral ?? prettyJson(options.imageManifest ?? defaultImageManifest, newline))
      + ';',
    pluginCatalog: PLUGIN_CATALOG_MARKER
      + (options.pluginCatalogLiteral ?? prettyJson(options.pluginCatalog ?? defaultPluginCatalog, newline))
      + ';'
  };
  const order = options.order || ['records', 'imageManifest', 'pluginCatalog'];
  const lines = ['<!doctype html>', '<script>'];

  for (const name of order) {
    lines.push(declarations[name], '');
  }
  lines.push('</script>', '</html>', '');
  return lines.join(newline);
}

function assertBothReject(html, expected) {
  assert.throws(() => siteData.parse(html), expected);
  assert.throws(() => siteData.replaceRecords(html, []), expected);
}

function assertInvalidReplacement(records, expected = /records/i) {
  const html = fixture();
  assert.throws(() => siteData.replaceRecords(html, records), expected);
  assert.deepEqual(siteData.parse(html).records, defaultRecords);
}

function withScriptPreamble(html, preamble, newline = '\n') {
  return html.replace(`<script>${newline}`, `<script>${newline}${preamble}${newline}`);
}

function markerDeclarations(newline = '\n') {
  return [
    `${RECORDS_MARKER}[];`,
    `${IMAGE_MANIFEST_MARKER}{};`,
    `${PLUGIN_CATALOG_MARKER}[];`
  ].join(newline);
}

function continuedStringDecoy(quote) {
  return [
    `const decoy = ${quote}\\`,
    `${RECORDS_MARKER}[];\\`,
    `${IMAGE_MANIFEST_MARKER}{};\\`,
    `${PLUGIN_CATALOG_MARKER}[];${quote};`
  ].join('\n');
}

test('exports only a frozen parse and replaceRecords API', () => {
  assert.deepEqual(Object.keys(siteData), ['parse', 'replaceRecords']);
  assert.equal(typeof siteData.parse, 'function');
  assert.equal(typeof siteData.replaceRecords, 'function');
  assert.equal(Object.isFrozen(siteData), true);
});

test('parse reads records and imageManifest from LF HTML', () => {
  assert.deepEqual(siteData.parse(fixture()), {
    records: defaultRecords,
    imageManifest: defaultImageManifest
  });
});

test('parse reads records and imageManifest from CRLF HTML', () => {
  assert.deepEqual(siteData.parse(fixture({ newline: '\r\n' })), {
    records: defaultRecords,
    imageManifest: defaultImageManifest
  });
});

test('replaceRecords changes only the records JSON literal and reparses', () => {
  const records = [{ id: 'record-2', nested: { enabled: true } }, { id: 'record-3' }];
  const html = fixture();
  const oldLiteral = prettyJson(defaultRecords, '\n');
  const newLiteral = prettyJson(records, '\n');
  const literalStart = html.indexOf(RECORDS_MARKER) + RECORDS_MARKER.length;
  const prefix = html.slice(0, literalStart);
  const suffix = html.slice(literalStart + oldLiteral.length);

  const replaced = siteData.replaceRecords(html, records);

  assert.equal(replaced.slice(0, literalStart), prefix);
  assert.equal(replaced.slice(literalStart + newLiteral.length), suffix);
  assert.equal(replaced, prefix + newLiteral + suffix);
  assert.deepEqual(siteData.parse(replaced), {
    records,
    imageManifest: defaultImageManifest
  });
});

test('replaceRecords preserves CRLF throughout the replacement block', () => {
  const records = [{ id: 'record-2', values: [1, 2, 3] }];
  const html = fixture({ newline: '\r\n' });
  const oldLiteral = prettyJson(defaultRecords, '\r\n');
  const newLiteral = prettyJson(records, '\r\n');
  const literalStart = html.indexOf(RECORDS_MARKER) + RECORDS_MARKER.length;
  const suffix = html.slice(literalStart + oldLiteral.length);

  const replaced = siteData.replaceRecords(html, records);
  const recordsBlock = replaced.slice(literalStart, replaced.indexOf(IMAGE_MANIFEST_MARKER));

  assert.equal(replaced, html.slice(0, literalStart) + newLiteral + suffix);
  assert.equal(recordsBlock.replace(/\r\n/g, '').includes('\n'), false);
  assert.deepEqual(siteData.parse(replaced).records, records);
});

test('replaceRecords infers CRLF from the records block after an LF preamble', () => {
  const records = [{ id: 'record-2', values: [1, 2, 3] }];
  const crlfHtml = fixture({ newline: '\r\n' });
  const html = crlfHtml.replace('<!doctype html>\r\n<script>\r\n', '<!doctype html>\n<script>\n');

  const replaced = siteData.replaceRecords(html, records);
  const literalStart = replaced.indexOf(RECORDS_MARKER) + RECORDS_MARKER.length;
  const recordsBlock = replaced.slice(literalStart, replaced.indexOf(IMAGE_MANIFEST_MARKER));

  assert.equal(recordsBlock.replace(/\r\n/g, '').includes('\n'), false);
  assert.deepEqual(siteData.parse(replaced).records, records);
});

test('replaceRecords rejects mixed EOL inside the records block', () => {
  const html = fixture({ newline: '\r\n' });
  const literalStart = html.indexOf(RECORDS_MARKER) + RECORDS_MARKER.length;
  const firstBlockEol = html.indexOf('\r\n', literalStart);
  const mixed = html.slice(0, firstBlockEol) + '\n' + html.slice(firstBlockEol + 2);

  assert.throws(() => siteData.replaceRecords(mixed, [{ id: 'changed' }]), /records.*mixed.*EOL/i);
});

test('replaceRecords escapes script-closing text and restores it through parse', () => {
  const records = [{ text: '</script><script>alert(1)</script>' }];

  for (const html of [fixture(), fixture({ records })]) {
    const replaced = siteData.replaceRecords(html, records);
    const literalStart = replaced.indexOf(RECORDS_MARKER) + RECORDS_MARKER.length;
    const recordsBlock = replaced.slice(literalStart, replaced.indexOf(IMAGE_MANIFEST_MARKER));

    assert.doesNotMatch(recordsBlock, /<\/script>/i);
    assert.match(recordsBlock, /\\u003c\/script>/i);
    assert.deepEqual(siteData.parse(replaced).records, records);
  }
});

test('replaceRecords round-trips Unicode data and an empty array', () => {
  const unicodeRecords = [{
    id: 'unicode',
    text: '\u4e2d\u6587 \ud83c\udfb5 caf\u00e9'
  }];

  assert.deepEqual(siteData.parse(siteData.replaceRecords(fixture(), unicodeRecords)).records, unicodeRecords);
  assert.deepEqual(siteData.parse(siteData.replaceRecords(fixture(), [])).records, []);
});

test('parse returns independent results on every call', () => {
  const html = fixture();
  const first = siteData.parse(html);
  const second = siteData.parse(html);

  first.records[0].id = 'changed';
  first.imageManifest.hero.preview = 'changed.webp';

  assert.deepEqual(second, {
    records: defaultRecords,
    imageManifest: defaultImageManifest
  });
  assert.deepEqual(siteData.parse(html), second);
});

test('parse and replaceRecords reject non-string HTML', () => {
  for (const html of [null, undefined, {}, Buffer.from('html')]) {
    assert.throws(() => siteData.parse(html), /html.*string/i);
    assert.throws(() => siteData.replaceRecords(html, []), /html.*string/i);
  }
});

for (const [name, marker] of [
  ['records', RECORDS_MARKER],
  ['imageManifest', IMAGE_MANIFEST_MARKER],
  ['pluginReferenceCatalog', PLUGIN_CATALOG_MARKER]
]) {
  test(`parse and replaceRecords reject a missing ${name} marker`, () => {
    assertBothReject(fixture().replace(marker, `    const missing${name} = `), new RegExp(`missing.*${name}`, 'i'));
  });

  test(`parse and replaceRecords reject a duplicate ${name} marker`, () => {
    const html = fixture().replace('</script>', `${marker}null;\n</script>`);
    assertBothReject(html, new RegExp(`duplicate.*${name}`, 'i'));
  });
}

test('parse and replaceRecords reject out-of-order markers', () => {
  assertBothReject(
    fixture({ order: ['imageManifest', 'records', 'pluginCatalog'] }),
    /markers.*out of order/i
  );
});

for (const [name, decoy] of [
  ['block comments', `/*\n${markerDeclarations()}\n*/`],
  ['line comments', markerDeclarations().split('\n').map((line) => `// ${line}`).join('\n')],
  ['double-quoted strings', continuedStringDecoy('"')],
  ['single-quoted strings', continuedStringDecoy("'")],
  ['template strings', `const decoy = \`\n${markerDeclarations()}\n\`;`],
  ['extra indentation', markerDeclarations().split('\n').map((line) => ` ${line}`).join('\n')]
]) {
  test(`parse ignores marker decoys in ${name}`, () => {
    assert.deepEqual(siteData.parse(withScriptPreamble(fixture(), decoy)), {
      records: defaultRecords,
      imageManifest: defaultImageManifest
    });
  });
}

test('parse requires declarations to have exactly four leading spaces', () => {
  assertBothReject(fixture().replace(RECORDS_MARKER, ` ${RECORDS_MARKER}`), /missing.*records/i);
});

for (const [name, preamble] of [
  ['function declarations', [
    'function localData() {',
    markerDeclarations(),
    '}'
  ].join('\n')],
  ['arrow and function expressions', [
    'const arrowData = () => {',
    markerDeclarations(),
    '};',
    'const functionData = function () {',
    markerDeclarations(),
    '};'
  ].join('\n')],
  ['class methods', [
    'class LocalData {',
    '  read() {',
    markerDeclarations(),
    '  }',
    '}'
  ].join('\n')],
  ['parenthesized expressions', [
    'const parenthesizedData = (function () {',
    markerDeclarations(),
    '});'
  ].join('\n')]
]) {
  test(`parse ignores four-space local bindings inside ${name}`, () => {
    const html = withScriptPreamble(fixture(), preamble);
    const replacement = [{ id: 'replacement' }];

    assert.deepEqual(siteData.parse(html), {
      records: defaultRecords,
      imageManifest: defaultImageManifest
    });
    assert.deepEqual(siteData.parse(siteData.replaceRecords(html, replacement)).records, replacement);
  });
}

test('parse allows marker-like text inside valid records JSON strings', () => {
  const records = [{
    id: 'marker-text',
    values: [RECORDS_MARKER, IMAGE_MANIFEST_MARKER, PLUGIN_CATALOG_MARKER]
  }];

  assert.deepEqual(siteData.parse(fixture({ records })).records, records);
});

test('parse ignores apostrophes and marker-like declarations in ordinary HTML', () => {
  const outsideScript = [
    "<p>don't treat this as JavaScript</p>",
    markerDeclarations()
  ].join('\n');
  const html = fixture()
    .replace('<script>', `${outsideScript}\n<script>`)
    .replace('</script>', `</script>\n${outsideScript}`);

  assert.deepEqual(siteData.parse(html), {
    records: defaultRecords,
    imageManifest: defaultImageManifest
  });
});

test('regex literals do not hide a later duplicate declaration', () => {
  const preamble = [
    String.raw`const quoteAndComments = /['"]|\/\/|\/\*|    const records = /;`,
    `${RECORDS_MARKER}[];`
  ].join('\n');

  assertBothReject(withScriptPreamble(fixture(), preamble), /duplicate.*records/i);
});

test('regex literals after statement blocks do not hide a later duplicate declaration', () => {
  const suffix = [
    'if (true) {}',
    String.raw`/['\"]/.test("x");`,
    `${RECORDS_MARKER}[];`
  ].join('\n');
  const html = fixture().replace('</script>', `${suffix}\n</script>`);

  assertBothReject(html, /duplicate.*records/i);
});

test('object expressions followed by division do not hide a later duplicate declaration', () => {
  const suffix = [
    'const quotient = {} / "x";',
    `${RECORDS_MARKER}[];`
  ].join('\n');
  const html = fixture().replace('</script>', `${suffix}\n</script>`);

  assertBothReject(html, /duplicate.*records/i);
});

for (const [name, block] of [
  ['if/else statements', 'if (true) {} else {}'],
  ['bare blocks', '{}'],
  ['function declarations', 'function afterBlock() {}'],
  ['class declarations', 'class AfterBlock {}'],
  ['try/finally statements', 'try {} finally {}'],
  ['arrow expression assignments', 'const afterBlock = () => {};'],
  ['function expression assignments', 'const afterBlock = function () {};']
]) {
  test(`regex literals after ${name} do not hide a top-level duplicate declaration`, () => {
    const suffix = [
      block,
      String.raw`/['"]/.test("x");`,
      `${RECORDS_MARKER}[];`
    ].join('\n');
    const html = fixture().replace('</script>', `${suffix}\n</script>`);

    assertBothReject(html, /duplicate.*records/i);
  });
}

test('parse finds canonical markers after valid division-heavy code', () => {
  const preamble = [
    'const factors = { left: 144, right: 12 };',
    'const ratio = factors.left / factors.right / 2;',
    'const nestedRatio = (ratio + 4) / (factors.right / 3);',
    'const objectRatio = { valueOf() { return 24; } } / 3 / 2;'
  ].join('\n');

  assert.deepEqual(siteData.parse(withScriptPreamble(fixture(), preamble)), {
    records: defaultRecords,
    imageManifest: defaultImageManifest
  });
});

test('parse ignores marker text inside regex literals', () => {
  const preamble = String.raw`const markerPattern = /['"\\/]|    const records = |    const imageManifest = |    const pluginReferenceCatalog = /;`;

  assert.deepEqual(siteData.parse(withScriptPreamble(fixture(), preamble)), {
    records: defaultRecords,
    imageManifest: defaultImageManifest
  });
});

test('parse counts real declarations globally across multiple script blocks', () => {
  const decoyScript = [
    '<script>',
    `/*\n${markerDeclarations()}\n*/`,
    String.raw`const markerPattern = /['"]|    const records = /;`,
    '</script>'
  ].join('\n');
  const html = fixture().replace('<script>', `${decoyScript}\n<script>`);

  assert.deepEqual(siteData.parse(html), {
    records: defaultRecords,
    imageManifest: defaultImageManifest
  });
});

test('parse rejects duplicate real declarations across script blocks', () => {
  const firstScript = `<script>\n${RECORDS_MARKER}[];\n</script>`;
  const html = fixture().replace('<script>', `${firstScript}\n<script>`);

  assertBothReject(html, /duplicate.*records/i);
});

test('parse and replaceRecords reject malformed records JSON', () => {
  assertBothReject(fixture({ recordsLiteral: '[{"id": }]' }), /records.*JSON/i);
});

test('parse and replaceRecords reject malformed imageManifest JSON', () => {
  assertBothReject(fixture({ imageManifestLiteral: '{"hero": }' }), /imageManifest.*JSON/i);
});

test('parse and replaceRecords reject a malformed semicolon boundary', () => {
  const html = fixture().replace(`${prettyJson(defaultRecords, '\n')};`, prettyJson(defaultRecords, '\n'));
  assertBothReject(html, /records.*boundary/i);
});

test('parse and replaceRecords reject non-array records in the HTML', () => {
  assertBothReject(fixture({ recordsLiteral: '{}' }), /records.*array/i);
});

test('replaceRecords rejects a non-array replacement', () => {
  for (const records of [null, {}, 'records']) {
    assert.throws(() => siteData.replaceRecords(fixture(), records), /records.*array/i);
  }
});

for (const [name, buildRecords] of [
  ['undefined', () => [undefined]],
  ['NaN', () => [NaN]],
  ['positive Infinity', () => [Infinity]],
  ['negative Infinity', () => [-Infinity]],
  ['functions', () => [function invalid() {}]],
  ['bigints', () => [1n]],
  ['symbol values', () => [Symbol('value')]],
  ['array holes', () => new Array(1)],
  ['array extra keys', () => Object.assign([], { extra: true })],
  ['array custom prototypes', () => {
    const value = [];
    Object.setPrototypeOf(value, {});
    return [value];
  }],
  ['object custom prototypes', () => [Object.assign(Object.create({ inherited: true }), { value: 1 })]],
  ['non-enumerable properties', () => {
    const value = {};
    Object.defineProperty(value, 'hidden', { value: true });
    return [value];
  }],
  ['symbol keys', () => {
    const value = { visible: true };
    value[Symbol('hidden')] = true;
    return [value];
  }],
  ['cycles', () => {
    const records = [];
    records.push(records);
    return records;
  }]
]) {
  test(`replaceRecords rejects ${name} without changing the source HTML`, () => {
    assertInvalidReplacement(buildRecords());
  });
}

test('replaceRecords rejects accessors without invoking getters', () => {
  let getterCalls = 0;
  const value = {};
  Object.defineProperty(value, 'computed', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return 'unsafe';
    }
  });

  assertInvalidReplacement([value], /records.*accessor/i);
  assert.equal(getterCalls, 0);
});

test('replaceRecords rejects toJSON without invoking it', () => {
  let toJsonCalls = 0;
  const value = {
    visible: true,
    toJSON() {
      toJsonCalls += 1;
      return { replaced: true };
    }
  };

  assertInvalidReplacement([value], /records.*toJSON/i);
  assert.equal(toJsonCalls, 0);
});

test('replaceRecords rejects negative zero without changing the source HTML', () => {
  const html = fixture();

  assert.throws(
    () => siteData.replaceRecords(html, [-0]),
    (error) => error instanceof TypeError && /records.*negative zero/i.test(error.message)
  );
  assert.deepEqual(siteData.parse(html).records, defaultRecords);
});

test('replaceRecords accepts nested dense arrays and null-prototype data objects', () => {
  const value = Object.create(null);
  value.id = 'null-prototype';
  value.values = [null, 'text', true, 1.5];

  const parsed = siteData.parse(siteData.replaceRecords(fixture(), [value]));

  assert.deepEqual(parsed.records, [{
    id: 'null-prototype',
    values: [null, 'text', true, 1.5]
  }]);
});

for (const [name, imageManifestLiteral] of [
  ['null', 'null'],
  ['array', '[]'],
  ['string', '"manifest"'],
  ['number', '42'],
  ['boolean', 'true']
]) {
  test(`parse and replaceRecords reject an invalid ${name} imageManifest`, () => {
    assertBothReject(fixture({ imageManifestLiteral }), /imageManifest.*object/i);
  });
}

test('parse and replaceRecords preserve the real repository index boundaries', () => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const before = fs.readFileSync(indexPath, 'utf8');

  const parsed = siteData.parse(before);
  const same = siteData.replaceRecords(before, parsed.records);
  const changedRecords = JSON.parse(JSON.stringify(parsed.records));
  changedRecords[0].title += ' changed';
  const changed = siteData.replaceRecords(before, changedRecords);
  const literalStart = before.indexOf(RECORDS_MARKER) + RECORDS_MARKER.length;
  const originalManifestStart = before.indexOf(IMAGE_MANIFEST_MARKER);
  const changedManifestStart = changed.indexOf(IMAGE_MANIFEST_MARKER);

  assert.equal(parsed.records.length, 84);
  assert.ok(Object.keys(parsed.imageManifest).length > 0);
  assert.equal(same, before);
  assert.equal(changed.slice(0, literalStart), before.slice(0, literalStart));
  assert.equal(changed.slice(changedManifestStart), before.slice(originalManifestStart));
  assert.deepEqual(siteData.parse(changed).records, changedRecords);
  assert.equal(fs.readFileSync(indexPath, 'utf8'), before);
});
