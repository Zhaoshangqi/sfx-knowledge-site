const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const SfxKnowledgeModel = require('../src/knowledge-model.js');

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

test('loads the shared knowledge model before the inline application data', () => {
  const modelTag = indexHtml.match(/<script src="src\/knowledge-model\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const modelScript = indexHtml.indexOf(modelTag);
  const inlineCategories = indexHtml.indexOf('const categories = [');

  assert.ok(modelTag, 'knowledge model script must be cache-versioned');
  assert.ok(modelScript < inlineCategories);
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

test('provides effect index controls and render target', () => {
  ['effectCategoryFilter', 'effectEvidenceFilter', 'effectResultCount', 'effectList'].forEach((id) => {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  });
});

test('removes course-oriented shell copy', () => {
  assert.doesNotMatch(indexHtml, /沉浸式学习模式/);
  assert.doesNotMatch(indexHtml, /学习时间：最新优先/);
});

test('builds and renders the effect-use projection', () => {
  [
    'SfxKnowledgeModel.buildEffectUses(records)',
    'function filteredEffectUses()',
    'function renderEffectLibrary()',
    'function renderEffectDetail(effectId)',
    'state.effectEvidence',
    'use.sourceKeywords',
    'canonicalEffectName(use.name, pluginReferenceCatalog)',
    'function matchedEffectReferenceAliases(use)',
    'matchedEffectReferenceAliases(use)'
  ].forEach((source) => assert.ok(indexHtml.includes(source), `missing ${source}`));
  assert.match(indexHtml, /function matchedEffectReferenceAliases\(use\) \{[\s\S]*?\.\.\.\(reference\.aliases \|\| \[\]\)/);
  const navigation = loadDualIndexNavigation();
  const hash = navigation.serializeHashRoute({ video: 'video-1', origin: 'effects' });
  assert.equal(hash, '#video=video-1&origin=effects');
  assert.deepEqual(plainValue(navigation.parseHashRouteHash(hash)), { video: 'video-1', effect: '', view: '', origin: 'effects' });
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

test('effect rows open independent uses and can return to a video', () => {
  ['data-effect-id', 'data-open-video', '查看完整视频案例', 'effect-use-target', 'effect-use-evidence'].forEach((source) => {
    assert.ok(indexHtml.includes(source), `missing ${source}`);
  });
  assert.match(indexHtml, /function openEffectDetail\(effectId, syncHash = false\) \{[\s\S]*?const use = effectUses\.find\(\(item\) => item\.id === effectId\);[\s\S]*?if \(!use\) \{\s+state\.activeEffectId = "";/);
  const navigation = loadDualIndexNavigation();
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'ArrowLeft')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'ArrowRight')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('videos', 'End')), { mode: 'effects', focusMode: 'effects' });
  assert.deepEqual(plainValue(navigation.tabNavigation('effects', 'Home')), { mode: 'videos', focusMode: 'videos' });
});

test('tablet effect rows collapse and the reader return control handles keyboard activation', () => {
  assert.match(indexHtml, /@media \(max-width: 820px\) \{[\s\S]*?\.effect-use-row \{\s*grid-template-columns: 1fr;/);
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
  assert.match(indexHtml, /function renderEffectUseSummary\(record, use\) \{[\s\S]*?data-effect-id=[\s\S]*?renderPluginReferences\(record, plugin, pluginIndex\)/);
  assert.match(indexHtml, /VideoDetailData\.effectUse\(record, use\)/);
  const detailClick = indexHtml.match(/detailEl\.addEventListener\("click", \(event\) => \{([\s\S]*?)\n    \}\);/)?.[1] || '';
  assert.ok(detailClick.indexOf('[data-effect-id]') < detailClick.indexOf('[data-effect-shot]'));
  assert.match(detailClick, /openEffectDetail\(effectButton\.dataset\.effectId, true\)/);

  const titlePosition = detailSource.indexOf('<h2 class="detail-title"');
  const goalPosition = detailSource.indexOf('<h3>设计目标</h3>');
  const ideasPosition = detailSource.indexOf('<h3>设计思路</h3>');
  const coverPosition = detailSource.indexOf('<div class="detail-cover">');
  const materialsPosition = detailSource.indexOf('<h3>素材与分层</h3>');
  assert.ok(titlePosition < goalPosition && goalPosition < ideasPosition && ideasPosition < coverPosition && coverPosition < materialsPosition);
});
