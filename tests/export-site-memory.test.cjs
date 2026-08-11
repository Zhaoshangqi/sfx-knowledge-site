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
      detail: "保留瞬态。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。",
      params: ["Bands 8 / 40。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。"]
    }],
    plugins: [{
      name: "Vocoder",
      purpose: "建立双路调制。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。",
      settings: ["Bands 8 / 40"]
    }],
    materials: ["每次只改一个维度并输出弱/中/强三版，做 matched-loudness A/B。"],
    chainFocus: ["EQ -> Vocoder。复刻时只调一个核心旋钮，渲染弱/中/强三版并响度匹配比较。"],
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
      evidence: ["画面确认"]
    }]
  });

  assert.match(output, /### Structured Effect Uses/);
  assert.match(output, /Effect use ID: `video-a:vocoder:1`/);
  assert.match(output, /\*\*Vocoder\*\*/);
  assert.match(output, /Bands: 8 \/ 40 \[画面确认\]/);
  assert.match(output, /Bands 8 \/ 40。/);
  assert.match(output, /1\. \*\*调制\*\*: 保留瞬态。/);
  assert.match(output, /\*\*Vocoder\*\*: 建立双路调制。/);
  assert.doesNotMatch(output, /Practice Checklist|不应进入导出|弱\/中\/强三版/);
});
