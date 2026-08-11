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
  assert.match(workflow, /完整视频干货档案/);
  assert.match(workflow, /不生成练习、作业、打卡、难度、预计学习时间或课程任务/);
  assert.match(workflow, /保留每一条有证据的制作决策、参数、路由、自动化动作、限制和失败尝试/);
  assert.match(workflow, /字幕只用于定位证据/);
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
  assert.equal(typeof enrichment.detectPlugins, "function");
  assert.equal(typeof enrichment.extractParameterEvidence, "function");
  assert.equal(typeof enrichment.enrichRecord, "function");
  assert.equal(typeof enrichment.normalizeSettingFact, "function");
  assert.equal(typeof enrichment.runEnrichment, "function");

  const emptyRecord = {
    id: "fixture",
    videoId: "fixture-video",
    title: "Fixture",
    source: "Fixture Source",
    category: "scifi",
    steps: [],
    plugins: [],
    materials: [],
    chainFocus: [],
    parameterLogic: [],
    coreIdeas: [],
    tips: [],
    keywords: []
  };
  const falsePositiveTranscript = "In 2024 I changed the pitch, EQ and reverb for this layer.";

  assert.deepEqual(enrichment.detectPlugins(emptyRecord, falsePositiveTranscript), []);
  assert.deepEqual(enrichment.detectPlugins(emptyRecord, ""), []);
  assert.deepEqual(enrichment.enrichLearning(emptyRecord, [], ""), {
    chainFocus: [],
    parameterLogic: []
  });

  const existingPlugin = {
    name: "Existing EQ",
    purpose: "历史记录已有的处理",
    settings: ["历史参数"],
    evidenceTag: "legacy"
  };
  assert.deepEqual(
    enrichment.detectPlugins({ ...emptyRecord, plugins: [existingPlugin] }, falsePositiveTranscript),
    [existingPlugin]
  );

  const explicitPlugins = enrichment.detectPlugins(
    emptyRecord,
    "At 01:20 I opened Little AlterBoy. Formant -4 semitones and Mix 40%."
  );
  assert.equal(explicitPlugins.length, 1);
  assert.equal(explicitPlugins[0].name, "Little AlterBoy");
  assert.match(explicitPlugins[0].purpose, /需画面确认/);
  assert.ok(explicitPlugins[0].settings.length >= 1);
  assert.ok(explicitPlugins[0].settings.every((setting) => /字幕.*需画面确认/.test(setting)));
  assert.doesNotMatch(JSON.stringify(explicitPlugins), /可确认的数值|画面确认值|A\/B|旁路/);

  const nameOnlyPlugin = enrichment.detectPlugins(emptyRecord, "I opened Little AlterBoy.");
  const nameOnlyLearning = enrichment.enrichLearning(emptyRecord, nameOnlyPlugin, "");
  assert.equal(nameOnlyPlugin.length, 1);
  assert.doesNotMatch(JSON.stringify({ nameOnlyPlugin, nameOnlyLearning }), /A\/B|旁路|微调/);

  const parameterEvidence = enrichment.extractParameterEvidence(
    "In 2024 I changed pitch. Mix 40%, delay 120 ms, Bands 40, and take 7."
  );
  assert.ok(parameterEvidence.includes("Mix 40%"));
  assert.ok(parameterEvidence.includes("120 ms"));
  assert.ok(parameterEvidence.includes("Bands 40"));
  assert.doesNotMatch(JSON.stringify(parameterEvidence), /2024|take 7/);
  assert.deepEqual(enrichment.extractParameterEvidence("Pitch 2024 and chapter 7."), []);
  assert.deepEqual(
    enrichment.extractParameterEvidence("Bands 40? Mix 30%！ Formant -4…"),
    ["Bands 40?", "Mix 30%！", "Formant -4…"]
  );

  assert.equal(enrichment.normalizeSettingFact(" Bands 40? "), "Bands 40?");
  assert.equal(enrichment.normalizeSettingFact(" Mix 40%！ "), "Mix 40%！");
  assert.equal(enrichment.normalizeSettingFact(" Formant -4… "), "Formant -4…");
  assert.equal(enrichment.normalizeSettingFact(" Pitch -4... "), "Pitch -4...");
  assert.equal(enrichment.normalizeSettingFact(" Level 7.9 dB。； "), "Level 7.9 dB");

  const plugins = [
    {
      name: "Vocoder",
      purpose: "建立双路调制。",
      settings: ["  Bands 40?  ", " Level 7.9 dB。； "]
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
  assert.ok(learning.parameterLogic.includes("Vocoder 参数逻辑：Bands 40?；Level 7.9 dB"));
  assert.equal(learning.parameterLogic.some((item) => item.startsWith("No Values 参数逻辑：")), false);
  assert.doesNotMatch(JSON.stringify(learning), /(?:。|\.|；|;)\s*；/);
  assert.doesNotMatch(JSON.stringify(learning), /A\/B|旁路|每次只调/);
  assert.equal(Object.prototype.hasOwnProperty.call(learning, "practiceChecklist"), false);

  const noEvidenceResult = enrichment.enrichRecord(emptyRecord, {
    forceAuto: true,
    transcript: falsePositiveTranscript
  });
  assert.strictEqual(noEvidenceResult.record, emptyRecord);
  assert.equal(noEvidenceResult.changed, false);
  assert.equal(noEvidenceResult.generated, 0);
  assert.equal(noEvidenceResult.status, "insufficient-evidence");

  const explicitResult = enrichment.enrichRecord(emptyRecord, {
    forceAuto: true,
    transcript: "I opened Little AlterBoy. Formant -4 semitones."
  });
  assert.equal(explicitResult.changed, true);
  assert.deepEqual(explicitResult.record.steps, []);
  assert.equal(explicitResult.record.plugins[0].name, "Little AlterBoy");
  assert.doesNotMatch(JSON.stringify(explicitResult.record), /EQ \/ modulation|A\/B|旁路/);

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

  const fixtureHtml = [
    "<!doctype html>",
    "<script>",
    `const records = ${JSON.stringify([emptyRecord], null, 2)};`,
    "",
    "const imageManifest = {};",
    "const categoryById = {};",
    "</script>"
  ].join("\n");
  let writtenSite = "";
  let writtenReport;
  const orchestrationIo = [];
  const mtimeBeforeRun = fs.statSync(indexPath).mtimeMs;

  fs.readFileSync = function guardedOrchestrationRead(file, ...args) {
    if (typeof file === "string" && path.resolve(file) === indexPath) {
      orchestrationIo.push(`read:${path.resolve(file)}`);
      throw new Error("in-memory orchestration must not read index.html");
    }
    return originalReadFileSync.call(this, file, ...args);
  };
  fs.writeFileSync = function guardedOrchestrationWrite(file) {
    orchestrationIo.push(`write:${typeof file === "string" ? path.resolve(file) : String(file)}`);
    throw new Error("in-memory orchestration must not write files");
  };

  let runResult;
  try {
    runResult = enrichment.runEnrichment({
      html: fixtureHtml,
      forceAuto: true,
      enrichRecordOptions: { transcript: falsePositiveTranscript },
      writeSite(nextHtml) {
        writtenSite = nextHtml;
      },
      writeReport(payload) {
        writtenReport = payload;
      },
      log() {}
    });
  } finally {
    fs.readFileSync = originalReadFileSync;
    fs.writeFileSync = originalWriteFileSync;
  }

  assert.deepEqual(orchestrationIo, []);
  assert.equal(fs.statSync(indexPath).mtimeMs, mtimeBeforeRun);
  assert.equal(runResult.changed, 0);
  assert.equal(runResult.insufficientEvidence, 1);
  assert.doesNotMatch(writtenSite, /Little AlterBoy|EQ \/ modulation|A\/B/);
  assert.equal(writtenReport.report[0].status, "insufficient-evidence");
});
