const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const SfxKnowledgeModel = require('../src/knowledge-model.js');
const SfxEffectGuides = require('../src/effect-guides.js');

function extractTagById(id) {
  const match = indexHtml.match(new RegExp(`<[^>]+\\bid="${id}"(?=\\s|>)[^>]*>`, 'i'));
  assert.ok(match, `missing tag with id ${id}`);
  return match[0];
}

function extractButtonByMode(markup, mode) {
  const match = markup.match(new RegExp(`<button\\b(?=[^>]*\\bdata-mode="${mode}"(?=\\s|>))[^>]*>[^<]*<\\/button>`, 'i'));
  assert.ok(match, `missing ${mode} mode button in view switch`);
  return match[0];
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`(?:^|\\s)${name}="([^"]*)"`, 'i'));
  assert.ok(match, `missing ${name} attribute in ${tag}`);
  return match[1];
}

function hasBooleanAttribute(tag, name) {
  return new RegExp(`(?:^|\\s)${name}(?:\\s|=|>)`, 'i').test(tag);
}

function loadDualIndexNavigation() {
  const start = indexHtml.indexOf('    const DualIndexNavigation = (() => {');
  const end = indexHtml.indexOf('    })();', start);
  assert.notEqual(start, -1, 'missing DualIndexNavigation helpers');
  assert.notEqual(end, -1, 'unterminated DualIndexNavigation helpers');
  const source = indexHtml.slice(start, end + '    })();'.length) + '\nthis.DualIndexNavigation = DualIndexNavigation;';
  const context = { URLSearchParams };
  vm.runInNewContext(source, context);
  return context.DualIndexNavigation;
}

function loadVideoDetailData() {
  const start = indexHtml.indexOf('    const VideoDetailData = (() => {');
  const end = indexHtml.indexOf('    })();', start);
  assert.notEqual(start, -1, 'missing VideoDetailData helpers');
  assert.notEqual(end, -1, 'unterminated VideoDetailData helpers');
  const source = indexHtml.slice(start, end + '    })();'.length) + '\nthis.VideoDetailData = VideoDetailData;';
  const context = { SfxKnowledgeModel };
  vm.runInNewContext(source, context);
  return context.VideoDetailData;
}

const permissiveEffectGuides = {
  guideFor(name, uses) {
    const evidenceUse = uses && uses[0];
    return evidenceUse ? {
      canonicalName: name,
      evidenceUseId: evidenceUse.id,
      input: '明确的输入素材',
      action: '明确的处理动作',
      result: '明确的听感变化'
    } : null;
  }
};

function loadEffectIndexData(effectGuides = permissiveEffectGuides) {
  const start = indexHtml.indexOf('    const EffectIndexData = (() => {');
  const end = indexHtml.indexOf('    })();', start);
  assert.notEqual(start, -1, 'missing EffectIndexData helpers');
  assert.notEqual(end, -1, 'unterminated EffectIndexData helpers');
  const source = indexHtml.slice(start, end + '    })();'.length) + '\nthis.EffectIndexData = EffectIndexData;';
  const context = { SfxKnowledgeModel, SfxEffectGuides: effectGuides };
  vm.runInNewContext(source, context);
  return context.EffectIndexData;
}

function plainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function records() {
  const prefix = '    const records = ';
  const start = indexHtml.indexOf(prefix);
  const end = indexHtml.indexOf('    const imageManifest', start);
  assert.notEqual(start, -1, 'missing records JSON');
  assert.notEqual(end, -1, 'missing records JSON boundary');
  return JSON.parse(indexHtml.slice(start + prefix.length, end).trim().replace(/;$/, ''));
}

