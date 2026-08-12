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

function inlineLiteral(name, nextName) {
  const prefix = `    const ${name} = `;
  const start = indexHtml.indexOf(prefix);
  const end = indexHtml.indexOf(`    const ${nextName}`, start);
  assert.notEqual(start, -1, `missing ${name}`);
  assert.notEqual(end, -1, `missing ${name} boundary`);
  const source = indexHtml.slice(start + prefix.length, end).trim().replace(/;$/, '');
  return vm.runInNewContext(`(${source})`);
}

function records() {
  return inlineLiteral('records', 'imageManifest');
}

function imageManifest() {
  return inlineLiteral('imageManifest', 'pluginReferenceCatalog');
}

function pluginReferenceCatalog() {
  return inlineLiteral('pluginReferenceCatalog', 'categoryById');
}

function sourceSlice(startMarker, endMarker) {
  const start = indexHtml.indexOf(`    ${startMarker}`);
  const end = indexHtml.indexOf(`    ${endMarker}`, start);
  assert.notEqual(start, -1, `missing ${startMarker}`);
  assert.notEqual(end, -1, `missing ${endMarker} boundary`);
  return indexHtml.slice(start, end);
}

function loadNamedFunction(source, name, context = {}) {
  vm.runInNewContext(`${source}\nthis.${name} = ${name};`, context);
  return context[name];
}

