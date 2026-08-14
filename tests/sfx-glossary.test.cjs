'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const glossary = require('../src/sfx-glossary.js');

const expectedIds = [
  'eq', 'filter', 'compression', 'limiting', 'saturation', 'distortion',
  'transient', 'attack', 'body', 'texture', 'tail', 'layer', 'bus', 'send',
  'return', 'sidechain', 'dry-wet', 'formant', 'convolution', 'granular',
  'resonance', 'automation', 'pitch', 'stereo-width', 'headroom', 'envelope',
  'one-shot', 'loop', 'stem', 'impulse-response', 'modulation', 'spectral'
];

function idsFor(value) {
  return glossary.termsFor(value).map((entry) => entry.id);
}

test('publishes the exact unique frozen bilingual glossary', () => {
  const entries = glossary.entries();

  assert.deepEqual(entries.map((entry) => entry.id), expectedIds);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 32);
  assert.ok(Object.isFrozen(entries));

  entries.forEach((entry) => {
    assert.match(entry.id, /^[a-z0-9-]+$/);
    for (const key of ['english', 'chinese', 'meaning', 'use']) {
      assert.equal(typeof entry[key], 'string');
      assert.ok(entry[key].trim());
      assert.equal(entry[key], entry[key].trim());
    }
    assert.ok(Array.isArray(entry.aliases));
    assert.ok(entry.aliases.length > 0);
    assert.ok(entry.aliases.every((alias) => typeof alias === 'string' && alias.trim() === alias));
    assert.equal(new Set(entry.aliases.map((alias) => alias.toLocaleLowerCase('en-US'))).size, entry.aliases.length);
    assert.ok(Object.isFrozen(entry));
    assert.ok(Object.isFrozen(entry.aliases));
  });
});

test('looks up only exact public ids and returns shared frozen entries', () => {
  const eq = glossary.termForId('eq');
  assert.equal(eq, glossary.entries()[0]);
  assert.ok(Object.isFrozen(eq));
  assert.equal(glossary.termForId('EQ'), null);
  assert.equal(glossary.termForId(''), null);
  assert.equal(glossary.termForId(null), null);
  assert.equal(glossary.termForId('__proto__'), null);
});

test('matches Latin aliases at token boundaries and Chinese aliases directly', () => {
  assert.deepEqual(
    idsFor('Use a bus send and sidechain compression.').sort(),
    ['bus', 'compression', 'send', 'sidechain']
  );
  assert.deepEqual(idsFor('调整瞬态与尾音').sort(), ['tail', 'transient']);
  assert.equal(idsFor('business sequel compressed').includes('bus'), false);
  assert.equal(idsFor('business sequel compressed').includes('eq'), false);
  assert.equal(idsFor('mirror').includes('impulse-response'), false);
});

test('recognizes common site forms without translating product names', () => {
  const ids = idsFor([
    'Dry/Wet and stereo image',
    'IR convolution with granulation',
    '调整瞬态起音，再做侧链压缩。',
    'FabFilter Pro-Q 3 and Stepwise Morph'
  ]);

  for (const id of ['dry-wet', 'stereo-width', 'impulse-response', 'convolution', 'granular', 'transient', 'attack', 'sidechain', 'compression']) {
    assert.ok(ids.includes(id), 'expected alias to match ' + id);
  }
  assert.equal(ids.some((id) => id === 'fabfilter-pro-q-3' || id === 'stepwise-morph'), false);
});

test('recursively scans arrays and plain objects without mutation or duplicate terms', () => {
  const input = {
    title: 'Layer the attack and body',
    steps: [
      { text: 'Use one-shot material.' },
      { notes: ['layer', 'BUS'] }
    ],
    ignoredDate: new Date('2026-08-14T00:00:00Z')
  };
  const before = JSON.stringify(input);
  const ids = idsFor(input);

  assert.equal(JSON.stringify(input), before);
  assert.equal(ids.filter((id) => id === 'layer').length, 1);
  for (const id of ['attack', 'body', 'one-shot', 'layer', 'bus']) {
    assert.ok(ids.includes(id));
  }
});

test('sorts matches deterministically by Chinese label then id', () => {
  const terms = glossary.termsFor(glossary.entries().map((entry) => entry.aliases[0]));
  const expected = glossary.entries().slice().sort((left, right) => (
    left.chinese.localeCompare(right.chinese, 'zh-CN') || left.id.localeCompare(right.id)
  ));
  assert.deepEqual(terms, expected);
  assert.ok(Object.isFrozen(terms));
});

test('fails closed for unsupported values and cyclic objects', () => {
  const cyclic = { text: 'filter' };
  cyclic.self = cyclic;

  assert.deepEqual(glossary.termsFor(null), []);
  assert.deepEqual(glossary.termsFor(42), []);
  assert.deepEqual(glossary.termsFor(new Date()), []);
  assert.deepEqual(idsFor(cyclic), ['filter']);
  assert.ok(Object.isFrozen(glossary.termsFor(null)));
});

test('attaches the same frozen API to the browser global', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'sfx-glossary.js'), 'utf8');
  const context = { globalThis: {} };
  vm.runInNewContext(source, context, { filename: 'sfx-glossary.js' });

  const browserApi = context.globalThis.SfxGlossary;
  assert.ok(Object.isFrozen(browserApi));
  assert.deepEqual(Array.from(browserApi.entries(), (entry) => entry.id), expectedIds);
});