test('loads the shared knowledge model and effect guides before the inline application data', () => {
  const modelTag = indexHtml.match(/<script src="src\/knowledge-model\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const guideTag = indexHtml.match(/<script src="src\/effect-guides\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const modelScript = indexHtml.indexOf(modelTag);
  const guideScript = indexHtml.indexOf(guideTag);
  const inlineCategories = indexHtml.indexOf('const categories = [');

  assert.ok(modelTag, 'knowledge model script must be cache-versioned');
  assert.ok(guideTag, 'effect guide script must be cache-versioned');
  assert.ok(modelScript < guideScript, 'effect guides must load after the knowledge model');
  assert.ok(guideScript < inlineCategories, 'effect guides must load before inline application data');
});

test('exposes accessible video and effect index modes', () => {
  const viewSwitch = extractTagById('viewSwitch');
  const viewSwitchMarkup = indexHtml.match(/<div\b[^>]*\bid="viewSwitch"(?=\s|>)[^>]*>[\s\S]*?<\/div>/i)?.[0] || '';
  const videosTab = extractButtonByMode(viewSwitchMarkup, 'videos');
  const effectsTab = extractButtonByMode(viewSwitchMarkup, 'effects');
  const videoPanel = extractTagById('videoLibrary');
  const effectsPanel = extractTagById('effectLibrary');

  assert.equal(attribute(viewSwitch, 'role'), 'tablist');
  assert.equal(attribute(videosTab, 'id'), 'videosModeTab');
  assert.equal(attribute(videosTab, 'role'), 'tab');
  assert.equal(attribute(videosTab, 'aria-controls'), 'videoLibrary');
  assert.equal(attribute(videosTab, 'aria-selected'), 'true');
  assert.equal(attribute(effectsTab, 'id'), 'effectsModeTab');
  assert.equal(attribute(effectsTab, 'role'), 'tab');
  assert.equal(attribute(effectsTab, 'aria-controls'), 'effectLibrary');
  assert.equal(attribute(effectsTab, 'aria-selected'), 'false');
  assert.equal(attribute(effectsTab, 'tabindex'), '-1');
  assert.equal(attribute(videoPanel, 'role'), 'tabpanel');
  assert.equal(attribute(videoPanel, 'aria-labelledby'), 'videosModeTab');
  assert.equal(attribute(effectsPanel, 'role'), 'tabpanel');
  assert.equal(attribute(effectsPanel, 'aria-labelledby'), 'effectsModeTab');
  assert.ok(hasBooleanAttribute(effectsPanel, 'hidden'));
});

test('provides a minimal effect index toolbar and render target', () => {
  ['search', 'sourceFilter', 'effectResultCount', 'effectList'].forEach((id) => {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  });
  assert.doesNotMatch(indexHtml, /id="effectCategoryFilter"/);
  assert.doesNotMatch(indexHtml, /id="effectEvidenceFilter"/);
});

test('removes course-oriented shell copy', () => {
  assert.doesNotMatch(indexHtml, /沉浸式学习模式/);
  assert.doesNotMatch(indexHtml, /学习时间：最新优先/);
});

test('builds and renders screenshot-backed effect profiles', () => {
  [
    'SfxKnowledgeModel.buildEffectUses(records)',
    'function filteredEffectUses()',
    'function renderEffectLibrary()',
    'function renderEffectDetail(effectId)',
    'EffectIndexData.profiles(',
    'EffectIndexData.profileForUse(',
    'use.sourceKeywords',
    'strictCanonicalName(use?.name, catalog)'
  ].forEach((source) => assert.ok(indexHtml.includes(source), `missing ${source}`));
  const navigation = loadDualIndexNavigation();
  const hash = navigation.serializeHashRoute({ video: 'video-1', origin: 'effects' });
  assert.equal(hash, '#video=video-1&origin=effects');
  assert.deepEqual(plainValue(navigation.parseHashRouteHash(hash)), { video: 'video-1', effect: '', view: '', origin: 'effects' });
});

test('effect search filters strict profiles without changing screenshot ownership', () => {
  const useFilter = indexHtml.match(/function filteredEffectUses\(\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  const renderer = indexHtml.match(/function renderEffectLibrary\(\) \{([\s\S]*?)\r?\n    \}\r?\n\r?\n    function renderTabs/)?.[1] || '';

  assert.doesNotMatch(useFilter, /state\.query|effectSearchable/);
  assert.match(renderer, /const allProfiles = EffectIndexData\.profiles\(effectUses, records, pluginReferenceCatalog, imageManifest\)/);
  assert.match(renderer, /const profiles = allProfiles[\s\S]*?\.filter\(\(profile\) => !query/);
  assert.match(renderer, /effectProfileSearchable\(profile\)/);
  assert.ok(renderer.indexOf('EffectIndexData.profiles') < renderer.indexOf('effectProfileSearchable(profile)'));
});

test('effect source filtering hides global profiles without recalculating screenshot ownership', () => {
  const renderer = indexHtml.match(/function renderEffectLibrary\(\) \{([\s\S]*?)\r?\n    \}\r?\n\r?\n    function renderTabs/)?.[1] || '';
  const sourceMatcher = indexHtml.match(/function effectProfileMatchesSource\(profile\) \{([\s\S]*?)\r?\n    \}/)?.[1] || '';

  assert.match(renderer, /EffectIndexData\.profiles\(effectUses, records, pluginReferenceCatalog, imageManifest\)/);
  assert.doesNotMatch(renderer, /EffectIndexData\.profiles\(list,/);
  assert.match(renderer, /effectProfileMatchesSource\(profile\)/);
  assert.match(sourceMatcher, /profile\.uses\.some\(\(use\) => use\.source === state\.source\)/);
  assert.ok(renderer.indexOf('EffectIndexData.profiles(effectUses') < renderer.indexOf('effectProfileMatchesSource(profile)'));
});

test('missing guides hide profiles even when an exact official image is available', () => {
  const effectIndexData = loadEffectIndexData({ guideFor() { return null; } });
  const use = {
    id: 'use-1',
    name: 'Test Effect',
    category: 'dynamic',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const catalog = [{
    title: 'Test Effect',
    aliases: ['Test Effect'],
    preview: 'official-preview.webp',
    full: 'official-full.webp'
  }];

  assert.equal(effectIndexData.profileForUse(use, [use], [], catalog, {}), null);
});

test('effect profiles require guide input, action, and result', async (t) => {
  const use = {
    id: 'use-1',
    name: 'Test Effect',
    category: 'dynamic',
    screenshotKey: 'test-shot',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const testRecords = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Test Effect shaping', imageKey: 'test-shot' }]
  }];
  const manifest = { 'test-shot': { preview: 'test-preview.webp', full: 'test-full.webp' } };
  const completeGuide = {
    canonicalName: 'Test Effect',
    evidenceUseId: 'use-1',
    input: '单薄的测试冲击素材',
    action: '重塑起音并收紧持续段',
    result: '起音更集中，尾部更短'
  };

  for (const field of ['input', 'action', 'result']) {
    await t.test(`missing ${field}`, () => {
      const guide = { ...completeGuide };
      delete guide[field];
      const effectIndexData = loadEffectIndexData({ guideFor() { return guide; } });

      assert.equal(effectIndexData.profileForUse(use, [use], testRecords, [], manifest), null);
    });
  }
});

test('effect profiles require the guide evidence use to exist in the grouped uses', () => {
  const effectIndexData = loadEffectIndexData({
    guideFor() {
      return {
        canonicalName: 'Test Effect',
        evidenceUseId: 'missing-use',
        input: '单薄的测试冲击素材',
        action: '重塑起音并收紧持续段',
        result: '起音更集中，尾部更短'
      };
    }
  });
  const use = {
    id: 'use-1',
    name: 'Test Effect',
    screenshotKey: 'test-shot',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const testRecords = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Test Effect shaping', imageKey: 'test-shot' }]
  }];
  const manifest = { 'test-shot': { preview: 'test-preview.webp', full: 'test-full.webp' } };

  assert.equal(effectIndexData.profileForUse(use, [use], testRecords, [], manifest), null);
});

test('official-only profiles stay hidden without a strict evidence video screenshot', () => {
  const effectIndexData = loadEffectIndexData({
    guideFor() {
      return {
        canonicalName: 'Test Effect',
        evidenceUseId: 'use-1',
        input: '单薄的测试冲击素材',
        action: '重塑起音并收紧持续段',
        result: '起音更集中，尾部更短'
      };
    }
  });
  const use = {
    id: 'use-1',
    name: 'Test Effect',
    category: 'dynamic',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const catalog = [{
    title: 'Test Effect',
    aliases: ['Test Effect'],
    preview: 'official-preview.webp',
    full: 'official-full.webp'
  }];

  assert.equal(effectIndexData.profileForUse(use, [use], [], catalog, {}), null);
});

test('complete guides publish only evidence-led copy with the evidence video first', () => {
  const guides = {
    guideFor() {
      return {
        canonicalName: 'Test Effect',
        evidenceUseId: 'use-1',
        input: '单薄的测试冲击素材',
        action: '重塑起音并收紧持续段',
        result: '起音更集中，尾部更短'
      };
    }
  };
  const effectIndexData = loadEffectIndexData(guides);
  const uses = [1, 2, 3].map((number) => ({
    id: `use-${number}`,
    name: 'Test Effect',
    category: 'dynamic',
    screenshotKey: `shot-${number}`,
    sourceRecordId: `record-${number}`,
    sourceTitle: `Video ${number}`,
    source: 'Test',
    legacy: false
  }));
  const testRecords = [1, 2, 3].map((number) => ({
    id: `record-${number}`,
    title: `Video ${number}`,
    url: `https://example.com/${number}`,
    steps: [{ order: number, name: `Test Effect case ${number}`, imageKey: `shot-${number}` }]
  }));
  const manifest = Object.fromEntries([1, 2, 3].map((number) => [
    `shot-${number}`,
    { preview: `shot-${number}-preview.webp`, full: `shot-${number}-full.webp` }
  ]));
  const catalog = [{
    title: 'Test Effect',
    aliases: ['Test Effect'],
    preview: 'official-preview.webp',
    full: 'official-full.webp',
    source: 'https://example.com/official'
  }];

  const profile = plainValue(effectIndexData.profileForUse(uses[2], uses, testRecords, catalog, manifest));

  assert.equal(profile.id, guides.guideFor().evidenceUseId);
  assert.equal(profile.evidenceUseId, guides.guideFor().evidenceUseId);
  assert.equal(profile.input, guides.guideFor().input);
  assert.equal(profile.action, guides.guideFor().action);
  assert.equal(profile.result, guides.guideFor().result);
  ['suitable', 'purpose', 'outcome', 'limitation'].forEach((field) => {
    assert.equal(Object.prototype.hasOwnProperty.call(profile, field), false, field);
  });
  assert.equal(profile.visuals[0].kind, 'video');
  assert.equal(profile.visuals[0].useId, profile.evidenceUseId);
  assert.equal(profile.visuals.length, 3);
  assert.deepEqual(profile.visuals.map((visual) => visual.useId), ['use-1', 'use-2', 'use-3']);
  assert.ok(profile.visuals.every((visual) => visual.kind === 'video'));
  assert.doesNotMatch(JSON.stringify(profile), /parameterValues|parameters/);
});

test('effect profiles ignore screenshots matched only by generated chain scaffolding', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'generated-chain-use',
    name: 'Test Effect',
    category: '未分类',
    target: '',
    purpose: 'Give the source a different identity.',
    result: '',
    screenshotKey: '',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: true
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{
      order: 1,
      name: 'Unrelated ambience edit',
      detail: '本条的主要链路可以按 Test Effect -> Reverb 来读：这是自动生成的通用链路说明。',
      params: ['链路参考：Test Effect'],
      imageKey: 'unrelated-shot'
    }]
  }];
  const manifest = { 'unrelated-shot': { preview: 'unrelated-preview.webp', full: 'unrelated-full.webp' } };

  assert.equal(effectIndexData.profileForUse(use, [use], records, [], manifest), null);
});

test('product profiles do not claim screenshots from generic effect mentions', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'vocoder-use',
    name: 'Ableton Vocoder',
    category: '音高与频率',
    target: '',
    purpose: 'Give the source a synthetic identity.',
    result: '',
    screenshotKey: '',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: true
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{
      order: 1,
      name: 'Add electronic motion',
      detail: 'Use pitch, filter, ring modulation, vocoder, FM, grain, or tremolo to create motion.',
      imageKey: 'generic-motion-shot'
    }]
  }];
  const manifest = { 'generic-motion-shot': { preview: 'generic-preview.webp', full: 'generic-full.webp' } };

  assert.equal(effectIndexData.profileForUse(use, [use], records, [], manifest), null);
});

