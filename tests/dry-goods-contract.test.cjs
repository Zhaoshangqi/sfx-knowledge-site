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

  assert.match(agents, /`effectUses`：可选的结构化效果器实际用法/);
  assert.match(agents, /完整视频干货档案/);
  assert.match(agents, /不生成练习、作业、打卡、难度或预计学习时间/);
  assert.match(agents, /画面确认、作者口述、音频可辨、分析推断或视频未展示/);
  assert.doesNotMatch(agents, /practiceChecklist|练习清单/);

  assert.match(
    workflow,
    /materials, keywords, tips, chainFocus, parameterLogic, effectUses（可选）/
  );
  assert.match(workflow, /结构化效果器用法和证据边界/);
  assert.doesNotMatch(workflow, /practiceChecklist|练习清单/);
});

test("the repository skill retrieves effect evidence rather than practice tasks", () => {
  const skill = read("skills/sfx-knowledge/SKILL.md");

  assert.match(skill, /structured effect uses/);
  assert.match(skill, /omit exercises and course tasks/);
  assert.match(
    skill,
    /retain every evidenced production decision, parameter, route, automation move, limitation, and failed attempt/
  );
  assert.doesNotMatch(skill, /practice tasks/);
});

test("the enrichment tool no longer generates practice fields or course suffixes", () => {
  const source = read("tools/enrich-sfx-records.cjs");

  assert.doesNotMatch(source, /practiceChecklist\s*:/);
  [
    /练习/,
    /复习/,
    /弱\/中\/强/,
    /3 个强度版本/,
    /A\/B 练习/,
    /复刻时/,
    /按效果链学习/,
    /教程式拆解/,
    /每次只调一个主要参数，记录听感变化/
  ].forEach((pattern) => assert.doesNotMatch(source, pattern));

  assert.match(
    source,
    /参数页未显示时，只记录可确认的处理角色与调节方向；具体数值保持未知。/
  );

  const indexPath = path.resolve(__dirname, "..", "index.html");
  const modulePath = require.resolve("../tools/enrich-sfx-records.cjs");
  const mtimeBeforeImport = fs.statSync(indexPath).mtimeMs;
  const originalReadFileSync = fs.readFileSync;
  const originalWriteFileSync = fs.writeFileSync;
  const writes = [];
  let indexReads = 0;
  let enrichment;
  let importError;

  delete require.cache[modulePath];
  fs.readFileSync = function guardedRead(file, ...args) {
    if (typeof file === "string" && path.resolve(file) === indexPath) {
      indexReads += 1;
      throw new Error("requiring enrichment must not read index.html");
    }
    return originalReadFileSync.call(this, file, ...args);
  };
  fs.writeFileSync = function guardedWrite(file, ...args) {
    writes.push(typeof file === "string" ? path.resolve(file) : String(file));
    throw new Error("requiring enrichment must not write files");
  };

  try {
    enrichment = require(modulePath);
  } catch (error) {
    importError = error;
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
  }

  assert.equal(fs.statSync(indexPath).mtimeMs, mtimeBeforeImport);
  assert.equal(indexReads, 0, "requiring the module must not read index.html");
  assert.deepEqual(writes, [], "requiring the module must not write any files");
  assert.ifError(importError);
  assert.equal(typeof enrichment.enrichLearning, "function");
  assert.equal(typeof enrichment.mergeEnrichedRecord, "function");

  const plugins = [
    {
      name: "Vocoder",
      purpose: "建立双路调制。",
      settings: ["  Bands 40。  ", " Level 7.9 dB；； "]
    },
    {
      name: "No Values",
      purpose: "保留证据边界。",
      settings: ["   ", "；；"]
    }
  ];
  const learning = enrichment.enrichLearning(
    { category: "scifi", materials: ["合成层"] },
    plugins,
    ""
  );

  assert.ok(learning.chainFocus.includes("1. Vocoder：建立双路调制。"));
  assert.ok(learning.parameterLogic.includes("Vocoder 参数逻辑：Bands 40；Level 7.9 dB"));
  assert.ok(learning.parameterLogic.includes("No Values 参数逻辑：视频未显示具体数值"));
  assert.doesNotMatch(JSON.stringify(learning), /(?:。|\.|；|;)\s*；/);
  assert.equal(Object.prototype.hasOwnProperty.call(learning, "practiceChecklist"), false);

  const legacyPractice = ["历史字段保持原样"];
  const mergeOptions = { steps: [], plugins, learning };
  const legacyMerged = enrichment.mergeEnrichedRecord(
    {
      title: "旧记录",
      coreIdeas: [],
      tips: [],
      keywords: [],
      practiceChecklist: legacyPractice
    },
    mergeOptions
  );
  const freshMerged = enrichment.mergeEnrichedRecord(
    { title: "新记录", coreIdeas: [], tips: [], keywords: [] },
    mergeOptions
  );

  assert.strictEqual(legacyMerged.practiceChecklist, legacyPractice);
  assert.equal(Object.prototype.hasOwnProperty.call(freshMerged, "practiceChecklist"), false);
});
