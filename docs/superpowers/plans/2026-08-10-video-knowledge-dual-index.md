# Video Knowledge Dual-Index Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把现有 82 条视频知识库改造成“视频案例 + 效果器索引”双入口，移除课程练习内容，并用三条结构化效果器案例验证新数据模型。

**Architecture:** 保留 `index.html` 中的 82 条记录与纯静态发布方式，新建一个可同时被浏览器和 Node 测试加载的 `src/knowledge-model.js`，负责课程模板裁剪、效果器用法兼容、分类、搜索和稳定 ID。`index.html` 只负责 DOM、路由、渲染和现有截图灯箱；Skill 导出器读取同一数据模型，确保网站与可检索记忆一致。

**Tech Stack:** 原生 HTML/CSS/JavaScript、CommonJS/UMD、Node.js `node:test`、Python `unittest`、GitHub Pages。

---

## 文件职责

- Create: `src/knowledge-model.js`：纯函数数据层；浏览器通过 `window.SfxKnowledgeModel` 使用，Node 测试通过 `require()` 使用。
- Create: `tests/knowledge-model.test.cjs`：课程模板裁剪、去重、分类、兼容转换、稳定 ID 和搜索边界测试。
- Create: `tests/dual-index-site.test.cjs`：HTML 双入口、详情顺序、深链和练习区移除的静态契约测试。
- Create: `tests/effect-use-fixtures.test.cjs`：三条结构化 `effectUses` 样例的数据与证据完整性测试。
- Create: `tests/export-site-memory.test.cjs`：Skill 镜像导出不含练习，并包含结构化效果器用法的测试。
- Create: `tests/dry-goods-contract.test.cjs`：仓库维护规则、Skill 和生成器不再要求练习字段的测试。
- Modify: `index.html`：双入口 UI、效果器索引、详情重排、稳定路由和三条样例数据。
- Modify: `tools/export-site-memory.cjs`：移除练习导出，增加结构化效果器用法导出。
- Modify: `tools/verify-plugin-tips-import.cjs`：更新导出验收合同，不再要求练习段落。
- Modify: `tools/enrich-sfx-records.cjs`：停止生成练习字段和课程模板尾句。
- Modify: `AGENTS.md`：把后续视频完成标准改为完整干货与 `effectUses`。
- Modify: `docs/learning-workflow.md`：更新网站字段和 Skill 镜像说明。
- Modify: `skills/sfx-knowledge/SKILL.md`：移除 practice tasks 用途，强调效果器证据和设计决策。
- Regenerate: `skills/sfx-knowledge/references/site-video-memory.md`：由更新后的导出器生成。

## Task 1: 建立可测试的知识模型

**Files:**
- Create: `tests/knowledge-model.test.cjs`
- Create: `src/knowledge-model.js`

- [ ] **Step 1: 写课程裁剪、兼容转换和搜索边界的失败测试**

创建 `tests/knowledge-model.test.cjs`：

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const {
  buildEffectUses,
  classifyEffectUse,
  groupEffectUses,
  searchableRecordText,
  stripCourseScaffolding,
  uniqueFacts,
} = require("../src/knowledge-model.js");

const baseRecord = {
  id: "record-a",
  videoId: "video-a",
  title: "测试视频",
  source: "测试来源",
  category: "scifi",
  secondaryCategories: [],
  summary: "保留的摘要",
  keywords: ["科技"],
  materials: ["metal body"],
  coreIdeas: ["保留瞬态"],
  chainFocus: ["EQ -> Manipulator"],
  parameterLogic: ["Dry/Wet 63%"],
  practiceChecklist: ["练习中独有的检索暗号"],
  steps: [{ order: 1, name: "处理", detail: "画面确认", params: ["Mix 63%"], imageKey: "shot-a" }],
  plugins: [{ name: "Polyverse Manipulator", purpose: "改变 pitch/formant", settings: ["Dry/Wet 63%"] }],
};

test("strips only known course suffixes and keeps factual parameters", () => {
  assert.equal(
    stripCourseScaffolding("Manipulator 参数逻辑：Dry/Wet 63%。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。"),
    "Manipulator 参数逻辑：Dry/Wet 63%。",
  );
  assert.equal(
    stripCourseScaffolding("作者在视频里说这是一次复刻，但随后展示 Mix 63%。"),
    "作者在视频里说这是一次复刻，但随后展示 Mix 63%。",
  );
});

test("deduplicates only whitespace-normalized identical facts", () => {
  assert.deepEqual(uniqueFacts(["A  B", "A B", "A B。"]), ["A  B", "A B。"]);
});

test("builds stable legacy effect uses and excludes replaced plugins", () => {
  const record = {
    ...baseRecord,
    effectUses: [{
      id: "record-a:polyverse-manipulator:1",
      name: "Polyverse Manipulator",
      category: "音高与频率",
      purpose: "保留干声并改变身份",
      replacesPluginIndexes: [0],
      stepIndex: 0,
      parameters: [{ name: "Dry/Wet", value: "63%", evidence: "画面确认" }],
      evidence: ["画面确认"],
    }],
  };
  const first = buildEffectUses([record]);
  const second = buildEffectUses([record]);
  assert.deepEqual(first, second);
  assert.equal(first.length, 1);
  assert.equal(first[0].id, "record-a:polyverse-manipulator:1");
  assert.equal(first[0].screenshotKey, "shot-a");
  assert.equal(first[0].sourceRecordId, "record-a");
  assert.deepEqual(first[0].sourcePluginIndexes, [0]);
  assert.deepEqual(first[0].sourceKeywords, ["科技"]);
  assert.deepEqual(buildEffectUses([{ ...baseRecord, plugins: [] }]), []);
});

test("classifies only one high-confidence category and falls back for mixed chains", () => {
  assert.equal(classifyEffectUse({ name: "Vocoder", purpose: "formant processing" }), "音高与频率");
  assert.equal(classifyEffectUse({ name: "EQ / Reverb", purpose: "滤波和混响" }), "未分类");
});

test("search text excludes practiceChecklist", () => {
  const text = searchableRecordText(baseRecord, "科幻/机械/UI");
  assert.match(text, /保留的摘要/);
  assert.doesNotMatch(text, /练习中独有的检索暗号/);
});