test('effect profiles omit uncertain entries without a reliable screenshot', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'missing-shot',
    name: 'Unverified Processor',
    category: 'unclassified',
    target: '',
    purpose: 'Unverified legacy note.',
    result: '',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const records = [{ id: 'record-1', title: 'Video 1', steps: [{ order: 1, name: 'Unrelated editing', imageKey: 'unrelated' }] }];

  assert.equal(effectIndexData.profileForUse(use, [use], records, [], {}), null);
  assert.deepEqual(plainValue(effectIndexData.profiles([
    use,
    { ...use, id: 'placeholder', name: '未确认插件链' }
  ], records, [], {})), []);
});

test('effect profiles reject composite chain names instead of borrowing component images', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'composite-use',
    name: 'Soundtoys Decapitator / Devil-Loc',
    category: 'saturation',
    purpose: 'Add density and movement.',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const catalog = [
    { title: 'Soundtoys Decapitator', aliases: ['Decapitator'], preview: 'decapitator.webp' },
    { title: 'Soundtoys Devil-Loc', aliases: ['Devil-Loc'], preview: 'devil-loc.webp' }
  ];

  assert.equal(effectIndexData.profileForUse(use, [use], [], catalog, {}), null);
  assert.deepEqual(plainValue(effectIndexData.referenceCandidates(use.name, catalog)), []);
});

