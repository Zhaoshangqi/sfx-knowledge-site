(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SfxEffectLearningPaths = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function normalizeName(value) {
    return String(value).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  var goalRecords = Object.freeze([
    Object.freeze({ id: 'all', label: '全部' }),
    Object.freeze({ id: 'cleanup-control', label: '清理与控制' }),
    Object.freeze({ id: 'impact-density', label: '冲击与密度' }),
    Object.freeze({ id: 'motion-rhythm', label: '运动与节奏' }),
    Object.freeze({ id: 'pitch-tone', label: '音高与音色' }),
    Object.freeze({ id: 'space-tail', label: '空间与尾部' }),
    Object.freeze({ id: 'granular-transform', label: '颗粒与变形' })
  ]);

  var goalsByName = Object.freeze({
    'dawesome love': Object.freeze(['granular-transform']),
    'fabfilter pro-mb': Object.freeze(['cleanup-control', 'impact-density']),
    'fabfilter pro-q 3': Object.freeze(['pitch-tone']),
    'fabfilter saturn 2': Object.freeze(['impact-density', 'granular-transform']),
    'izotope rx de-click': Object.freeze(['granular-transform']),
    'izotope stutter edit 2': Object.freeze(['motion-rhythm', 'granular-transform']),
    'kilohearts phase plant': Object.freeze(['pitch-tone', 'motion-rhythm']),
    'kilohearts snap heap': Object.freeze(['space-tail', 'motion-rhythm']),
    'melda mautopitch': Object.freeze(['pitch-tone']),
    'meldaproduction mtremolo': Object.freeze(['motion-rhythm', 'space-tail']),
    'minimal audio wave shifter': Object.freeze(['pitch-tone', 'motion-rhythm']),
    'morph eq': Object.freeze(['pitch-tone', 'motion-rhythm']),
    'ni transient master': Object.freeze(['impact-density', 'cleanup-control']),
    'oeksound soothe2': Object.freeze(['cleanup-control', 'impact-density']),
    'polyverse manipulator': Object.freeze(['pitch-tone', 'impact-density']),
    'sonic academy kick 3': Object.freeze(['impact-density']),
    'soundtheory gullfoss': Object.freeze(['cleanup-control']),
    'soundtoys crystallizer': Object.freeze(['granular-transform', 'space-tail']),
    'soundtoys decapitator': Object.freeze(['impact-density']),
    'soundtoys filterfreak': Object.freeze(['motion-rhythm', 'pitch-tone']),
    'soundtoys phasemistress': Object.freeze(['motion-rhythm', 'space-tail']),
    'stepwise morph': Object.freeze(['pitch-tone', 'granular-transform']),
    'unfiltered audio indent 2': Object.freeze(['cleanup-control', 'impact-density']),
    'uvi shade': Object.freeze(['motion-rhythm', 'space-tail']),
    'valhalla freqecho': Object.freeze(['space-tail', 'pitch-tone']),
    'waves enigma': Object.freeze(['motion-rhythm', 'space-tail']),
    'waves z-noise': Object.freeze(['cleanup-control'])
  });

  var emptyGoals = Object.freeze([]);
  var knownGoalIds = Object.freeze(goalRecords.map(function (goal) { return goal.id; }));

  function goals() {
    return goalRecords;
  }

  function goalsFor(canonicalName) {
    var normalizedName = normalizeName(canonicalName);
    return Object.prototype.hasOwnProperty.call(goalsByName, normalizedName)
      ? goalsByName[normalizedName]
      : emptyGoals;
  }

  function matches(canonicalName, goalId) {
    var mappedGoalIds = goalsFor(canonicalName);
    if (mappedGoalIds.length === 0) return false;
    if (goalId === 'all') return true;
    if (knownGoalIds.indexOf(goalId) === -1) return false;
    return mappedGoalIds.indexOf(goalId) !== -1;
  }

  return Object.freeze({
    goals: goals,
    goalsFor: goalsFor,
    matches: matches
  });
}));