test("groups uses by normalized effect name while preserving each source use", () => {
  const grouped = groupEffectUses([
    { id: "a", name: "Vocoder", sourceRecordId: "one" },
    { id: "b", name: "IZOTOPE   VOCODER", sourceRecordId: "two" },
  ], [{ title: "iZotope Vocoder", aliases: ["Vocoder", "iZotope Vocoder"] }]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].name, "iZotope Vocoder");
  assert.deepEqual(grouped[0].uses.map((use) => use.id), ["a", "b"]);
});
```

- [ ] **Step 2: 运行测试并确认因模块不存在而失败**

Run: `node --test tests/knowledge-model.test.cjs`

Expected: FAIL，错误包含 `Cannot find module '../src/knowledge-model.js'`。

- [ ] **Step 3: 实现纯函数知识模型**

创建 `src/knowledge-model.js`，使用 UMD 暴露以下完整 API：

```js
(function attachKnowledgeModel(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.SfxKnowledgeModel = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createKnowledgeModel() {
  "use strict";

  const COURSE_SUFFIXES = [
    /\s*复习时先看每一步负责的声音角色，再看插件名称。?$/u,
    /\s*学习时给每颗插件标注“[^”]+”之一。?$/u,
    /\s*复习时先听它改变的是素材身份、频谱、运动、空间、动态还是响度，再决定是否保留。?$/u,
    /\s*复刻时只调一个核心旋钮，渲染弱\/中\/强三版并响度匹配比较。?$/u,
    /\s*复刻时不要机械抄数值，先听这些参数改变的是攻击、频段、空间、运动还是响度。?$/u,
  ];

  const CATEGORY_RULES = [
    ["频谱与音色", /\b(eq|filter|spliteq)\b|均衡|滤波|共振/iu],
    ["动态与响度", /compress|limiter|clipper|sidechain|压缩|限制|削波|侧链|响度/iu],
    ["饱和与失真", /saturat|distort|exciter|饱和|失真|谐波增强/iu],
    ["音高与频率", /pitch|formant|vocoder|frequency shift|音高|共振峰|声码|频移/iu],
    ["调制与运动", /phaser|flanger|chorus|tremolo|doppler|stereo motion|移相|镶边|合唱|颤音|多普勒/iu],
    ["空间与时间", /reverb|delay|echo|granular|convolution|混响|延迟|回声|颗粒|卷积/iu],
    ["修复与非常规处理", /\brx\b|de-click|de-clip|de-noise|修复|去噪/iu],
    ["自动化、脚本与路由", /automation|script|routing|rtpc|包络|脚本|路由|中间件/iu],
  ];

  function cleanText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function stripCourseScaffolding(value) {
    let output = String(value == null ? "" : value).trim();
    for (const pattern of COURSE_SUFFIXES) output = output.replace(pattern, "").trim();
    return output;
  }

  function uniqueFacts(items) {
    const seen = new Set();
    const output = [];
    for (const item of Array.isArray(items) ? items : []) {
      const cleaned = stripCourseScaffolding(item);
      const key = cleanText(cleaned);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      output.push(cleaned);
    }
    return output;
  }

  function normalizedEffectName(value) {
    return cleanText(value).normalize("NFKC").toLowerCase();
  }

  function canonicalEffectName(value, referenceCatalog) {
    const original = cleanText(value);
    const normalized = normalizedEffectName(original);
    for (const reference of Array.isArray(referenceCatalog) ? referenceCatalog : []) {
      const aliases = [reference.title, ...(reference.aliases || [])];
      if (aliases.some((alias) => normalizedEffectName(alias) === normalized)) {
        return cleanText(reference.title) || original;
      }
    }
    return original;
  }

  function effectSlug(value) {
    return normalizedEffectName(value)
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "effect";
  }

  function inferEvidence(value) {
    const text = cleanText(value);
    const labels = [];
    if (/画面事实|画面确认|可见参数|截图显示/u.test(text)) labels.push("画面确认");
    if (/作者口述|作者说明/u.test(text)) labels.push("作者口述");
    if (/分析推断|分析建议/u.test(text)) labels.push("分析推断");
    if (/视频未展示|未显示具体数值|精确值未公开/u.test(text)) labels.push("视频未展示");
    return labels;
  }

  function classifyEffectUse(effect) {
    if (cleanText(effect && effect.category)) return cleanText(effect.category);
    const text = [effect && effect.name, effect && effect.purpose, effect && effect.target]
      .map(cleanText)
      .join(" ");
    const matches = CATEGORY_RULES.filter((entry) => entry[1].test(text));
    return matches.length === 1 ? matches[0][0] : "未分类";
  }

  function normalizeParameters(parameters, settings) {
    if (Array.isArray(parameters) && parameters.length) {
      return parameters.map((parameter) => ({
        name: cleanText(parameter.name) || "参数",
        value: cleanText(parameter.value),
        direction: cleanText(parameter.direction),
        evidence: cleanText(parameter.evidence),
      })).filter((parameter) => parameter.value || parameter.direction);
    }
    return uniqueFacts(settings).map((setting) => ({
      name: "参数线索",
      value: setting,
      direction: "",
      evidence: inferEvidence(setting)[0] || "",
    }));
  }

  function normalizeUse(record, effect, index, legacy) {
    const stepIndex = Number.isInteger(effect.stepIndex) ? effect.stepIndex : -1;
    const step = stepIndex >= 0 ? (record.steps || [])[stepIndex] : null;
    const sourcePluginIndexes = legacy
      ? [index]
      : (effect.replacesPluginIndexes || []).filter(Number.isInteger);
    const purpose = stripCourseScaffolding(effect.purpose);
    const settings = Array.isArray(effect.settings) ? effect.settings : [];
    const parameters = normalizeParameters(effect.parameters, settings);
    const evidence = uniqueFacts([
      ...(Array.isArray(effect.evidence) ? effect.evidence : []),
      ...inferEvidence([purpose, effect.result, effect.limitations, ...settings].join(" ")),
    ]);
    const name = cleanText(effect.name) || "未命名处理";
    return {
      id: cleanText(effect.id) || `${record.id}:effect:${effectSlug(name)}:${index + 1}`,
      name,
      vendor: cleanText(effect.vendor),
      category: classifyEffectUse(effect),
      target: stripCourseScaffolding(effect.target),
      chainPosition: stripCourseScaffolding(effect.chainPosition),
      purpose,
      parameters,
      result: stripCourseScaffolding(effect.result),
      interactions: stripCourseScaffolding(effect.interactions),
      limitations: stripCourseScaffolding(effect.limitations),
      timestamp: cleanText(effect.timestamp),
      stepIndex,
      screenshotKey: cleanText(effect.screenshotKey) || cleanText(step && step.imageKey),
      evidence,
      sourceRecordId: record.id,
      sourceVideoId: record.videoId,
      sourceTitle: record.title,
      source: record.source,
      sourceKeywords: uniqueFacts(record.keywords || []),
      sourcePluginIndexes,
      legacy: Boolean(legacy),
    };
  }

  function buildEffectUses(records) {
    const output = [];
    for (const record of Array.isArray(records) ? records : []) {
      const explicit = Array.isArray(record.effectUses) ? record.effectUses : [];
      const replaced = new Set(explicit.flatMap((effect) => effect.replacesPluginIndexes || []));
      explicit.forEach((effect, index) => output.push(normalizeUse(record, effect, index, false)));
      (record.plugins || []).forEach((plugin, index) => {
        if (replaced.has(index) || !cleanText(plugin && plugin.name)) return;
        output.push(normalizeUse(record, plugin, index, true));
      });
    }
    return output;
  }

  function searchableRecordText(record, categoryLabel) {
    return [
      record.title,
      record.source,
      record.addedAt,
      record.updatedAt,
      record.updateNote,
      categoryLabel,
      record.summary,
      ...(record.keywords || []),
      ...(record.materials || []),
      ...(record.coreIdeas || []),
      ...(record.chainFocus || []),
      ...(record.parameterLogic || []),
      ...(record.tips || []),
      ...(record.plugins || []).flatMap((plugin) => [plugin.name, plugin.purpose, ...(plugin.settings || [])]),
      ...(record.steps || []).flatMap((step) => [step.name, step.detail, ...(step.params || [])]),
      ...(record.effectUses || []).flatMap((effect) => [
        effect.name,
        effect.vendor,
        effect.category,
        effect.target,
        effect.chainPosition,
        effect.purpose,
        effect.result,
        effect.interactions,
        effect.limitations,
        ...(effect.parameters || []).flatMap((parameter) => [parameter.name, parameter.value, parameter.direction]),
      ]),
    ].map(stripCourseScaffolding).join(" ").toLowerCase();
  }

  function groupEffectUses(uses, referenceCatalog) {
    const groups = new Map();
    for (const use of Array.isArray(uses) ? uses : []) {
      const canonicalName = canonicalEffectName(use.name, referenceCatalog);
      const key = normalizedEffectName(canonicalName);
      if (!groups.has(key)) groups.set(key, { name: canonicalName, uses: [] });
      groups.get(key).uses.push(use);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, "zh-CN", { numeric: true }));
  }

  return {
    buildEffectUses,
    canonicalEffectName,
    classifyEffectUse,
    effectSlug,
    groupEffectUses,
    inferEvidence,
    searchableRecordText,
    stripCourseScaffolding,
    uniqueFacts,
  };
});
```

- [ ] **Step 4: 运行模型测试并确认通过**

Run: `node --test tests/knowledge-model.test.cjs`

Expected: 6 tests PASS，0 FAIL。

- [ ] **Step 5: 提交知识模型**

```powershell
git add src/knowledge-model.js tests/knowledge-model.test.cjs
git commit -m "Add effect-use knowledge model"
```

## Task 2: 增加双入口页面骨架

**Files:**
- Create: `tests/dual-index-site.test.cjs`
- Modify: `index.html:91-245`
- Modify: `index.html:693-754`

- [ ] **Step 1: 写双入口 HTML 契约的失败测试**

创建 `tests/dual-index-site.test.cjs`：

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");

test("loads the shared knowledge model before the inline application", () => {
  const modelIndex = html.indexOf('<script src="src/knowledge-model.js"></script>');
  const appIndex = html.indexOf("const categories = [");
  assert.ok(modelIndex >= 0);
  assert.ok(modelIndex < appIndex);
});

test("contains accessible video and effect index modes", () => {
  assert.match(html, /id="viewSwitch"[^>]*role="tablist"/);
  assert.match(html, /data-mode="videos"[^>]*>视频案例</);
  assert.match(html, /data-mode="effects"[^>]*>效果器索引</);
  assert.match(html, /id="videoLibrary"/);
  assert.match(html, /id="effectLibrary"[^>]*hidden/);
});

test("contains effect filters, list and explicit empty-state targets", () => {
  assert.match(html, /id="effectCategoryFilter"/);
  assert.match(html, /id="effectEvidenceFilter"/);
  assert.match(html, /id="effectResultCount"/);
  assert.match(html, /id="effectList"/);
});

test("removes course-oriented interface copy", () => {
  assert.doesNotMatch(html, /沉浸式学习模式/);
  assert.doesNotMatch(html, /学习时间：最新优先/);
});
```

- [ ] **Step 2: 运行测试并确认双入口尚不存在**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: 4 tests FAIL，失败内容指向缺失的 `viewSwitch`、`effectLibrary` 和模型脚本。

- [ ] **Step 3: 在 Hero 中加入分段控制和效果器筛选**

在 `hero-inner` 中把现有工具栏替换为：

```html
<div class="view-switch" id="viewSwitch" role="tablist" aria-label="知识库视图">
  <button class="view-switch-button active" type="button" role="tab" aria-selected="true" data-mode="videos">视频案例</button>
  <button class="view-switch-button" type="button" role="tab" aria-selected="false" data-mode="effects">效果器索引</button>
</div>
<div class="toolbar">
  <input id="search" class="search" type="search" placeholder="搜索视频、设计目标、效果器、参数或素材...">
  <select id="effectCategoryFilter" class="select" aria-label="效果器功能筛选" hidden>
    <option value="all">全部效果器功能</option>
  </select>
  <select id="effectEvidenceFilter" class="select" aria-label="证据状态筛选" hidden>
    <option value="all">全部证据状态</option>
    <option value="画面确认">画面确认</option>
    <option value="作者口述">作者口述</option>
    <option value="音频可辨">音频可辨</option>
    <option value="分析推断">分析推断</option>
    <option value="视频未展示">视频未展示</option>
    <option value="unstructured">尚未结构化</option>
  </select>
  <select id="sourceFilter" class="select" aria-label="来源筛选">
    <option value="all">全部来源</option>
  </select>
  <select id="sortOrder" class="select" aria-label="排序方式">
    <option value="updatedDesc">更新时间：最新优先</option>
    <option value="updatedAsc">更新时间：最早优先</option>
    <option value="addedDesc">收录时间：最新优先</option>
    <option value="titleAsc">标题：A-Z / 拼音</option>
  </select>
</div>
```

