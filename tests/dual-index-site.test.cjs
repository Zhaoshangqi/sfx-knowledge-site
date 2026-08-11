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

function loadEffectIndexData() {
  const start = indexHtml.indexOf('    const EffectIndexData = (() => {');
  const end = indexHtml.indexOf('    })();', start);
  assert.notEqual(start, -1, 'missing EffectIndexData helpers');
  assert.notEqual(end, -1, 'unterminated EffectIndexData helpers');
  const source = indexHtml.slice(start, end + '    })();'.length) + '\nthis.EffectIndexData = EffectIndexData;';
  const context = { SfxKnowledgeModel };
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
    'canonicalEffectName(use.name, pluginReferenceCatalog)'
  ].forEach((source) => assert.ok(indexHtml.includes(source), `missing ${source}`));
  const navigation = loadDualIndexNavigation();
  const hash = navigation.serializeHashRoute({ video: 'video-1', origin: 'effects' });
  assert.equal(hash, '#video=video-1&origin=effects');
  assert.deepEqual(plainValue(navigation.parseHashRouteHash(hash)), { video: 'video-1', effect: '', view: '', origin: 'effects' });
});

test('effect profiles prefer video screenshots, stay concise, and cap galleries', () => {
  const effectIndexData = loadEffectIndexData();
  const manifest = {
    shot1: { preview: 'shot1-preview.webp', full: 'shot1-full.webp' },
    shot2: { preview: 'shot2-preview.webp', full: 'shot2-full.webp' },
    shot3: { preview: 'shot3-preview.webp', full: 'shot3-full.webp' },
    shot4: { preview: 'shot4-preview.webp', full: 'shot4-full.webp' }
  };
  const testRecords = [1, 2, 3, 4].map((number) => ({
    id: `record-${number}`,
    title: `Video ${number}`,
    url: `https://example.com/${number}`,
    steps: [{ order: number, name: `Test Effect case ${number}`, detail: 'Visible Test Effect interface.', imageKey: `shot${number}` }]
  }));
  const uses = testRecords.map((record, index) => ({
    id: `use-${index + 1}`,
    name: 'Test Effect',
    category: 'dynamic',
    target: index === 0 ? 'impact and weapon layers' : '',
    purpose: 'Make the hit clearer and more controlled.',
    result: index === 0 ? 'A clearer and more controlled hit.' : '',
    limitations: '',
    screenshotKey: '',
    sourceRecordId: record.id,
    sourceTitle: record.title,
    source: 'Test',
    legacy: false
  }));
  const catalog = [{
    title: 'Test Effect',
    aliases: ['Test Effect'],
    preview: 'official-preview.webp',
    full: 'official-full.webp',
    source: 'https://example.com/official'
  }];

  const profile = plainValue(effectIndexData.profileForUse(uses[0], uses, testRecords, catalog, manifest));

  assert.equal(profile.name, 'Test Effect');
  assert.equal(profile.suitable, 'impact and weapon layers');
  assert.equal(profile.purpose, 'Make the hit clearer and more controlled.');
  assert.equal(profile.outcome, 'A clearer and more controlled hit.');
  assert.equal(profile.visuals.length, 3);
  assert.ok(profile.visuals.every((visual) => visual.kind === 'video'));
  assert.equal(profile.visuals[0].preview, 'shot1-preview.webp');
  assert.doesNotMatch(JSON.stringify(profile), /parameterValues|parameters/);
});

test('effect profiles replace technical control notes with a plain application summary', () => {
  const effectIndexData = loadEffectIndexData();
  const use = {
    id: 'technical-use',
    name: 'Transient Shaper',
    category: '动态与响度',
    target: '',
    purpose: '在330Hz增加谐波和温暖感。',
    result: '',
    limitations: '-0.13Hz 负速率会产生幽灵漂移感。',
    screenshotKey: 'technical-shot',
    sourceRecordId: 'record-1',
    sourceTitle: 'Video 1',
    legacy: false
  };
  const records = [{ id: 'record-1', title: 'Video 1', steps: [{ order: 1, name: 'Transient Shaper', imageKey: 'technical-shot' }] }];
  const manifest = { 'technical-shot': { preview: 'technical-preview.webp', full: 'technical-full.webp' } };

  const profile = plainValue(effectIndexData.profileForUse(use, [use], records, [], manifest));

  assert.equal(profile.purpose, '重塑攻击、持续段与整体动态');
  assert.equal(profile.limitation, '');
  assert.doesNotMatch(profile.purpose, /330|Hz|参数|阈值/i);
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
