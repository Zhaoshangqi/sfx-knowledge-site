const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const memoryPath = path.join(
  __dirname,
  "..",
  "skills",
  "sfx-knowledge",
  "references",
  "site-video-memory.md"
);
const memoryMtimeBeforeImport = fs.statSync(memoryPath).mtimeMs;
const { renderRecord } = require("../tools/export-site-memory.cjs");

test("exports dry goods and structured effect uses without practice sections", () => {
  assert.equal(typeof renderRecord, "function", "importing must expose renderRecord without exporting production memory");
  assert.equal(
    fs.statSync(memoryPath).mtimeMs,
    memoryMtimeBeforeImport,
    "importing the exporter must not regenerate production memory"
  );

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
      detail: "保留瞬态。 视频证据：unstructured transcript fragment",
      params: [
        "Bands 8 / 40。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。",
        "A/B：旁路本步骤，听它是否只增加响度。",
        "具体数值未完整显示：用耳朵确认速度、频点、湿度或攻击是否服务画面。"
      ]
    }, {
      order: 2,
      name: "自动课程模板步骤",
      detail: "通用教程。本条的主要链路可以按 EQ -> Reverb 来读。视频证据：raw transcript",
      params: ["角色：自动课程模板步骤"],
      imageKey: "generated-template-image"
    }],
    plugins: [{
      name: "Vocoder",
      purpose: "建立双路调制。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。",
      settings: [
        "Bands 8 / 40",
        "字幕/画面线索：raw transcript fragment",
        "可确认的数值/范围：2024；2"
      ]
    }],
    materials: [
      "每次只改一个维度并输出弱/中/强三版，做 matched-loudness A/B。",
      "复刻时只动一个核心参数并渲染 3 个强度版本，避免同时改太多导致无法判断贡献。"
    ],
    chainFocus: [
      "EQ -> Vocoder。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。",
      "迁移练习假设：这条课程任务不应进入干货导出。",
      "效果链事实。复习这条时先看每一步负责的声音角色，再看插件名称。"
    ],
    parameterLogic: [
      "Bands 8 / 40。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。",
      "Pro-Q 3 参数逻辑：字幕/画面线索：raw transcript fragment"
    ],
    tips: [
      "这些数值只属于当前素材，不可外推为通用阈值。",
      "练习：导出三版并比较。"
    ],
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
      parameters: [
        {
          name: "Bands",
          value: "8 / 40",
          direction: "更多频段更平滑",
          evidence: "画面确认"
        },
        { name: "Mix", direction: "向下收干湿比", evidence: "作者口述" }
      ],
      result: "瞬态更清楚",
      interactions: "与前级 EQ 联动",
      limitations: "只属于当前素材",
      screenshotKey: "video-a-vocoder",
      evidence: ["画面确认", "作者口述"]
    }]
  });

  assert.match(output, /### Structured Effect Uses/);
  assert.match(output, /Effect use ID: `video-a:vocoder:1`/);
  assert.match(output, /\*\*Vocoder\*\*/);
  assert.match(output, /Bands: 8 \/ 40; 更多频段更平滑 \[画面确认\]/);
  assert.match(output, /Mix: 向下收干湿比 \[作者口述\]/);
  assert.match(output, /Result: 瞬态更清楚/);
  assert.match(output, /Interactions: 与前级 EQ 联动/);
  assert.match(output, /Limits: 只属于当前素材/);
  assert.match(output, /Evidence image key: `video-a-vocoder`/);
  assert.match(output, /Evidence: 画面确认; 作者口述/);
  assert.match(output, /Bands 8 \/ 40。/);
  assert.match(output, /1\. \*\*调制\*\*: 保留瞬态。/);
  assert.match(output, /\*\*Vocoder\*\*: 建立双路调制。/);
  assert.match(output, /效果链事实。/);
  assert.match(output, /### Key Decisions and Evidence Boundaries/);
  assert.match(output, /这些数值只属于当前素材，不可外推为通用阈值。/);
  assert.doesNotMatch(output, /自动课程模板步骤|generated-template-image/);
  assert.doesNotMatch(
    output,
    /Practice Checklist|不应进入导出|弱\/中\/强三版|3 个强度版本|迁移练习假设|练习|复习|视频证据|字幕\/画面线索|可确认的数值\/范围|A\/B：旁路本步骤|具体数值未完整显示/
  );

  const malformed = renderRecord({
    videoId: "video-b\n### injected-video-section",
    title: { bad: true },
    url: ["https://example.com/bad"],
    source: true,
    category: "test",
    secondaryCategories: { bad: true },
    summary: "摘要\n### injected-summary-section",
    coreIdeas: [{ bad: true }, ["nested"], "可保留事实\n### injected-core-section"],
    steps: [
      null,
      [],
      {
        order: 1,
        name: { bad: true },
        detail: "步骤事实\n### injected-step-section",
        params: [{ bad: true }, ["nested"], "参数事实"]
      }
    ],
    plugins: [{ name: "Plugin", purpose: { bad: true }, settings: [{ bad: true }, "设置事实"] }],
    materials: { bad: true },
    chainFocus: [{ bad: true }],
    parameterLogic: [false],
    keywords: [{ bad: true }, "keyword\n### injected-keyword-section"],
    effectUses: [{
      name: { bad: true },
      parameters: [{ name: { bad: true }, value: { bad: true }, direction: ["nested"] }],
      evidence: { bad: true }
    }]
  });
  assert.doesNotMatch(malformed, /\[object Object\]|undefined|nested/);
  assert.doesNotMatch(malformed, /^### injected-/m);
  assert.doesNotMatch(malformed, /^\. \*\*\*\*: /m);

  const productionMemory = fs.readFileSync(memoryPath, "utf8");
  assert.doesNotMatch(
    productionMemory,
    /### Practice Checklist|复刻时只调一个核心旋钮|复刻时只动一个核心参数|弱\/中\/强三版|3 个强度版本|练习|复习|字幕\/画面线索|可确认的数值\/范围|A\/B：旁路本步骤|具体数值未完整显示|本条的主要链路可以按|复用检查：|第一步参数优先级：|第一颗处理点的判断：/
  );
  assert.match(productionMemory, /OTT截图记录的输出与各频段增益只属于当前工程/);
});
