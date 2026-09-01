'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const LearningMap = require('../src/learning-map.js');

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function fixture(options = {}) {
  const roleCount = hasOwn(options, 'roleCount') ? options.roleCount : 3;
  const decisionCount = hasOwn(options, 'decisionCount') ? options.decisionCount : 2;
  const stepOrders = hasOwn(options, 'stepOrders') ? options.stepOrders.slice() : [1, 2, 3, 4, 5];
  const chapterOrders = hasOwn(options, 'chapterOrders')
    ? options.chapterOrders.map((orders) => orders.slice())
    : [stepOrders.slice(0, 2), stepOrders.slice(2)];

  return {
    id: 'fixture-record',
    learningMap: {
      version: hasOwn(options, 'version') ? options.version : 1,
      goal: '  Build a readable effect  ',
      roles: Array.from({ length: roleCount }, (_, index) => ({
        name: `  Role ${index + 1}  `,
        description: `  Responsibility ${index + 1}  `
      })),
      decisions: Array.from({ length: decisionCount }, (_, index) => `  Decision ${index + 1}  `),
      sequence: '  Input -> process -> result  ',
      chapters: chapterOrders.map((orders, index) => ({
        id: `  chapter-${index + 1}  `,
        title: `  Chapter ${index + 1}  `,
        question: `  Question ${index + 1}?  `,
        summary: `  Summary ${index + 1}  `,
        stepOrders: orders
      }))
    },
    steps: stepOrders.map((order, index) => ({
      order,
      name: `Step ${index + 1}`,
      learning: {
        input: `  Input ${index + 1}  `,
        problem: `  Problem ${index + 1}  `,
        action: `  Action ${index + 1}  `,
        result: `  Result ${index + 1}  `
      }
    }))
  };
}

function detail(record) {
  return { steps: record.steps };
}

function nullPrototypeCopy(value) {
  if (Array.isArray(value)) return value.map(nullPrototypeCopy);
  if (!value || typeof value !== 'object') return value;
  const result = Object.create(null);
  for (const key of Object.keys(value)) result[key] = nullPrototypeCopy(value[key]);
  return result;
}

function assertFailsClosed(record, detailData) {
  let result = Symbol('not-called');
  assert.doesNotThrow(() => {
    result = LearningMap.project(record, detailData);
  });
  assert.equal(result, null);
}

test('exports only a frozen project and limits API with immutable limits', () => {
  assert.deepEqual(Object.keys(LearningMap), ['project', 'limits']);
  assert.ok(Object.isFrozen(LearningMap));

  const limits = LearningMap.limits();
  assert.deepEqual(limits, {
    version: 1,
    roles: { min: 3, max: 6 },
    decisions: { min: 2, max: 3 },
    chapters: { min: 2, max: 5 },
    learningKeys: ['input', 'problem', 'action', 'result']
  });
  assert.ok(Object.isFrozen(limits));
  assert.ok(Object.isFrozen(limits.roles));
  assert.ok(Object.isFrozen(limits.decisions));
  assert.ok(Object.isFrozen(limits.chapters));
  assert.ok(Object.isFrozen(limits.learningKeys));
  assert.throws(() => { limits.roles.min = 0; }, TypeError);
  assert.throws(() => { limits.learningKeys.push('notes'); }, TypeError);
  assert.equal(LearningMap.limits().roles.min, 3);
  assert.deepEqual(LearningMap.limits().learningKeys, ['input', 'problem', 'action', 'result']);
});

test('projects and trims the valid lower-bound fixture', () => {
  const record = fixture();
  const projected = LearningMap.project(record, detail(record));

  assert.ok(projected);
  assert.equal(projected.version, 1);
  assert.equal(projected.goal, 'Build a readable effect');
  assert.equal(projected.sequence, 'Input -> process -> result');
  assert.deepEqual(projected.roles, [
    { name: 'Role 1', description: 'Responsibility 1' },
    { name: 'Role 2', description: 'Responsibility 2' },
    { name: 'Role 3', description: 'Responsibility 3' }
  ]);
  assert.deepEqual(projected.decisions, ['Decision 1', 'Decision 2']);
  assert.deepEqual(projected.steps.map(({ index, order, learning }) => ({ index, order, learning })), [
    { index: 0, order: 1, learning: { input: 'Input 1', problem: 'Problem 1', action: 'Action 1', result: 'Result 1' } },
    { index: 1, order: 2, learning: { input: 'Input 2', problem: 'Problem 2', action: 'Action 2', result: 'Result 2' } },
    { index: 2, order: 3, learning: { input: 'Input 3', problem: 'Problem 3', action: 'Action 3', result: 'Result 3' } },
    { index: 3, order: 4, learning: { input: 'Input 4', problem: 'Problem 4', action: 'Action 4', result: 'Result 4' } },
    { index: 4, order: 5, learning: { input: 'Input 5', problem: 'Problem 5', action: 'Action 5', result: 'Result 5' } }
  ]);
  assert.deepEqual(projected.chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    question: chapter.question,
    summary: chapter.summary,
    stepOrders: chapter.stepOrders
  })), [
    { id: 'chapter-1', title: 'Chapter 1', question: 'Question 1?', summary: 'Summary 1', stepOrders: [1, 2] },
    { id: 'chapter-2', title: 'Chapter 2', question: 'Question 2?', summary: 'Summary 2', stepOrders: [3, 4, 5] }
  ]);
  assert.strictEqual(projected.steps[0].step, record.steps[0]);
  assert.strictEqual(projected.chapters[1].steps[0], projected.steps[2]);
});