test('effect profiles reject natural-language composite names', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'natural-composite-use',
    name: 'Alpha FX and Beta FX',
    category: 'chain',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const catalog = [{
    title: 'Alpha FX and Beta FX',
    aliases: [],
    preview: 'composite.webp',
    full: 'composite-full.webp'
  }];

  assert.equal(effectIndexData.profileForUse(use, [use], [], catalog, {}), null);
  assert.deepEqual(plainValue(effectIndexData.referenceCandidates(use.name, catalog)), []);
});

test('effect profiles never infer a screenshot from the step detail', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'detail-only-use',
    name: 'Oxford Inflator Native',
    category: 'saturation',
    purpose: 'Add density.',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: true
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{
      order: 1,
      name: 'Automate Frequency Shifter movement',
      detail: 'Oxford Inflator Native is used later in the chain.',
      imageKey: 'frequency-shifter-shot'
    }]
  }];
  const manifest = {
    'frequency-shifter-shot': { preview: 'frequency.webp', full: 'frequency-full.webp' }
  };

  assert.equal(effectIndexData.profileForUse(use, [use], records, [], manifest), null);
});

test('effect profiles reject ambiguous step titles that name several processors', () => {
  const effectIndexData = loadEffectIndexData();
  const uses = [
    {
      id: 'ambiguous-step-use',
      name: 'Wave Warper',
      category: 'modulation',
      purpose: 'Add movement.',
      sourceRecordId: 'record-1',
      sourceTitle: 'Video 1',
      legacy: true
    },
    {
      id: 'filterfreak-use',
      name: 'FilterFreak',
      category: 'modulation',
      purpose: 'Filter the source.',
      sourceRecordId: 'record-1',
      sourceTitle: 'Video 1',
      legacy: true
    }
  ];
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{
      order: 1,
      name: 'FilterFreak + Wave Warper movement',
      imageKey: 'ambiguous-shot'
    }]
  }];
  const manifest = {
    'ambiguous-shot': { preview: 'ambiguous.webp', full: 'ambiguous-full.webp' }
  };

  assert.equal(effectIndexData.profileForUse(uses[0], uses, records, [], manifest), null);
});

test('single-product titles may mention internal controls with separators', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'shade-use',
    name: 'UVI Shade',
    category: 'modulation',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: true
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Shade uses tremolo + follower', imageKey: 'shade-shot' }]
  }];
  const catalog = [{
    title: 'UVI Shade',
    aliases: ['Shade'],
    preview: 'shade-official.webp',
    full: 'shade-official-full.webp'
  }];
  const manifest = {
    'shade-shot': { preview: 'shade.webp', full: 'shade-full.webp' }
  };

  const profile = plainValue(effectIndexData.profileForUse(use, [use], records, catalog, manifest));
  assert.equal(profile.visuals[0].kind, 'video');
  assert.equal(profile.visuals[0].imageKey, 'shade-shot');
});

test('effect aliases require token boundaries instead of matching inside words', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'rift-use',
    name: 'Rift',
    category: 'distortion',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: true
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Drifting pitch texture', imageKey: 'drifting-shot' }]
  }];
  const manifest = {
    'drifting-shot': { preview: 'drifting.webp', full: 'drifting-full.webp' }
  };

  assert.equal(effectIndexData.profileForUse(use, [use], records, [], manifest), null);
});

test('one inferred video screenshot cannot belong to two effect identities', () => {
  const effectIndexData = loadEffectIndexData();
  const uses = [
    {
      id: 'serum-sampler-use',
      name: 'Serum sampler',
      category: 'synthesis',
      sourceRecordId: 'record-1',
      sourceTitle: 'Video 1',
      legacy: true
    },
    {
      id: 'serum-use',
      name: 'Xfer Serum 2',
      category: 'synthesis',
      sourceRecordId: 'record-1',
      sourceTitle: 'Video 1',
      legacy: true
    }
  ];
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Serum sampler source', imageKey: 'serum-shot' }]
  }];
  const catalog = [{
    title: 'Xfer Serum 2',
    aliases: ['Xfer Serum', 'Serum'],
    preview: 'serum-official.webp',
    full: 'serum-official-full.webp'
  }];
  const manifest = {
    'serum-shot': { preview: 'serum-shot.webp', full: 'serum-shot-full.webp' }
  };

  const profiles = plainValue(effectIndexData.profiles(uses, records, catalog, manifest));
  assert.deepEqual(profiles, []);
});

test('one video asset cannot belong to two products through different step titles', () => {
  const effectIndexData = loadEffectIndexData();
  const uses = [
    {
      id: 'alpha-use',
      name: 'Alpha FX',
      category: 'modulation',
      sourceRecordId: 'record-1',
      sourceTitle: 'Video 1',
      legacy: true
    },
    {
      id: 'beta-use',
      name: 'Beta FX',
      category: 'modulation',
      sourceRecordId: 'record-2',
      sourceTitle: 'Video 2',
      legacy: true
    }
  ];
  const records = [
    { id: 'record-1', title: 'Video 1', steps: [{ order: 1, name: 'Alpha FX motion', imageKey: 'shared-shot' }] },
    { id: 'record-2', title: 'Video 2', steps: [{ order: 1, name: 'Beta FX motion', imageKey: 'shared-shot' }] }
  ];
  const catalog = [
    { title: 'Alpha FX', aliases: [], preview: 'alpha-official.webp', full: 'alpha-official-full.webp' },
    { title: 'Beta FX', aliases: [], preview: 'beta-official.webp', full: 'beta-official-full.webp' }
  ];
  const manifest = {
    'shared-shot': { preview: 'shared.webp', full: 'shared-full.webp' }
  };

  const profiles = plainValue(effectIndexData.profiles(uses, records, catalog, manifest));
  assert.deepEqual(profiles, []);
});