同时把 Hero 说明改成“按视频案例学习设计思路，也可跨视频检索效果器实际用法”，不再使用课程、练习或学习时长措辞。

- [ ] **Step 4: 把列表区域拆成视频与效果器两个投影**

把 `libraryView` 内容替换为：

```html
<section class="library-view" id="libraryView">
  <section id="videoLibrary" aria-labelledby="videosModeLabel">
    <h2 class="visually-hidden" id="videosModeLabel">视频案例</h2>
    <nav class="tabs" id="tabs" aria-label="音效分类页签"></nav>
    <div class="results-bar">
      <span id="resultCount"></span>
      <span class="category-note" id="categoryNote"></span>
    </div>
    <div class="grid" id="grid"></div>
  </section>

  <section id="effectLibrary" aria-labelledby="effectsModeLabel" hidden>
    <h2 class="visually-hidden" id="effectsModeLabel">效果器索引</h2>
    <div class="results-bar">
      <span id="effectResultCount"></span>
      <span class="category-note">每一条用法都保留独立视频来源</span>
    </div>
    <div class="effect-list" id="effectList"></div>
  </section>
</section>
```

把 reader hint 改为：

```html
<div class="reader-hint" id="readerHint">完整案例阅读</div>
```

在主应用脚本前加入：

```html
<script src="src/knowledge-model.js"></script>
```

- [ ] **Step 5: 加入稳定尺寸和响应式样式**

在现有 `.toolbar`、`.tabs` 和 `.results-bar` 样式附近加入：

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.view-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(112px, 1fr));
  gap: 4px;
  margin-top: 22px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.66);
}
.view-switch-button {
  min-height: 38px;
  padding: 7px 12px;
  border: 0;
  border-radius: 6px;
  color: var(--muted);
  background: transparent;
  cursor: pointer;
  font-weight: 900;
}
.view-switch-button.active {
  color: #fff;
  background: var(--ink);
}
.effect-list {
  display: grid;
  gap: 18px;
}
.effect-group {
  border-top: 1px solid var(--line);
}
.effect-group-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 0 8px;
}
.effect-group-header h3 {
  margin: 0;
  font-size: 18px;
}
.effect-use-row {
  width: 100%;
  min-height: 74px;
  display: grid;
  grid-template-columns: minmax(150px, 0.7fr) minmax(240px, 1.3fr) minmax(170px, 0.8fr);
  gap: 16px;
  align-items: start;
  padding: 12px 0;
  border: 0;
  border-top: 1px solid rgba(44, 50, 49, 0.12);
  color: var(--ink);
  background: transparent;
  cursor: pointer;
  text-align: left;
}
.effect-use-row:hover,
.effect-use-row:focus-visible {
  background: rgba(15, 139, 141, 0.06);
  outline: none;
}
.effect-use-purpose,
.effect-use-target,
.effect-use-source {
  line-height: 1.55;
}
.effect-use-target,
.effect-use-evidence {
  color: var(--muted);
  font-size: 12px;
}
.effect-use-source {
  color: var(--muted);
  font-size: 12px;
}
@media (max-width: 760px) {
  .effect-use-row { grid-template-columns: 1fr; gap: 6px; }
  .view-switch { width: 100%; }
}
```

把 `.toolbar` 的桌面网格改为：

```css
.toolbar {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) repeat(4, auto);
  gap: 12px;
  max-width: 1180px;
  margin: 14px auto 0;
}
```

- [ ] **Step 6: 运行页面契约测试并确认通过**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: 4 tests PASS，0 FAIL。

- [ ] **Step 7: 提交双入口骨架**

```powershell
git add index.html tests/dual-index-site.test.cjs
git commit -m "Add video and effect index views"
```

## Task 3: 实现效果器索引、筛选和稳定深链

**Files:**
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `index.html:31281-31722`

- [ ] **Step 1: 增加效果器渲染与路由的失败测试**

向 `tests/dual-index-site.test.cjs` 追加：

```js
test("builds and renders the effect-use projection", () => {
  assert.match(html, /SfxKnowledgeModel\.buildEffectUses\(records\)/);
  assert.match(html, /function filteredEffectUses\(\)/);
  assert.match(html, /function renderEffectLibrary\(\)/);
  assert.match(html, /function renderEffectDetail\(effectId\)/);
  assert.match(html, /state\.effectEvidence/);
  assert.match(html, /use\.sourceKeywords/);
  assert.match(html, /canonicalEffectName\(use\.name, pluginReferenceCatalog\)/);
});

