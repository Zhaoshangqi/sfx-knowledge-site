'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const modulePath = path.join(__dirname, '..', 'src', 'effect-learning-paths.js');
const moduleSource = fs.readFileSync(modulePath, 'utf8');
const SfxEffectGuides = require('../src/effect-guides.js');
const SfxEffectLearningPaths = fs.existsSync(modulePath) ? require(modulePath) : null;

const expectedGoals = [
  { id: 'all', label: '全部' },
  { id: 'cleanup-control', label: '清理与控制' },
  { id: 'impact-density', label: '冲击与密度' },
  { id: 'motion-rhythm', label: '运动与节奏' },
  { id: 'pitch-tone', label: '音高与音色' },
  { id: 'space-tail', label: '空间与尾部' },
  { id: 'granular-transform', label: '颗粒与变形' }
];

const expectedMapping = {
  'Dawesome Love': ['granular-transform'],
  'FabFilter Pro-MB': ['cleanup-control', 'impact-density'],
  'FabFilter Pro-Q 3': ['pitch-tone'],
  'FabFilter Saturn 2': ['impact-density', 'granular-transform'],
  'iZotope RX De-click': ['granular-transform'],
  'iZotope Stutter Edit 2': ['motion-rhythm', 'granular-transform'],
  'Kilohearts Phase Plant': ['pitch-tone', 'motion-rhythm'],
  'Kilohearts Snap Heap': ['space-tail', 'motion-rhythm'],
  'Melda MAutoPitch': ['pitch-tone'],
  'MeldaProduction MTremolo': ['motion-rhythm', 'space-tail'],
  'Minimal Audio Wave Shifter': ['pitch-tone', 'motion-rhythm'],
  'Morph EQ': ['pitch-tone', 'motion-rhythm'],
  'NI Transient Master': ['impact-density', 'cleanup-control'],
  'Oeksound Soothe2': ['cleanup-control', 'impact-density'],
  'Polyverse Manipulator': ['pitch-tone', 'impact-density'],
  'Sonic Academy Kick 3': ['impact-density'],
  'Soundtheory Gullfoss': ['cleanup-control'],
  'Soundtoys Crystallizer': ['granular-transform', 'space-tail'],
  'Soundtoys Decapitator': ['impact-density'],
  'Soundtoys FilterFreak': ['motion-rhythm', 'pitch-tone'],
  'Soundtoys PhaseMistress': ['motion-rhythm', 'space-tail'],
  'Stepwise Morph': ['pitch-tone', 'granular-transform'],
  'Unfiltered Audio Indent 2': ['cleanup-control', 'impact-density'],
  'UVI Shade': ['motion-rhythm', 'space-tail'],
  'Valhalla FreqEcho': ['space-tail', 'pitch-tone'],
  'Waves Enigma': ['motion-rhythm', 'space-tail'],
  'Waves Z-Noise': ['cleanup-control']
};

function learningPaths() {
  assert.ok(SfxEffectLearningPaths, 'effect learning paths module must exist');
  return SfxEffectLearningPaths;
}

function normalizedName(value) {
  return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
}

function internalMappingKeys(source) {
  const match = source.match(/var goalsByName = Object\.freeze\((\{[\s\S]*?\n  \})\);/);
  assert.ok(match, 'goalsByName must remain a statically inspectable object literal');
  return Object.keys(vm.runInNewContext(`(${match[1]})`));
}

test('publishes exactly seven ordered goals with unique IDs', () => {
  const api = learningPaths();
  const goals = api.goals();

  assert.deepEqual(goals, expectedGoals);
  assert.equal(goals.length, 7);
  assert.equal(new Set(goals.map((goal) => goal.id)).size, 7);
  goals.forEach((goal) => assert.deepEqual(Object.keys(goal), ['id', 'label']));
});