test('official-only profiles stay hidden even for one exact product identity', () => {
  const effectIndexData = loadEffectIndexData();
  const catalog = [
    {
      title: 'Soundtoys PhaseMistress',
      aliases: ['Phase Mistress (Soundtoys)'],
      preview: 'phase-mistress.webp',
      full: 'phase-mistress-full.webp'
    },
    {
      title: 'Kilohearts Transient Shaper',
      aliases: ['Transient Shaper'],
      preview: 'transient.webp',
      full: 'transient-full.webp'
    }
  ];
  const phaseUse = {
    id: 'phase-use',
    name: 'Phase Mistress(Soundtoys)',
    category: 'modulation',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const genericUse = {
    id: 'generic-use',
    name: 'Transient Shaper',
    category: 'dynamic',
    sourceRecordId: 'record-2',
    sourceTitle: 'Video 2'
  };

  assert.equal(effectIndexData.profileForUse(phaseUse, [phaseUse], [], catalog, {}), null);
  assert.equal(effectIndexData.profileForUse(genericUse, [genericUse], [], catalog, {}), null);
});

test('explicit screenshots still require the step title to identify the effect', () => {
  const effectIndexData = loadEffectIndexData();
  const h3000Use = {
    id: 'h3000-use',
    name: 'H3000 Factory',
    category: 'pitch',
    screenshotKey: 'generic-daw-shot',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const vocoderUse = {
    id: 'vocoder-use',
    name: 'Ableton Vocoder',
    category: 'pitch',
    screenshotKey: 'vocoder-shot',
    sourceRecordId: 'record-2',
    sourceTitle: 'Video 2'
  };
  const records = [
    {
      id: 'record-1',
      title: 'Video 1',
      steps: [{ order: 1, name: 'Turn a plastic tube into a tonal source', imageKey: 'generic-daw-shot' }]
    },
    {
      id: 'record-2',
      title: 'Video 2',
      steps: [{ order: 1, name: 'Configure two Ableton Vocoder instances', imageKey: 'vocoder-shot' }]
    }
  ];
  const manifest = {
    'generic-daw-shot': { preview: 'generic.webp', full: 'generic-full.webp' },
    'vocoder-shot': { preview: 'vocoder.webp', full: 'vocoder-full.webp' }
  };

  assert.equal(effectIndexData.profileForUse(h3000Use, [h3000Use], records, [], manifest), null);
  const vocoderProfile = plainValue(effectIndexData.profileForUse(vocoderUse, [vocoderUse], records, [], manifest));
  assert.equal(vocoderProfile.visuals[0].imageKey, 'vocoder-shot');
});

test('explicit screenshots reject generic titles that do not identify the product', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'vocoder-use',
    name: 'Ableton Vocoder',
    category: 'pitch',
    screenshotKey: 'vocoder-shot',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1'
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Configure two Vocoder instances', imageKey: 'vocoder-shot' }]
  }];
  const manifest = {
    'vocoder-shot': { preview: 'vocoder.webp', full: 'vocoder-full.webp' }
  };

  assert.equal(effectIndexData.profileForUse(use, [use], records, [], manifest), null);
});

test('generic effect-type names stay hidden even when the screenshot title repeats them', () => {
  const effectIndexData = loadEffectIndexData();
  ['Stereo Imager', 'Tape Saturation', 'Bitcrusher', 'De-esser', 'Noise Gate', 'Convolution Reverb'].forEach((name, index) => {
    const key = 'generic-shot-' + index;
    const recordId = 'record-' + index;
    const use = {
      id: 'generic-use-' + index,
      name,
      category: 'processing',
      screenshotKey: key,
      sourceRecordId: recordId,
      sourceTitle: 'Video ' + index
    };
    const records = [{
      id: recordId,
      title: 'Video ' + index,
      steps: [{ order: 1, name: name + ' automation', imageKey: key }]
    }];
    const manifest = {
      [key]: { preview: key + '.webp', full: key + '-full.webp' }
    };

    assert.equal(effectIndexData.profileForUse(use, [use], records, [], manifest), null, name);
  });
});

test('audited generic shorthand can resolve to one concrete product identity', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'wave-shifter-use',
    name: 'Minimal Audio Wave Shifter',
    category: 'modulation',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: true
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Wave Shifter makes bubbly motion', imageKey: 'wave-shifter-shot' }]
  }];
  const manifest = {
    'wave-shifter-shot': { preview: 'wave-shifter.webp', full: 'wave-shifter-full.webp' }
  };

  const profile = plainValue(effectIndexData.profileForUse(use, [use], records, [], manifest));
  assert.equal(profile.name, 'Minimal Audio Wave Shifter');
  assert.equal(profile.visuals[0].kind, 'video');
});

test('successor reference aliases cannot rename an older plugin version', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'proq3-use',
    name: 'FabFilter Pro-Q 3',
    category: 'eq',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: true
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Use Pro-Q 3 for local tone shaping', imageKey: 'proq3-shot' }]
  }];
  const catalog = [{
    title: 'FabFilter Pro-Q 4',
    aliases: ['FabFilter Pro-Q 3', 'Pro-Q 3', 'Pro-Q 4'],
    preview: 'proq4.webp',
    full: 'proq4-full.webp'
  }];
  const manifest = {
    'proq3-shot': { preview: 'proq3.webp', full: 'proq3-full.webp' }
  };

  const profile = plainValue(effectIndexData.profileForUse(use, [use], records, catalog, manifest));
  assert.equal(profile.name, 'FabFilter Pro-Q 3');
  assert.deepEqual(profile.visuals.map((visual) => visual.kind), ['video']);
  assert.equal(profile.visuals[0].imageKey, 'proq3-shot');
});

