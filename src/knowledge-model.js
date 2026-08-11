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
    /复习(?:这条)?时先看每一步负责的声音角色，再看插件名称[。！？；.!?;]?$/,
    /学习时给每颗插件标注“[^”]+”之一[。！？；.!?;]?$/,
    /复习时先听它改变的是素材身份、频谱、运动、空间、动态还是响度，再决定是否保留[。！？；.!?;]?$/,
    /复刻时只调一个核心旋钮，渲染弱\/中\/强三版并响度匹配比较[。！？；.!?;]?$/,
    /复刻时不要机械抄数值，先听这些参数改变的是攻击、频段、空间、运动还是响度[。！？；.!?;]?$/,
    /复刻时只动一个核心参数并渲染 3 个强度版本，避免同时改太多导致无法判断贡献[。！？；.!?;]?$/,
    /每次只改一个维度并输出弱\/中\/强三版，做 matched-loudness A\/B[。！？；.!?;]?$/i,
    /复刻时先做干声\/处理声响度匹配，再逐个 bypass 插件[。！？；.!?;]?$/i,
    /视频未显示完整参数页：按插件承担的角色做 A\/B 微调[。！？；.!?;]*$/,
    /具体数值未完整显示：重点听运动速度、频段位置、湿度和瞬态变化[。！？；.!?;]*$/,
    /具体数值未完整显示：用耳朵确认速度、频点、湿度或攻击是否服务画面[。！？；.!?;]*$/,
    /A\/B：旁路本步骤，听它是否(?:增加了清晰角色，而不是|只)增加响度[。！？；.!?;]*$/
  ];

  var generatedFactPatterns = [
    /分析推断练习[:：]/,
    /迁移练习(?:假设)?[:：]?/,
    /(?:^|[。；;]\s*)练习[:：]/,
    /^每次只改一个维度并输出弱\/中\/强三版/,
    /^复用检查：把本条链路抽象成源素材选择、第一层处理、二次采样、最终混音四个阶段[。！？；.!?;]?$/,
    /^画面同步检查：/,
    /^没有明确数值的插件页必须标注为/,
    /^每条链最后做旁路检查：/,
    /^(?:频段|空间|运动|动态)判断：/,
    /^(?:动态\/失真类|空间\/延迟类|音高\/合成\/采样类|滤波\/光谱类|调制类)处理/,
    /^第一步参数优先级：[\s\S]+这通常决定整条链后面的尺度、速度或素材质量[。！？；.!?;]?$/,
    /^第一颗处理点的判断：[\s\S]+先验证它是否真的改善了源素材，再继续下一级[。！？；.!?;]?$/,
    /^调参时一次只改变[\s\S]+(?:打印|输出)弱[、\/]中[、\/]强三版/,
    /^至少导出[\s\S]+三种/,
    /^保留无[\s\S]+三个阶段性打印/
  ];

  function isGeneratedStepScaffolding(value) {
    return typeof value === 'string' && /本条的主要链路可以按[\s\S]*视频证据[:：]/.test(value);
  }

  function stripGeneratedWrapper(value, marker) {
    var match = marker.exec(value);
    if (!match) return value;
    var before = value.slice(0, match.index).trim();
    var wrapped = value.slice(match.index);
    var factualSuffix = wrapped.match(/[；;](参数逻辑[:：][\s\S]+)$/);
    if (factualSuffix) {
      var label = before.replace(/参数逻辑[:：]\s*$/, '').replace(/[；;]+$/, '').trim();
      return [label, factualSuffix[1]].filter(Boolean).join(' ');
    }
    if (!before || /参数逻辑[:：]\s*$/.test(before)) return '';
    return before.replace(/[；;]+$/, '').trim();
  }

  function stripCourseScaffolding(value) {
    var result = value == null ? '' : String(value).trim();
    if (isGeneratedStepScaffolding(result)) return '';
    if (generatedFactPatterns.some(function (pattern) { return pattern.test(result); })) return '';
    var generatedChainIndex = result.indexOf('本条的主要链路可以按');
    if (generatedChainIndex !== -1) {
      return result.slice(0, generatedChainIndex).trim();
    }
    result = result.replace(/\s*视频证据[:：][\s\S]*$/, '').trim();
    result = stripGeneratedWrapper(result, /字幕\/画面线索[:：]/);
    result = stripGeneratedWrapper(result, /可确认的数值\/范围[:：]/);
    result = stripGeneratedWrapper(result, /具体数值未完整显示[:：](?:重点听运动速度、频段位置、湿度和瞬态变化|用耳朵确认速度、频点、湿度或攻击是否服务画面)/);
    if (/^字幕中出现的数值线索[:：]/.test(result)) return '';
    var previous;
    do {
      previous = result;
      suffixes.forEach(function (suffix) {
        result = result.replace(suffix, '').trim();
      });
      if (result !== previous) result = result.replace(/[；;]+$/, '').trim();
    } while (result !== previous);
    if (/^(?:A\/B[:：]旁路本步骤|具体数值未完整显示[:：](?:重点听|用耳朵确认))/.test(result)) return '';
    return result;
  }

  function uniqueFacts(facts) {
    var seen = Object.create(null);
    return (Array.isArray(facts) ? facts : []).map(stripCourseScaffolding).filter(function (fact) {
      var key = whitespaceKey(fact);
      if (!key || seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function normalizeKey(value) {
    return cleanText(value).normalize('NFKC').replace(/\s+/g, ' ').toLowerCase();
  }

  function whitespaceKey(value) {
    return value == null ? '' : String(value).replace(/\s+/g, ' ').trim();
  }

  function canonicalEffectName(name, referenceCatalog) {
    var raw = cleanText(name).normalize('NFKC').replace(/\s+/g, ' ');
    var key = raw.toLowerCase();
    (Array.isArray(referenceCatalog) ? referenceCatalog : []).some(function (reference) {
      var candidates = [reference && reference.title].concat(reference && Array.isArray(reference.aliases) ? reference.aliases : []);
      var match = candidates.some(function (candidate) { return normalizeKey(candidate) === key; });
      if (match) {
        raw = reference.title;
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
    var text = [use && use.name, use && use.purpose, use && use.target].map(cleanText).join(' ');
    var matches = categoryRules.filter(function (rule) { return rule[1].test(text); }).map(function (rule) { return rule[0]; });
    return matches.length === 1 ? matches[0] : '未分类';
  }

  function inferEvidence(text) {
    var value = cleanText(text).replace(/(?:尚待|仍待|有待|尚未|无法|不能|不可|需|待|未)画面确认/g, '');
    var labels = ['画面确认', '作者口述', '音频可辨', '分析推断', '视频未展示'];
    var matches = [];
    for (var i = 0; i < labels.length; i += 1) {
      if (value.indexOf(labels[i]) !== -1) matches.push(labels[i]);
    }
    return matches;
  }

  function scalarText(value) {
    return typeof value === 'string' || typeof value === 'number' ? cleanText(value) : '';
  }

  function collectEvidenceText(value, parts) {
    if (typeof value === 'string' || typeof value === 'number') {
      parts.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(function (item) { collectEvidenceText(item, parts); });
    } else if (value && typeof value === 'object') {
      Object.keys(value).forEach(function (key) { collectEvidenceText(value[key], parts); });
    }
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

  function normalizeLegacySetting(setting) {
    var value = stripCourseScaffolding(scalarText(setting));
    if (!value) return '';
    if (/^(?:字幕\/画面线索|可确认的数值\/范围)[:：]/.test(value)) {
      var factualSuffix = value.match(/[；;](参数逻辑[:：][\s\S]+)$/);
      if (!factualSuffix) return '';
      value = stripCourseScaffolding(factualSuffix[1]);
    }
    return value;
  }

  function normalizeParameters(parameters, legacy) {
    if (legacy) {
      if (!Array.isArray(parameters)) return [];
      return parameters.map(function (setting) {
        var value = normalizeLegacySetting(setting);
        return { name: '参数线索', value: value, direction: '', evidence: inferEvidence(value)[0] || '' };
      }).filter(function (parameter) { return parameter.value !== ''; });
    }
    if (Array.isArray(parameters)) return parameters.filter(function (parameter) {
      return cleanText(parameter && parameter.value) || cleanText(parameter && parameter.direction);
    }).map(function (parameter) { return normalizeParameter(parameter, '参数'); });
    if (parameters && typeof parameters === 'object') {
      return Object.keys(parameters).map(function (name) { return normalizeParameter(parameters[name], name); }).filter(function (parameter) {
        return parameter.value || parameter.direction;
      });
    }
    return [];
  }

  function listText(value) {
    if (!Array.isArray(value)) return value == null ? [] : [cleanText(value)].filter(Boolean);
    return value.map(function (item) { return cleanText(typeof item === 'object' ? item.name || item.title || JSON.stringify(item) : item); }).filter(Boolean);
  }

  function normalizeStepIndex(value) {
    if (Number.isInteger(value)) return value;
    if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value);
    return -1;
  }

  function makeUse(record, input, legacy, pluginIndex) {
    var name = cleanText(input && input.name);
    var stepIndex = normalizeStepIndex(input && (input.stepIndex != null ? input.stepIndex : input.step));
    var step = stepIndex >= 0 ? (record.steps || [])[stepIndex] : null;
    var replacementIndexes = Array.isArray(input && input.replacesPluginIndexes) ? input.replacesPluginIndexes.filter(function (index) { return Number.isInteger(index) && index >= 0; }) : [];
    var generatedId = String(record.id) + ':effect:' + effectSlug(name) + ':' + (pluginIndex + 1);
    var explicitFallbackId = String(record.id) + ':effect:' + effectSlug(name) + ':explicit-' + (pluginIndex + 1);
    var normalizedParameters = normalizeParameters(input && (input.parameters != null ? input.parameters : input.settings), legacy);
    var evidenceParts = [];
    [input && input.evidence, input && input.purpose, input && input.result, input && input.limitations, input && input.notes, input && input.settings].forEach(function (value) {
      collectEvidenceText(value, evidenceParts);
    });
    normalizedParameters.forEach(function (parameter) {
      evidenceParts.push(parameter.evidence, parameter.value);
    });
    var use = {
      id: legacy ? generatedId : (input && typeof input.id === 'string' && input.id.trim() ? input.id : explicitFallbackId),
      name: name,
      vendor: cleanText(input && input.vendor),
      category: classifyEffectUse(input),
      target: stripCourseScaffolding(input && input.target),
      chainPosition: stripCourseScaffolding(input && input.chainPosition != null ? input.chainPosition : legacy ? pluginIndex + 1 : ''),
      purpose: stripCourseScaffolding(input && input.purpose),
      parameters: normalizedParameters,
      result: stripCourseScaffolding(input && input.result),
      interactions: stripCourseScaffolding(input && input.interactions),
      limitations: stripCourseScaffolding(input && input.limitations),
      timestamp: cleanText(input && input.timestamp),
      stepIndex: stepIndex,
      screenshotKey: cleanText(input && input.screenshotKey) || cleanText(step && step.imageKey),
      evidence: inferEvidence(evidenceParts.join(' ')),
      sourceRecordId: record.id === undefined ? '' : record.id,
      sourceVideoId: cleanText(record.sourceVideoId || record.videoId),
      sourceTitle: cleanText(record.title),
      source: typeof record.source === 'string' ? record.source : '',
      sourceKeywords: uniqueFacts(record.keywords),
      sourcePluginIndexes: legacy ? [pluginIndex] : replacementIndexes,
      legacy: Boolean(legacy)
    };
    return use;
  }

  function buildEffectUses(records) {
    if (!Array.isArray(records)) return [];
    return records.reduce(function (all, record) {
      record = record || {};
      var explicit = Array.isArray(record.effectUses) ? record.effectUses.filter(function (use) {
        return use && typeof use === 'object' && !Array.isArray(use);
      }) : [];
      var plugins = Array.isArray(record.plugins) ? record.plugins : [];
      var replaced = new Set();
      explicit.forEach(function (use) {
        (Array.isArray(use.replacesPluginIndexes) ? use.replacesPluginIndexes : []).forEach(function (index) {
          if (Number.isInteger(index) && index >= 0) replaced.add(index);
        });
      });
      explicit.forEach(function (use, index) { all.push(makeUse(record, use, false, index)); });
      plugins.forEach(function (plugin, index) {
        if (!replaced.has(index)) all.push(makeUse(record, plugin || {}, true, index));
      });
      return all;
    }, []);
  }

  function searchableRecordText(record, categoryLabel) {
    var values = [];
    var fields = ['title', 'source', 'addedAt', 'updatedAt', 'updateNote', 'summary', 'keywords', 'materials', 'coreIdeas', 'chainFocus', 'parameterLogic', 'tips', 'plugins', 'steps', 'effectUses'];
    function collect(value) {
      if (value == null) return;
      if (typeof value === 'string' || typeof value === 'number') values.push(stripCourseScaffolding(value).toLowerCase());
      else if (Array.isArray(value)) value.forEach(collect);
      else if (typeof value === 'object') Object.keys(value).forEach(function (key) { if (key !== 'practiceChecklist') collect(value[key]); });
    }
    (record && typeof record === 'object' ? fields : []).forEach(function (field) { collect(record[field]); });
    collect(categoryLabel);
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
    isGeneratedStepScaffolding: isGeneratedStepScaffolding,
    searchableRecordText: searchableRecordText,
    stripCourseScaffolding: stripCourseScaffolding,
    uniqueFacts: uniqueFacts
  };
}));
