const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SfxEffectGuides = require('../src/effect-guides.js');

const expectedNames = [
  'Dawesome Love',
  'FabFilter Pro-MB',
  'FabFilter Pro-Q 3',
  'FabFilter Saturn 2',
  'iZotope RX De-click',
  'iZotope Stutter Edit 2',
  'Kilohearts Phase Plant',
  'Kilohearts Snap Heap',
  'Melda MAutoPitch',
  'MeldaProduction MTremolo',
  'Minimal Audio Wave Shifter',
  'Morph EQ',
  'NI Transient Master',
  'Oeksound Soothe2',
  'Polyverse Manipulator',
  'Sonic Academy Kick 3',
  'Soundtheory Gullfoss',
  'Soundtoys Crystallizer',
  'Soundtoys Decapitator',
  'Soundtoys FilterFreak',
  'Soundtoys PhaseMistress',
  'Stepwise Morph',
  'Unfiltered Audio Indent 2',
  'UVI Shade',
  'Valhalla FreqEcho',
  'Waves Enigma',
  'Waves Z-Noise'
];

const guideKeys = ['canonicalName', 'evidenceUseId', 'input', 'action', 'result'];
const proseKeys = ['input', 'action', 'result'];

test('publishes exactly the approved effect guides', () => {
  const guides = SfxEffectGuides.all();

  assert.equal(guides.length, 27);
  assert.deepEqual(guides.map((guide) => guide.canonicalName), expectedNames);
  assert.equal(new Set(guides.map((guide) => guide.evidenceUseId)).size, 27);
});

test('uses exactly five concrete fields with concise guide prose', () => {
  SfxEffectGuides.all().forEach((guide) => {
    assert.deepEqual(Object.keys(guide), guideKeys, guide.canonicalName);

    guideKeys.forEach((key) => {
      assert.equal(typeof guide[key], 'string', `${guide.canonicalName}.${key}`);
      assert.equal(guide[key], guide[key].trim(), `${guide.canonicalName}.${key}`);
      assert.ok(guide[key], `${guide.canonicalName}.${key}`);
    });

    proseKeys.forEach((key) => {
      const length = Array.from(guide[key]).length;
      assert.ok(length >= 12 && length <= 44, `${guide.canonicalName}.${key}: ${length}`);
    });
  });
});

test('rejects fallback wording and parameter instructions in guide prose', () => {
  const forbiddenFallback = /进一步塑形|强化身份|完成这一处理点|声音角色更清楚|更有层次|更有质感/;
  const parameterInstruction = /\b\d+(?:\.\d+)?\s*(?:hz|khz|db|ms|s|%|bands?|octaves?)\b|参数|阈值|旋钮|预设值/i;

  SfxEffectGuides.all().forEach((guide) => {
    proseKeys.forEach((key) => {
      assert.doesNotMatch(guide[key], forbiddenFallback, `${guide.canonicalName}.${key}`);
      assert.doesNotMatch(guide[key], parameterInstruction, `${guide.canonicalName}.${key}`);
    });
  });
});

test('looks up a canonical name after case and whitespace normalization', () => {
  const expected = SfxEffectGuides.all()[2];

  assert.strictEqual(SfxEffectGuides.guideFor('  FABFILTER   PRO-Q 3  '), expected);
});

test('looks up a canonical name after NFKC normalization', () => {
  const expected = SfxEffectGuides.all()[2];

  assert.strictEqual(SfxEffectGuides.guideFor('ＦａｂＦｉｌｔｅｒ　Ｐｒｏ－Ｑ　３'), expected);
});

test('rejects near and unknown effect names', () => {
  assert.equal(SfxEffectGuides.guideFor('Pro-Q 3'), null);
  assert.equal(SfxEffectGuides.guideFor('Unknown Effect'), null);
});

test('freezes the API, shared guide array, and every guide', () => {
  const guides = SfxEffectGuides.all();

  assert.ok(Object.isFrozen(SfxEffectGuides));
  assert.ok(Object.isFrozen(guides));
  assert.strictEqual(SfxEffectGuides.all(), guides);
  guides.forEach((guide) => assert.ok(Object.isFrozen(guide), guide.canonicalName));
});

test('attaches the API to the browser global', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'effect-guides.js'), 'utf8');
  const context = {};

  vm.runInNewContext(source, context);

  assert.ok(context.SfxEffectGuides);
  assert.equal(context.SfxEffectGuides.all().length, 27);
  assert.ok(Object.isFrozen(context.SfxEffectGuides));
});