test("supports stable video and effect hash routes", () => {
  assert.match(html, /function parseHashRoute\(\)/);
  assert.match(html, /params\.get\("video"\)/);
  assert.match(html, /params\.get\("effect"\)/);
  assert.match(html, /window\.addEventListener\("hashchange"/);
});

test("effect rows open independent uses and can return to a video", () => {
  assert.match(html, /data-effect-id=/);
  assert.match(html, /data-open-video=/);
  assert.match(html, /查看完整视频案例/);
  assert.match(html, /effect-use-target/);
  assert.match(html, /effect-use-evidence/);
});
```

- [ ] **Step 2: 运行测试并确认效果器逻辑尚未实现**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: 新增的 3 tests FAIL。

- [ ] **Step 3: 扩展状态和 DOM 引用**

在 `categoryById` 之后加入：

```js
const effectUses = SfxKnowledgeModel.buildEffectUses(records);
const effectCategories = ["频谱与音色", "动态与响度", "饱和与失真", "音高与频率", "调制与运动", "空间与时间", "修复与非常规处理", "自动化、脚本与路由", "未分类"];
const state = {
  mode: "videos",
  category: "all",
  effectCategory: "all",
  effectEvidence: "all",
  query: "",
  source: "all",
  sort: "updatedDesc",
  activeId: "",
  activeEffectId: "",
  view: "library",
  returnMode: "videos",
};
```

删除旧的单行 `state`，并加入以下 DOM 引用：

```js
const viewSwitchEl = document.getElementById("viewSwitch");
const videoLibraryEl = document.getElementById("videoLibrary");
const effectLibraryEl = document.getElementById("effectLibrary");
const effectCategoryEl = document.getElementById("effectCategoryFilter");
const effectEvidenceEl = document.getElementById("effectEvidenceFilter");
const effectCountEl = document.getElementById("effectResultCount");
const effectListEl = document.getElementById("effectList");
const readerHintEl = document.getElementById("readerHint");
```

在来源选项初始化后加入：

```js
effectCategoryEl.innerHTML += effectCategories.map((category) =>
  '<option value="' + escapeAttr(category) + '">' + escapeHtml(category) + '</option>'
).join("");
```

- [ ] **Step 4: 实现效果器筛选、分组和列表渲染**

在 `filteredRecords()` 后加入：

```js
function effectSearchable(use) {
  return [
    use.name,
    SfxKnowledgeModel.canonicalEffectName(use.name, pluginReferenceCatalog),
    use.vendor,
    use.category,
    use.target,
    use.chainPosition,
    use.purpose,
    use.result,
    use.interactions,
    use.limitations,
    use.sourceTitle,
    use.source,
    ...(use.sourceKeywords || []),
    ...(use.evidence || []),
    ...(use.parameters || []).flatMap((parameter) => [parameter.name, parameter.value, parameter.direction]),
  ].join(" ").toLowerCase();
}

function filteredEffectUses() {
  const query = state.query.trim().toLowerCase();
  return effectUses.filter((use) => {
    const categoryMatch = state.effectCategory === "all" || use.category === state.effectCategory;
    const sourceMatch = state.source === "all" || use.source === state.source;
    const evidenceMatch = state.effectEvidence === "all"
      || (state.effectEvidence === "unstructured"
        ? !(use.evidence || []).length
        : (use.evidence || []).includes(state.effectEvidence));
    const queryMatch = !query || effectSearchable(use).includes(query);
    return categoryMatch && sourceMatch && evidenceMatch && queryMatch;
  });
}

function effectParameterSummary(use) {
  const parameter = (use.parameters || [])[0];
  if (!parameter) return "参数尚未结构化";
  return [parameter.name, parameter.value || parameter.direction].filter(Boolean).join(": ");
}

function renderModeSwitch() {
  viewSwitchEl.querySelectorAll("[data-mode]").forEach((button) => {
    const active = button.dataset.mode === state.mode;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });
  videoLibraryEl.hidden = state.mode !== "videos";
  effectLibraryEl.hidden = state.mode !== "effects";
  effectCategoryEl.hidden = state.mode !== "effects";
  effectEvidenceEl.hidden = state.mode !== "effects";
  sortEl.hidden = state.mode !== "videos";
  searchEl.placeholder = state.mode === "effects"
    ? "搜索效果器、用途、参数、素材或来源视频..."
    : "搜索视频、设计目标、效果器、参数或素材...";
}

function renderEffectLibrary() {
  const list = filteredEffectUses();
  const groups = SfxKnowledgeModel.groupEffectUses(list, pluginReferenceCatalog);
  effectCountEl.textContent = "当前显示 " + list.length + " 条用法 / " + groups.length + " 个效果器";
  if (!list.length) {
    effectListEl.innerHTML = '<div class="empty">没有匹配的效果器用法。</div>';
    return;
  }
  effectListEl.innerHTML = groups.map((group) =>
    '<section class="effect-group">' +
      '<div class="effect-group-header"><h3>' + escapeHtml(group.name) + '</h3><span>' + group.uses.length + ' 个视频用法</span></div>' +
      group.uses.map((use) =>
        '<button class="effect-use-row" type="button" data-effect-id="' + escapeAttr(use.id) + '">' +
          '<span><strong>' + escapeHtml(use.category) + '</strong><br>' + escapeHtml(use.vendor || "厂商未记录") + '<br>' + escapeHtml(effectParameterSummary(use)) + '</span>' +
          '<span class="effect-use-purpose"><span class="effect-use-target">' + escapeHtml(use.target || "处理对象未展示") + '</span><br>' + escapeHtml(use.purpose || "该条记录尚未补充用途") + '</span>' +
          '<span class="effect-use-source">' + escapeHtml(use.sourceTitle) + '<br>' + escapeHtml(Number.isInteger(use.stepIndex) && use.stepIndex >= 0 ? "步骤 " + (use.stepIndex + 1) : "步骤未关联") + (use.timestamp ? '<br>' + escapeHtml("时间 " + use.timestamp) : '') + '<br><span class="effect-use-evidence">' + escapeHtml((use.evidence || []).join(" / ") || "证据尚未结构化") + '</span></span>' +
        '</button>'
      ).join("") +
    '</section>'
  ).join("");
}
```

- [ ] **Step 5: 实现效果器详情与视频回链**

在 `renderDetail()` 前加入：

```js
function renderEvidenceLabels(labels) {
  if (!Array.isArray(labels) || !labels.length) return '<span class="chip">尚未结构化证据</span>';
  return labels.map((label) => '<span class="chip">' + escapeHtml(label) + '</span>').join("");
}

function renderEffectDetail(effectId) {
  const use = effectUses.find((item) => item.id === effectId);
  if (!use) {
    detailEl.innerHTML = '<div class="detail-body"><div class="empty">找不到这个效果器用法。</div></div>';
    return;
  }
  const parameterHtml = (use.parameters || []).map((parameter) =>
    '<div class="effect-parameter"><strong>' + escapeHtml(parameter.name) + '</strong>' +
    '<span>' + escapeHtml(parameter.value || parameter.direction) + '</span>' +
    (parameter.evidence ? '<span class="chip">' + escapeHtml(parameter.evidence) + '</span>' : '') + '</div>'
  ).join("") || '<div class="empty">该视频没有展示可确认的具体参数。</div>';
  const sourceRecord = records.find((record) => record.id === use.sourceRecordId);
  const pluginReferenceHtml = sourceRecord
    ? (use.sourcePluginIndexes || []).map((pluginIndex) => {
      const plugin = (sourceRecord.plugins || [])[pluginIndex];
      return plugin ? renderPluginReferences(sourceRecord, plugin, pluginIndex) : "";
    }).join("")
    : "";
  const shotHtml = use.screenshotKey
    ? '<button class="step-shot" type="button" data-effect-shot="' + escapeAttr(use.screenshotKey) + '" aria-label="放大效果器证据截图：' + escapeAttr(use.name) + '">' +
      '<img data-shot-preview="' + escapeAttr(use.screenshotKey) + '" alt="' + escapeAttr(use.name + " 参数截图") + '" loading="lazy" decoding="async"><span>截图准备中，稍后可放大查看</span></button>'
    : '';
  detailEl.innerHTML =
    '<div class="detail-body">' +
      '<div class="card-meta"><span>' + escapeHtml(use.category) + '</span><span>' + escapeHtml(use.vendor || "厂商未记录") + '</span></div>' +
      '<h2 class="detail-title">' + escapeHtml(use.name) + '</h2>' +
      '<p class="detail-summary">' + escapeHtml(use.purpose || "该条用途尚未结构化") + '</p>' +
      '<button class="open-video" type="button" data-open-video="' + escapeAttr(use.sourceRecordId) + '">查看完整视频案例</button>' +
      '<div class="section"><h3>处理对象与链路位置</h3><div class="learning-point">' + escapeHtml(use.target || "视频未展示处理对象") + '</div><div class="learning-point">' + escapeHtml(use.chainPosition || "视频未展示链路位置") + '</div></div>' +
      '<div class="section"><h3>参数与调节方向</h3>' + parameterHtml + '</div>' +
      (use.result ? '<div class="section"><h3>处理结果</h3><div class="learning-point">' + escapeHtml(use.result) + '</div></div>' : '') +
      (use.interactions ? '<div class="section"><h3>与前后级关系</h3><div class="learning-point">' + escapeHtml(use.interactions) + '</div></div>' : '') +
      (use.limitations ? '<div class="section"><h3>限制与边界</h3><div class="learning-point">' + escapeHtml(use.limitations) + '</div></div>' : '') +
      '<div class="section"><h3>证据</h3><div class="chips">' + renderEvidenceLabels(use.evidence) + '</div>' + shotHtml + pluginReferenceHtml + '</div>' +
      '<div class="section"><h3>来源视频</h3><div class="learning-point">' + escapeHtml(sourceRecord ? sourceRecord.title : use.sourceTitle) + (Number.isInteger(use.stepIndex) && use.stepIndex >= 0 ? '<br>' + escapeHtml("步骤 " + (use.stepIndex + 1)) : '') + (use.timestamp ? '<br>' + escapeHtml("时间 " + use.timestamp) : '') + '</div></div>' +
    '</div>';
  loadDetailPreviews();
}
```

扩展 `detailEl` 点击处理，在插件截图分支之前加入：

```js
const openVideoButton = target.closest ? target.closest("[data-open-video]") : null;
if (openVideoButton) {
  state.returnMode = "effects";
  state.activeId = openVideoButton.dataset.openVideo;
  openVideoDetail(state.activeId, true);
  return;
}
const effectShot = target.closest ? target.closest("[data-effect-shot]") : null;
if (effectShot) {
  const key = effectShot.dataset.effectShot;
  openLightbox(imageAsset("full", key) || imageAsset("preview", key), "效果器证据截图");
  return;
}
```

- [ ] **Step 6: 实现哈希路由和视图事件**

在 `showReader()` 后加入：

```js
function writeHashRoute(values, replace = false) {
  const params = new URLSearchParams(values);
  const url = window.location.pathname + window.location.search + "#" + params.toString();
  window.history[replace ? "replaceState" : "pushState"](null, "", url);
}

function parseHashRoute() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    video: params.get("video"),
    effect: params.get("effect"),
    view: params.get("view"),
  };
}

function openVideoDetail(recordId, syncHash) {
  const record = records.find((item) => item.id === recordId);
  if (!record) {
    detailEl.innerHTML = '<div class="detail-body"><div class="empty">找不到这个视频案例。</div></div>';
    showReader();
    return;
  }
  state.activeId = recordId;
  state.activeEffectId = "";
  readerHintEl.textContent = "完整案例阅读";
  renderDetail();
  showReader();
  if (syncHash) writeHashRoute({ video: recordId });
}

function openEffectDetail(effectId, syncHash) {
  state.activeEffectId = effectId;
  state.returnMode = "effects";
  readerHintEl.textContent = "效果器实际用法";
  renderEffectDetail(effectId);
  showReader();
  if (syncHash) writeHashRoute({ effect: effectId });
}

function applyHashRoute() {
  const route = parseHashRoute();
  if (route.effect) return openEffectDetail(route.effect, false);
  if (route.video) return openVideoDetail(route.video, false);
  state.mode = route.view === "effects" ? "effects" : "videos";
  showLibrary();
  render();
}
```

增加事件监听：

```js
viewSwitchEl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-mode]");
  if (!button) return;
  state.mode = button.dataset.mode;
  state.returnMode = state.mode;
  writeHashRoute({ view: state.mode });
  render();
});

effectCategoryEl.addEventListener("change", (event) => {
  state.effectCategory = event.target.value;
  renderEffectLibrary();
});

effectEvidenceEl.addEventListener("change", (event) => {
  state.effectEvidence = event.target.value;
  renderEffectLibrary();
});

effectListEl.addEventListener("click", (event) => {
  const row = event.target.closest("[data-effect-id]");
  if (!row) return;
  openEffectDetail(row.dataset.effectId, true);
});

