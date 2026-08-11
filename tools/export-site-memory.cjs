const fs = require("fs");
const path = require("path");
const {
  isGeneratedStepScaffolding,
  stripCourseScaffolding,
  uniqueFacts
} = require("../src/knowledge-model.js");

const repoRoot = path.resolve(__dirname, "..");
const indexPath = path.join(repoRoot, "index.html");
const outputPath = path.join(repoRoot, "skills", "sfx-knowledge", "references", "site-video-memory.md");
const courseTailPattern = /复习(?:这条)?时先看每一步负责的声音角色，再看插件名称|复刻时只调一个核心旋钮|复刻时只动一个核心参数并渲染 3 个强度版本|每次只改一个维度并输出弱\/中\/强三版|弱\/中\/强三版|练习优先/;
const practiceFactPattern = /迁移练习假设|分析推断练习|此分类是练习假设|后续迁移练习|复刻验收/;

function readRecords() {
  const html = fs.readFileSync(indexPath, "utf8");
  const match = html.match(/const records = ([\s\S]*?);\r?\n\r?\n\s*const imageManifest/);
  if (!match) throw new Error("Could not locate records in index.html");
  return JSON.parse(match[1]);
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function objectOrEmpty(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function fact(value) {
  const scalar = typeof value === "string"
    ? value
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : "";
  const cleaned = stripCourseScaffolding(scalar.replace(/\s+/g, " ").trim());
  if (practiceFactPattern.test(cleaned)) return "";
  const courseTailIndex = cleaned.search(courseTailPattern);
  return courseTailIndex === -1
    ? cleaned
    : cleaned.slice(0, courseTailIndex).replace(/[，、；;:\s]+$/u, "").trim();
}

function facts(items) {
  return uniqueFacts(arrayOrEmpty(items).map(fact));
}

function list(items, indent = "") {
  return facts(items).map((item) => `${indent}- ${item}`).join("\n");
}

function renderEffectUse(effect) {
  effect = objectOrEmpty(effect);
  const name = fact(effect.name) || "Effect";
  const vendor = fact(effect.vendor);
  const purpose = fact(effect.purpose);
  const id = fact(effect.id);
  const lines = [
    `- **${name}**${vendor ? ` (${vendor})` : ""}: ${purpose}`,
    id ? `  - Effect use ID: \`${id}\`` : "",
    fact(effect.category) ? `  - Category: ${fact(effect.category)}` : "",
    fact(effect.target) ? `  - Target: ${fact(effect.target)}` : "",
    fact(effect.chainPosition) ? `  - Chain position: ${fact(effect.chainPosition)}` : ""
  ];

  arrayOrEmpty(effect.parameters).forEach((parameter) => {
    parameter = objectOrEmpty(parameter);
    const name = fact(parameter.name) || "Parameter";
    const value = fact(parameter.value);
    const direction = fact(parameter.direction);
    const evidence = fact(parameter.evidence);
    if (!value && !direction) return;
    lines.push(`  - ${name}: ${value}${direction ? `${value ? "; " : ""}${direction}` : ""}${evidence ? ` [${evidence}]` : ""}`);
  });

  [
    ["Result", effect.result],
    ["Interactions", effect.interactions],
    ["Limits", effect.limitations]
  ].forEach(([label, value]) => {
    const cleaned = fact(value);
    if (cleaned) lines.push(`  - ${label}: ${cleaned}`);
  });

  const screenshotKey = fact(effect.screenshotKey);
  if (screenshotKey) lines.push(`  - Evidence image key: \`${screenshotKey}\``);
  const evidence = facts(effect.evidence);
  if (evidence.length) lines.push(`  - Evidence: ${evidence.join("; ")}`);
  return lines.filter(Boolean).join("\n");
}

function renderRecord(input) {
  const record = objectOrEmpty(input);
  const categories = [record.category, ...arrayOrEmpty(record.secondaryCategories)]
    .map(fact)
    .filter(Boolean);
  const lines = [
    `## ${fact(record.videoId)} - ${fact(record.title)}`,
    `- Source: \`${fact(record.url)}\``,
    `- Creator: ${fact(record.source) || "Unknown"}`,
    `- Added / updated: ${fact(record.addedAt) || "unknown"} / ${fact(record.updatedAt) || fact(record.addedAt) || "unknown"}`,
    `- Category: ${categories.join(", ")}`,
    `- Summary: ${fact(record.summary)}`,
    "",
    "### Core Ideas",
    list(record.coreIdeas),
    "",
    "### Step / Event Map"
  ];

  arrayOrEmpty(record.steps).forEach((step, index) => {
    step = objectOrEmpty(step);
    if (isGeneratedStepScaffolding(step.detail)) return;
    const detail = fact(step.detail);
    const params = list(step.params, "   ");
    const imageKey = fact(step.imageKey);
    const motion = objectOrEmpty(step.motion);
    const motionSource = fact(motion.src);
    if (!detail && !params && !imageKey && !motionSource) return;
    lines.push(`${fact(step.order) || index + 1}. **${fact(step.name) || "Step"}**: ${detail}`);
    if (params) lines.push(params);
    if (imageKey) lines.push(`   - Evidence image key: \`${imageKey}\``);
    if (motionSource) lines.push(`   - Motion reference: \`${motionSource}\``);
  });

  lines.push("", "### Plugin and Processing Notes");
  arrayOrEmpty(record.plugins).forEach((plugin) => {
    plugin = objectOrEmpty(plugin);
    const name = fact(plugin.name);
    const purpose = fact(plugin.purpose);
    const settings = list(plugin.settings, "  ");
    if (!name && !purpose && !settings) return;
    lines.push(`- **${name || "Plugin"}**: ${purpose}`);
    if (settings) lines.push(settings);
  });

  const effectUses = arrayOrEmpty(record.effectUses).filter((effect) => effect && typeof effect === "object" && !Array.isArray(effect));
  if (effectUses.length) {
    lines.push("", "### Structured Effect Uses");
    effectUses.forEach((effect) => lines.push(renderEffectUse(effect)));
  }

  lines.push("", "### Materials / Layer Sources", list(record.materials));
  lines.push("", "### Effect-Chain Reasoning", list(record.chainFocus));
  lines.push(
    "",
    "### Key Decisions and Evidence Boundaries",
    list([...arrayOrEmpty(record.parameterLogic), ...arrayOrEmpty(record.tips)])
  );
  lines.push("", `- Use when: ${facts(record.keywords).join("; ")}`);
  return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

function exportSiteMemory() {
  const records = readRecords();
  const header = [
    "# Site Video Memory",
    "",
    "> Auto-generated from `index.html` by `tools/export-site-memory.cjs`. Do not edit this file by hand.",
    "> Use it when exact per-video steps, visible parameters, plugin roles, structured effect uses, effect-chain reasoning, or evidence boundaries are needed.",
    "",
    `Records: ${records.length}`,
    ""
  ];
  const output = `${header.join("\n")}${records.map(renderRecord).join("\n\n")}\n`.replace(/[ \t]+$/gm, "");
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, output, "utf8");
  return { outputPath, records: records.length, bytes: Buffer.byteLength(output) };
}

if (require.main === module) console.log(JSON.stringify(exportSiteMemory(), null, 2));

module.exports = { exportSiteMemory, renderEffectUse, renderRecord };