test('projects the valid upper-bound fixture', () => {
  const record = fixture({
    roleCount: 6,
    decisionCount: 3,
    chapterOrders: [[1], [2], [3], [4], [5]]
  });
  const projected = LearningMap.project(record, detail(record));

  assert.ok(projected);
  assert.equal(projected.roles.length, 6);
  assert.equal(projected.decisions.length, 3);
  assert.equal(projected.chapters.length, 5);
  assert.deepEqual(projected.chapters.flatMap((chapter) => chapter.stepOrders), [1, 2, 3, 4, 5]);
});

test('preserves actual step-array indexes when orders and chapters are rearranged', () => {
  const record = fixture({
    stepOrders: [30, 10, 50, 20, 40],
    chapterOrders: [[10, 30], [40, 20, 50]]
  });
  const projected = LearningMap.project(record, detail(record));

  assert.ok(projected);
  assert.deepEqual(projected.steps.map((entry) => [entry.index, entry.order]), [
    [0, 30], [1, 10], [2, 50], [3, 20], [4, 40]
  ]);
  assert.deepEqual(projected.chapters.map((chapter) => chapter.steps.map((entry) => entry.index)), [
    [1, 0], [4, 3, 2]
  ]);
  assert.strictEqual(projected.chapters[0].steps[0].step, record.steps[1]);
});

test('accepts null-prototype data objects at every object level', () => {
  const record = nullPrototypeCopy(fixture());
  const detailData = Object.create(null);
  detailData.steps = record.steps;

  const projected = LearningMap.project(record, detailData);
  assert.ok(projected);
  assert.equal(projected.version, 1);
  assert.deepEqual(projected.steps.map((entry) => entry.index), [0, 1, 2, 3, 4]);
});

test('publishes the same frozen contract through the browser global', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'learning-map.js'), 'utf8');
  const context = vm.createContext({ recordJson: JSON.stringify(fixture()) });
  vm.runInContext(source, context, { filename: 'learning-map.js' });
  vm.runInContext(
    'record = JSON.parse(recordJson); projection = SfxLearningMap.project(record, { steps: record.steps });',
    context
  );

  assert.deepEqual(Array.from(Object.keys(context.SfxLearningMap)), ['project', 'limits']);
  assert.ok(Object.isFrozen(context.SfxLearningMap));
  assert.ok(Object.isFrozen(context.SfxLearningMap.limits()));
  assert.equal(context.SfxLearningMap.limits().version, LearningMap.limits().version);
  assert.equal(context.projection.version, 1);
  assert.deepEqual(Array.from(context.projection.chapters, (chapter) => Array.from(chapter.stepOrders)), [
    [1, 2], [3, 4, 5]
  ]);
});

test('rejects missing or mismatched schema versions', () => {
  for (const version of [0, 2, '1', null]) {
    const record = fixture({ version });
    assertFailsClosed(record, detail(record));
  }

  const record = fixture();
  delete record.learningMap.version;
  assertFailsClosed(record, detail(record));
});

test('rejects role counts below 3 or above 6', () => {
  for (const roleCount of [2, 7]) {
    const record = fixture({ roleCount });
    assertFailsClosed(record, detail(record));
  }
});

test('rejects decision counts below 2 or above 3', () => {
  for (const decisionCount of [1, 4]) {
    const record = fixture({ decisionCount });
    assertFailsClosed(record, detail(record));
  }
});

test('rejects chapter counts below 2 or above 5', () => {
  const oneChapter = fixture({ chapterOrders: [[1, 2, 3, 4, 5]] });
  assertFailsClosed(oneChapter, detail(oneChapter));

  const sixChapters = fixture({
    stepOrders: [1, 2, 3, 4, 5, 6],
    chapterOrders: [[1], [2], [3], [4], [5], [6]]
  });
  assertFailsClosed(sixChapters, detail(sixChapters));
});

test('rejects duplicate chapter ids after trimming', () => {
  const record = fixture();
  record.learningMap.chapters[1].id = ' chapter-1 ';
  assertFailsClosed(record, detail(record));
});

test('rejects missing, duplicate, non-positive, or non-integer step orders', () => {
  const mutations = [
    (record) => { delete record.steps[0].order; },
    (record) => { record.steps[1].order = record.steps[0].order; },
    (record) => { record.steps[0].order = 0; },
    (record) => { record.steps[0].order = 1.5; }
  ];

  for (const mutate of mutations) {
    const record = fixture();
    mutate(record);
    assertFailsClosed(record, detail(record));
  }
});