window.addEventListener("hashchange", applyHashRoute);
```

把现有 `document` 键盘监听中的 reader `Escape` 分支改成同步返回路由：

```js
if (event.key === "Escape" && state.view === "reader") {
  state.mode = state.returnMode;
  writeHashRoute({ view: state.mode });
  showLibrary();
  render();
}
```

把视频卡点击中的 `renderDetail(); showReader();` 改为：

```js
state.returnMode = "videos";
openVideoDetail(card.dataset.id, true);
```

把返回按钮处理改为：

```js
backToLibraryEl.addEventListener("click", () => {
  state.mode = state.returnMode;
  writeHashRoute({ view: state.mode });
  showLibrary();
  render();
});
```

把初始 `render();` 改为：

```js
applyHashRoute();
```

- [ ] **Step 7: 更新总渲染函数并运行测试**

把 `render()` 改为：

```js
function render() {
  renderModeSwitch();
  if (state.mode === "videos") {
    renderTabs();
    renderGrid();
  } else {
    renderEffectLibrary();
  }
}
```

Run: `node --test tests/knowledge-model.test.cjs tests/dual-index-site.test.cjs`

Expected: 13 tests PASS，0 FAIL。

- [ ] **Step 8: 提交效果器索引与路由**

```powershell
git add index.html tests/dual-index-site.test.cjs
git commit -m "Implement effect index and deep links"
```

## Task 4: 重排视频详情并移除练习呈现

**Files:**
- Modify: `tests/dual-index-site.test.cjs`
- Modify: `index.html:31324-31341`
- Modify: `index.html:31454-31579`

- [ ] **Step 1: 写详情顺序和练习排除的失败测试**

向 `tests/dual-index-site.test.cjs` 追加：

```js
test("video detail follows the dry-goods reading order", () => {
  const start = html.indexOf("function renderDetail()");
  const end = html.indexOf("function openLightbox", start);
  const block = html.slice(start, end);
  const headings = ["设计目标", "设计思路", "素材与分层", "完整制作流程", "完整效果链", "效果器用法", "关键决策与证据边界", "来源与关键词"];
  let cursor = -1;
  for (const heading of headings) {
    const next = block.indexOf(heading);
    assert.ok(next > cursor, `${heading} must appear after the previous section`);
    cursor = next;
  }
  assert.ok(block.indexOf("打开原视频") > block.indexOf("来源与关键词"));
});

test("practiceChecklist is absent from rendering and search", () => {
  const searchStart = html.indexOf("function searchable(record)");
  const searchEnd = html.indexOf("function recordTime", searchStart);
  const detailStart = html.indexOf("function renderDetail()");
  const detailEnd = html.indexOf("function openLightbox", detailStart);
  assert.doesNotMatch(html.slice(searchStart, searchEnd), /practiceChecklist/);
  assert.doesNotMatch(html.slice(detailStart, detailEnd), /practiceChecklist|练习复盘/);
  assert.doesNotMatch(html.slice(detailStart, detailEnd), /<span>学习 /);
});

test("historical course suffixes pass through the conservative cleaner", () => {
  assert.match(html, /SfxKnowledgeModel\.stripCourseScaffolding/);
  assert.match(html, /SfxKnowledgeModel\.uniqueFacts/);
  const summaryStart = html.indexOf("function renderEffectUseSummary");
  const summaryEnd = html.indexOf("function renderDetail", summaryStart);
  assert.match(html.slice(summaryStart, summaryEnd), /renderPluginReferences/);
});
```

- [ ] **Step 2: 运行测试并确认旧详情顺序失败**

Run: `node --test tests/dual-index-site.test.cjs`

Expected: 新增的 3 tests FAIL。

- [ ] **Step 3: 从视频搜索索引移除练习字段**

把 `searchable(record)` 替换为：

```js
function searchable(record) {
  return SfxKnowledgeModel.searchableRecordText(record, categoryById[record.category]?.label || "");
}
```

- [ ] **Step 4: 增加保守清洗和效果器摘要渲染函数**

在 `listSection()` 后加入：

```js
function cleanedFacts(items) {
  return SfxKnowledgeModel.uniqueFacts(items).filter(Boolean);
}

function renderEffectUseSummary(record, use) {
  const parameters = (use.parameters || []).slice(0, 6).map((parameter) =>
    '<span class="chip">' + escapeHtml([parameter.name, parameter.value || parameter.direction].filter(Boolean).join(": ")) + '</span>'
  ).join("");
  const referenceHtml = (use.sourcePluginIndexes || []).map((pluginIndex) => {
    const plugin = (record.plugins || [])[pluginIndex];
    return plugin ? renderPluginReferences(record, plugin, pluginIndex) : "";
  }).join("");
  return '<div class="plugin effect-use-summary">' +
    '<strong>' + escapeHtml(use.name) + '</strong>' +
    '<div>' + escapeHtml(use.purpose || use.target || "用途尚未结构化") + '</div>' +
    (parameters ? '<div class="chips plugin-settings">' + parameters + '</div>' : '') +
    '<button class="effect-source-link" type="button" data-effect-id="' + escapeAttr(use.id) + '">查看跨视频用法</button>' +
    referenceHtml +
  '</div>';
}
```

在 `detailEl` 点击处理的最前面加入：

```js
const effectSummary = target.closest ? target.closest("[data-effect-id]") : null;
if (effectSummary) {
  openEffectDetail(effectSummary.dataset.effectId, true);
  return;
}
```

- [ ] **Step 5: 按批准顺序重写 `renderDetail()`**

保留现有步骤截图和插件参考辅助函数，把 `renderDetail()` 的数据准备与 `detailEl.innerHTML` 改为：

```js
function renderDetail() {
  const record = records.find((item) => item.id === state.activeId);
  if (!record) return;
  const category = categoryById[record.category];
  const designIdeas = cleanedFacts(record.coreIdeas || []);
  const chainFacts = cleanedFacts(record.chainFocus || []);
  const decisionFacts = cleanedFacts([...(record.parameterLogic || []), ...(record.tips || [])]);
  const recordEffects = effectUses.filter((use) => use.sourceRecordId === record.id);
  const stepHtml = (record.steps || []).map((step, index) => {
    const motion = step.motion && step.motion.src ? step.motion : null;
    const shotHtml = step.imageKey
      ? '<button class="step-shot' + (motion ? ' has-motion' : '') + '" type="button" data-step-index="' + index + '" data-image-key="' + escapeAttr(step.imageKey) + '"' +
        (motion ? ' data-motion-src="' + escapeAttr(motion.src) + '" data-motion-poster="' + escapeAttr(motion.poster || imageAsset("preview", step.imageKey)) + '"' : '') +
        ' aria-label="' + escapeAttr((motion ? "播放流程动图：" : "放大步骤截图：") + step.name) + '">' +
        '<img data-shot-preview="' + escapeAttr(step.imageKey) + '" alt="' + escapeAttr(record.title + " - " + step.name) + '" loading="lazy" decoding="async">' +
        '<span>' + (motion ? '动图准备中，稍后可播放' : '截图准备中，稍后可放大查看') + '</span>' +
        (motion ? '<span class="step-motion-badge">1080p 动图</span>' : '') +
        '</button>'
      : '';
    const detail = SfxKnowledgeModel.stripCourseScaffolding(step.detail);
    const params = cleanedFacts(step.params || []);
    return '<div class="step">' + shotHtml + '<div><strong>' + escapeHtml(step.order + ". " + step.name) + '</strong><p>' + escapeHtml(detail) + '</p>' +
      (params.length ? '<div class="chips">' + params.slice(0, 8).map((param) => '<span class="chip">' + escapeHtml(param) + '</span>').join("") + '</div>' : '') +
      '</div></div>';
  }).join("");
  const materials = cleanedFacts(record.materials || []);
  const keywords = cleanedFacts(record.keywords || []);

  detailEl.innerHTML =
    '<div class="detail-cover"><img src="' + thumbnail(record, "hqdefault") + '" alt="' + escapeAttr(record.title) + '" loading="lazy" decoding="async" onerror="this.style.display=\'none\'"></div>' +
    '<div class="detail-body">' +
      '<h2 class="detail-title">' + escapeHtml(record.title) + '</h2>' +
      '<div class="card-meta"><span>' + escapeHtml(category.label) + '</span><span>' + escapeHtml(record.source) + '</span><span>收录 ' + escapeHtml(record.addedAt || "") + '</span><span>更新 ' + escapeHtml(record.updatedAt || record.addedAt || "") + '</span></div>' +
      '<div class="section"><h3>设计目标</h3><p class="detail-summary">' + escapeHtml(record.summary) + '</p></div>' +
      listSection("设计思路", designIdeas, "idea") +
      '<div class="section"><h3>素材与分层</h3><div class="chips">' + materials.map((material) => '<span class="chip">' + escapeHtml(material) + '</span>').join("") + '</div></div>' +
      '<div class="section"><h3>完整制作流程</h3>' + stepHtml + '</div>' +
      listSection("完整效果链", chainFacts, "learning-point") +
      '<div class="section"><h3>效果器用法</h3>' + recordEffects.map((use) => renderEffectUseSummary(record, use)).join("") + '</div>' +
      listSection("关键决策与证据边界", decisionFacts, "learning-point") +
      '<div class="section"><h3>来源与关键词</h3><div class="learning-point"><strong>来源频道：</strong>' + escapeHtml(record.source) + '</div><a class="open-video" href="' + escapeAttr(record.url) + '" target="_blank" rel="noopener">打开原视频</a><div class="chips">' + keywords.slice(0, 24).map((keyword) => '<span class="chip">' + escapeHtml(keyword) + '</span>').join("") + '</div></div>' +
    '</div>';
  loadDetailPreviews();
}
```

把 `.effect-use-summary` 设为完整宽度并维持文本按钮语义：

```css
.effect-use-summary {
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
}
.effect-source-link {
  display: inline-block;
  margin-top: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--blue);
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
}
.effect-parameter {
  display: grid;
  grid-template-columns: minmax(120px, 0.35fr) minmax(180px, 1fr) auto;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid var(--line);
}
@media (max-width: 640px) {
  .effect-parameter { grid-template-columns: 1fr; }
}
```

- [ ] **Step 6: 运行模型和页面契约测试**

Run: `node --test tests/knowledge-model.test.cjs tests/dual-index-site.test.cjs`

Expected: 16 tests PASS，0 FAIL。

- [ ] **Step 7: 提交详情重排**

```powershell
git add index.html tests/dual-index-site.test.cjs
git commit -m "Refocus video details on complete dry goods"
```

## Task 5: 补录三条结构化效果器样例

**Files:**
- Create: `tests/effect-use-fixtures.test.cjs`
- Modify: `index.html` records `d8ed0db4`, `upy3d1em`, `yt-f9OrpDtedSI`

- [ ] **Step 1: 写三条样例的数据失败测试**

创建 `tests/effect-use-fixtures.test.cjs`：

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const html = fs.readFileSync(path.resolve(__dirname, "..", "index.html"), "utf8");
const match = html.match(/const records = ([\s\S]*?);\r?\n\r?\n\s*const imageManifest/);
assert.ok(match, "records data block must exist");
const records = JSON.parse(match[1]);

const expected = [
  ["d8ed0db4", "d8ed0db4:izotope-vocoder:1", [1], 3, "img_d43e4e82e77fb756"],
  ["upy3d1em", "upy3d1em:polyverse-manipulator:1", [11], 13, "noah-boom-manipulator-pitch-formant"],
  ["yt-f9OrpDtedSI", "yt-f9OrpDtedSI:h3000-factory:1", [], 4, "f9OrpDtedSI-plastic-tube-tonal-chain"],
];

for (const [recordId, effectId, replacedPluginIndexes, stepIndex, screenshotKey] of expected) {
  test(`${effectId} preserves its source evidence`, () => {
    const record = records.find((item) => item.id === recordId);
    assert.ok(record);
    const use = record.effectUses.find((item) => item.id === effectId);
    assert.ok(use);
    assert.deepEqual(use.replacesPluginIndexes, replacedPluginIndexes);
    assert.equal(use.stepIndex, stepIndex);
    assert.equal(use.screenshotKey, screenshotKey);
    assert.ok(use.purpose);
    assert.ok(use.parameters.length > 0);
    assert.ok(use.evidence.length > 0);
    assert.ok(use.limitations);
  });
}
```

