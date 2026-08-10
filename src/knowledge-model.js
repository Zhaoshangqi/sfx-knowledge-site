(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.SfxKnowledgeModel = factory();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function cleanText(value) {
    return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
  }

  var suffixes = [
    /复习时先看每一步负责的声音角色，再看插件名称[。！？；.!?;]?$/,
    /学习时给每颗插件标注“[^”]+”之一[。！？；.!?;]?$/,
    /复习时先听它改变的是素材身份、频谱、运动、空间、动态还是响度，再决定是否保留[。！？；.!?;]?$/,
    /复刻时只调一个核心旋钮，渲染弱\/中\/强三版并响度匹配比较[。！？；.!?;]?$/,
    /复刻时不要机械抄数值，先听这些参数改变的是攻击、频段、空间、运动还是响度[。！？；.!?;]?$/
  ];

  function stripCourseScaffolding(value) {
    var result = cleanText(value);
    suffixes.forEach(function (suffix) {
      result = result.replace(suffix, '').trim();
    });
    return result;
  }

  function uniqueFacts(facts) {
    var seen = Object.create(null);
    return (Array.isArray(facts) ? facts : []).map(cleanText).filter(function (fact) {
      if (!fact || seen[fact]) return false;
      seen[fact] = true;
      return true;
    });
  }

  function normalizeKey(value) {
    return cleanText(value).normalize('NFKC').replace(/\s+/g, ' ').toLowerCase();
  }

  function canonicalEffectName(name, referenceCatalog) {
    var raw = cleanText(name).normalize('NFKC').replace(/\s+/g, ' ');
    var key = raw.toLowerCase();
    (Array.isArray(referenceCatalog) ? referenceCatalog : []).some(function (reference) {
      var candidates = [reference && reference.title].concat(reference && Array.isArray(reference.aliases) ? reference.aliases : []);
      var match = candidates.some(function (candidate) { return normalizeKey(candidate) === key; });
      if (match) {
        raw = cleanText(reference.title);
      }
      return match;
    });
    return raw;
  }

  function effectSlug(name) {
    return normalizeKey(name).replace(/[^a-z0-9\u3400-\u9fff]+/g, '-').replace(/^-+|-+$/g, '') || 'effect';
  }

  var categoryRules = [
    ['频谱与音色', /\b(?:eq|filter|spliteq)\b|均衡|滤波|共振/i],
    ['动态与响度', /\b(?:compressor|limiter|clipper|sidechain)\b|压缩|限制|削波|侧链|响度/i],
    ['饱和与失真', /saturat|distort|exciter|饱和|失真|谐波增强/i],
    ['音高与频率', /pitch|formant|vocoder|frequency\s*shift|音高|共振峰|声码|频移/i],
    ['调制与运动', /phaser|flanger|chorus|tremolo|doppler|stereo\s*motion|相位|镶边|合唱|颤音|多普勒|立体声运动/i],
    ['空间与时间', /reverb|delay|echo|granular|convolution|混响|延迟|回声|颗粒|卷积/i],
    ['修复与非常规处理', /\bRX\b|de[- ]?(?:click|clip|noise)|修复|去噪|去点击|去削波/i],
    ['自动化、脚本与路由', /automation|script|routing|rtpc|包络|脚本|路由|中间件/i]
  ];

  function classifyEffectUse(use) {
    var explicit = cleanText(use && use.category);
    if (explicit) return explicit;
    var text = [use && use.name, use && use.vendor, use && use.purpose, use && use.target].map(cleanText).join(' ');
    var matches = categoryRules.filter(function (rule) { return rule[1].test(text); }).map(function (rule) { return rule[0]; });
    return matches.length === 1 ? matches[0] : '未分类';
  }

  function inferEvidence(text) {
    var value = cleanText(text);
    var labels = ['画面确认', '作者口述', '分析推断', '视频未展示'];
    for (var i = 0; i < labels.length; i += 1) {
      if (value.indexOf(labels[i]) !== -1) return labels[i];
    }
    return '';
  }

  function normalizeParameter(parameter, fallbackName) {
    if (parameter && typeof parameter === 'object' && !Array.isArray(parameter)) {
      return {
        name: cleanText(parameter.name || fallbackName),
        value: cleanText(parameter.value),
        direction: cleanText(parameter.direction),
        evidence: cleanText(parameter.evidence)
      };
    }
    return { name: cleanText(fallbackName), value: cleanText(parameter), direction: '', evidence: '' };
  }

  function normalizeParameters(parameters, legacy) {
    if (legacy) {
      return [{ name: '参数线索', value: parameters == null ? '' : cleanText(JSON.stringify(parameters)), direction: '', evidence: '' }];
    }
    if (Array.isArray(parameters)) return parameters.map(function (parameter) { return normalizeParameter(parameter, '参数'); });
    if (parameters && typeof parameters === 'object') {
      return Object.keys(parameters).map(function (name) { return normalizeParameter(parameters[name], name); });
    }
    return [];
  }

  function listText(value) {
    if (!Array.isArray(value)) return value == null ? [] : [cleanText(value)].filter(Boolean);
    return value.map(function (item) { return cleanText(typeof item === 'object' ? item.name || item.title || JSON.stringify(item) : item); }).filter(Boolean);
  }

  function findStep(record, stepIndex) {
    return (Array.isArray(record.steps) ? record.steps : []).find(function (step) {
      return step && (step.index === stepIndex || step.stepIndex === stepIndex);
    });
  }

  function makeUse(record, input, legacy, pluginIndex) {
    var name = cleanText(input && input.name);
    var stepIndex = input && (input.stepIndex != null ? input.stepIndex : input.step);
    var step = findStep(record, stepIndex);
    var replacementIndexes = Array.isArray(input && input.replacesPluginIndexes) ? input.replacesPluginIndexes.filter(function (index) { return Number.isInteger(index) && index >= 0; }) : [];
    var use = {
      id: cleanText(input && input.id) || [cleanText(record.id), effectSlug(name), legacy ? pluginIndex + 1 : 'explicit'].join('-'),
      name: name,
      vendor: cleanText(input && input.vendor),
      category: classifyEffectUse(input),
      target: cleanText(input && input.target),
      chainPosition: input && input.chainPosition != null ? input.chainPosition : legacy ? pluginIndex + 1 : null,
      purpose: cleanText(input && input.purpose),
      parameters: normalizeParameters(input && (input.parameters != null ? input.parameters : input.settings), legacy),
      result: cleanText(input && input.result),
      interactions: listText(input && input.interactions),
      limitations: listText(input && input.limitations),
      timestamp: cleanText(input && input.timestamp),
      stepIndex: stepIndex == null ? null : stepIndex,
      screenshotKey: cleanText(input && input.screenshotKey) || cleanText(step && step.screenshotKey),
      evidence: cleanText(input && input.evidence) || inferEvidence(input && [input.purpose, input.result, input.notes].join(' ')),
      sourceRecordId: cleanText(record.id),
      sourceVideoId: cleanText(record.sourceVideoId || record.videoId),
      sourceTitle: cleanText(record.title),
      source: cleanText(input && input.source) || (legacy ? 'plugin' : 'effectUse'),
      sourceKeywords: listText(record.keywords),
      sourcePluginIndexes: legacy ? [pluginIndex] : replacementIndexes,
      legacy: Boolean(legacy)
    };
    return use;
  }

  function buildEffectUses(record) {
    record = record || {};
    var explicit = Array.isArray(record.effectUses) ? record.effectUses : [];
    var plugins = Array.isArray(record.plugins) ? record.plugins : [];
    var replaced = Object.create(null);
    explicit.forEach(function (use) {
      (Array.isArray(use.replacesPluginIndexes) ? use.replacesPluginIndexes : []).forEach(function (index) {
        if (Number.isInteger(index) && index >= 0) replaced[index] = true;
      });
    });
    var result = explicit.map(function (use) { return makeUse(record, use, false); });
    plugins.forEach(function (plugin, index) {
      if (!replaced[index]) result.push(makeUse(record, plugin || {}, true, index));
    });
    return result;
  }

  function searchableRecordText(record) {
    var values = [];
    var fields = ['title', 'source', 'date', 'createdAt', 'updatedAt', 'updateNote', 'categoryLabel', 'summary', 'keywords', 'materials', 'coreIdeas', 'chainFocus', 'parameterLogic', 'tips', 'plugins', 'steps', 'effectUses'];
    function collect(value) {
      if (value == null) return;
      if (typeof value === 'string' || typeof value === 'number') values.push(stripCourseScaffolding(value).toLowerCase());
      else if (Array.isArray(value)) value.forEach(collect);
      else if (typeof value === 'object') Object.keys(value).forEach(function (key) { if (key !== 'practiceChecklist') collect(value[key]); });
    }
    (record && typeof record === 'object' ? fields : []).forEach(function (field) { collect(record[field]); });
    return values.filter(Boolean).join(' ');
  }

  function groupEffectUses(uses, referenceCatalog) {
    var groups = Object.create(null);
    (Array.isArray(uses) ? uses : []).forEach(function (use) {
      var name = canonicalEffectName(use && use.name, referenceCatalog);
      var key = normalizeKey(name);
      if (!groups[key]) groups[key] = { name: name, uses: [] };
      groups[key].uses.push(use);
    });
    return Object.keys(groups).map(function (key) { return groups[key]; }).sort(function (a, b) {
      return a.name.localeCompare(b.name, 'zh-CN', { numeric: true, sensitivity: 'base' });
    });
  }

  return {
    buildEffectUses: buildEffectUses,
    canonicalEffectName: canonicalEffectName,
    classifyEffectUse: classifyEffectUse,
    effectSlug: effectSlug,
    groupEffectUses: groupEffectUses,
    inferEvidence: inferEvidence,
    searchableRecordText: searchableRecordText,
    stripCourseScaffolding: stripCourseScaffolding,
    uniqueFacts: uniqueFacts
  };
}));