test('audited video frames that do not show the named effect stay hidden', () => {
  const effectIndexData = loadEffectIndexData();
  const rejectedUses = [
    {
      id: 'love-use',
      name: 'Love',
      sourceRecordId: 'record-1',
      sourceTitle: 'Video 1',
      screenshotKey: 'deep-HsFlJ_UJyxs-01-aa4f8dfdbc'
    },
    {
      id: 'wwise-use',
      name: 'Wwise',
      sourceRecordId: 'record-2',
      sourceTitle: 'Video 2',
      screenshotKey: 'img_f9466a775baa4fe1'
    },
    {
      id: 'blackhole-use',
      name: 'Eventide Blackhole',
      sourceRecordId: 'record-3',
      sourceTitle: 'Video 3',
      screenshotKey: 'deep-26TcO5_3pxo-02-5dc4c18e58'
    },
    {
      id: 'cataract-use',
      name: 'Glitchmachines Cataract',
      sourceRecordId: 'record-4',
      sourceTitle: 'Video 4',
      screenshotKey: 'deep-Pvkfc32V8Mo-03-6d71ed3339'
    },
    {
      id: 'disperser-use',
      name: 'Kilohearts Disperser',
      sourceRecordId: 'record-5',
      sourceTitle: 'Video 5',
      screenshotKey: 'deep-6oJUotZGz0k-03-08cc14832b'
    },
    {
      id: 'stereo-focus-use',
      name: 'Acme Stereo Focus',
      sourceRecordId: 'record-6',
      sourceTitle: 'Video 6',
      screenshotKey: 'img_ec02e77a2eac06d9'
    }
  ];
  const records = [
    {
      id: 'record-1',
      title: 'Video 1',
      steps: [{ order: 1, name: 'Love creates ping-pong movement', imageKey: 'deep-HsFlJ_UJyxs-01-aa4f8dfdbc' }]
    },
    {
      id: 'record-2',
      title: 'Video 2',
      steps: [{ order: 1, name: 'Work in Wwise', imageKey: 'img_f9466a775baa4fe1' }]
    },
    {
      id: 'record-3',
      title: 'Video 3',
      steps: [{ order: 1, name: 'Eventide Blackhole tail', imageKey: 'deep-26TcO5_3pxo-02-5dc4c18e58' }]
    },
    {
      id: 'record-4',
      title: 'Video 4',
      steps: [{ order: 1, name: 'Glitchmachines Cataract edit', imageKey: 'deep-Pvkfc32V8Mo-03-6d71ed3339' }]
    },
    {
      id: 'record-5',
      title: 'Video 5',
      steps: [{ order: 1, name: 'Kilohearts Disperser layer', imageKey: 'deep-6oJUotZGz0k-03-08cc14832b' }]
    },
    {
      id: 'record-6',
      title: 'Video 6',
      steps: [{ order: 1, name: 'Acme Stereo Focus automation', imageKey: 'img_ec02e77a2eac06d9' }]
    }
  ];
  const manifest = {
    'deep-HsFlJ_UJyxs-01-aa4f8dfdbc': { preview: 'love-daw.webp', full: 'love-daw-full.webp' },
    'img_f9466a775baa4fe1': { preview: 'wwise-daw.webp', full: 'wwise-daw-full.webp' },
    'deep-26TcO5_3pxo-02-5dc4c18e58': { preview: 'blackhole-daw.webp', full: 'blackhole-daw-full.webp' },
    'deep-Pvkfc32V8Mo-03-6d71ed3339': { preview: 'cataract-daw.webp', full: 'cataract-daw-full.webp' },
    'deep-6oJUotZGz0k-03-08cc14832b': { preview: 'disperser-host.webp', full: 'disperser-host-full.webp' },
    'img_ec02e77a2eac06d9': { preview: 'stereo-blur.webp', full: 'stereo-blur-full.webp' }
  };

  assert.deepEqual(plainValue(effectIndexData.profiles(rejectedUses, records, [], manifest)), []);
});

test('audited shorthand names resolve to one real product name', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'love-use',
    name: 'Love',
    category: 'modulation',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: true
  };
  const records = [{
    id: 'record-1',
    title: 'Video 1',
    steps: [{ order: 1, name: 'Love swarm granular', imageKey: 'deep-Vlhaimjv1Jw-03-207e173f97' }]
  }];
  const manifest = {
    'deep-Vlhaimjv1Jw-03-207e173f97': { preview: 'love.webp', full: 'love-full.webp' }
  };

  const profile = plainValue(effectIndexData.profileForUse(use, [use], records, [], manifest));
  assert.equal(profile.name, 'Dawesome Love');
  assert.equal(profile.visuals[0].imageKey, 'deep-Vlhaimjv1Jw-03-207e173f97');
});