- [ ] **Step 2: 运行测试并确认 `effectUses` 尚未存在**

Run: `node --test tests/effect-use-fixtures.test.cjs`

Expected: 3 tests FAIL，失败位置为读取 `record.effectUses`。

- [ ] **Step 3: 给 Vocoder 记录增加结构化用法**

在记录 `d8ed0db4` 的 `plugins` 后加入：

```json
"effectUses": [
  {
    "id": "d8ed0db4:izotope-vocoder:1",
    "name": "iZotope Vocoder",
    "vendor": "iZotope",
    "category": "音高与频率",
    "target": "Serum 合成音色的双路调制层",
    "chainPosition": "SampHold 之后、OTT 多频段动态之前；两个 Vocoder 实例并行组合",
    "purpose": "用较少频段制造粗糙颗粒，用较多频段保留平滑连续度，再把两种质感组合成复杂谐波层。",
    "parameters": [
      { "name": "Bands", "value": "8 / 40", "direction": "8 段更粗糙，40 段更平滑", "evidence": "画面确认" },
      { "name": "Gain", "value": "7.9 dB / 14 dB", "direction": "分别平衡两路调制输出", "evidence": "画面确认" },
      { "name": "Bandwidth", "value": "18 kHz", "direction": "两路共用", "evidence": "画面确认" },
      { "name": "Attack", "value": "1 ms", "direction": "快速跟随", "evidence": "画面确认" },
      { "name": "Formant", "value": "-15.8 / -8.40 dB", "direction": "分别调整两路音色", "evidence": "画面确认" }
    ],
    "result": "两路分别提供粗糙与平滑的调制细节，组合后得到更丰富的谐波层次。",
    "interactions": "后级 OTT 再平衡高、中、低频能量；Vocoder 本身先决定颗粒密度和调制身份。",
    "limitations": "这些数值只属于视频当前 Serum 素材与双路增益关系，不作为其他素材的通用预设。",
    "timestamp": "",
    "stepIndex": 3,
    "screenshotKey": "img_d43e4e82e77fb756",
    "replacesPluginIndexes": [1],
    "evidence": ["画面确认", "分析推断"]
  }
]
```

- [ ] **Step 4: 给 Manipulator 记录增加结构化用法**

在记录 `upy3d1em` 的 `plugins` 后加入：

```json
"effectUses": [
  {
    "id": "upy3d1em:polyverse-manipulator:1",
    "name": "Polyverse Manipulator",
    "vendor": "Polyverse Music",
    "category": "音高与频率",
    "target": "已完成密度、失真和多段动态塑形的 boom 主体",
    "chainPosition": "长串联塑形之后、Shade 变体和批量打印之前",
    "purpose": "改变 pitch 与 formant 制造新的大型怪异身份，同时保留部分干声，让素材仍然具有真实 boom 的重量。",
    "parameters": [
      { "name": "Pitch", "value": "1.44", "direction": "向上改变音高身份", "evidence": "画面确认" },
      { "name": "Formant", "value": "-4.41", "direction": "向下改变共振峰", "evidence": "画面确认" },
      { "name": "Dry/Wet", "value": "63%", "direction": "保留干声主体", "evidence": "画面确认" }
    ],
    "result": "获得非自然的大型怪异感，但不会只剩刺耳的高频共振或明显插件音色。",
    "interactions": "与 Shade 的开关、playback rate 和 pitch 变化一起用于批量打印可挑选的身份变体。",
    "limitations": "视频明确指出 100% wet 会锁到刺耳高频共振；63% 只适用于当前 boom，不应机械照抄。",
    "timestamp": "",
    "stepIndex": 13,
    "screenshotKey": "noah-boom-manipulator-pitch-formant",
    "replacesPluginIndexes": [11],
    "evidence": ["画面确认"]
  }
]
```

- [ ] **Step 5: 给 H3000 记录增加结构化用法**

在记录 `yt-f9OrpDtedSI` 的 `plugins` 后加入：

```json
"effectUses": [
  {
    "id": "yt-f9OrpDtedSI:h3000-factory:1",
    "name": "H3000 Factory",
    "vendor": "Eventide",
    "category": "音高与频率",
    "target": "塑料管 tonal launcher thump 背景层",
    "chainPosition": "Decapitator 与 Saturn 2 之后、Oxford Inflator 与 FilterFreak 之前",
    "purpose": "把塑料管层下移一个八度，扩大体型并隐藏日常物件身份，使其成为低沉的发射器音调支撑。",
    "parameters": [
      { "name": "Pitch shift", "value": "-1 octave", "direction": "向下扩大尺度", "evidence": "作者口述" }
    ],
    "result": "塑料管从轻小物件变成低沉而带音调的 launcher thump，并保持为不抢主瞬态的第三背景层。",
    "interactions": "前级失真建立谐波，H3000 下移体型，Inflator 增厚，FilterFreak 再增加运动和隐藏原始身份。",
    "limitations": "画面只确认 H3000 是链成员；下移一个八度来自作者口述，其余 H3000 参数未公开。",
    "timestamp": "",
    "stepIndex": 4,
    "screenshotKey": "f9OrpDtedSI-plastic-tube-tonal-chain",
    "replacesPluginIndexes": [],
    "evidence": ["画面确认", "作者口述", "视频未展示"]
  }
]
```

H3000 只是复合 `Plastic tube chain` 中的一颗插件，因此不替换旧索引项；兼容条目继续保留 Decapitator、Saturn 2、Inflator 和 FilterFreak 的整链信息，直到这些成员也被逐条结构化。

- [ ] **Step 6: 运行样例、模型和页面测试**

Run: `node --test tests/knowledge-model.test.cjs tests/dual-index-site.test.cjs tests/effect-use-fixtures.test.cjs`

Expected: 19 tests PASS，0 FAIL。

- [ ] **Step 7: 提交结构化样例**

```powershell
git add index.html tests/effect-use-fixtures.test.cjs
git commit -m "Add structured Vocoder Manipulator and H3000 uses"
```

## Task 6: 更新 Skill 镜像导出和播放列表验收

**Files:**
- Create: `tests/export-site-memory.test.cjs`
- Modify: `tools/export-site-memory.cjs`
- Modify: `tools/verify-plugin-tips-import.cjs`
- Regenerate: `skills/sfx-knowledge/references/site-video-memory.md`

- [ ] **Step 1: 写导出不含练习且包含效果器用法的失败测试**

创建 `tests/export-site-memory.test.cjs`：