test('returns immutable goals and mappings that cannot change future calls', () => {
  const api = learningPaths();
  const goals = api.goals();
  const proQGoals = api.goalsFor('FabFilter Pro-Q 3');

  assert.ok(Object.isFrozen(api));
  assert.ok(Object.isFrozen(goals));
  goals.forEach((goal) => assert.ok(Object.isFrozen(goal), goal.id));
  assert.ok(Object.isFrozen(proQGoals));

  assert.throws(() => goals.push({ id: 'extra', label: 'Extra' }), TypeError);
  assert.throws(() => proQGoals.push('space-tail'), TypeError);
  assert.throws(() => { goals[0].label = 'Changed'; }, TypeError);

  assert.deepEqual(api.goals(), expectedGoals);
  assert.deepEqual(api.goalsFor('FabFilter Pro-Q 3'), expectedMapping['FabFilter Pro-Q 3']);
});

test('maps exactly the same 27 canonical names published by effect guides', () => {
  const publishedNames = SfxEffectGuides.all().map((guide) => guide.canonicalName).sort();
  const mappingNames = Object.keys(expectedMapping).sort();

  assert.equal(mappingNames.length, 27);
  assert.deepEqual(mappingNames, publishedNames);
});

test('contains no missing or extra internal mapping names', () => {
  const publishedNames = SfxEffectGuides.all()
    .map((guide) => normalizedName(guide.canonicalName))
    .sort();
  const internalNames = internalMappingKeys(moduleSource).sort();

  assert.equal(internalNames.length, 27);
  assert.deepEqual(internalNames, publishedNames);
});

test('assigns every published guide one or two known non-all goals without duplicates', () => {
  const api = learningPaths();
  const knownGoalIds = new Set(api.goals().map((goal) => goal.id));

  SfxEffectGuides.all().forEach((guide) => {
    const goalIds = api.goalsFor(guide.canonicalName);

    assert.deepEqual(goalIds, expectedMapping[guide.canonicalName], guide.canonicalName);
    assert.ok(goalIds.length >= 1 && goalIds.length <= 2, guide.canonicalName);
    assert.equal(new Set(goalIds).size, goalIds.length, guide.canonicalName);
    goalIds.forEach((goalId) => {
      assert.notEqual(goalId, 'all', guide.canonicalName);
      assert.ok(knownGoalIds.has(goalId), `${guide.canonicalName}: ${goalId}`);
      assert.equal(api.matches(guide.canonicalName, goalId), true);
    });
  });
});

test('fails closed for unknown names and unknown goal IDs', () => {
  const api = learningPaths();

  assert.deepEqual(api.goalsFor('Unknown Effect'), []);
  assert.deepEqual(api.goalsFor('Pro-Q 3'), []);
  assert.deepEqual(api.goalsFor('__proto__'), []);
  assert.equal(api.matches('Unknown Effect', 'cleanup-control'), false);
  assert.equal(api.matches('__proto__', 'cleanup-control'), false);
  assert.equal(api.matches('FabFilter Pro-Q 3', 'unknown-goal'), false);
  assert.equal(api.matches('Unknown Effect', 'unknown-goal'), false);
  assert.equal(api.matches('Unknown Effect', 'all'), false);
  assert.equal(api.matches('FabFilter Pro-Q 3', 'all'), true);
});

test('normalizes names with NFKC, case folding, repeated internal whitespace, and trimming', () => {
  const api = learningPaths();
  const normalizedVariant = '  ＦａｂＦｉｌｔｅｒ   Ｐｒｏ－Ｑ ３  ';

  assert.deepEqual(api.goalsFor(normalizedVariant), ['pitch-tone']);
  assert.equal(api.matches(normalizedVariant, 'pitch-tone'), true);
});

test('attaches the UMD API to the browser global', () => {
  assert.ok(fs.existsSync(modulePath), 'effect learning paths module must exist');
  const context = {};

  vm.runInNewContext(moduleSource, context);

  assert.ok(context.SfxEffectLearningPaths);
  assert.deepEqual(Object.keys(context.SfxEffectLearningPaths), ['goals', 'goalsFor', 'matches']);
  assert.deepEqual(
    Array.from(context.SfxEffectLearningPaths.goalsFor('Dawesome Love')),
    ['granular-transform']
  );
  assert.ok(Object.isFrozen(context.SfxEffectLearningPaths));
});
