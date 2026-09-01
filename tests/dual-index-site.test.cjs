const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const SfxKnowledgeModel = require('../src/knowledge-model.js');
const SfxEffectGuides = require('../src/effect-guides.js');
const SfxEffectLearningPaths = require('../src/effect-learning-paths.js');
const SfxVideoSubtitles = require('../src/video-subtitles.js');
const SfxVideoTimeline = require('../src/video-timeline.js');
const SfxGlossary = require('../src/sfx-glossary.js');

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

function loadEffectFilterHelpers(context = {}) {
  const source = sourceSlice('function escapeHtml(value) {', 'function thumbnail(record, quality = "hqdefault") {');
  vm.runInNewContext(
    `${source}\nthis.normalizedEffectGoal = normalizedEffectGoal;\nthis.highlightSearchText = highlightSearchText;\nthis.effectProfileSupportingValues = effectProfileSupportingValues;\nthis.effectProfileMatchHint = effectProfileMatchHint;\nthis.clearEffectFilters = clearEffectFilters;`,
    context
  );
  return context;
}

function loadEffectLibraryRenderer(context) {
  const source = [
    sourceSlice('function escapeHtml(value) {', 'function thumbnail(record, quality = "hqdefault") {'),
    sourceSlice('function effectProfileSearchable(profile) {', 'function filteredEffectUses() {'),
    sourceSlice('function effectProfileMatchesSource(profile) {', 'function renderEvidenceLabels(labels) {'),
    sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {'),
    'this.renderEffectLibrary = renderEffectLibrary;'
  ].join('\n');
  vm.runInNewContext(source, context);
  return context.renderEffectLibrary;
}

function listenerBody(elementName, eventName) {
  const match = indexHtml.match(new RegExp(
    `${elementName}\\.addEventListener\\("${eventName}", \\(event\\) => \\{([\\s\\S]*?)\\n    \\}\\);`
  ));
  assert.ok(match, `missing ${eventName} listener for ${elementName}`);
  return match[1];
}

function escapeHtmlForTest(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttrForTest(value) {
  return escapeHtmlForTest(value);
}

function escapeRegexForTest(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function loadDetailRenderingHelpers(context = {}) {
  const source = sourceSlice(
    'function renderTimeJump(seconds, label, attributes = {}) {',
    'function renderDetail(options = {}) {'
  );
  vm.runInNewContext(`${source}
this.renderTimeJump = renderTimeJump;
this.renderQuickConclusion = renderQuickConclusion;
this.renderSectionNavigation = renderSectionNavigation;
this.videoDetailSections = videoDetailSections;
this.renderStepTimeline = renderStepTimeline;
this.renderDetailedSteps = renderDetailedSteps;
this.renderCompleteEvidence = renderCompleteEvidence;`, context);
  return context;
}

function loadEffectCaseHelpers(context = {}) {
  const source = sourceSlice(
    'function sourceStepForEffectUse(use) {',
    'function renderEffectDetail(effectId) {'
  );
  vm.runInNewContext(`${source}
this.sourceStepForEffectUse = sourceStepForEffectUse;
this.effectCaseForUse = effectCaseForUse;
this.effectCasesForProfile = effectCasesForProfile;
this.renderEffectCase = renderEffectCase;
this.renderEffectInterfaceReference = renderEffectInterfaceReference;`, context);
  return context;
}

test('loads shared knowledge, subtitle, glossary, player, and detail navigation before inline data', () => {
  const modelTag = indexHtml.match(/<script src="src\/knowledge-model\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const guideTag = indexHtml.match(/<script src="src\/effect-guides\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const learningPathsTag = indexHtml.match(/<script src="src\/effect-learning-paths\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const subtitlesTag = indexHtml.match(/<script src="src\/video-subtitles\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const timelineTag = indexHtml.match(/<script src="src\/video-timeline\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const glossaryTag = indexHtml.match(/<script src="src\/sfx-glossary\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const playerTag = indexHtml.match(/<script src="src\/youtube-caption-player\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const detailNavigationTag = indexHtml.match(/<script src="src\/detail-navigation\.js\?v=[^"]+"><\/script>/)?.[0] || '';
  const modelScript = indexHtml.indexOf(modelTag);
  const guideScript = indexHtml.indexOf(guideTag);
  const learningPathsScript = indexHtml.indexOf(learningPathsTag);
  const subtitlesScript = indexHtml.indexOf(subtitlesTag);
  const timelineScript = indexHtml.indexOf(timelineTag);
  const glossaryScript = indexHtml.indexOf(glossaryTag);
  const playerScript = indexHtml.indexOf(playerTag);
  const detailNavigationScript = indexHtml.indexOf(detailNavigationTag);
  const inlineCategories = indexHtml.indexOf('const categories = [');

  assert.ok(modelTag, 'knowledge model script must be cache-versioned');
  assert.ok(guideTag, 'effect guide script must be cache-versioned');
  assert.ok(learningPathsTag, 'effect learning paths script must be cache-versioned');
  assert.ok(subtitlesTag, 'video subtitle script must be cache-versioned');
  assert.ok(timelineTag, 'verified video timeline script must be cache-versioned');
  assert.ok(glossaryTag, 'sound-design glossary script must be cache-versioned');
  assert.ok(playerTag, 'YouTube caption player script must be cache-versioned');
  assert.ok(detailNavigationTag, 'detail navigation script must be cache-versioned');
  assert.ok(modelScript < guideScript, 'effect guides must load after the knowledge model');
  assert.ok(guideScript < learningPathsScript, 'effect learning paths must load after effect guides');
  assert.ok(learningPathsScript < subtitlesScript, 'subtitle data must load after the effect modules');
  assert.ok(subtitlesScript < timelineScript, 'timeline helpers must load after subtitle data');
  assert.ok(timelineScript < glossaryScript, 'glossary must load after timeline helpers');
  assert.ok(glossaryScript < playerScript, 'player must load after the glossary');
  assert.ok(playerScript < detailNavigationScript, 'detail navigation must load after the player');
  assert.ok(detailNavigationScript < inlineCategories, 'detail navigation must load before inline application data');
});

test('renders only relevant glossary terms and escapes every glossary field', () => {
  const source = sourceSlice('function renderVideoGlossary(record, track) {', 'function renderTimeJump(seconds, label, attributes = {}) {');
  const escapeHtml = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const renderVideoGlossary = loadNamedFunction(source, 'renderVideoGlossary', {
    SfxGlossary,
    SfxVideoSubtitles,
    escapeHtml
  });

  assert.equal(renderVideoGlossary({ title: 'no matching vocabulary' }, null), '');
  const markup = renderVideoGlossary(
    { title: 'Use EQ' },
    { cues: [{ start: 0, end: 1, text: 'Then add a short tail.' }] }
  );
  assert.match(markup, /data-video-glossary/);
  assert.match(markup, /EQ \/ Equalization/);
  assert.match(markup, /尾音/);

  const hostileGlossary = {
    termsFor() {
      return [{
        english: '<script>alert(1)</script>',
        chinese: '<b>术语</b>',
        meaning: 'A & B',
        use: '"quoted"'
      }];
    }
  };
  const hostileRenderer = loadNamedFunction(source, 'renderVideoGlossary', {
    SfxGlossary: hostileGlossary,
    SfxVideoSubtitles,
    escapeHtml
  });
  const hostileMarkup = hostileRenderer({ title: 'anything' }, null);
  assert.doesNotMatch(hostileMarkup, /<script>|<b>/i);
  assert.match(hostileMarkup, /&lt;script&gt;/);
  assert.match(hostileMarkup, /A &amp; B/);
  assert.match(hostileMarkup, /&quot;quoted&quot;/);
});

test('keeps a stable glossary anchor and refreshes it only for the active hydrated video', () => {
  const detailSource = sourceSlice('function renderDetail(options = {}) {', 'function sourceStepForEffectUse(use) {');

  assert.match(detailSource, /data-video-glossary-anchor/);
  assert.match(detailSource, /renderVideoGlossary\(record, null\)/);
  assert.match(detailSource, /onTrackLoaded: \(track\) => \{/);
  assert.match(detailSource, /state\.activeId !== record\.id/);
  assert.match(detailSource, /glossaryAnchor\.innerHTML = renderVideoGlossary\(record, track\)/);
});

test('video detail puts the player before quick conclusions and folded complete evidence', () => {
  const detailSource = sourceSlice('function renderDetail(options = {}) {', 'function sourceStepForEffectUse(use) {');
  const shellOrder = [
    'detail-learning-layout',
    'video-study-rail',
    'detail-learning-content',
    'quickHtml',
    'navigationHtml',
    'timelineHtml',
    'effectHtml',
    'data-video-glossary-anchor',
    'transcriptHtml',
    'evidenceHtml'
  ].map((token) => detailSource.indexOf(token));

  assert.ok(shellOrder.every((position) => position >= 0), 'player-first shell is incomplete');
  assert.deepEqual([...shellOrder].sort((left, right) => left - right), shellOrder);
  assert.match(detailSource, /transcriptRoot:/);
  assert.match(detailSource, /startSeconds:/);

  const helperSource = sourceSlice(
    'function renderTimeJump(seconds, label, attributes = {}) {',
    'function renderDetail(options = {}) {'
  );
  assert.match(helperSource, /class="detail-quick\b/);
  assert.match(helperSource, /class="detail-section-nav"/);
  assert.match(helperSource, /class="complete-evidence\b/);
  assert.match(helperSource, /<details class="evidence-disclosure"/);
});

test('quick conclusions stay concise while folded evidence preserves every supplied block once', () => {
  const helpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    SfxVideoTimeline
  });
  const record = {
    summary: 'summary-token',
    coreIdeas: ['idea-one', 'idea-two', 'idea-three', 'idea-four'],
    steps: []
  };
  const quick = helpers.renderQuickConclusion(record, { coreIdeas: record.coreIdeas });
  assert.match(quick, /summary-token/);
  ['idea-one', 'idea-two', 'idea-three'].forEach((token) => assert.match(quick, new RegExp(token)));
  assert.doesNotMatch(quick, /idea-four/);

  const blocks = {
    ideas: '<p>ideas-token</p>',
    process: '<p>process-token</p>',
    chain: '<p>chain-token</p>',
    boundaries: '<p>boundaries-token</p>'
  };
  const evidence = helpers.renderCompleteEvidence(blocks);
  Object.keys(blocks).forEach((key) => {
    const token = `${key}-token`;
    assert.equal((evidence.match(new RegExp(token, 'g')) || []).length, 1, token);
  });
  assert.equal((evidence.match(/<details class="evidence-disclosure"/g) || []).length, 4);
});

test('renders the Veto learning template while preserving exact legacy detail fallbacks', () => {
  const veto = records().find((record) => record.videoId === '3JjAK2uhxM4');
  assert.ok(veto, 'missing production Veto record');

  const detailData = loadVideoDetailData();
  const projected = detailData.project(veto);
  const helpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeAttrForTest,
    imageAsset: (kind, key) => `assets/${kind}/${key}.webp`,
    SfxVideoTimeline
  });
  const quick = helpers.renderQuickConclusion(veto, projected);
  const timeline = helpers.renderStepTimeline(veto, projected);
  const detailed = helpers.renderDetailedSteps(veto, projected);

  assert.match(quick, /30 秒读懂/);
  assert.match(quick, /设计目标/);
  assert.equal((quick.match(/class=\"learning-role\"/g) || []).length, 6);
  ['动作提示', '主体材质', '重量冲击', '能量身份', '高频细节', '空间与尾音']
    .forEach((role) => assert.match(quick, new RegExp(role)));
  assert.match(quick, /关键决定/);
  assert.match(quick, /最终结构/);
  assert.match(quick, /初始命中 → 吸入式转场 → 手臂拉回 → 材质与尾音收束 → 敌我变体/);

  assert.match(timeline, /设计章节/);
  assert.equal((timeline.match(/class=\"learning-chapter\"/g) || []).length, 5);
  ['先定动作骨架', '建立动作与力量', '塑造液态高频', '建立角色身份与转场', '完成材质、尾音与敌我版本']
    .forEach((title) => assert.match(timeline, new RegExp(title)));
  assert.equal((timeline.match(/data-step-time=/g) || []).length, 17);
  assert.equal((timeline.match(/data-chapter-time=/g) || []).length, 5);

  assert.equal((detailed.match(/class=\"step-learning-grid\"/g) || []).length, 17);
  ['输入', '问题', '动作', '结果'].forEach((label) => {
    assert.equal((detailed.match(new RegExp(`<dt>${label}</dt>`, 'g')) || []).length, 17, label);
  });
  assert.match(detailed, /完整大招画面与已有声音草稿。/);
  assert.match(detailed, /查看完整说明/);
  assert.equal((detailed.match(/class=\"step-source-detail\"/g) || []).length, 17);
  const firstSourceStart = detailed.indexOf('<details class=\"step-source-detail\">');
  const firstSourceEnd = detailed.indexOf('</details>', firstSourceStart);
  assert.ok(firstSourceStart >= 0 && firstSourceEnd > firstSourceStart, 'missing folded source detail');
  assert.match(
    detailed.slice(firstSourceStart, firstSourceEnd),
    new RegExp(escapeRegexForTest(escapeHtmlForTest(veto.steps[0].detail)))
  );

  const searchable = SfxKnowledgeModel.searchableRecordText(veto, '');
  assert.match(searchable, /已有声音草稿/);
  assert.match(detailed, /已有声音草稿/);

  const legacy = {
    title: 'Legacy Record',
    summary: 'legacy-summary',
    coreIdeas: ['legacy-idea'],
    steps: [{
      order: 1,
      name: 'legacy-step',
      detail: 'legacy-detail',
      params: ['legacy-param'],
      startSeconds: 12
    }]
  };
  const legacyProjected = detailData.project(legacy);
  const legacyQuick = helpers.renderQuickConclusion(legacy, legacyProjected);
  const legacyTimeline = helpers.renderStepTimeline(legacy, legacyProjected);
  const legacyDetailed = helpers.renderDetailedSteps(legacy, legacyProjected);

  assert.match(legacyQuick, /快速结论/);
  assert.doesNotMatch(legacyQuick, /30 秒读懂/);
  assert.match(legacyTimeline, /class=\"step-timeline\"/);
  assert.doesNotMatch(legacyTimeline, /learning-chapter/);
  assert.match(legacyDetailed, /legacy-detail/);
  assert.match(legacyDetailed, /legacy-param/);
  assert.doesNotMatch(legacyDetailed, /step-learning-grid|step-source-detail/);

  assert.match(indexHtml, /\.learning-map\s*\{[^}]*display:\s*grid;/);
  assert.match(indexHtml, /\.learning-roles\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/);
  assert.match(indexHtml, /\.learning-chapter\s*\{[^}]*border-top:\s*1px solid var\(--line\);/);
  assert.match(indexHtml, /\.step-learning-grid\s*>\s*div\s*\{[^}]*grid-template-columns:\s*44px minmax\(0, 1fr\);/);
  const mobileStart = indexHtml.indexOf('@media (max-width: 640px)');
  const mobileEnd = indexHtml.indexOf('@media (orientation: landscape)', mobileStart);
  const mobileCss = indexHtml.slice(mobileStart, mobileEnd);
  assert.ok(mobileStart >= 0 && mobileEnd > mobileStart, 'missing mobile CSS boundary');
  assert.match(mobileCss, /\.learning-roles\s*\{[^}]*grid-template-columns:\s*1fr;/);
  assert.match(mobileCss, /\.learning-chapter-head\s*\{[^}]*grid-template-columns:\s*1fr;/);
});

test('all 85 records render verified step and screenshot time controls', () => {
  const detailData = loadVideoDetailData();
  const helpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    imageAsset: (kind, key) => `assets/${kind}/${key}.webp`,
    SfxVideoTimeline
  });

  records().forEach((record) => {
    const projected = detailData.project(record);
    const timeline = helpers.renderStepTimeline(record, projected);
    const detailed = helpers.renderDetailedSteps(record, projected);
    assert.equal((timeline.match(/data-step-time=/g) || []).length, record.steps.length, record.id);
    assert.ok((timeline.match(/data-seek-seconds=/g) || []).length >= record.steps.length, record.id);
    projected.steps.filter((step) => step.imageKey).forEach((step) => {
      assert.match(
        detailed,
        new RegExp(`data-image-key="${escapeRegexForTest(step.imageKey)}"[\\s\\S]*?data-screenshot-time`),
        `${record.id}:${step.imageKey}`
      );
    });
  });
});

test('detail time controls seek the active player and preserve verified deep links', () => {
  const detailClick = listenerBody('detailEl', 'click');
  assert.ok(detailClick.indexOf('[data-open-video]') < detailClick.indexOf('[data-seek-seconds]'));
  assert.match(detailClick, /activeVideoPlayer\.playAt\(seconds\)/);
  assert.match(detailClick, /writeHashRoute\(\{[\s\S]*?video: state\.activeId[\s\S]*?time: seconds[\s\S]*?section:[\s\S]*?\}, true\)/);
  assert.match(detailClick, /openVideoDetail\(openVideo\.dataset\.openVideo, true, \{[\s\S]*?time:[\s\S]*?section: "effects"/);
  assert.match(detailClick, /data-transcript-start/);
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
  ['search', 'sourceFilter', 'effectGoals', 'effectResultCount', 'effectList'].forEach((id) => {
    assert.match(indexHtml, new RegExp(`id="${id}"`));
  });
  assert.doesNotMatch(indexHtml, /id="effectCategoryFilter"/);
  assert.doesNotMatch(indexHtml, /id="effectEvidenceFilter"/);
});

test('keeps independent video and effect filter state across navigation', () => {
  const stateSource = indexHtml.match(/const state = \{([\s\S]*?)\n    \};/)?.[1] || '';
  const domSource = indexHtml.slice(indexHtml.indexOf('const tabsEl'), indexHtml.indexOf('let searchRenderTimer'));
  const activateSource = sourceSlice('function activateLibraryMode(mode, syncHash = true) {', 'viewSwitchEl.addEventListener("click"');
  const returnSource = sourceSlice('function returnToLibrary() {', 'function focusLibraryModeTab() {');

  assert.match(stateSource, /effectGoal: "all"/);
  assert.match(stateSource, /videoQuery: ""/);
  assert.match(stateSource, /videoSource: "all"/);
  assert.match(stateSource, /effectQuery: ""/);
  assert.match(stateSource, /effectSource: "all"/);
  assert.doesNotMatch(stateSource, /^\s*(?:query|source):/m);
  assert.match(domSource, /const effectGoalsEl = document\.getElementById\("effectGoals"\);/);
  assert.doesNotMatch(activateSource, /effectGoal\s*=/);
  assert.doesNotMatch(returnSource, /effectGoal\s*=/);
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
    /categoryCountStatEl\.textContent = categories\.filter\(\(category\) => category\.id !== "all"\)\.length \+ " 个分类";/
  );
  assert.doesNotMatch(indexHtml, /(?:84 个视频|85 个视频|27 个效果器|6 个分类)/);
});

test('updates the exact effect statistic from strict published profiles', () => {
  const source = sourceSlice('function updateEffectCountStat() {', 'function renderModeSwitch() {');
  const context = {
    effectCountStatEl: { textContent: '0 个效果器' },
    effectUses: [],
    records: [],
    pluginReferenceCatalog: [],
    imageManifest: {},
    profileCalls: 0,
    EffectIndexData: {
      profiles() {
        context.profileCalls += 1;
        return Array.from({ length: 9 });
      }
    }
  };
  const updateEffectCountStat = loadNamedFunction(source, 'updateEffectCountStat', context);

  updateEffectCountStat();

  assert.equal(context.effectCountStatEl.textContent, '9 个效果器');
  assert.equal(context.profileCalls, 1);
});

test('applies the initial route before scheduling the deferred effect statistic', () => {
  const startup = indexHtml.slice(indexHtml.indexOf('    window.addEventListener("hashchange"'), indexHtml.indexOf('  </script>', indexHtml.indexOf('    window.addEventListener("hashchange"')));

  assert.ok(startup.indexOf('applyHashRoute();') < startup.indexOf('scheduleEffectCountStat();'));
  assert.match(startup, /function scheduleEffectCountStat\(\)/);
  assert.match(startup, /typeof requestIdleCallback === "function"/);
  assert.match(startup, /requestIdleCallback\(updateEffectCountStat\)/);
  assert.match(startup, /setTimeout\(updateEffectCountStat, 0\)/);
  assert.doesNotMatch(
    startup.slice(0, startup.indexOf('applyHashRoute();')),
    /EffectIndexData\.profiles\(/
  );
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
  assert.match(css, /\.toolbar\.effects-mode \{[\s\S]*?grid-template-columns:/);
  assert.doesNotMatch(heroRule, /gradient|linear-gradient|radial-gradient/);
  assert.doesNotMatch(heroHeadingRule, /vw|clamp\(/);
  assert.match(heroHeadingRule, /font-size: \d+px/);
  assert.match(tabletRules, /\.control-inner \{ grid-template-columns: 1fr; \}/);
  assert.match(tabletRules, /\.toolbar\.effects-mode \{[^}]*grid-template-columns:/);
  assert.match(mobileRules, /\.view-switch \{ width: 100%; \}/);
  assert.match(mobileRules, /\.search \{ grid-column: 1 \/ -1; \}/);
  assert.match(mobileRules, /\.toolbar\.effects-mode #sourceFilter \{ grid-column: 1 \/ -1; \}/);
  assert.match(mobileRules, /\.tabs,\s*\.goal-tabs \{[\s\S]*?flex-wrap: nowrap;[\s\S]*?overflow-x: auto;/);
});

test('mode switching toggles toolbar layout and sort visibility in both directions', () => {
  const classNames = new Set();
  const buttons = ['videos', 'effects'].map((mode) => ({
    dataset: { mode },
    classList: { toggle(name, active) { active ? this.names.add(name) : this.names.delete(name); }, names: new Set() },
    setAttribute(name, value) { this[name] = value; },
    tabIndex: 0
  }));
  const context = {
    state: {
      mode: 'effects',
      videoQuery: 'impact video',
      videoSource: 'Video Channel',
      effectQuery: 'transient',
      effectSource: 'Effect Channel'
    },
    viewSwitchEl: { querySelectorAll() { return buttons; } },
    videoLibraryEl: { hidden: false },
    effectLibraryEl: { hidden: true },
    sortEl: { hidden: false },
    searchEl: { placeholder: '', value: '' },
    sourceEl: { value: '' },
    toolbarEl: {
      classList: {
        toggle(name, active) { active ? classNames.add(name) : classNames.delete(name); }
      }
    }
  };
  const renderModeSwitch = loadNamedFunction(
    sourceSlice('function renderModeSwitch() {', 'function renderEffectLibrary() {'),
    'renderModeSwitch',
    context
  );

  renderModeSwitch();
  assert.equal(classNames.has('effects-mode'), true);
  assert.equal(context.sortEl.hidden, true);
  assert.equal(context.videoLibraryEl.hidden, true);
  assert.equal(context.effectLibraryEl.hidden, false);
  assert.equal(context.searchEl.value, 'transient');
  assert.equal(context.sourceEl.value, 'Effect Channel');

  context.state.mode = 'videos';
  renderModeSwitch();
  assert.equal(classNames.has('effects-mode'), false);
  assert.equal(context.sortEl.hidden, false);
  assert.equal(context.videoLibraryEl.hidden, false);
  assert.equal(context.effectLibraryEl.hidden, true);
  assert.equal(context.searchEl.value, 'impact video');
  assert.equal(context.sourceEl.value, 'Video Channel');
});

test('search and source controls update only the active library filters', () => {
  const context = {
    state: {
      mode: 'videos',
      videoQuery: '',
      videoSource: 'all',
      effectQuery: 'existing effect',
      effectSource: 'Effect Channel',
      activeId: 'video-1',
      activeEffectId: 'effect-1'
    },
    searchRenderTimer: 0,
    renderCalls: 0,
    window: {
      clearTimeout() {},
      setTimeout(callback) {
        callback();
        return 1;
      }
    }
  };
  context.render = () => { context.renderCalls += 1; };
  const searchHandler = loadNamedFunction(
    `function searchHandler(event) {${listenerBody('searchEl', 'input')}\n}`,
    'searchHandler',
    context
  );
  const sourceHandler = loadNamedFunction(
    `function sourceHandler(event) {${listenerBody('sourceEl', 'change')}\n}`,
    'sourceHandler',
    context
  );

  searchHandler({ target: { value: 'new video query' } });
  sourceHandler({ target: { value: 'Video Channel' } });
  assert.equal(context.state.videoQuery, 'new video query');
  assert.equal(context.state.videoSource, 'Video Channel');
  assert.equal(context.state.effectQuery, 'existing effect');
  assert.equal(context.state.effectSource, 'Effect Channel');

  context.state.mode = 'effects';
  searchHandler({ target: { value: 'new effect query' } });
  sourceHandler({ target: { value: 'Another Effect Channel' } });
  assert.equal(context.state.videoQuery, 'new video query');
  assert.equal(context.state.videoSource, 'Video Channel');
  assert.equal(context.state.effectQuery, 'new effect query');
  assert.equal(context.state.effectSource, 'Another Effect Channel');
  assert.equal(context.state.activeId, '');
  assert.equal(context.state.activeEffectId, '');
  assert.equal(context.renderCalls, 4);
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
  assert.deepEqual(plainValue(navigation.parseHashRouteHash(hash)), {
    video: 'video-1', effect: '', view: '', origin: 'effects', time: null, section: ''
  });
});

test('effect search filters strict profiles without changing screenshot ownership', () => {
  const useFilter = indexHtml.match(/function filteredEffectUses\(\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  const searchableSource = sourceSlice('function escapeHtml(value) {', 'function filteredEffectUses() {');
  const renderer = sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {');

  assert.doesNotMatch(useFilter, /state\.query|effectSearchable/);
  assert.match(renderer, /const allProfiles = EffectIndexData\.profiles\(effectUses, records, pluginReferenceCatalog, imageManifest\)/);
  assert.match(renderer, /const sourceProfiles = allProfiles[\s\S]*?effectProfileMatchesSource\(profile\)/);
  assert.match(renderer, /const goalProfiles = sourceProfiles[\s\S]*?SfxEffectLearningPaths\.matches\(profile\.name, state\.effectGoal\)/);
  assert.match(renderer, /const profiles = goalProfiles[\s\S]*?\.filter\(\(profile\) => !query/);
  assert.match(renderer, /effectProfileSearchable\(profile\)/);
  assert.ok(renderer.indexOf('EffectIndexData.profiles') < renderer.indexOf('effectProfileSearchable(profile)'));

  ['profile.name', 'profile.input', 'profile.action', 'profile.result'].forEach((field) => {
    assert.ok(searchableSource.includes(field), `missing ${field}`);
  });
  ['use?.target', 'use?.purpose', 'use?.result', 'use?.sourceTitle', 'use?.source', 'use?.sourceKeywords'].forEach((field) => {
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
  assert.match(renderer, /const goalProfiles = sourceProfiles[\s\S]*?const profiles = goalProfiles/);
  assert.match(sourceMatcher, /profile\.uses\.some\(\(use\) => use\.source === state\.effectSource\)/);
  assert.ok(renderer.indexOf('EffectIndexData.profiles(effectUses') < renderer.indexOf('effectProfileMatchesSource(profile)'));
});

test('effect profile search uses evidence fields and supporting case text', () => {
  const helperContext = loadEffectFilterHelpers({
    SfxEffectLearningPaths,
    state: { effectGoal: 'all', query: '', source: 'all' },
    searchEl: { value: '' },
    sourceEl: { value: 'all' }
  });
  const searchable = loadNamedFunction(
    sourceSlice('function effectProfileSearchable(profile) {', 'function filteredEffectUses() {'),
    'effectProfileSearchable',
    helperContext
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
      sourceKeywords: ['支撑关键词'],
      parameters: ['参数不得进入搜索']
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
  assert.ok(!searchableText.includes('参数不得进入搜索'));
});

test('normalizes invalid effect goals and safely highlights literal search text', () => {
  const context = loadEffectFilterHelpers({
    SfxEffectLearningPaths,
    state: { effectGoal: 'all', query: '', source: 'all' },
    searchEl: { value: '' },
    sourceEl: { value: 'all' }
  });

  assert.equal(context.normalizedEffectGoal('cleanup-control'), 'cleanup-control');
  assert.equal(context.normalizedEffectGoal('missing-goal'), 'all');
  assert.equal(context.normalizedEffectGoal(''), 'all');
  assert.equal(context.highlightSearchText('Bright transient BRIGHT', 'bright'), '<mark class="search-hit">Bright</mark> transient <mark class="search-hit">BRIGHT</mark>');
  assert.equal(context.highlightSearchText('No literal match', 'absent'), 'No literal match');
  assert.equal(context.highlightSearchText('Use [a-z]+ literally', '[a-z]+'), 'Use <mark class="search-hit">[a-z]+</mark> literally');
  assert.equal(
    context.highlightSearchText('<img onerror=1> & safe', '<IMG ONERROR=1>'),
    '<mark class="search-hit">&lt;img onerror=1&gt;</mark> &amp; safe'
  );
  assert.equal(context.highlightSearchText('<b>plain</b>', '  '), '&lt;b&gt;plain&lt;/b&gt;');
});

test('explains supporting-only search matches without duplicating visible matches', () => {
  const context = loadEffectFilterHelpers({
    SfxEffectLearningPaths,
    state: { effectGoal: 'all', query: '', source: 'all' },
    searchEl: { value: '' },
    sourceEl: { value: 'all' }
  });
  const profile = {
    name: 'Visible Effect',
    input: 'Clean input',
    action: 'Shape the attack',
    result: 'Focused result',
    uses: [{
      sourceTitle: 'Granular texture walkthrough',
      source: 'Creator Channel',
      sourceKeywords: ['sound design'],
      target: 'Layered source',
      purpose: 'Create movement',
      result: 'Wide tail'
    }]
  };

  assert.equal(context.effectProfileMatchHint(profile, 'texture'), 'Granular texture walkthrough');
  assert.equal(context.effectProfileMatchHint(profile, 'focused'), '');
  assert.equal(context.effectProfileMatchHint(profile, ''), '');
  assert.equal(context.effectProfileMatchHint({
    ...profile,
    uses: [{ sourceTitle: '', source: '', sourceKeywords: [], target: '', purpose: 'Attack 设置为 12 ms' }]
  }, '12 ms'), '');
});

test('filters parameter instructions and extended placeholders from every supporting field', () => {
  const context = loadEffectFilterHelpers({
    SfxEffectLearningPaths,
    state: { effectGoal: 'all', query: '', source: 'all' },
    searchEl: { value: '' },
    sourceEl: { value: 'all' }
  });
  const profile = {
    name: 'Visible Effect',
    input: 'Clean input',
    action: 'Shape the sound',
    result: 'Focused result',
    uses: [{
      sourceTitle: 'Attack 设置为 12 ms',
      source: 'Sound Design Archive',
      sourceKeywords: ['Threshold 6 dB', 'granular texture', '未记录输入'],
      target: '',
      purpose: '',
      result: ''
    }]
  };
  const searchable = loadNamedFunction(
    sourceSlice('function effectProfileSearchable(profile) {', 'function filteredEffectUses() {'),
    'effectProfileSearchable',
    context
  );

  assert.deepEqual(
    plainValue(context.effectProfileSupportingValues(profile)),
    ['Sound Design Archive', 'granular texture']
  );
  ['12 ms', '6 dB', '未记录输入'].forEach((query) => {
    assert.equal(context.effectProfileMatchHint(profile, query), '', query);
    assert.ok(!searchable(profile).includes(query.toLowerCase()), query);
  });
  assert.equal(context.effectProfileMatchHint(profile, 'archive'), 'Sound Design Archive');
  assert.equal(context.effectProfileMatchHint(profile, 'granular'), 'granular texture');
  assert.ok(searchable(profile).includes('sound design archive'));
  assert.ok(searchable(profile).includes('granular texture'));
});

test('renders ordered goal counts and combines source, goal, and query filters', () => {
  const modeSource = sourceSlice('function renderModeSwitch() {', 'function renderEffectLibrary() {');
  const renderer = sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {');
  assert.match(modeSource, /\? "搜索效果器、输入素材、处理动作或来源\.\.\."/);
  assert.doesNotMatch(modeSource, /搜索效果器、适用素材、作用或来源/);
  assert.match(renderer, /SfxEffectLearningPaths\.goals\(\)/);
  assert.match(renderer, /SfxEffectLearningPaths\.matches\(profile\.name, goal\.id\)/);
  assert.match(
    renderer,
    /effectCountEl\.textContent = "当前显示 " \+ profiles\.length \+ " \/ " \+ sourceProfiles\.length \+ " 个效果器档案";/
  );
  assert.doesNotMatch(renderer, /filteredEffectUses\(\)|list\.length|条视频用法/);
  assert.equal((renderer.match(/EffectIndexData\.profiles\(/g) || []).length, 1);

  const profiles = [
    { id: 'pro-q', name: 'FabFilter Pro-Q 3', action: '控制共振', result: 'Resonance becomes focused' },
    { id: 'transient', name: 'NI Transient Master', action: '收紧起音', result: 'Punch becomes denser' },
    { id: 'crystallizer', name: 'Soundtoys Crystallizer', action: '切分尾部', result: 'Tail becomes granular' },
    { id: 'enigma', name: 'Waves Enigma', action: '调制滤波', result: 'Motion becomes rhythmic' }
  ].map((profile, index) => ({
    ...profile,
    input: `输入素材 ${index + 1}`,
    sourceCount: 1,
    useCount: 1,
    uses: [{ source: index < 3 ? '来源 A' : '来源 B', sourceTitle: `视频 ${index + 1}` }],
    visuals: [{ kind: 'video', preview: `preview-${index + 1}.webp` }],
    suitable: '不得出现的旧适用字段',
    purpose: '不得出现的旧作用字段',
    outcome: '不得出现的旧结果字段',
    parameters: ['不得出现的参数']
  }));
  const context = {
    SfxEffectLearningPaths,
    state: { effectSource: '来源 A', effectGoal: 'cleanup-control', effectQuery: 'resonance' },
    effectUses: Array.from({ length: 99 }, (_, index) => ({ id: `raw-use-${index}` })),
    records: [],
    pluginReferenceCatalog: [],
    imageManifest: {},
    effectGoalsEl: { innerHTML: '' },
    effectCountEl: { textContent: '' },
    effectListEl: { innerHTML: '' },
    searchEl: { value: 'resonance' },
    sourceEl: { value: '来源 A' },
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
  const renderEffectLibrary = loadEffectLibraryRenderer(context);

  renderEffectLibrary();
  assert.equal(context.effectCountEl.textContent, '当前显示 1 / 3 个效果器档案');
  assert.deepEqual(
    Array.from(context.effectGoalsEl.innerHTML.matchAll(/<button[\s\S]*?<\/button>/g), (match) => match[0]),
    [
      '<button class="goal-tab" type="button" data-effect-goal="all" aria-pressed="false">全部<span>3</span></button>',
      '<button class="goal-tab active" type="button" data-effect-goal="cleanup-control" aria-pressed="true">清理与控制<span>2</span></button>',
      '<button class="goal-tab" type="button" data-effect-goal="impact-density" aria-pressed="false">冲击与密度<span>1</span></button>',
      '<button class="goal-tab" type="button" data-effect-goal="motion-rhythm" aria-pressed="false">运动与节奏<span>0</span></button>',
      '<button class="goal-tab" type="button" data-effect-goal="pitch-tone" aria-pressed="false">音高与音色<span>1</span></button>',
      '<button class="goal-tab" type="button" data-effect-goal="space-tail" aria-pressed="false">空间与尾部<span>1</span></button>',
      '<button class="goal-tab" type="button" data-effect-goal="granular-transform" aria-pressed="false">颗粒与变形<span>1</span></button>'
    ]
  );
  assert.match(context.effectListEl.innerHTML, /FabFilter Pro-Q 3/);
  assert.match(context.effectListEl.innerHTML, /<mark class="search-hit">Resonance<\/mark>/);
  assert.doesNotMatch(context.effectListEl.innerHTML, /NI Transient Master|Soundtoys Crystallizer|Waves Enigma/);

  context.state.effectGoal = 'invalid-goal';
  context.state.effectQuery = '';
  renderEffectLibrary();
  assert.equal(context.state.effectGoal, 'all');
  assert.equal(context.effectCountEl.textContent, '当前显示 3 / 3 个效果器档案');
  assert.match(context.effectGoalsEl.innerHTML, /class="goal-tab active"[^>]*data-effect-goal="all"[^>]*aria-pressed="true"/);
  assert.equal(context.profileBuildCalls, 2, 'build the globally owned profile set once per render');
  assert.equal(context.rawUseProjectionCalls, 0, 'published counters must not project hidden raw uses');
});

test('renders result-first cards and explains supporting-only matches', () => {
  const profile = {
    id: 'pro-q',
    name: 'FabFilter Pro-Q 3',
    input: 'Harsh resonance',
    action: 'Cut narrow bands',
    result: 'Cleaner focused tone',
    sourceCount: 1,
    useCount: 2,
    uses: [{ source: '来源 A', sourceTitle: 'Dragon spell design' }],
    visuals: [{ kind: 'video', preview: 'preview.webp' }],
    suitable: 'legacy suitable',
    purpose: 'legacy purpose',
    outcome: 'legacy outcome',
    parameters: ['Frequency 2 kHz']
  };
  const context = {
    SfxEffectLearningPaths,
    state: { effectSource: 'all', effectGoal: 'all', effectQuery: 'dragon' },
    effectUses: [],
    records: [],
    pluginReferenceCatalog: [],
    imageManifest: {},
    effectGoalsEl: { innerHTML: '' },
    effectCountEl: { textContent: '' },
    effectListEl: { innerHTML: '' },
    searchEl: { value: 'dragon' },
    sourceEl: { value: 'all' },
    EffectIndexData: { profiles: () => [profile] }
  };
  const renderEffectLibrary = loadEffectLibraryRenderer(context);

  renderEffectLibrary();
  const markup = context.effectListEl.innerHTML;
  const resultIndex = markup.indexOf('听感结果');
  const inputIndex = markup.indexOf('适用输入');
  const actionIndex = markup.indexOf('处理动作');
  assert.ok(resultIndex > 0 && resultIndex < inputIndex && inputIndex < actionIndex);
  [profile.name, profile.result, profile.input, profile.action].forEach((value) => {
    assert.ok(markup.includes(value), `missing visible guide value ${value}`);
  });
  assert.match(markup, /class="effect-profile-match"[\s\S]*?<strong>搜索命中<\/strong>[\s\S]*?<mark class="search-hit">Dragon<\/mark> spell design/);
  assert.doesNotMatch(markup, /legacy suitable|legacy purpose|legacy outcome|Frequency 2 kHz|参数/);

  context.state.effectQuery = 'focused';
  renderEffectLibrary();
  assert.match(context.effectListEl.innerHTML, /Cleaner <mark class="search-hit">focused<\/mark> tone/);
  assert.doesNotMatch(context.effectListEl.innerHTML, /effect-profile-match|搜索命中/);
});

test('goal and reset buttons update only effect filters and rerender', () => {
  const helperContext = loadEffectFilterHelpers({
    SfxEffectLearningPaths,
    state: {
      mode: 'effects',
      returnMode: 'effects',
      category: 'weapons',
      sort: 'titleAsc',
      effectGoal: 'impact-density',
      videoQuery: 'weapon breakdown',
      videoSource: 'Video Channel',
      effectQuery: 'punch',
      effectSource: '来源 A'
    },
    searchEl: { value: 'punch' },
    sourceEl: { value: '来源 A' }
  });
  helperContext.clearEffectFilters();
  assert.deepEqual(plainValue(helperContext.state), {
    mode: 'effects',
    returnMode: 'effects',
    category: 'weapons',
    sort: 'titleAsc',
    effectGoal: 'all',
    videoQuery: 'weapon breakdown',
    videoSource: 'Video Channel',
    effectQuery: '',
    effectSource: 'all'
  });
  assert.equal(helperContext.searchEl.value, '');
  assert.equal(helperContext.sourceEl.value, 'all');

  const goalContext = {
    state: { effectGoal: 'all' },
    normalizedEffectGoal: (value) => value,
    renders: 0
  };
  goalContext.renderEffectLibrary = () => { goalContext.renders += 1; };
  const goalHandler = loadNamedFunction(
    `function goalHandler(event) {${listenerBody('effectGoalsEl', 'click')}\n}`,
    'goalHandler',
    goalContext
  );
  const goalButton = { dataset: { effectGoal: 'space-tail' } };
  goalHandler({ target: { closest: () => goalButton } });
  assert.equal(goalContext.state.effectGoal, 'space-tail');
  assert.equal(goalContext.renders, 1);

  const resetContext = {
    resets: 0,
    renders: 0,
    state: { returnMode: 'videos' },
    openEffectDetail() { throw new Error('reset must not open a detail route'); }
  };
  resetContext.clearEffectFilters = () => { resetContext.resets += 1; };
  resetContext.renderEffectLibrary = () => { resetContext.renders += 1; };
  const resetHandler = loadNamedFunction(
    `function resetHandler(event) {${listenerBody('effectListEl', 'click')}\n}`,
    'resetHandler',
    resetContext
  );
  const resetButton = { dataset: {} };
  resetHandler({ target: { closest(selector) { return selector === '[data-reset-effects]' ? resetButton : null; } } });
  assert.equal(resetContext.resets, 1);
  assert.equal(resetContext.renders, 1);
  assert.equal(resetContext.state.returnMode, 'videos');
});

test('empty effect results provide concise copy and a real reset button', () => {
  const renderer = sourceSlice('function renderEffectLibrary() {', 'function renderTabs() {');
  assert.match(renderer, /没有找到符合当前目标和筛选条件的效果器档案。/);
  assert.match(renderer, /<button type="button" data-reset-effects>清空筛选<\/button>/);
  assert.doesNotMatch(renderer, /没有找到同时具备明确视频用法和准确截图的效果器档案。/);
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
  assert.equal(profile.visuals.length, 4);
  assert.deepEqual(profile.visuals.slice(0, 3).map((visual) => visual.useId), ['use-3', 'use-1', 'use-2']);
  assert.ok(profile.visuals.slice(0, 3).every((visual) => visual.kind === 'video'));
  assert.equal(profile.visuals[3].kind, 'official');
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
  const publicEffectUseManifest = require('../tools/data/public-effect-use-ids.json');
  const names = profiles.map((profile) => profile.name);
  const guideEvidenceUseIds = guides.map((guide) => guide.evidenceUseId);

  assert.equal(siteRecords.length, 85);
  assert.equal(profiles.length, 27);
  assert.deepEqual(
    new Set(names),
    new Set(guides.map((guide) => guide.canonicalName))
  );
  assert.equal(new Set(names).size, profiles.length);
  assert.equal(guideEvidenceUseIds.length, 27);
  assert.equal(new Set(guideEvidenceUseIds).size, 27);
  assert.equal(publicEffectUseManifest.version, 1);
  assert.equal(publicEffectUseManifest.useIds.length, 101);
  assert.deepEqual(
    new Set(publicEffectUseManifest.useIds),
    new Set(profiles.flatMap((profile) => profile.uses.map((use) => use.id)))
  );
  assert.deepEqual(
    SfxEffectLearningPaths.goals().map((goal) => ({
      id: goal.id,
      count: goal.id === 'all'
        ? profiles.length
        : profiles.filter((profile) => SfxEffectLearningPaths.matches(profile.name, goal.id)).length
    })),
    [
      { id: 'all', count: 27 },
      { id: 'cleanup-control', count: 8 },
      { id: 'impact-density', count: 8 },
      { id: 'motion-rhythm', count: 10 },
      { id: 'pitch-tone', count: 9 },
      { id: 'space-tail', count: 7 },
      { id: 'granular-transform', count: 5 }
    ]
  );

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

test('effect case projection renders all 101 public uses exactly once', () => {
  const siteRecords = records();
  const uses = SfxKnowledgeModel.buildEffectUses(siteRecords);
  const profiles = loadEffectIndexData(SfxEffectGuides).profiles(
    uses,
    siteRecords,
    pluginReferenceCatalog(),
    imageManifest()
  );
  const detailHelpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    SfxVideoTimeline
  });
  const helpers = loadEffectCaseHelpers({
    records: siteRecords,
    SfxVideoTimeline,
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    cleanedText: (value) => typeof value === 'string' ? value : '',
    renderTimeJump: detailHelpers.renderTimeJump
  });

  const publicIds = require('../tools/data/public-effect-use-ids.json').useIds;
  const renderedIds = [];
  let missingVisualCount = 0;
  profiles.forEach((profile) => {
    const cases = helpers.effectCasesForProfile(profile);
    const markup = cases.map((item) => helpers.renderEffectCase(profile, item)).join('');
    assert.equal((markup.match(/class="effect-case"/g) || []).length, profile.uses.length, profile.name);
    cases.forEach((item) => {
      renderedIds.push(item.use.id);
      assert.equal(
        (markup.match(new RegExp(`data-effect-case-id="${escapeRegexForTest(item.use.id)}"`, 'g')) || []).length,
        1,
        item.use.id
      );
      if (!item.visual) {
        missingVisualCount += 1;
        assert.match(helpers.renderEffectCase(profile, item), /effect-case-missing/);
      } else {
        assert.equal(item.visual.kind, 'video');
        assert.equal(item.visual.useId, item.use.id);
      }
    });
    assert.doesNotMatch(markup, /data-effect-parameter|class="effect-parameter|parameters/);
  });

  assert.equal(renderedIds.length, 101);
  assert.deepEqual(new Set(renderedIds), new Set(publicIds));
  assert.ok(missingVisualCount > 0, 'truthful no-image cases must be represented');
});

test('effect interface reference stays profile-level and never borrows another use screenshot', () => {
  const detailHelpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    SfxVideoTimeline
  });
  const recordsFixture = [{
    id: 'video-a',
    title: 'Video A',
    updatedAt: '2026-08-14',
    steps: [{ order: 1, name: 'Target Effect', detail: 'Step detail', startSeconds: 12 }]
  }];
  const helpers = loadEffectCaseHelpers({
    records: recordsFixture,
    SfxVideoTimeline,
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    cleanedText: (value) => typeof value === 'string' ? value : '',
    renderTimeJump: detailHelpers.renderTimeJump
  });
  const use = { id: 'use-a', sourceRecordId: 'video-a', stepIndex: 0, purpose: 'Case action' };
  const profile = {
    evidenceUseId: 'use-a',
    name: 'Target Effect',
    input: 'Input',
    action: 'Action',
    result: 'Result',
    uses: [use],
    visuals: [
      { kind: 'video', useId: 'other-use', preview: 'other.webp', full: 'other-full.webp', caption: 'Other use' },
      { kind: 'official', useId: 'use-a', preview: 'official.webp', full: 'official-full.webp', caption: 'Official' }
    ]
  };
  const item = helpers.effectCaseForUse(profile, use);
  assert.equal(item.visual, null);
  assert.match(helpers.renderEffectCase(profile, item), /effect-case-missing/);
  const reference = helpers.renderEffectInterfaceReference(profile);
  assert.match(reference, /official\.webp/);
  assert.match(reference, /effect-interface-reference/);
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
  assert.match(indexHtml, /route\.target === "video" \|\| route\.target === "invalidVideo"[\s\S]*?renderModeSwitch\(\);\s+openVideoDetail\(route\.id, false, \{ time: route\.time, section: route\.section \}\)/);
  const navigation = loadDualIndexNavigation();
  assert.deepEqual(plainValue(navigation.routeDecision('#video=video-1&origin=effects', { video: () => true })), {
    target: 'video', id: 'video-1', mode: 'videos', returnMode: 'effects', time: null, section: ''
  });
  assert.deepEqual(plainValue(navigation.routeDecision('#video=video-1', { video: () => true })), {
    target: 'video', id: 'video-1', mode: 'videos', returnMode: 'videos', time: null, section: ''
  });
  assert.deepEqual(plainValue(navigation.routeDecision('#effect=missing', { effect: () => false })), {
    target: 'invalidEffect', id: 'missing', mode: 'effects', returnMode: 'effects', time: null, section: ''
  });
  assert.deepEqual(plainValue(navigation.routeWriteIntent('#video=video-1', { view: 'videos' }, true)), {
    method: 'replace', hash: '#view=videos'
  });
  assert.deepEqual(plainValue(navigation.routeWriteIntent('#view=videos', { view: 'videos' })), {
    method: 'none', hash: '#view=videos'
  });
});

test('supports validated video time and section deep links', () => {
  const navigation = loadDualIndexNavigation();
  assert.deepEqual(
    plainValue(navigation.parseHashRouteHash('#video=video-a&t=42&section=steps&origin=effects')),
    { video: 'video-a', effect: '', view: '', origin: 'effects', time: 42, section: 'steps' }
  );
  assert.equal(
    navigation.serializeHashRoute({ video: 'video-a', time: 42.8, section: 'steps', origin: 'effects' }),
    '#video=video-a&origin=effects&t=42&section=steps'
  );
  assert.deepEqual(
    plainValue(navigation.routeDecision('#video=video-a&t=42&section=steps', { video: () => true })),
    { target: 'video', id: 'video-a', mode: 'videos', returnMode: 'videos', time: 42, section: 'steps' }
  );
});

test('drops invalid time and section values without breaking legacy routes', () => {
  const navigation = loadDualIndexNavigation();
  assert.equal(navigation.parseHashRouteHash('#video=video-a&t=-1&section=unknown').time, null);
  assert.equal(navigation.parseHashRouteHash('#video=video-a&t=Infinity').section, '');
  assert.equal(navigation.serializeHashRoute({ video: 'video-a', time: '12', section: 'quick' }), '#video=video-a&t=12&section=quick');
  assert.equal(navigation.serializeHashRoute({ effect: 'use-a', time: 20, section: 'steps' }), '#effect=use-a');
  assert.equal(navigation.serializeHashRoute({ view: 'effects', time: 20 }), '#view=effects');
  assert.deepEqual(
    plainValue(navigation.routeDecision('#view=effects&t=10&section=steps')),
    { target: 'library', id: '', mode: 'effects', returnMode: 'effects', time: null, section: '' }
  );
});

test('effect profile cards open aggregated uses and can return to a timed video case', () => {
  ['effect-profile-card', 'data-effect-id', 'data-open-video', '播放本案例'].forEach((source) => {
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
    videoSummary: sourceSlice('function renderEffectUseSummary(record, use) {', 'function renderVideoGlossary(record, track) {'),
    detail: sourceSlice('function sourceStepForEffectUse(use) {', 'function openLightbox(src, caption) {')
  };
  const approvedFields = ['input', 'action', 'result'];
  const legacyProfileFields = /profile\.(?:suitable|purpose|outcome|limitation)/;

  Object.entries(renderSources).forEach(([surface, source]) => {
    approvedFields.forEach((field) => {
      assert.match(source, new RegExp(`profile\\.${field}`), `${surface} missing profile.${field}`);
    });
    assert.doesNotMatch(source, legacyProfileFields, `${surface} uses a legacy profile field`);
  });

  ['听感结果', '适用输入', '处理动作'].forEach((label) => {
    assert.ok(renderSources.card.includes(label), `card missing ${label}`);
  });
  ['输入素材', '处理动作', '听感变化'].forEach((label) => {
    assert.ok(renderSources.videoSummary.includes(label), `videoSummary missing ${label}`);
  });
  ['能得到什么', '适合什么输入', '怎么处理', '全部视频案例', '处理对象', '实际用途', '听感方向', '暂无对应截图'].forEach((label) => {
    assert.ok(renderSources.detail.includes(label), `detail missing ${label}`);
  });
  assert.doesNotMatch(renderSources.card, /一句话结论|适合用在|主要作用|能带来什么|输入素材|听感变化/);
  assert.doesNotMatch(renderSources.videoSummary, /一句话结论|适合用在|主要作用|能带来什么|听感结果/);
  assert.doesNotMatch(renderSources.detail, /一句话结论|适合用在|主要作用|输入素材|听感变化|听感结果/);

  assert.match(renderSources.videoSummary, /if \(!profile\) return "";/);
  assert.doesNotMatch(renderSources.videoSummary, /const purpose|<strong>适合：<\/strong>|<strong>听感：<\/strong>/);
  assert.match(renderSources.videoSummary, /effect-summary-shot/);
  assert.match(renderSources.videoSummary, /data-effect-id/);

  assert.doesNotMatch(renderSources.detail, /cautionHtml|effect-caution/);
  assert.match(renderSources.detail, /item\?\.kind === "video"[\s\S]*?item\.useId === use\?\.id[\s\S]*?item\.preview[\s\S]*?item\.full[\s\S]*?item\.caption/);
  assert.match(renderSources.detail, /effectCasesForProfile\(profile\)/);
  assert.match(renderSources.detail, /cases\.map\(\(item\) => renderEffectCase\(profile, item\)\)/);
  assert.match(renderSources.detail, /effect-result-lead/);
  assert.match(renderSources.detail, /effect-interface-reference/);
  assert.match(renderSources.detail, /effect-all-cases/);
  assert.match(renderSources.detail, /effect-case-shot/);
  assert.match(renderSources.detail, /data-open-video/);
  assert.doesNotMatch(renderSources.detail, /visuals\.length >= 3|slice\(0, 3\)|profile\.parameters/);
});

test('video-detail effect summaries omit unpublished profiles and render approved guidance', () => {
  const context = {
    effectUses: [],
    records: [],
    pluginReferenceCatalog: [],
    imageManifest: {},
    escapeAttr: (value) => String(value),
    escapeHtml: (value) => String(value),
    SfxVideoTimeline,
    renderTimeJump: () => '',
    EffectIndexData: { profileForUse: () => null }
  };
  const renderEffectUseSummary = loadNamedFunction(
    sourceSlice('function renderEffectUseSummary(record, use) {', 'function renderVideoGlossary(record, track) {'),
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

test('effect detail renders result-led copy, one interface reference, and every timed case', () => {
  const detailEl = { innerHTML: '' };
  const uses = [
    { id: 'use-1', sourceRecordId: 'video-1', stepIndex: 0, purpose: '主案例实际用途' },
    { id: 'use-2', sourceRecordId: 'video-2', stepIndex: 0, purpose: '支撑案例实际用途' }
  ];
  const profile = {
    id: 'use-1',
    evidenceUseId: 'use-1',
    name: '测试效果器',
    input: '单薄的测试输入素材',
    action: '重塑起音并收紧持续段',
    result: '起音更集中，尾部更短',
    suitable: '旧适用字段不得出现',
    parameters: ['Threshold -12 dB 不得出现'],
    uses,
    visuals: [
      { kind: 'video', useId: 'use-1', preview: 'primary-preview.webp', full: 'primary-full.webp', caption: '主证据截图' },
      { kind: 'video', useId: 'use-2', preview: 'additional-preview.webp', full: 'additional-full.webp', caption: '支撑案例截图' },
      { kind: 'official', useId: 'use-1', preview: 'official-preview.webp', full: 'official-full.webp', caption: '官方参考图' }
    ]
  };
  const recordsFixture = [
    {
      id: 'video-1', title: '主证据视频', updatedAt: '2026-08-14',
      timeline: { status: 'reviewed', source: 'youtube-player', reviewedAt: '2026-08-14', durationSeconds: 120 },
      steps: [{ order: 2, name: '主证据步骤原文', detail: '主处理对象', startSeconds: 12 }]
    },
    {
      id: 'video-2', title: '额外支撑视频', updatedAt: '2026-08-13',
      timeline: { status: 'reviewed', source: 'youtube-player', reviewedAt: '2026-08-14', durationSeconds: 120 },
      steps: [{ order: 5, name: '额外案例步骤原文', detail: '支撑处理对象', startSeconds: 68 }]
    }
  ];
  const detailHelpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    SfxVideoTimeline
  });
  const context = {
    effectUses: uses,
    records: recordsFixture,
    pluginReferenceCatalog: [],
    imageManifest: {},
    detailEl,
    escapeAttr: escapeHtmlForTest,
    escapeHtml: escapeHtmlForTest,
    cleanedText: (value) => typeof value === 'string' ? value : '',
    SfxVideoTimeline,
    renderTimeJump: detailHelpers.renderTimeJump,
    EffectIndexData: { profileForUse: () => profile }
  };
  const renderEffectDetail = loadNamedFunction(
    sourceSlice('function sourceStepForEffectUse(use) {', 'function openLightbox(src, caption) {'),
    'renderEffectDetail',
    context
  );
  renderEffectDetail('use-1');

  ['能得到什么', profile.result, '适合什么输入', profile.input, '怎么处理', profile.action, '全部视频案例'].forEach((text) => {
    assert.ok(detailEl.innerHTML.includes(text), `detail missing ${text}`);
  });
  assert.equal((detailEl.innerHTML.match(/class="effect-case"/g) || []).length, 2);
  assert.equal((detailEl.innerHTML.match(/official-preview\.webp/g) || []).length, 1);
  assert.match(detailEl.innerHTML, /data-effect-case-id="use-1"/);
  assert.match(detailEl.innerHTML, /data-effect-case-id="use-2"/);
  assert.match(detailEl.innerHTML, /data-open-video="video-1"[\s\S]*?data-seek-seconds="12"|data-seek-seconds="12"[\s\S]*?data-open-video="video-1"/);
  assert.match(detailEl.innerHTML, /data-open-video="video-2"[\s\S]*?data-seek-seconds="68"|data-seek-seconds="68"[\s\S]*?data-open-video="video-2"/);
  assert.doesNotMatch(detailEl.innerHTML, /旧适用字段不得出现|Threshold -12 dB|profile\.parameters/);
});

test('effect detail fails closed on missing uses and renders malformed visuals as missing', () => {
  const detailEl = { innerHTML: '' };
  const use = { id: 'use-1', sourceRecordId: 'video-1', stepIndex: 0, purpose: 'Test purpose' };
  let profile = {
    id: 'use-1',
    evidenceUseId: 'use-1',
    name: 'Malformed Effect',
    input: 'Test input',
    action: 'Test action',
    result: 'Test result',
    uses: [],
    visuals: []
  };
  const detailHelpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    SfxVideoTimeline
  });
  const context = {
    effectUses: [use],
    records: [{
      id: 'video-1', title: 'Video 1',
      timeline: { status: 'reviewed', reviewedAt: '2026-08-14', durationSeconds: 60 },
      steps: [{ order: 1, name: 'Step 1', detail: 'Target', startSeconds: 10 }]
    }],
    pluginReferenceCatalog: [],
    imageManifest: {},
    detailEl,
    EffectIndexData: { profileForUse() { return profile; } },
    escapeHtml(value) { return String(value); },
    escapeAttr(value) { return String(value); },
    cleanedText(value) { return typeof value === 'string' ? value : ''; },
    SfxVideoTimeline,
    renderTimeJump: detailHelpers.renderTimeJump
  };
  const renderEffectDetail = loadNamedFunction(
    sourceSlice('function sourceStepForEffectUse(use) {', 'function openLightbox(src, caption) {'),
    'renderEffectDetail',
    context
  );

  assert.doesNotThrow(() => renderEffectDetail('use-1'));
  assert.match(detailEl.innerHTML, /还没有可核对的视频用法/);

  profile = {
    ...profile,
    uses: [use],
    visuals: [{
      kind: 'video',
      preview: 'primary-preview.webp',
      full: 'primary-full.webp',
      caption: 'Wrong owner evidence',
      useId: 'different-use'
    }]
  };
  renderEffectDetail('use-1');
  assert.match(detailEl.innerHTML, /effect-case-missing/);
  assert.doesNotMatch(detailEl.innerHTML, /primary-preview|Wrong owner evidence|undefined/);
});

test('effect cards use stable responsive grids and the reader return control handles keyboard activation', () => {
  const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  const cardRule = css.match(/\.effect-profile-card \{([\s\S]*?)\n    \}/)?.[1] || '';
  const factRules = css.slice(css.indexOf('.effect-profile-result'), css.indexOf('.grid {'));
  const tabletRules = css.match(/@media \(max-width: 820px\) \{([\s\S]*?)\n    \}/)?.[1] || '';
  const mobileRules = css.match(/@media \(max-width: 640px\) \{([\s\S]*?)\n    \}/)?.[1] || '';

  assert.match(css, /\.effect-list \{[\s\S]*?grid-template-columns: repeat\(auto-fill, minmax\(500px, 1fr\)\)/);
  assert.doesNotMatch(css, /\.effect-list \{[\s\S]*?minmax\(280px, 1fr\)/);
  assert.match(cardRule, /display: grid;/);
  assert.match(cardRule, /grid-template-columns: minmax\(180px, 220px\) minmax\(0, 1fr\);/);
  assert.match(tabletRules, /\.effect-list \{ grid-template-columns: 1fr; \}/);
  assert.match(mobileRules, /\.effect-profile-card \{ grid-template-columns: 1fr; \}/);
  assert.doesNotMatch(factRules, /-webkit-line-clamp|text-overflow|overflow:\s*hidden/);
  assert.match(css, /mark\.search-hit \{[\s\S]*?background: #[0-9a-fA-F]{6};[\s\S]*?color: #[0-9a-fA-F]{6};[\s\S]*?padding: 0;/);
  assert.match(indexHtml, /function focusLibraryModeTab\(\) \{[\s\S]*?requestAnimationFrame[\s\S]*?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(indexHtml, /function returnToLibrary\(\) \{[\s\S]*?writeHashRoute\(\{ view: state\.mode \}, true\);[\s\S]*?render\(\);[\s\S]*?focusLibraryModeTab\(\);/);
  assert.match(indexHtml, /function applyHashRoute\(\) \{[\s\S]*?const returningFromReader = state\.view === "reader";[\s\S]*?showLibrary\(\);\s*render\(\);\s*if \(returningFromReader\) focusLibraryModeTab\(\);/);
  assert.match(indexHtml, /backToLibraryEl\.addEventListener\("click", returnToLibrary\)/);
  assert.match(indexHtml, /backToLibraryEl\.addEventListener\("keydown", \(event\) => \{[\s\S]*?\["Enter", " "\]\.includes\(event\.key\)[\s\S]*?event\.preventDefault\(\);[\s\S]*?returnToLibrary\(\);/);
  assert.match(indexHtml, /if \(event\.key === "Escape" && state\.view === "reader"\) \{\s*returnToLibrary\(\);\s*\}/);
});

test('effect detail uses a fixed two-column evidence layout with a one-column tablet fallback', () => {
  const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  const titleRule = css.match(/\.effect-detail \.detail-title \{([\s\S]*?)\n    \}/)?.[1] || '';
  const gridRule = css.match(/\.effect-detail-grid \{([\s\S]*?)\n    \}/)?.[1] || '';
  const shotRule = css.match(/\.effect-case-shot \{([\s\S]*?)\n    \}/)?.[1] || '';
  const shotImageRule = css.match(/\.effect-case-shot img \{([\s\S]*?)\n    \}/)?.[1] || '';
  const tabletRules = css.match(/@media \(max-width: 980px\) \{([\s\S]*?)\n    \}/)?.[1] || '';

  assert.match(titleRule, /font-size: 42px;/);
  assert.doesNotMatch(titleRule, /clamp\(|vw/);
  assert.match(css, /\.detail-title:focus \{\s*outline: none;\s*\}/);
  assert.match(gridRule, /grid-template-columns: minmax\(260px, 0\.78fr\) minmax\(420px, 1\.22fr\);/);
  assert.match(shotRule, /width: 100%;/);
  assert.match(shotRule, /max-width: 100%;/);
  assert.match(shotRule, /aspect-ratio: 16 \/ 9;/);
  assert.match(shotImageRule, /height: 100%;/);
  assert.match(shotImageRule, /object-fit: contain;/);
  assert.match(tabletRules, /\.effect-detail-grid \{ grid-template-columns: 1fr; gap: 28px; \}/);
  assert.match(tabletRules, /\.effect-more-cases \.effect-case-list \{ grid-template-columns: 1fr; \}/);
});

test('learning layout keeps a stable desktop rail and activation-only mobile sticky player', () => {
  const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  assert.match(css, /\.detail-learning-layout \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(420px, 520px\);/);
  assert.match(css, /\.video-study-rail \{[\s\S]*?position: sticky;[\s\S]*?top: 16px;/);
  assert.match(css, /@media \(max-width: 1039px\) \{[\s\S]*?\.detail-learning-layout \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\);/);
  assert.match(css, /@media \(max-width: 640px\) \{[\s\S]*?\.video-study-rail\.player-activated \{[\s\S]*?position: sticky;[\s\S]*?max-height: 36vh;/);
  assert.match(css, /\.video-study-rail\.sticky-collapsed \.video-study-player \{[\s\S]*?block-size: 0;[\s\S]*?overflow: hidden;/);
  assert.match(css, /\.video-study-rail-toolbar \{[\s\S]*?min-height: 48px;/);

  const toggleSource = sourceSlice('function toggleStickyPlayer(button) {', 'function setupStickyPlayerRail(rail, playerRoot) {');
  assert.match(toggleSource, /classList\.toggle\("sticky-collapsed"\)/);
  assert.match(toggleSource, /setAttribute\("aria-expanded"/);
  assert.doesNotMatch(toggleSource, /SfxYouTubeCaptionPlayer\.mount|\.destroy\(|detailEl\.innerHTML/);
});

test('short phone landscape keeps the complete player rail inside the viewport', () => {
  const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  assert.match(
    css,
    /@media \(orientation: landscape\) and \(max-height: 520px\) and \(min-width: 641px\) and \(max-width: 900px\) \{[\s\S]*?\.video-study-rail \{[\s\S]*?width: min\(100%, 470px\);[\s\S]*?justify-self: center;/
  );
});

test('chapter links reflect available content and every rendered target is unique', () => {
  const helpers = loadDetailRenderingHelpers({
    escapeHtml: escapeHtmlForTest,
    escapeAttr: escapeHtmlForTest,
    SfxVideoTimeline
  });
  const record = { steps: [{ name: 'Step' }] };
  const fullSections = helpers.videoDetailSections(
    record,
    [{ id: 'eq' }],
    { contentStatus: 'track' },
    [{ sourceRecordId: 'video-a' }],
    'video-a'
  );
  assert.deepEqual(plainValue(fullSections.map((section) => section.id)), [
    'quick', 'steps', 'effects', 'glossary', 'transcript', 'evidence'
  ]);
  const navigation = helpers.renderSectionNavigation(fullSections);
  fullSections.forEach((section) => {
    assert.equal((navigation.match(new RegExp(`data-section-target="${section.id}"`, 'g')) || []).length, 1);
  });

  const sparseSections = helpers.videoDetailSections(
    { steps: [] },
    [],
    { contentStatus: 'missing' },
    [],
    'video-a'
  );
  assert.deepEqual(plainValue(sparseSections.map((section) => section.id)), ['quick', 'evidence']);
});

test('print mode expands evidence and removes sticky or interactive reader chrome', () => {
  const css = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  const print = css.match(/@media print \{([\s\S]*?)\n    \}/)?.[1] || '';
  assert.match(print, /\.detail-section-nav/);
  assert.match(print, /\.video-study-rail/);
  assert.match(print, /display: none/);
  assert.match(print, /\.evidence-disclosure > \.evidence-disclosure-body/);
  assert.match(print, /display: block/);
  assert.match(print, /position: static/);
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

test('renders a player-first dry-goods archive with folded sources at the end', () => {
  const detailSource = sourceSlice('function renderDetail(options = {}) {', 'function sourceStepForEffectUse(use) {');
  const helperSource = sourceSlice('function renderTimeJump(seconds, label, attributes = {}) {', 'function renderDetail(options = {}) {');

  assert.doesNotMatch(detailSource, /practiceChecklist|练习复盘|<span>学习/);
  assert.match(detailSource, /const chainHtml = detailData\.chainFacts/);
  assert.match(detailSource, /const decisionHtml = detailData\.decisionFacts/);
  assert.match(detailSource, /const pluginHtml = detailData\.plugins\.map/);
  assert.match(detailSource, /renderCompleteEvidence\(\{[\s\S]*?ideas:[\s\S]*?process:[\s\S]*?chain:[\s\S]*?boundaries:/);
  assert.match(helperSource, /<details class="evidence-disclosure">/);
  assert.match(detailSource, /const subtitleEntry = SfxVideoSubtitles\.entryFor\(record\.videoId\)/);
  assert.match(detailSource, /SfxYouTubeCaptionPlayer\.render\(record, subtitleEntry, thumbnail\(record, "hqdefault"\)\)/);
  assert.match(detailSource, /SfxYouTubeCaptionPlayer\.mount\(playerRoot, \{/);
  assert.match(detailSource, /entry: subtitleEntry/);
  assert.match(detailSource, /loadTrack: \(videoId\) => SfxVideoSubtitles\.loadTrack\(videoId\)/);
  assert.match(detailSource, /subtitles: SfxVideoSubtitles/);
  assert.match(detailSource, /transcriptRoot: transcriptRoot/);
  assert.match(detailSource, /startSeconds: Number\.isFinite\(options\.time\)/);
  assert.doesNotMatch(indexHtml, /SfxVideoSubtitles\.trackFor\(/);
  const playerCss = indexHtml.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
  assert.match(playerCss, /\.video-transcript-loading\s*\{/);
  assert.match(playerCss, /\.video-player:fullscreen \.video-transcript-container/);
  assert.doesNotMatch(detailSource, /decisionFacts.*updateNote/);
  const effectSummarySource = sourceSlice('function renderEffectUseSummary(record, use) {', 'function renderVideoGlossary(record, track) {');
  assert.match(effectSummarySource, /EffectIndexData\.profileForUse/);
  ['profile.input', 'profile.action', 'profile.result'].forEach((field) => {
    assert.ok(effectSummarySource.includes(field), `missing ${field}`);
  });
  assert.doesNotMatch(effectSummarySource, /profile\.(?:suitable|purpose|outcome|limitation)|const purpose/);
  assert.match(effectSummarySource, /data-effect-id/);
  assert.match(effectSummarySource, /effect-summary-shot/);
  assert.match(effectSummarySource, /SfxVideoTimeline\.effectStart/);
  assert.doesNotMatch(effectSummarySource, /parameters|parameterHtml|renderEvidenceLabels|链路位置|参数/);
  const detailClick = indexHtml.match(/detailEl\.addEventListener\("click", \(event\) => \{([\s\S]*?)\n    \}\);/)?.[1] || '';
  assert.ok(detailClick.indexOf('[data-effect-id]') < detailClick.indexOf('[data-effect-image]'));
  assert.match(detailClick, /openEffectDetail\(effectButton\.dataset\.effectId, true\)/);
  assert.ok(detailSource.indexOf('learningShellOpen') < detailSource.indexOf('quickHtml'));
  assert.ok(detailSource.indexOf('quickHtml') < detailSource.indexOf('evidenceHtml'));
});

test('destroys active player, chapter navigation, and sticky listeners across route changes', () => {
  const lifecycleSource = sourceSlice('let searchRenderTimer = 0;', 'function focusReaderHeading() {');
  const videoOpenSource = sourceSlice('function openVideoDetail(recordId, syncHash = false, options = {}) {', 'function openEffectDetail(effectId, syncHash = false) {');
  const effectOpenSource = sourceSlice('function openEffectDetail(effectId, syncHash = false) {', 'function applyHashRoute() {');
  const showLibrarySource = sourceSlice('function showLibrary() {', 'function focusReaderHeading() {');

  assert.match(lifecycleSource, /let activeVideoPlayer = null;/);
  assert.match(lifecycleSource, /let activeDetailNavigation = null;/);
  assert.match(lifecycleSource, /let activeStickyCleanup = null;/);
  assert.match(lifecycleSource, /function destroyActiveVideoPlayer\(\) \{[\s\S]*?activeVideoPlayer\.destroy\(\);[\s\S]*?activeVideoPlayer = null;/);
  [videoOpenSource, effectOpenSource, showLibrarySource].forEach((source) => {
    assert.match(source, /destroyActiveVideoPlayer\(\);/);
    assert.match(source, /destroyActiveDetailNavigation\(\);/);
    assert.match(source, /destroyActiveStickyRail\(\);/);
  });
});

test('effect detail is a complete case guide without parameter information', () => {
  const effectDetailSource = sourceSlice('function sourceStepForEffectUse(use) {', 'function openLightbox(src, caption) {');

  ['能得到什么', '适合什么输入', '怎么处理', '全部视频案例', '处理对象', '实际用途', '听感方向', '暂无对应截图'].forEach((heading) => {
    assert.ok(effectDetailSource.includes(heading), `missing ${heading}`);
  });
  assert.match(effectDetailSource, /EffectIndexData\.profileForUse/);
  assert.match(effectDetailSource, /effectCasesForProfile\(profile\)/);
  assert.match(effectDetailSource, /item\?\.kind === "video"/);
  assert.match(effectDetailSource, /item\.useId === use\?\.id/);
  assert.match(effectDetailSource, /effect-interface-reference/);
  assert.match(effectDetailSource, /effect-case-missing/);
  assert.match(effectDetailSource, /effect-case-shot/);
  assert.match(effectDetailSource, /data-open-video/);
  assert.doesNotMatch(effectDetailSource, /profile\.(?:suitable|purpose|outcome|limitation)|一句话结论|适合用在|主要作用|输入素材|听感变化|听感结果/);
  assert.doesNotMatch(effectDetailSource, /profile\.parameters|parameterHtml|参数与调节方向|链路位置|厂商未记录|renderEvidenceLabels/);
});