```js
const assert = require("node:assert/strict");
const test = require("node:test");

const { renderRecord } = require("../tools/export-site-memory.cjs");

test("exports dry goods and structured effect uses without practice sections", () => {
  const output = renderRecord({
    videoId: "video-a",
    title: "测试视频",
    url: "https://example.com/video-a",
    source: "测试来源",
    category: "scifi",
    secondaryCategories: [],
    summary: "摘要",
    coreIdeas: ["设计原则"],
    steps: [{
      order: 1,
      name: "调制",
      detail: "保留瞬态。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。",
      params: ["Mix 63%。复刻时不要机械抄数值，先听这些参数改变的是攻击、频段、空间、运动还是响度。"],
    }],
    plugins: [{
      name: "Vocoder",
      purpose: "建立双路调制。复习时先看每一步负责的声音角色，再看插件名称。",
      settings: ["Bands 8 / 40"],
    }],
    materials: [],
    chainFocus: ["EQ -> Vocoder。复习时先看每一步负责的声音角色，再看插件名称。"],
    parameterLogic: ["Bands 8 / 40。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。"],
    practiceChecklist: ["不应进入导出"],
    keywords: ["Vocoder"],
    effectUses: [{
      id: "video-a:vocoder:1",
      name: "Vocoder",
      vendor: "Vendor",
      category: "音高与频率",
      target: "合成层",
      chainPosition: "EQ 之后",
      purpose: "改变调制细节",
      parameters: [{ name: "Bands", value: "8 / 40", evidence: "画面确认" }],
      limitations: "只属于当前素材",
      evidence: ["画面确认"],
    }],
  });
  assert.match(output, /### Structured Effect Uses/);
  assert.match(output, /\*\*Vocoder\*\*/);
  assert.match(output, /Bands: 8 \/ 40 \[画面确认\]/);
  assert.match(output, /Bands 8 \/ 40。/);
  assert.match(output, /1\. \*\*调制\*\*: 保留瞬态。/);
  assert.match(output, /\*\*Vocoder\*\*: 建立双路调制。/);
  assert.doesNotMatch(output, /Practice Checklist|不应进入导出|弱\/中\/强三版/);
});
```

- [ ] **Step 2: 运行测试并确认导出器无法被安全导入**

Run: `node --test tests/export-site-memory.test.cjs`

Expected: FAIL，因为当前文件不导出 `renderRecord`，并会在 `require()` 时直接执行导出。

- [ ] **Step 3: 重构导出器并加入结构化效果器段落**

在 `tools/export-site-memory.cjs` 顶部加入：

```js
const {
  stripCourseScaffolding,
  uniqueFacts,
} = require("../src/knowledge-model.js");
```

把 `list()` 改为：

```js
function list(items, indent = "") {
  return uniqueFacts(items).map((item) => `${indent}- ${item}`).join("\n");
}
```

同时让 `renderRecord()` 中没有经过 `list()` 的字段也走同一个保守清洗器：

```js
lines.push(`${step.order}. **${step.name}**: ${stripCourseScaffolding(step.detail)}`);
lines.push(`- **${plugin.name}**: ${stripCourseScaffolding(plugin.purpose || "")}`);
```

步骤参数和插件设置继续调用已更新的 `list()`；不得只删除 Practice 标题却把课程尾句留在步骤或插件说明中。

增加：

```js
function renderEffectUse(effect) {
  const lines = [
    `- **${effect.name}**${effect.vendor ? ` (${effect.vendor})` : ""}: ${stripCourseScaffolding(effect.purpose || "")}`,
    effect.category ? `  - Category: ${effect.category}` : "",
    effect.target ? `  - Target: ${stripCourseScaffolding(effect.target)}` : "",
    effect.chainPosition ? `  - Chain position: ${stripCourseScaffolding(effect.chainPosition)}` : "",
  ];
  for (const parameter of effect.parameters || []) {
    const value = parameter.value || parameter.direction || "";
    const evidence = parameter.evidence ? ` [${parameter.evidence}]` : "";
    lines.push(`  - ${parameter.name || "Parameter"}: ${value}${evidence}`);
  }
  if (effect.result) lines.push(`  - Result: ${stripCourseScaffolding(effect.result)}`);
  if (effect.interactions) lines.push(`  - Interactions: ${stripCourseScaffolding(effect.interactions)}`);
  if (effect.limitations) lines.push(`  - Limits: ${stripCourseScaffolding(effect.limitations)}`);
  if (effect.screenshotKey) lines.push(`  - Evidence image key: \`${effect.screenshotKey}\``);
  if (effect.evidence?.length) lines.push(`  - Evidence: ${effect.evidence.join("; ")}`);
  return lines.filter(Boolean).join("\n");
}
```

在 `renderRecord()` 的插件段落后加入：

```js
if (record.effectUses?.length) {
  lines.push("", "### Structured Effect Uses");
  for (const effect of record.effectUses) lines.push(renderEffectUse(effect));
}
```

删除：

```js
lines.push("", "### Practice Checklist", list(record.practiceChecklist));
```

把 header 第二条说明改为：

```js
"> Use it when exact per-video steps, visible parameters, plugin roles, structured effect uses, effect-chain reasoning, or evidence boundaries are needed.",
```

把文件末尾执行逻辑包成函数并导出：

```js
function exportSiteMemory() {
  const records = readRecords();
  const header = [
    "# Site Video Memory",
    "",
    "> Auto-generated from `index.html` by `tools/export-site-memory.cjs`. Do not edit this file by hand.",
    "> Use it when exact per-video steps, visible parameters, plugin roles, structured effect uses, effect-chain reasoning, or evidence boundaries are needed.",
    "",
    `Records: ${records.length}`,
    "",
  ];
  const output = `${header.join("\n")}${records.map(renderRecord).join("\n\n")}\n`.replace(/[ \t]+$/gm, "");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, "utf8");
  return { outputPath, records: records.length, bytes: Buffer.byteLength(output) };
}

if (require.main === module) console.log(JSON.stringify(exportSiteMemory(), null, 2));

module.exports = { exportSiteMemory, renderEffectUse, renderRecord };
```

- [ ] **Step 4: 更新播放列表验证器的记忆合同**

在 `tools/verify-plugin-tips-import.cjs` 中：

1. 在顶部引入 `stripCourseScaffolding` 和 `uniqueFacts`：

```js
const {
  stripCourseScaffolding,
  uniqueFacts,
} = require("../src/knowledge-model.js");
```

2. 从 `requiredArrays` 删除 `"practiceChecklist"`。
3. 从 `listSections` 删除 `"### Practice Checklist"`。
4. 删除 `practiceLines` 变量和分支。
5. 预期 Core Ideas 和各列表段落时使用 `uniqueFacts(items)`；预期步骤正文、插件用途和结构化效果器用途时使用 `stripCourseScaffolding(...)`，保证验证器与导出器比较的是同一投影。
6. 把 `Use when` 校验改为直接检查整个记录块：

```js
requireLines(
  block.lines,
  [`- Use when: ${arrayOrEmpty(record.keywords).join("; ")}`],
  `site-video-memory.md Use when for ${label}`
);
```

7. 在插件校验后加入结构化用法校验：

```js
if (arrayOrEmpty(record.effectUses).length) {
  const effectLines = sectionLines(
    block,
    "### Structured Effect Uses",
    `site-video-memory.md block for ${label}`
  );
  requireLines(
    effectLines,
    record.effectUses.map((effect) =>
      `- **${effect.name}**${effect.vendor ? ` (${effect.vendor})` : ""}: ${stripCourseScaffolding(effect.purpose || "")}`
    ),
    `site-video-memory.md structured effects for ${label}`
  );
}
```

- [ ] **Step 5: 运行导出测试、重新生成记忆并验证播放列表**

Run: `node --test tests/export-site-memory.test.cjs`

Expected: 1 test PASS。

Run: `node tools/export-site-memory.cjs`

Expected: JSON 输出包含 `"records": 82`。

Run: `node tools/verify-plugin-tips-import.cjs --completed 20`

Expected: JSON 输出包含 `"ok": true`、`"records": 82`、`"uniqueVideoIds": 82`。

- [ ] **Step 6: 确认生成记忆中没有练习段落**

Run: `rg -n "### Practice Checklist|复刻时只调一个核心旋钮|弱/中/强三版" skills/sfx-knowledge/references/site-video-memory.md`

Expected: exit code 1，无匹配。

- [ ] **Step 7: 提交导出链更新**

```powershell
git add tools/export-site-memory.cjs tools/verify-plugin-tips-import.cjs tests/export-site-memory.test.cjs skills/sfx-knowledge/references/site-video-memory.md
git commit -m "Export structured effect uses without exercises"
```

## Task 7: 更新后续维护规则和自动返工工具

**Files:**
- Create: `tests/dry-goods-contract.test.cjs`
- Modify: `tools/enrich-sfx-records.cjs:332-420`
- Modify: `AGENTS.md:15-31`
- Modify: `docs/learning-workflow.md:44-89`
- Modify: `skills/sfx-knowledge/SKILL.md:11-24`

- [ ] **Step 1: 写维护合同的失败测试**

创建 `tests/dry-goods-contract.test.cjs`：

```js
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(path.resolve(__dirname, "..", relativePath), "utf8");
}

test("maintenance rules require effectUses instead of practiceChecklist", () => {
  const agents = read("AGENTS.md");
  const workflow = read("docs/learning-workflow.md");
  assert.match(agents, /effectUses/);
  assert.match(workflow, /effectUses/);
  assert.doesNotMatch(agents, /`practiceChecklist`：可实际复刻的练习/);
  assert.doesNotMatch(workflow, /练习清单/);
});

test("the repository skill retrieves effect evidence rather than practice tasks", () => {
  const skill = read("skills/sfx-knowledge/SKILL.md");
  assert.match(skill, /structured effect uses/);
  assert.doesNotMatch(skill, /practice tasks/);
});