test('loads the shared knowledge model, effect guides, and learning paths before the inline application data', () => {
  const modelTag = indexHtml.match(/<script src="src\/knowledge-model\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const guideTag = indexHtml.match(/<script src="src\/effect-guides\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const learningPathsTag = indexHtml.match(/<script src="src\/effect-learning-paths\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const modelScript = indexHtml.indexOf(modelTag);
  const guideScript = indexHtml.indexOf(guideTag);
  const learningPathsScript = indexHtml.indexOf(learningPathsTag);
  const inlineCategories = indexHtml.indexOf('const categories = [');

  assert.ok(modelTag, 'knowledge model script must be cache-versioned');
  assert.ok(guideTag, 'effect guide script must be cache-versioned');
  assert.ok(learningPathsTag, 'effect learning paths script must be cache-versioned');
  assert.ok(modelScript < guideScript, 'effect guides must load after the knowledge model');
  assert.ok(guideScript < learningPathsScript, 'effect learning paths must load after effect guides');
  assert.ok(learningPathsScript < inlineCategories, 'effect learning paths must load before inline application data');
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

test('hero introduction uses the approved learning-reference copy', () => {
  const heroSection = indexHtml.match(/<section class="hero">([\s\S]*?)<\/section>/)?.[1] || '';
  const heroIntro = heroSection.match(/<p>([^<]*)<\/p>/)?.[1] || '';

  assert.equal(heroIntro, '从完整视频案例理解设计思路，并按声音目标查清效果器的输入、处理动作和听感结果。');
});

test('compact shell exposes useful runtime-derived header statistics', () => {
  ['videoCountStat', 'effectCountStat', 'categoryCountStat'].forEach((id) => {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  });

  assert.match(indexHtml, /videoCountStatEl\.textContent = records\.length \+ " 个视频";/);
  assert.match(
    indexHtml,
    /effectCountStatEl\.textContent = EffectIndexData\.profiles\(effectUses, records, pluginReferenceCatalog, imageManifest\)\.length \+ " 个效果器";/
  );
  assert.match(
    indexHtml,
    /categoryCountStatEl\.textContent = categories\.filter\(\(category\) => category\.id !== "all"\)\.length \+ " 个分类";/
  );
  assert.doesNotMatch(indexHtml, /(?:82 个视频|27 个效果器|6 个分类)/);
});

test('compact hero and library section heads use the approved copy', () => {
  const heroSection = indexHtml.match(/<section class="hero">([\s\S]*?)<\/section>/)?.[1] || '';
  const brandSubline = indexHtml.match(/<div class="brand-text">[\s\S]*?<span>([^<]*)<\/span>/)?.[1] || '';
  const videoPanel = indexHtml.match(/<section id="videoLibrary"[\s\S]*?<\/section>/)?.[0] || '';
  const effectPanel = indexHtml.match(/<section id="effectLibrary"[\s\S]*?<\/section>/)?.[0] || '';

  assert.match(heroSection, /<h1>音效知识库<\/h1>/);
  assert.equal(brandSubline, '设计思路、素材分层和效果器实用方法');
  assert.match(videoPanel, /<p class="section-eyebrow">完整案例<\/p>[\s\S]*?<h2 id="videosModeLabel">视频案例<\/h2>/);
  assert.match(videoPanel, /<p>按声音类型浏览完整制作过程与关键决策。<\/p>/);
  assert.match(effectPanel, /<p class="section-eyebrow">效果器档案<\/p>[\s\S]*?<h2 id="effectsModeLabel">按设计目标找效果器<\/h2>/);
  assert.match(effectPanel, /<p>只收录能核对输入、处理动作、听感结果和截图的用法。<\/p>/);
});

test('view controls live in a full-width control band outside the hero', () => {
  const heroStart = indexHtml.indexOf('<section class="hero">');
  const heroEnd = indexHtml.indexOf('</section>', heroStart);
  const heroMarkup = indexHtml.slice(heroStart, heroEnd + '</section>'.length);
  const shellAfterHero = indexHtml.slice(heroEnd + '</section>'.length, indexHtml.indexOf('<main id="appMain">'));

  assert.doesNotMatch(heroMarkup, /id="viewSwitch"|class="toolbar"/);
  assert.match(
    shellAfterHero,
    /^\s*<section class="control-band">\s*<div class="control-inner">[\s\S]*?id="viewSwitch"[\s\S]*?class="toolbar"[\s\S]*?<\/div>\s*<\/section>\s*$/
  );
});

test('search and library navigation expose visible structure and labels', () => {
  const searchLabel = indexHtml.match(/<label\b[^>]*for="search"[^>]*>搜索知识库<\/label>/)?.[0] || '';
  const videoPanel = indexHtml.match(/<section id="videoLibrary"[\s\S]*?<\/section>/)?.[0] || '';
  const effectPanel = indexHtml.match(/<section id="effectLibrary"[\s\S]*?<\/section>/)?.[0] || '';

  assert.match(searchLabel, /class="visually-hidden"/);
  assert.match(videoPanel, /<h2 id="videosModeLabel">视频案例<\/h2>/);
  assert.match(effectPanel, /<h2 id="effectsModeLabel">按设计目标找效果器<\/h2>/);
  assert.match(
    effectPanel,
    /<nav class="goal-tabs" id="effectGoals" aria-label="效果器设计目标"><\/nav>\s*<div class="results-bar">/
  );
  assert.match(extractTagById('sourceFilter'), /aria-label="来源筛选"/);
  assert.match(extractTagById('sortOrder'), /aria-label="排序方式"/);
});

test('card renderers use concise accessible names', () => {
  const effectRenderer = sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {');
  const videoRenderer = sourceSlice('function renderGrid() {', 'function showLibrary() {');

  assert.match(effectRenderer, /aria-label="查看效果器档案：' \+ escapeAttr\(profile\.name\) \+ '"/);
  assert.match(videoRenderer, /aria-label="查看视频案例：' \+ escapeAttr\(record\.title\) \+ '"/);
  assert.match(effectRenderer, /effect-profile-title/);
  assert.match(videoRenderer, /card-title/);
});

test('shell CSS is compact and responsive without viewport-scaled hero text', () => {
  const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  const heroRule = css.match(/\.hero \{([\s\S]*?)\n    \}/)?.[1] || '';
  const heroHeadingRule = css.match(/\.hero h1 \{([\s\S]*?)\n    \}/)?.[1] || '';
  const tabletRules = css.match(/@media \(max-width: 980px\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  const mobileRules = css.match(/@media \(max-width: 640px\) \{([\s\S]*?)\n    \}/)?.[1] || '';

  assert.match(css, /\.control-band \{/);
  assert.match(css, /\.control-inner \{[\s\S]*?grid-template-columns: auto minmax\(0, 1fr\)/);
  assert.match(css, /\.toolbar \{[\s\S]*?grid-template-columns: minmax\([^;]+\) [^;]+ [^;]+;/);
  assert.doesNotMatch(heroRule, /gradient|linear-gradient|radial-gradient/);
  assert.doesNotMatch(heroHeadingRule, /vw|clamp\(/);
  assert.match(heroHeadingRule, /font-size: \d+px/);
  assert.match(tabletRules, /\.control-inner \{ grid-template-columns: 1fr; \}/);
  assert.match(
    tabletRules,
    /\.toolbar \{ grid-template-columns: minmax\(200px, 1fr\) minmax\(140px, 174px\) minmax\(150px, 190px\); \}/
  );
  assert.match(mobileRules, /\.view-switch \{ width: 100%; \}/);
  assert.match(mobileRules, /\.toolbar \{ grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(mobileRules, /\.search \{ grid-column: 1 \/ -1; \}/);
  assert.match(mobileRules, /\.tabs,\s*\.goal-tabs \{[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow-x: auto;/);
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
  const searchableSource = sourceSlice('function effectProfileSearchable(profile) {', 'function filteredEffectUses() {');
  const renderer = sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {');

  assert.doesNotMatch(useFilter, /state\.query|effectSearchable/);
  assert.match(renderer, /const allProfiles = EffectIndexData\.profiles\(effectUses, records, pluginReferenceCatalog, imageManifest\)/);
  assert.match(renderer, /const sourceProfiles = allProfiles[\s\S]*?effectProfileMatchesSource\(profile\)/);
  assert.match(renderer, /const profiles = sourceProfiles[\s\S]*?\.filter\(\(profile\) => !query/);
  assert.match(renderer, /effectProfileSearchable\(profile\)/);
  assert.ok(renderer.indexOf('EffectIndexData.profiles') < renderer.indexOf('effectProfileSearchable(profile)'));

  ['profile.name', 'profile.input', 'profile.action', 'profile.result'].forEach((field) => {
    assert.ok(searchableSource.includes(field), `missing ${field}`);
  });
  ['use.name', 'use.target', 'use.purpose', 'use.result', 'use.sourceTitle', 'use.source', 'use.sourceKeywords'].forEach((field) => {
    assert.ok(searchableSource.includes(field), `missing supporting case text ${field}`);
  });
  assert.doesNotMatch(searchableSource, /profile\.(?:suitable|purpose|outcome)/);
});

test('effect source filtering hides global profiles without recalculating screenshot ownership', () => {
  const renderer = sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {');
  const sourceMatcher = indexHtml.match(/function effectProfileMatchesSource\(profile\) \{([\s\S]*?)\r?\n    \}/)?.[1] || '';

  assert.match(renderer, /EffectIndexData\.profiles\(effectUses, records, pluginReferenceCatalog, imageManifest\)/);
  assert.doesNotMatch(renderer, /EffectIndexData\.profiles\(list,/);
  assert.match(renderer, /const sourceProfiles = allProfiles[\s\S]*?effectProfileMatchesSource\(profile\)/);
  assert.match(renderer, /const profiles = sourceProfiles/);
  assert.match(sourceMatcher, /profile\.uses\.some\(\(use\) => use\.source === state\.source\)/);
  assert.ok(renderer.indexOf('EffectIndexData.profiles(effectUses') < renderer.indexOf('effectProfileMatchesSource(profile)'));
});

test('effect profile search uses evidence fields and supporting case text', () => {
  const searchable = loadNamedFunction(
    sourceSlice('function effectProfileSearchable(profile) {', 'function filteredEffectUses() {'),
    'effectProfileSearchable'
  );
  const searchableText = searchable({
    name: '测试效果器',
    category: '动态',
    input: '单薄输入素材',
    action: '切片并扩散',
    result: '形成漂移纹理',
    suitable: '旧适用字段',
    purpose: '旧作用字段',
    outcome: '旧结果字段',
    uses: [{
      name: '案例效果器名',
      target: '案例处理对象',
      purpose: '案例用途文本',
      result: '案例结果文本',
      sourceTitle: '支撑视频标题',
      source: '支撑视频来源',
      sourceKeywords: ['支撑关键词']
    }]
  });

  [
    '测试效果器',
    '单薄输入素材',
    '切片并扩散',
    '形成漂移纹理',
    '案例处理对象',
    '案例用途文本',
    '案例结果文本',
    '支撑视频标题',
    '支撑视频来源',
    '支撑关键词'
  ].forEach((value) => assert.ok(searchableText.includes(value.toLowerCase()), `missing ${value}`));
  ['旧适用字段', '旧作用字段', '旧结果字段'].forEach((value) => {
    assert.ok(!searchableText.includes(value), `legacy profile text leaked: ${value}`);
  });
});

test('effect library counts published profiles after source and query filters', () => {
  const modeSource = sourceSlice('function renderModeSwitch() {', 'function renderEffectLibrary() {');
  const renderer = sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {');
  assert.match(modeSource, /\? "搜索效果器、输入素材、处理动作或来源\.\.\."/);
  assert.doesNotMatch(modeSource, /搜索效果器、适用素材、作用或来源/);
  assert.match(renderer, /没有找到同时具备明确视频用法和准确截图的效果器档案。/);
  assert.doesNotMatch(renderer, /没有找到同时匹配内容和截图的效果器档案。/);
  assert.match(
    renderer,
    /effectCountEl\.textContent = "当前显示 " \+ profiles\.length \+ " \/ " \+ sourceProfiles\.length \+ " 个效果器档案";/
  );
  assert.doesNotMatch(renderer, /filteredEffectUses\(\)|list\.length|条视频用法/);
  assert.equal((renderer.match(/EffectIndexData\.profiles\(/g) || []).length, 1);

  const profiles = Array.from({ length: 27 }, (_, index) => ({
    id: `effect-${index + 1}`,
    name: `效果器 ${index + 1}`,
    input: `输入素材 ${index + 1}`,
    action: index === 0 ? '颗粒搜索动作' : `处理动作 ${index + 1}`,
    result: `听感变化 ${index + 1}`,
    sourceCount: 1,
    useCount: 1,
    uses: [{ source: index < 2 ? '来源 A' : '来源 B', sourceTitle: `视频 ${index + 1}` }],
    visuals: [{ kind: 'video', preview: `preview-${index + 1}.webp` }]
  }));
  const context = {
    state: { source: 'all', query: '' },
    effectUses: Array.from({ length: 99 }, (_, index) => ({ id: `raw-use-${index}` })),
    records: [],
    pluginReferenceCatalog: [],
    imageManifest: {},
    effectCountEl: { textContent: '' },
    effectListEl: { innerHTML: '' },
    escapeAttr: (value) => String(value),
    escapeHtml: (value) => String(value),
    profileBuildCalls: 0,
    rawUseProjectionCalls: 0
  };
  context.EffectIndexData = {
    profiles() {
      context.profileBuildCalls += 1;
      return profiles;
    }
  };
  context.filteredEffectUses = () => {
    context.rawUseProjectionCalls += 1;
    return context.effectUses;
  };
  const runtimeSource = [
    sourceSlice('function effectProfileSearchable(profile) {', 'function filteredEffectUses() {'),
    sourceSlice('function effectProfileMatchesSource(profile) {', 'function renderEvidenceLabels(labels) {'),
    renderer,
    'this.renderEffectLibrary = renderEffectLibrary;'
  ].join('\n');
  vm.runInNewContext(runtimeSource, context);

  context.renderEffectLibrary();
  assert.equal(context.effectCountEl.textContent, '当前显示 27 / 27 个效果器档案');

  context.state.source = '来源 A';
  context.state.query = '颗粒搜索动作';
  context.renderEffectLibrary();
  assert.equal(context.effectCountEl.textContent, '当前显示 1 / 2 个效果器档案');
  assert.equal(context.profileBuildCalls, 2, 'build the globally owned profile set once per render');
  assert.equal(context.rawUseProjectionCalls, 0, 'published counters must not project hidden raw uses');
});

test('missing guides hide profiles even when an exact official image is available', () => {
  const effectIndexData = loadEffectIndexData({ guideFor() { return null; } });
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
  const catalog = [{
    title: 'Test Effect',
    aliases: ['Test Effect'],
    preview: 'official-preview.webp',
    full: 'official-full.webp'
  }];

  assert.equal(effectIndexData.profileForUse(use, [use], testRecords, catalog, manifest), null);
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

test('duplicate evidence use ids in one canonical group fail closed', () => {
  const effectIndexData = loadEffectIndexData({
    guideFor() {
      return {
        canonicalName: 'Test Effect',
        evidenceUseId: 'shared-use',
        input: '单薄的测试冲击素材',
        action: '重塑起音并收紧持续段',
        result: '起音更集中，尾部更短'
      };
    }
  });
  const uses = [1, 2].map((number) => ({
    id: 'shared-use',
    name: 'Test Effect',
    screenshotKey: `test-shot-${number}`,
    sourceRecordId: `record-${number}`,
    sourceTitle: `Video ${number}`
  }));
  const testRecords = [1, 2].map((number) => ({
    id: `record-${number}`,
    title: `Video ${number}`,
    steps: [{ order: number, name: `Test Effect shaping ${number}`, imageKey: `test-shot-${number}` }]
  }));
  const manifest = Object.fromEntries([1, 2].map((number) => [
    `test-shot-${number}`,
    { preview: `test-${number}-preview.webp`, full: `test-${number}-full.webp` }
  ]));

  assert.equal(effectIndexData.profileForUse(uses[0], uses, testRecords, [], manifest), null);
});

test('duplicate evidence use ids across canonical groups hide both profiles', () => {
  const effectIndexData = loadEffectIndexData({
    guideFor(name) {
      return {
        canonicalName: name,
        evidenceUseId: 'shared-use',
        input: '单薄的测试冲击素材',
        action: '重塑起音并收紧持续段',
        result: '起音更集中，尾部更短'
      };
    }
  });
  const uses = [
    {
      id: 'shared-use',
      name: 'Alpha FX',
      screenshotKey: 'alpha-shot',
      sourceRecordId: 'record-alpha',
      sourceTitle: 'Alpha Video'
    },
    {
      id: 'shared-use',
      name: 'Beta FX',
      screenshotKey: 'beta-shot',
      sourceRecordId: 'record-beta',
      sourceTitle: 'Beta Video'
    }
  ];
  const testRecords = [
    {
      id: 'record-alpha',
      title: 'Alpha Video',
      steps: [{ order: 1, name: 'Alpha FX shaping', imageKey: 'alpha-shot' }]
    },
    {
      id: 'record-beta',
      title: 'Beta Video',
      steps: [{ order: 1, name: 'Beta FX shaping', imageKey: 'beta-shot' }]
    }
  ];
  const manifest = {
    'alpha-shot': { preview: 'alpha-preview.webp', full: 'alpha-full.webp' },
    'beta-shot': { preview: 'beta-preview.webp', full: 'beta-full.webp' }
  };

  assert.deepEqual(plainValue(effectIndexData.profiles(uses, testRecords, [], manifest)), []);
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
        evidenceUseId: 'use-3',
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

  const profile = plainValue(effectIndexData.profileForUse(uses[0], uses, testRecords, catalog, manifest));

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
  assert.deepEqual(profile.visuals.map((visual) => visual.useId), ['use-3', 'use-1', 'use-2']);
  assert.ok(profile.visuals.every((visual) => visual.kind === 'video'));
  assert.doesNotMatch(JSON.stringify(profile), /parameterValues|parameters/);
});

test('publishes only the 27 curated profiles with their evidence screenshots', () => {
  const siteRecords = records();
  const siteManifest = imageManifest();
  const siteRecordsById = new Map(siteRecords.map((record) => [record.id, record]));
  const uses = SfxKnowledgeModel.buildEffectUses(siteRecords);
  const profiles = plainValue(loadEffectIndexData(SfxEffectGuides).profiles(
    uses,
    siteRecords,
    pluginReferenceCatalog(),
    siteManifest
  ));
  const guides = SfxEffectGuides.all();
  const names = profiles.map((profile) => profile.name);
  const guideEvidenceUseIds = guides.map((guide) => guide.evidenceUseId);

  assert.equal(siteRecords.length, 82);
  assert.equal(profiles.length, 27);
  assert.deepEqual(
    new Set(names),
    new Set(guides.map((guide) => guide.canonicalName))
  );
  assert.equal(new Set(names).size, profiles.length);
  assert.equal(guideEvidenceUseIds.length, 27);
  assert.equal(new Set(guideEvidenceUseIds).size, 27);

  profiles.forEach((profile) => {
    const guide = SfxEffectGuides.guideFor(profile.name);
    assert.ok(guide, profile.name);
    assert.equal(profile.evidenceUseId, guide.evidenceUseId);
    assert.equal(profile.input, guide.input);
    assert.equal(profile.action, guide.action);
    assert.equal(profile.result, guide.result);
    assert.equal(profile.uses.filter((use) => use.id === profile.evidenceUseId).length, 1);
    const evidenceUse = profile.uses.find((use) => use.id === profile.evidenceUseId);
    assert.ok(evidenceUse, `${profile.name} evidence use`);
    const evidenceVisual = profile.visuals.find((visual) => (
      visual.kind === 'video' && visual.useId === profile.evidenceUseId
    ));
    assert.ok(evidenceVisual, `${profile.name} evidence screenshot`);
    assert.equal(evidenceVisual.sourceRecordId, evidenceUse.sourceRecordId, `${profile.name} evidence source record`);

    const sourceRecord = siteRecordsById.get(evidenceUse.sourceRecordId);
    assert.ok(sourceRecord, `${profile.name} source record`);
    assert.ok(evidenceVisual.imageKey, `${profile.name} evidence image key`);
    assert.ok(Array.isArray(sourceRecord.steps) && sourceRecord.steps.some((step) => (
      step.imageKey === evidenceVisual.imageKey
      && step.order === evidenceVisual.stepOrder
      && step.name === evidenceVisual.stepName
    )), `${profile.name} evidence source step`);

    const manifestAsset = siteManifest[evidenceVisual.imageKey];
    assert.ok(manifestAsset, `${profile.name} manifest asset`);
    assert.equal(evidenceVisual.preview, manifestAsset.preview || manifestAsset.full, `${profile.name} evidence preview`);
    assert.equal(evidenceVisual.full, manifestAsset.full || manifestAsset.preview, `${profile.name} evidence full image`);
  });

  const videoVisuals = profiles.flatMap((profile) => (
    profile.visuals.filter((visual) => visual.kind === 'video')
  ));
  const videoAssetKeys = videoVisuals.map((visual) => visual.full || visual.preview);
  videoAssetKeys.forEach((key, index) => assert.ok(key, `missing video asset key ${index}`));
  assert.equal(new Set(videoAssetKeys).size, videoVisuals.length);
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
  ['effect-profile-card', 'data-effect-id', 'data-open-video', '查看完整视频案例', '输入素材', '处理动作', '听感变化'].forEach((source) => {
    assert.ok(indexHtml.includes(source), `missing ${source}`);
  });
  assert.match(indexHtml, /function openEffectDetail\(effectId, syncHash = false\) \{[\s\S]*?const use = effectUses\.find\(\(item\) => item\.id === effectId\);[\s\S]*?if \(!use\) \{\s+state\.activeEffectId = "";/);
  const libraryRenderer = sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {');
  assert.doesNotMatch(libraryRenderer, /effectParameterSummary|renderEvidenceLabels|effect-use-row|厂商|参数|链路位置/);
  ['effect-profile-shot', 'effect-profile-title', 'profile.sourceCount', 'profile.useCount'].forEach((source) => {
    assert.ok(libraryRenderer.includes(source), `card behavior lost ${source}`);
  });
  const navigation = loadDualIndexNavigation();
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'ArrowLeft')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'ArrowRight')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'End')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('effects', 'Home')), { mode: 'videos', focusMode: 'videos' });
});

test('all public effect render surfaces use only the three evidence fields', () => {
  const renderSources = {
    card: sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {'),
    videoSummary: sourceSlice('function renderEffectUseSummary(record, use) {', 'function renderDetail() {'),
    detail: sourceSlice('function renderEffectDetail(effectId) {', 'function openLightbox(src, caption) {')
  };
  const approvedFields = ['input', 'action', 'result'];
  const approvedLabels = ['输入素材', '处理动作', '听感变化'];
  const legacyProfileFields = /profile\.(?:suitable|purpose|outcome|limitation)/;
  const legacyLabels = /一句话结论|适合用在|主要作用|能带来什么|听感结果/;

  Object.entries(renderSources).forEach(([surface, source]) => {
    approvedFields.forEach((field) => {
      assert.match(source, new RegExp(`profile\\.${field}`), `${surface} missing profile.${field}`);
    });
    approvedLabels.forEach((label) => {
      assert.ok(source.includes(label), `${surface} missing ${label}`);
    });
    assert.doesNotMatch(source, legacyProfileFields, `${surface} uses a legacy profile field`);
    assert.doesNotMatch(source, legacyLabels, `${surface} uses a legacy label`);
  });

  assert.match(renderSources.videoSummary, /if \(!profile\) return "";/);
  assert.doesNotMatch(renderSources.videoSummary, /const purpose|<strong>适合：<\/strong>|<strong>听感：<\/strong>/);
  assert.match(renderSources.videoSummary, /effect-summary-shot/);
  assert.match(renderSources.videoSummary, /data-effect-id/);

  assert.equal((renderSources.detail.match(/class="effect-quick-guide"/g) || []).length, 1);
  assert.equal((renderSources.detail.match(/class="effect-guide-item"/g) || []).length, 3);
  assert.doesNotMatch(renderSources.detail, /cautionHtml|effect-caution/);
  assert.match(renderSources.detail, /profile\.visuals\.slice\(0, 3\)/);
  assert.match(renderSources.detail, /effect-case-shot/);
  assert.match(renderSources.detail, /data-open-video/);
  assert.ok(renderSources.detail.includes('视频案例'));
});

test('video-detail effect summaries omit unpublished profiles and render approved guidance', () => {
  const context = {
    effectUses: [],
    records: [],
    pluginReferenceCatalog: [],
    imageManifest: {},
    escapeAttr: (value) => String(value),
    escapeHtml: (value) => String(value),
    EffectIndexData: { profileForUse: () => null }
  };
  const renderEffectUseSummary = loadNamedFunction(
    sourceSlice('function renderEffectUseSummary(record, use) {', 'function renderDetail() {'),
    'renderEffectUseSummary',
    context
  );
  const use = { id: 'use-1' };
  assert.equal(renderEffectUseSummary({}, use), '');

  context.EffectIndexData.profileForUse = () => ({
    id: 'use-1',
    name: '测试效果器',
    input: '单薄的测试输入素材',
    action: '重塑起音并收紧持续段',
    result: '起音更集中，尾部更短',
    visuals: [{
      useId: 'use-1',
      preview: 'preview.webp',
      full: 'full.webp',
      caption: '测试效果器视频截图'
    }]
  });
  const markup = renderEffectUseSummary({}, use);
  ['输入素材', '单薄的测试输入素材', '处理动作', '重塑起音并收紧持续段', '听感变化', '起音更集中，尾部更短'].forEach((text) => {
    assert.ok(markup.includes(text), `summary missing ${text}`);
  });
  assert.match(markup, /class="effect-summary-shot"/);
  assert.match(markup, /data-effect-id="use-1"/);
  assert.doesNotMatch(markup, /适合：|听感：|一句话结论|适合用在|主要作用|能带来什么|听感结果/);
});

test('effect detail renders one three-item guide with the linked video gallery', () => {
  const detailEl = { innerHTML: '' };
  const profile = {
    id: 'use-1',
    name: '测试效果器',
    input: '单薄的测试输入素材',
    action: '重塑起音并收紧持续段',
    result: '起音更集中，尾部更短',
    visuals: [{
      kind: 'video',
      useId: 'use-1',
      preview: 'preview.webp',
      full: 'full.webp',
      caption: '测试效果器视频截图',
      sourceRecordId: 'video-1',
      sourceTitle: '支撑视频案例',
      stepOrder: 2,
      timestamp: '00:12'
    }]
  };
  const context = {
    effectUses: [{ id: 'use-1' }],
    records: [{ id: 'video-1' }],
    pluginReferenceCatalog: [],
    imageManifest: {},
    detailEl,
    escapeAttr: (value) => String(value),
    escapeHtml: (value) => String(value),
    EffectIndexData: { profileForUse: () => profile }
  };
  const renderEffectDetail = loadNamedFunction(
    sourceSlice('function renderEffectDetail(effectId) {', 'function openLightbox(src, caption) {'),
    'renderEffectDetail',
    context
  );
  renderEffectDetail('use-1');

  ['输入素材', profile.input, '处理动作', profile.action, '听感变化', profile.result].forEach((text) => {
    assert.ok(detailEl.innerHTML.includes(text), `detail missing ${text}`);
  });
  assert.equal((detailEl.innerHTML.match(/class="effect-quick-guide"/g) || []).length, 1);
  assert.equal((detailEl.innerHTML.match(/class="effect-guide-item"/g) || []).length, 3);
  assert.match(detailEl.innerHTML, /class="effect-case-shot"/);
  assert.match(detailEl.innerHTML, /data-open-video="video-1"/);
  assert.doesNotMatch(detailEl.innerHTML, /一句话结论|适合用在|主要作用|能带来什么|听感结果|注意：/);
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
  ['profile.input', 'profile.action', 'profile.result'].forEach((field) => {
    assert.ok(effectSummarySource.includes(field), `missing ${field}`);
  });
  assert.doesNotMatch(effectSummarySource, /profile\.(?:suitable|purpose|outcome|limitation)|const purpose/);
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

  ['输入素材', '处理动作', '听感变化', '视频案例'].forEach((heading) => {
    assert.ok(effectDetailSource.includes(heading), `missing ${heading}`);
  });
  assert.match(effectDetailSource, /EffectIndexData\.profileForUse/);
  assert.match(effectDetailSource, /profile\.visuals\.slice\(0, 3\)/);
  assert.match(effectDetailSource, /effect-case-shot/);
  assert.match(effectDetailSource, /data-open-video/);
  assert.doesNotMatch(effectDetailSource, /profile\.(?:suitable|purpose|outcome|limitation)|一句话结论|适合用在|主要作用|能带来什么|听感结果/);
  assert.doesNotMatch(effectDetailSource, /parameterHtml|parameters|参数与调节方向|链路位置|厂商未记录|renderEvidenceLabels/);
});
