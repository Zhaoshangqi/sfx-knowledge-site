(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  } else {
    root.SfxLearningMap = api;
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var LIMITS = Object.freeze({
    version: 1,
    roles: Object.freeze({ min: 3, max: 6 }),
    decisions: Object.freeze({ min: 2, max: 3 }),
    chapters: Object.freeze({ min: 2, max: 5 }),
    learningKeys: Object.freeze(['input', 'problem', 'action', 'result'])
  });

  var hasOwn = Object.prototype.hasOwnProperty;

  function invalidData() {
    throw new TypeError('learning map input must contain only plain data');
  }

  function descriptorValue(value, key) {
    var descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !hasOwn.call(descriptor, 'value') || !descriptor.enumerable) invalidData();
    return descriptor.value;
  }

  function cloneArray(value, ancestors, sources) {
    if (Object.getPrototypeOf(value) !== Array.prototype) invalidData();

    var lengthDescriptor = Object.getOwnPropertyDescriptor(value, 'length');
    if (!lengthDescriptor || !hasOwn.call(lengthDescriptor, 'value')) invalidData();
    var length = lengthDescriptor.value;
    if (!Number.isSafeInteger(length) || length < 0) invalidData();

    var keys = Reflect.ownKeys(value);
    var result = new Array(length);
    var elementCount = 0;
    if (sources) sources.set(result, value);

    for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      var key = keys[keyIndex];
      if (key === 'length') continue;
      if (typeof key !== 'string') invalidData();

      var index = Number(key);
      if (!Number.isSafeInteger(index) || index < 0 || index >= length || String(index) !== key) {
        invalidData();
      }

      result[index] = cloneData(descriptorValue(value, key), ancestors, sources);
      elementCount += 1;
    }

    if (elementCount !== length) invalidData();
    return result;
  }

  function cloneObject(value, ancestors, sources) {
    var prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) invalidData();

    var keys = Reflect.ownKeys(value);
    var result = Object.create(null);
    if (sources) sources.set(result, value);

    for (var keyIndex = 0; keyIndex < keys.length; keyIndex += 1) {
      var key = keys[keyIndex];
      if (typeof key !== 'string') invalidData();
      result[key] = cloneData(descriptorValue(value, key), ancestors, sources);
    }
    return result;
  }

  function cloneData(value, ancestors, sources) {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') {
      if (!Number.isFinite(value)) invalidData();
      return value;
    }
    if (typeof value !== 'object') invalidData();
    if (ancestors.has(value)) invalidData();

    ancestors.add(value);
    try {
      return Array.isArray(value)
        ? cloneArray(value, ancestors, sources)
        : cloneObject(value, ancestors, sources);
    } finally {
      ancestors.delete(value);
    }
  }

  function isObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function text(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  function within(array, range) {
    return Array.isArray(array) && array.length >= range.min && array.length <= range.max;
  }

  function projectData(record, detailData, sources) {
    if (!isObject(record) || !isObject(detailData)) return null;

    var learningMap = record.learningMap;
    if (!isObject(learningMap) || learningMap.version !== LIMITS.version) return null;

    var goal = text(learningMap.goal);
    var sequence = text(learningMap.sequence);
    if (!goal || !sequence) return null;

    if (!within(learningMap.roles, LIMITS.roles)) return null;
    var roles = [];
    for (var roleIndex = 0; roleIndex < learningMap.roles.length; roleIndex += 1) {
      var sourceRole = learningMap.roles[roleIndex];
      if (!isObject(sourceRole)) return null;
      var name = text(sourceRole.name);
      var description = text(sourceRole.description);
      if (!name || !description) return null;
      roles.push({ name: name, description: description });
    }

    if (!within(learningMap.decisions, LIMITS.decisions)) return null;
    var decisions = [];
    for (var decisionIndex = 0; decisionIndex < learningMap.decisions.length; decisionIndex += 1) {
      var decision = text(learningMap.decisions[decisionIndex]);
      if (!decision) return null;
      decisions.push(decision);
    }

    var sourceSteps = detailData.steps;
    if (!Array.isArray(sourceSteps)) return null;
    var steps = [];
    var stepsByOrder = new Map();
    for (var stepIndex = 0; stepIndex < sourceSteps.length; stepIndex += 1) {
      var sourceStep = sourceSteps[stepIndex];
      if (!isObject(sourceStep)) return null;

      var order = sourceStep.order;
      if (!Number.isInteger(order) || order <= 0 || stepsByOrder.has(order)) return null;

      var sourceLearning = sourceStep.learning;
      if (!isObject(sourceLearning)) return null;
      var learning = {};
      for (var keyIndex = 0; keyIndex < LIMITS.learningKeys.length; keyIndex += 1) {
        var key = LIMITS.learningKeys[keyIndex];
        var value = text(sourceLearning[key]);
        if (!value) return null;
        learning[key] = value;
      }

      var originalStep = sources && sources.has(sourceStep) ? sources.get(sourceStep) : sourceStep;
      var entry = { step: originalStep, index: stepIndex, order: order, learning: learning };
      steps.push(entry);
      stepsByOrder.set(order, entry);
    }

    if (!within(learningMap.chapters, LIMITS.chapters)) return null;
    var chapters = [];
    var seenChapterIds = new Set();
    var seenOrders = new Set();
    for (var chapterIndex = 0; chapterIndex < learningMap.chapters.length; chapterIndex += 1) {
      var sourceChapter = learningMap.chapters[chapterIndex];
      if (!isObject(sourceChapter)) return null;

      var id = text(sourceChapter.id);
      var title = text(sourceChapter.title);
      var question = text(sourceChapter.question);
      var summary = text(sourceChapter.summary);
      if (!id || !title || !question || !summary || seenChapterIds.has(id)) return null;
      seenChapterIds.add(id);

      var sourceOrders = sourceChapter.stepOrders;
      if (!Array.isArray(sourceOrders) || sourceOrders.length === 0) return null;
      var stepOrders = [];
      var chapterSteps = [];
      for (var orderIndex = 0; orderIndex < sourceOrders.length; orderIndex += 1) {
        var chapterOrder = sourceOrders[orderIndex];
        if (!Number.isInteger(chapterOrder) || chapterOrder <= 0 ||
            seenOrders.has(chapterOrder) || !stepsByOrder.has(chapterOrder)) {
          return null;
        }
        seenOrders.add(chapterOrder);
        stepOrders.push(chapterOrder);
        chapterSteps.push(stepsByOrder.get(chapterOrder));
      }

      chapters.push({
        id: id,
        title: title,
        question: question,
        summary: summary,
        stepOrders: stepOrders,
        steps: chapterSteps
      });
    }

    if (seenOrders.size !== steps.length) return null;
    for (var stepOrderIndex = 0; stepOrderIndex < steps.length; stepOrderIndex += 1) {
      if (!seenOrders.has(steps[stepOrderIndex].order)) return null;
    }

    return {
      version: LIMITS.version,
      goal: goal,
      sequence: sequence,
      roles: roles,
      decisions: decisions,
      steps: steps,
      chapters: chapters
    };
  }

  function project(record, detailData) {
    try {
      var sources = typeof WeakMap === 'function' ? new WeakMap() : null;
      var safeRecord = cloneData(record, new WeakSet(), sources);
      var safeDetailData = cloneData(detailData, new WeakSet(), sources);
      return projectData(safeRecord, safeDetailData, sources);
    } catch (error) {
      return null;
    }
  }

  function limits() {
    return LIMITS;
  }

  return Object.freeze({
    project: project,
    limits: limits
  });
}));