test('supports stable video and effect hash routes', () => {
  assert.match(indexHtml, /function parseHashRoute\(\)/);
  assert.match(indexHtml, /params\.get\("video"\)/);
  assert.match(indexHtml, /params\.get\("effect"\)/);
  assert.match(indexHtml, /window\.addEventListener\("hashchange"/);
  assert.match(indexHtml, /state\.mode = route\.mode;\s+state\.returnMode = route\.returnMode;/);
  assert.match(indexHtml, /route\.target === "effect" \|\| route\.target === "invalidEffect"[\s\S]*?renderModeSwitch\(\);\s+openEffectDetail\(route\.id, false\)/);
  assert.match(indexHtml, /route\.target === "video" \|\| route\.target === "invalidVideo"[\s\S]*?renderModeSwitch\(\);\s+openVideoDetail\(route\.id, false\)/);
  const navigation = loadDualIndexNavigation();
  assert.deepEqual(plainValue(navigation.routeDecision('#video=video-1&origin=effects', { video: () => true })), {
    target: 'video', id: 'video-1', mode: 'videos', returnMode: 'effects'
  });
  assert.deepEqual(plainValue(navigation.routeDecision('#video=video-1', { video: () => true })), {
    target: 'video', id: 'video-1', mode: 'videos', returnMode: 'videos'
  });
  assert.deepEqual(plainValue(navigation.routeDecision('#effect=missing', { effect: () => false })), {
    target: 'invalidEffect', id: 'missing', mode: 'effects', returnMode: 'effects'
  });
  assert.deepEqual(plainValue(navigation.routeWriteIntent('#video=video-1', { view: 'videos' }, true)), {
    method: 'replace', hash: '#view=videos'
  });
  assert.deepEqual(plainValue(navigation.routeWriteIntent('#view=videos', { view: 'videos' })), {
    method: 'none', hash: '#view=videos'
  });
});

test('effect profile cards open aggregated uses and can return to a video', () => {
  ['effect-profile-card', 'data-effect-id', 'data-open-video', '查看完整视频案例', '适合用在', '主要作用', '听感结果'].forEach((source) => {
    assert.ok(indexHtml.includes(source), `missing ${source}`);
  });
  assert.match(indexHtml, /function openEffectDetail\(effectId, syncHash = false\) \{[\s\S]*?const use = effectUses\.find\(\(item\) => item\.id === effectId\);[\s\S]*?if \(!use\) \{\s+state\.activeEffectId = "";/);
  const libraryRenderer = indexHtml.match(/function renderEffectLibrary\(\) \{([\s\S]*?)\n    \}\n\n    function renderTabs/)?.[1] || '';
  assert.doesNotMatch(libraryRenderer, /effectParameterSummary|renderEvidenceLabels|effect-use-row|厂商|参数|链路位置/);
  const navigation = loadDualIndexNavigation();
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'ArrowLeft')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'ArrowRight')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'End')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('effects', 'Home')), { mode: 'videos', focusMode: 'videos' });
});