test("the enrichment tool no longer generates practice fields or course suffixes", () => {
  const source = read("tools/enrich-sfx-records.cjs");
  assert.doesNotMatch(source, /practiceChecklist\s*:/);
  assert.doesNotMatch(source, /复刻时只调一个核心旋钮/);
  assert.doesNotMatch(source, /A\/B 练习/);
});
```

- [ ] **Step 2: 运行测试并确认当前规则冲突**

Run: `node --test tests/dry-goods-contract.test.cjs`

Expected: 3 tests FAIL。

- [ ] **Step 3: 停止返工工具生成课程模板**

在 `tools/enrich-sfx-records.cjs` 的 `enrichLearning()` 中：

- 把 chain 行改为只保留事实：

```js
const chain = plugins.slice(0, 8).map((plugin, index) =>
  `${index + 1}. ${plugin.name}：${plugin.purpose}`
);
```

- 把 parameter 行改为：

```js
const parameter = plugins.slice(0, 8).map((plugin) => {
  const settings = plugin.settings.slice(0, 2).join("；");
  return `${plugin.name} 参数逻辑：${settings || "视频未显示具体数值"}`;
});
```

- 从返回对象删除完整 `practiceChecklist` 属性，只返回：

```js
return {
  chainFocus: chainFocus.slice(0, 12),
  parameterLogic: parameterLogic.slice(0, 10),
};
```

- 把 `updateNote` 改为：

```js
updateNote: `${today} 返工：补充完整效果链顺序、插件用途、参数证据、调节方向和高清步骤截图；未展示具体数值的内容保持未知。`,
```

保留 `...record`，因此历史记录已有的 `practiceChecklist` 不会在运行工具时被意外删除；新记录不会再由此工具生成练习字段。

- [ ] **Step 4: 更新 `AGENTS.md` 的分析结构**

把 `practiceChecklist` 条目替换为：

```markdown
- `effectUses`：可选的结构化效果器实际用法；记录处理对象、链路位置、用途、参数、结果、上下游关系、限制、截图键和证据标签。
```

在“分析结构”后加入：

```markdown
网站是完整视频干货档案，不生成练习、作业、打卡、难度或预计学习时间。字幕只用于定位；每条效果器结论必须标明画面确认、作者口述、音频可辨、分析推断或视频未展示。
```

- [ ] **Step 5: 更新工作流与仓库 Skill**

在 `docs/learning-workflow.md` 的字段列表中把末尾改为：

```text
materials, keywords, tips, chainFocus, parameterLogic, effectUses（可选）
```

把 Skill 镜像说明改为：

```markdown
生成文件 `skills/sfx-knowledge/references/site-video-memory.md` 不手工修改。它用于防止网站已有模块漏进 Skill，并保留每条模块的参数逻辑、结构化效果器用法和证据边界。
```

在 `skills/sfx-knowledge/SKILL.md` 中把 `site-video-memory.md` 的用途句改为：

```markdown
Load `references/site-video-memory.md` when exact website-module steps, screenshots, visible parameters, plugin roles, structured effect uses, effect-chain reasoning, or evidence boundaries are needed.
```

在 `Video Learning Rule` 第 3 条后加入：

```markdown
4. Treat the output as a complete reference archive: omit exercises and course tasks, but retain every evidenced production decision, parameter, route, automation move, limitation, and failed attempt.
```

将原第 4-6 条顺延为第 5-7 条。

- [ ] **Step 6: 运行维护合同和所有 Node 测试**

Run: `node --test tests/*.test.cjs`

Expected: 全部 Node tests PASS，0 FAIL。

- [ ] **Step 7: 提交维护合同更新**

```powershell
git add AGENTS.md docs/learning-workflow.md skills/sfx-knowledge/SKILL.md tools/enrich-sfx-records.cjs tests/dry-goods-contract.test.cjs
git commit -m "Align video analysis rules with dry-goods archive"
```

## Task 8: 浏览器视觉与交互验收

**Files:**
- Modify if required by observed defects: `index.html`
- Store ignored evidence: `.work/dual-index-qa/`

- [ ] **Step 1: 启动静态服务器并确认 HTTP 200**

Run in a hidden background process: `python -m http.server 8891 --bind 127.0.0.1`

Run: `Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8891/ | Select-Object StatusCode`

Expected: `StatusCode` is `200`。

- [ ] **Step 2: 在 1440 x 900 验证视频案例入口**

使用 in-app browser 打开 `http://127.0.0.1:8891/`，验证：

- 首屏显示“视频案例 / 效果器索引”分段控制。
- 视频案例保持 82 条总数、分类标签、来源筛选和搜索。
- 打开任一视频后，章节顺序为设计目标、设计思路、素材与分层、完整制作流程、完整效果链、效果器用法、关键决策与证据边界、来源与关键词。
- 页面中不出现“练习复盘”，详情元数据使用“收录”而非“学习”。
- 步骤截图仍能放大，动图仍按原逻辑点击播放。
- 至少打开一条带官方插件参考图的旧记录，确认参考图仍显示并可放大。

保存截图到 `.work/dual-index-qa/desktop-videos.png`。

- [ ] **Step 3: 在 1440 x 900 验证效果器索引与深链**

切换到效果器索引并依次验证：

- 搜索 `Vocoder`，出现 `iZotope Vocoder`，参数摘要包含 8 / 40。
- 搜索 `Manipulator`，出现多个视频用法，`Noah Sitrin：Boom 素材长插件链重设计` 是独立来源。
- 搜索 `H3000`，出现塑料管 launcher thump 用法。
- 功能筛选“音高与频率”只保留该分类。
- 证据筛选“画面确认”只保留包含该证据标签的用法；“尚未结构化”可找到旧兼容条目。
- 用来源视频关键词搜索可以命中对应效果器用法。
- 打开 `upy3d1em:polyverse-manipulator:1` 后，地址栏包含 `#effect=`，刷新后仍回到同一条效果器详情。
- 点击“查看完整视频案例”进入正确视频；返回列表后回到效果器索引。
- 分别访问不存在的 `#effect=missing` 与 `#video=missing`，页面显示明确空状态且 console 无异常。

保存截图到 `.work/dual-index-qa/desktop-effects.png` 和 `.work/dual-index-qa/effect-detail.png`。

- [ ] **Step 4: 验证 768 x 1024 与 360 x 800**

在两个视口分别检查：

- 分段控制、搜索框、筛选器和列表不横向溢出。
- 最长效果器名称与来源视频标题能换行，不覆盖相邻内容。
- 效果器行从三列稳定变为单列，不发生布局跳动。
- 视频步骤图和参数行不会超出正文。
- 返回按钮、筛选和详情按钮均可点击且具有可访问名称。

保存截图到 `.work/dual-index-qa/tablet.png` 和 `.work/dual-index-qa/mobile.png`。

- [ ] **Step 5: 检查浏览器错误和资源加载**

读取页面 console，Expected: 没有 uncaught exception、404 脚本、缺失 `SfxKnowledgeModel` 或无效图片路径错误。

若发现视觉或交互缺陷，只修改 `index.html` 中与本功能有关的 HTML/CSS/JS，然后重新执行 Steps 2-5。

- [ ] **Step 6: 提交视觉修正或记录无需修正**

若有修正：

```powershell
git add index.html
git commit -m "Polish dual-index responsive layout"
```

若无修正，不创建空提交；在执行记录中写明三个视口和深链均通过。

## Task 9: 全量验证、Skill 同步和本地交付

**Files:**
- Verify: all changed files
- Sync outside repository after approval if required: installed `sfx-knowledge` Skill

- [ ] **Step 1: 运行全部 Node 测试**

Run: `node --test tests/*.test.cjs`

Expected: 全部测试 PASS，0 FAIL。

- [ ] **Step 2: 运行 Python 测试**

Run: `python -m unittest discover -s tests -p "test_*.py"`

Expected: 11 tests PASS，0 FAIL。

- [ ] **Step 3: 重新导出并运行仓库验证器**

Run: `node tools/export-site-memory.cjs`

Expected: `"records": 82`。

Run: `node tools/verify-plugin-tips-import.cjs --completed 20`

Expected: `"ok": true`、82 records、82 unique video IDs。

Run: `node tools/verify-portable-kit.cjs`

Expected: `"ok": true`、`"memoryCoverage": "82/82"`、0 failures。

- [ ] **Step 4: 检查脚本语法和敏感文件边界**

Run:

```powershell
node --check src/knowledge-model.js
node --check tools/export-site-memory.cjs
node --check tools/enrich-sfx-records.cjs
node --check tools/verify-plugin-tips-import.cjs
git status --short
```

Expected: 所有 `node --check` exit code 0；Git 仅显示重新导出后预期的追踪文件，且不包含 `.work`、视频、音轨、Cookie 或凭据。

- [ ] **Step 5: 若最终导出产生变化，提交一致性结果**

Run: `git diff --check`

Expected: exit code 0。

若有追踪文件变化：

```powershell
git add index.html skills/sfx-knowledge/references/site-video-memory.md
git commit -m "Finalize dual-index knowledge export"
```

- [ ] **Step 6: 同步仓库 Skill 到本机并核对哈希**

Run with the required filesystem approval:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\install-sfx-skill.ps1 -Force
Get-FileHash .\skills\sfx-knowledge\SKILL.md
Get-FileHash C:\Users\zhaoshangqi\.codex\skills\sfx-knowledge\SKILL.md
```

Expected: 安装脚本成功；两个 `SKILL.md` 的 SHA-256 完全一致。

- [ ] **Step 7: 最终检查提交和工作树**

Run:

```powershell
git log -8 --oneline
git status --short
```

Expected: 日志包含本计划的各阶段提交；工作树为空。

- [ ] **Step 8: 提供本地试用入口**

保持静态服务器运行并交付 `http://127.0.0.1:8891/`。本阶段不推送远端；用户完成本地试用并明确批准发布后，再单独执行 GitHub push 和 Pages 验证。
