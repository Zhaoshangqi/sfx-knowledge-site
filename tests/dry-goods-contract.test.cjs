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
    /教程式拆解/
  ].forEach((pattern) => assert.doesNotMatch(source, pattern));

  assert.ok(
    source.includes("`${index + 1}. ${plugin.name}：${plugin.purpose}`"),
    "chain entries should contain only order, plugin name, and purpose"
  );
  assert.match(source, /settings \|\| "视频未显示具体数值"/);
  assert.match(source, /return \{\s*chainFocus: chainFocus\.slice\(0, 12\),\s*parameterLogic: parameterLogic\.slice\(0, 10\),?\s*\};/);
  assert.match(
    source,
    /补充完整效果链顺序、插件用途、参数证据、调节方向和高清步骤截图；未展示具体数值的内容保持未知。/
  );
});