test('effect cards use stable responsive grids and the reader return control handles keyboard activation', () => {
  assert.match(indexHtml, /\.effect-list \{[\s\S]*?grid-template-columns: repeat\(auto-fill, minmax\(280px, 1fr\)\)/);
  assert.match(indexHtml, /@media \(max-width: 640px\) \{[\s\S]*?\.effect-list \{ grid-template-columns: 1fr; \}/);
  assert.match(indexHtml, /function focusLibraryModeTab\(\) \{[\s\S]*?requestAnimationFrame[\s\S]*?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(indexHtml, /function returnToLibrary\(\) \{[\s\S]*?writeHashRoute\(\{ view: state\.mode \}, true\);[\s\S]*?render\(\);[\s\S]*?focusLibraryModeTab\(\);/);
  assert.match(indexHtml, /function applyHashRoute\(\) \{[\s\S]*?const returningFromReader = state\.view === "reader";[\s\S]*?showLibrary\(\);\s*render\(\);\s*if \(returningFromReader\) focusLibraryModeTab\(\);/);
  assert.match(indexHtml, /backToLibraryEl\.addEventListener\("click", returnToLibrary\)/);
  assert.match(indexHtml, /backToLibraryEl\.addEventListener\("keydown", \(event\) => \{[\s\S]*?\["Enter", " "\]\.includes\(event\.key\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?returnToLibrary\(\);/);
  assert.match(indexHtml, /if \(event\.key === "Escape" && state\.view === "reader"\) \{\s*returnToLibrary\(\);\s*\}/);
});

test('video cards are keyboard links and move focus into the reader', () => {
  assert.match(indexHtml, /return '<a class="card [\s\S]*?href="#video=' \+ encodeURIComponent\(record\.id\)/);
  assert.match(indexHtml, /gridEl\.addEventListener\("click", \(event\) => \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?openVideoDetail\(card\.dataset\.id, true\);/);
  assert.match(indexHtml, /<h2 class="detail-title" tabindex="-1">/);
  assert.match(indexHtml, /function focusReaderHeading\(\) \{[\s\S]*?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(indexHtml, /function showReader\(\) \{[\s\S]*?focusReaderHeading\(\);/);
});

test('searches video records through the shared factual model only', () => {
  const searchableSource = indexHtml.match(/function searchable\(record\) \{([\s\S]*?)\n    \}/)?.[1] || '';

  assert.equal(searchableSource.trim(), 'return SfxKnowledgeModel.searchableRecordText(record, categoryById[record.category]?.label || "");');
  assert.doesNotMatch(searchableSource, /practiceChecklist/);
});

test('uses conservative shared cleaners for factual detail arrays', () => {
  assert.match(indexHtml, /function cleanedFacts\(items\) \{\s*return SfxKnowledgeModel\.uniqueFacts\(items\)\.filter\(Boolean\);\s*\}/);
  assert.match(indexHtml, /SfxKnowledgeModel\.stripCourseScaffolding/);
  const detailData = loadVideoDetailData();
  const projected = plainValue(detailData.project({
    chainFocus: ['链路事实 复习时先看每一步负责的声音角色，再看插件名称。'],
    parameterLogic: ['参数事实'],
    tips: ['决策事实'],
    updateNote: '更新元数据',
    coreIdeas: 'malformed',
    materials: null,
    keywords: {},
    steps: 'malformed',
    plugins: { malformed: true }
  }));

  assert.deepEqual(projected.chainFacts, ['链路事实']);
  assert.deepEqual(projected.decisionFacts, ['参数事实', '决策事实']);
  assert.equal(projected.updateNote, '更新元数据');
  assert.ok(!projected.decisionFacts.includes('更新元数据'));
  ['coreIdeas', 'materials', 'keywords', 'steps', 'plugins'].forEach((key) => assert.deepEqual(projected[key], []));
  assert.deepEqual(plainValue(detailData.effectUse({ plugins: null }, { parameters: 'malformed', sourcePluginIndexes: { bad: true } })), {
    plugins: [], parameters: [], sourcePluginIndexes: []
  });
  assert.deepEqual(plainValue(detailData.effectUse({ plugins: [null, { name: 'Valid' }] }, { sourcePluginIndexes: [-1, 0, 1, 2, '1'] }).sourcePluginIndexes), [0, 1]);
  assert.deepEqual(plainValue(detailData.effectUse({}, { parameters: [null, {}, 'malformed'] }).parameters), []);

  const stepProjection = plainValue(detailData.project({
    steps: [{
      order: 1,
      name: '自动模板',
      detail: '通用说明。本条的主要链路可以按 EQ -> Reverb 来读。视频证据：raw transcript',
      params: ['角色：自动模板', '链路参考：EQ -> Reverb'],
      imageKey: 'generated-image'
    }, {
      order: 2,
      name: '保留步骤',
      detail: '画面确认：作者先做减法 EQ。',
      params: ['分析推断练习：旁路并记录。', '2558.9 Hz，只属于当前帧。'],
      imageKey: 'factual-image'
    }]
  })).steps;
  assert.deepEqual(stepProjection, [{
    order: 1,
    name: '自动模板',
    detail: '',
    params: ['角色：自动模板', '链路参考：EQ -> Reverb'],
    imageKey: 'generated-image'
  }, {
    order: 2,
    name: '保留步骤',
    detail: '画面确认：作者先做减法 EQ。',
    params: ['2558.9 Hz，只属于当前帧。'],
    imageKey: 'factual-image'
  }]);

  const productionProjection = records().map((record) => detailData.project(record));
  assert.equal(
    productionProjection.reduce((total, record) => total + record.steps.length, 0),
    records().reduce((total, record) => total + record.steps.length, 0),
    'dry-goods projection must not delete complete video steps'
  );
  assert.doesNotMatch(
    JSON.stringify(productionProjection),
    /分析推断练习|迁移练习|练习优先使用|此分类是练习假设|弱\/中\/强三版|本条的主要链路可以按|视频证据：/
  );
});

test('renders a dry-goods archive with effect links and sources at the end', () => {
  const detailSource = indexHtml.match(/function renderDetail\(\) \{([\s\S]*?)\n    \}\n\n    function renderEffectDetail/)?.[1] || '';
  const requiredHeadings = ['设计目标', '设计思路', '素材与分层', '完整制作流程', '完整效果链', '效果器用法', '关键决策与证据边界', '来源与关键词'];
  const positions = requiredHeadings.map((heading) => detailSource.indexOf('<h3>' + heading + '</h3>'));

  assert.ok(positions.every((position) => position !== -1));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.ok(detailSource.indexOf('<h3>来源与关键词</h3>') < detailSource.indexOf('打开原视频'));
  assert.doesNotMatch(detailSource, /practiceChecklist|练习复盘|<span>学习/);
  assert.match(detailSource, /const chainHtml = detailData\.chainFacts/);
  assert.match(detailSource, /const decisionHtml = detailData\.decisionFacts/);
  assert.doesNotMatch(detailSource, /decisionFacts.*updateNote/);
  const effectSummarySource = indexHtml.match(/function renderEffectUseSummary\(record, use\) \{([\s\S]*?)\n    \}\n\n    function renderDetail/)?.[1] || '';
  assert.match(effectSummarySource, /EffectIndexData\.profileForUse/);
  assert.match(effectSummarySource, /const purpose = profile\.purpose;/);
  assert.doesNotMatch(effectSummarySource, /use\.purpose/);
  assert.match(effectSummarySource, /data-effect-id/);
  assert.match(effectSummarySource, /effect-summary-shot/);
  assert.doesNotMatch(effectSummarySource, /parameters|parameterHtml|renderEvidenceLabels|链路位置|参数/);
  const detailClick = indexHtml.match(/detailEl\.addEventListener\("click", \(event\) => \{([\s\S]*?)\n    \}\);/)?.[1] || '';
  assert.ok(detailClick.indexOf('[data-effect-id]') < detailClick.indexOf('[data-effect-image]'));
  assert.match(detailClick, /openEffectDetail\(effectButton\.dataset\.effectId, true\)/);

  const titlePosition = detailSource.indexOf('<h2 class="detail-title"');
  const goalPosition = detailSource.indexOf('<h3>设计目标</h3>');
  const ideasPosition = detailSource.indexOf('<h3>设计思路</h3>');
  const coverPosition = detailSource.indexOf('<div class="detail-cover">');
  const materialsPosition = detailSource.indexOf('<h3>素材与分层</h3>');
  assert.ok(titlePosition < goalPosition && goalPosition < ideasPosition && ideasPosition < coverPosition && coverPosition < materialsPosition);
});

test('effect detail is an image-led application guide without parameter information', () => {
  const effectDetailSource = indexHtml.match(/function renderEffectDetail\(effectId\) \{([\s\S]*?)\n    \}\n\n    function openLightbox/)?.[1] || '';

  ['一句话结论', '适合用在', '能带来什么', '视频案例'].forEach((heading) => {
    assert.ok(effectDetailSource.includes(heading), `missing ${heading}`);
  });
  assert.match(effectDetailSource, /EffectIndexData\.profileForUse/);
  assert.match(effectDetailSource, /profile\.visuals\.slice\(0, 3\)/);
  assert.match(effectDetailSource, /effect-case-shot/);
  assert.doesNotMatch(effectDetailSource, /parameterHtml|parameters|参数与调节方向|链路位置|厂商未记录|renderEvidenceLabels/);
});
