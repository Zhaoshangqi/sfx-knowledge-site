(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SfxVideoTimeline = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function finiteNonNegative(value) {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  }

  function validRecord(record) {
    var timeline = record && typeof record === 'object' && !Array.isArray(record)
      ? record.timeline
      : null;
    return Boolean(
      timeline &&
      typeof timeline === 'object' &&
      !Array.isArray(timeline) &&
      finiteNonNegative(timeline.durationSeconds) &&
      timeline.durationSeconds > 0 &&
      typeof timeline.reviewedAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(timeline.reviewedAt) &&
      timeline.source === 'youtube-player'
    );
  }

  function bounded(record, seconds) {
    return validRecord(record) &&
      finiteNonNegative(seconds) &&
      seconds < record.timeline.durationSeconds
      ? seconds
      : null;
  }

  function stepStart(record, stepIndex) {
    if (!validRecord(record) || !Number.isInteger(stepIndex) || stepIndex < 0 || !Array.isArray(record.steps)) {
      return null;
    }
    var step = record.steps[stepIndex];
    return step && typeof step === 'object' && !Array.isArray(step)
      ? bounded(record, step.startSeconds)
      : null;
  }

  function screenshotStart(record, imageKey) {
    if (typeof imageKey !== 'string' || !imageKey.trim() || !validRecord(record) || !Array.isArray(record.steps)) {
      return null;
    }
    for (var index = 0; index < record.steps.length; index += 1) {
      var step = record.steps[index];
      if (step && typeof step === 'object' && !Array.isArray(step) &&
          typeof step.imageKey === 'string' && step.imageKey.trim() && step.imageKey === imageKey) {
        return stepStart(record, index);
      }
    }
    return null;
  }

  function effectStart(record, use) {
    if (!validRecord(record) || !use || typeof use !== 'object' || Array.isArray(use)) return null;
    if (use.startSeconds !== null && use.startSeconds !== undefined) {
      return bounded(record, use.startSeconds);
    }
    return stepStart(record, use.stepIndex);
  }

  function padTwo(value) {
    return value < 10 ? '0' + value : String(value);
  }

  function formatTime(seconds) {
    var wholeSeconds = finiteNonNegative(seconds) ? Math.floor(seconds) : 0;
    var hours = Math.floor(wholeSeconds / 3600);
    var minutes = Math.floor((wholeSeconds % 3600) / 60);
    var remainingSeconds = wholeSeconds % 60;

    if (hours > 0) return hours + ':' + padTwo(minutes) + ':' + padTwo(remainingSeconds);
    return padTwo(minutes) + ':' + padTwo(remainingSeconds);
  }

  function coverage(records, publicUses) {
    var recordList = Array.isArray(records) ? records : [];
    var useList = Array.isArray(publicUses) ? publicUses : [];
    var result = {
      records: recordList.length,
      reviewedRecords: 0,
      steps: 0,
      timedSteps: 0,
      publicCases: useList.length,
      timedPublicCases: 0,
      screenshotCasesReviewed: 0
    };

    recordList.forEach(function (record) {
      if (validRecord(record)) result.reviewedRecords += 1;
      var steps = record && Array.isArray(record.steps) ? record.steps : [];
      result.steps += steps.length;
      steps.forEach(function (_step, stepIndex) {
        if (stepStart(record, stepIndex) !== null) result.timedSteps += 1;
      });
    });

    useList.forEach(function (use) {
      if (use && use.screenshotReviewed === true) result.screenshotCasesReviewed += 1;
      if (!use || typeof use !== 'object' || Array.isArray(use)) return;

      for (var index = 0; index < recordList.length; index += 1) {
        var record = recordList[index];
        if (record && record.id === use.sourceRecordId) {
          if (effectStart(record, use) !== null) result.timedPublicCases += 1;
          return;
        }
      }
    });

    return Object.freeze(result);
  }

  return Object.freeze({
    validRecord: validRecord,
    stepStart: stepStart,
    screenshotStart: screenshotStart,
    effectStart: effectStart,
    formatTime: formatTime,
    coverage: coverage
  });
}));
