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

for (const [name, marker] of [
  ['records', RECORDS_MARKER],
  ['imageManifest', IMAGE_MANIFEST_MARKER],
  ['pluginReferenceCatalog', PLUGIN_CATALOG_MARKER]
]) {
  test(`parse and replaceRecords reject a missing ${name} marker`, () => {
    assertBothReject(fixture().replace(marker, `    const missing${name} = `), new RegExp(`missing.*${name}`, 'i'));
  });

  test(`parse and replaceRecords reject a duplicate ${name} marker`, () => {
    assertBothReject(fixture() + marker, new RegExp(`duplicate.*${name}`, 'i'));
  });
}

test('parse and replaceRecords reject out-of-order markers', () => {
  assertBothReject(
    fixture({ order: ['imageManifest', 'records', 'pluginCatalog'] }),
    /markers.*out of order/i
  );
});

test('parse and replaceRecords reject overlapping duplicate markers', () => {
  const html = fixture().replace(RECORDS_MARKER, RECORDS_MARKER + RECORDS_MARKER.slice(1));
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

test('parse reads the real repository index without mutating it', () => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  const before = fs.readFileSync(indexPath, 'utf8');

  const parsed = siteData.parse(before);

  assert.equal(parsed.records.length, 82);
  assert.ok(Object.keys(parsed.imageManifest).length > 0);
  assert.equal(fs.readFileSync(indexPath, 'utf8'), before);
});