test('requires chapter stepOrders to cover every step order exactly once', () => {
  const mutations = [
    (record) => { record.learningMap.chapters[1].stepOrders = [2, 3, 4, 5]; },
    (record) => { record.learningMap.chapters[1].stepOrders = [3, 4]; },
    (record) => { record.learningMap.chapters[1].stepOrders = [3, 4, 99]; },
    (record) => { record.learningMap.chapters[0].stepOrders = []; }
  ];

  for (const mutate of mutations) {
    const record = fixture();
    mutate(record);
    assertFailsClosed(record, detail(record));
  }
});

test('rejects whitespace-only input, problem, action, or result values', () => {
  for (const key of ['input', 'problem', 'action', 'result']) {
    const record = fixture();
    record.steps[0].learning[key] = ' \t\r\n ';
    assertFailsClosed(record, detail(record));
  }
});

test('rejects whitespace-only author strings elsewhere in the contract', () => {
  const mutations = [
    (record) => { record.learningMap.goal = '  '; },
    (record) => { record.learningMap.sequence = '\n'; },
    (record) => { record.learningMap.roles[0].name = '\t'; },
    (record) => { record.learningMap.roles[0].description = ' '; },
    (record) => { record.learningMap.decisions[0] = ' \r '; },
    (record) => { record.learningMap.chapters[0].id = ' '; },
    (record) => { record.learningMap.chapters[0].title = ' '; },
    (record) => { record.learningMap.chapters[0].question = ' '; },
    (record) => { record.learningMap.chapters[0].summary = ' '; }
  ];

  for (const mutate of mutations) {
    const record = fixture();
    mutate(record);
    assertFailsClosed(record, detail(record));
  }
});

test('rejects accessors without invoking getters', () => {
  let getterCalls = 0;
  const unsafeGetter = () => {
    getterCalls += 1;
    throw new Error('getter must not run');
  };

  const rootAccessor = fixture();
  Object.defineProperty(rootAccessor, 'learningMap', { enumerable: true, get: unsafeGetter });
  assertFailsClosed(rootAccessor, detail(rootAccessor));

  const nestedAccessor = fixture();
  Object.defineProperty(nestedAccessor.steps[0].learning, 'input', { enumerable: true, get: unsafeGetter });
  assertFailsClosed(nestedAccessor, detail(nestedAccessor));

  const detailAccessorRecord = fixture();
  const detailAccessor = {};
  Object.defineProperty(detailAccessor, 'steps', { enumerable: true, get: unsafeGetter });
  assertFailsClosed(detailAccessorRecord, detailAccessor);

  assert.equal(getterCalls, 0);
});

test('rejects custom object and array prototypes', () => {
  const customRoot = fixture();
  Object.setPrototypeOf(customRoot, { inherited: true });
  assertFailsClosed(customRoot, detail(customRoot));

  const customNested = fixture();
  Object.setPrototypeOf(customNested.steps[0].learning, { inherited: true });
  assertFailsClosed(customNested, detail(customNested));

  const customArray = fixture();
  Object.setPrototypeOf(customArray.learningMap.roles, {});
  assertFailsClosed(customArray, detail(customArray));
});

test('rejects sparse arrays and arrays with extra data keys', () => {
  const sparseRoles = fixture();
  delete sparseRoles.learningMap.roles[1];
  assertFailsClosed(sparseRoles, detail(sparseRoles));

  const sparseSteps = fixture();
  delete sparseSteps.steps[2];
  assertFailsClosed(sparseSteps, detail(sparseSteps));

  const sparseOrders = fixture();
  delete sparseOrders.learningMap.chapters[0].stepOrders[0];
  assertFailsClosed(sparseOrders, detail(sparseOrders));

  const extraArrayKey = fixture();
  extraArrayKey.learningMap.decisions.extra = 'not array data';
  assertFailsClosed(extraArrayKey, detail(extraArrayKey));
});

test('fails closed when reflection throws', () => {
  const throwingInputs = [
    new Proxy({}, { getPrototypeOf() { throw new Error('getPrototypeOf failed'); } }),
    new Proxy({}, { ownKeys() { throw new Error('ownKeys failed'); } }),
    new Proxy({ learningMap: {} }, {
      getOwnPropertyDescriptor() { throw new Error('descriptor failed'); }
    })
  ];

  for (const record of throwingInputs) assertFailsClosed(record, { steps: [] });

  const nestedProxy = fixture();
  nestedProxy.learningMap.roles[0] = new Proxy({}, {
    ownKeys() { throw new Error('nested ownKeys failed'); }
  });
  assertFailsClosed(nestedProxy, detail(nestedProxy));
});

test('fails closed for unsupported roots instead of throwing', () => {
  for (const value of [null, undefined, true, 1, 'record', Symbol('record')]) {
    assertFailsClosed(value, { steps: [] });
    assertFailsClosed(fixture(), value);
  }
});
