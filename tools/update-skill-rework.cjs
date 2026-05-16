const fs = require("fs");
const path = require("path");

const siteRoot = path.resolve(__dirname, "..");
const indexPath = path.join(siteRoot, "index.html");
const skillPath = path.join(process.env.USERPROFILE, ".codex", "skills", "sfx-knowledge", "references", "video-learnings.md");
const today = "2026-05-16";
const begin = "<!-- BEGIN SFX_SITE_DEEP_REWORK_2026_05_16 -->";
const end = "<!-- END SFX_SITE_DEEP_REWORK_2026_05_16 -->";

const html = fs.readFileSync(indexPath, "utf8");
const records = JSON.parse(html.match(/const records = ([\s\S]*?);\r?\n\r?\n\s*const imageManifest/)[1]);

function categoryPrinciple(category) {
  return {
    impact: "冲击类优先判断 transient/body/texture/tail，力道来自攻击速度和层角色，不是单纯加低频。",
    magic: "魔法类先做 gesture 与 tonal/resonant 层，再用随机调制、二次采样和尾音建立能量句子。",
    scifi: "科幻/UI 类按 input feedback、机械运动、能量层、细节、loop/tail 拆分，参数跟交互状态绑定。",
    environment: "环境类先保留真实随机性，再用 rate/stretch/EQ/loop 让空间长期可听。",
    creature: "生物类用 pitch/formant/envelope 改体型和情绪，再叠口腔、胸腔、皮肤或机械材质。",
    workflow: "流程类重点记录素材角色、插件顺序、打印中间结果、变体命名和 middleware 落地。"
  }[category] || "先确定源素材角色，再按清理、塑形、运动、空间、动态、导出的顺序判断。";
}

const rows = records.map((record) => {
  const shots = (record.steps || []).filter((step) => step.imageKey).length;
  const settings = (record.plugins || []).reduce((sum, plugin) => sum + ((plugin.settings || []).length), 0);
  const chain = (record.plugins || []).slice(0, 6).map((plugin) => plugin.name).join(" -> ");
  const idea = (record.coreIdeas || []).find((item) => !/这条要按效果链学习/.test(item)) || categoryPrinciple(record.category);
  return `- ${record.title} [${record.videoId}]：${record.steps.length} steps / ${shots} shots / ${record.plugins.length} plugins / ${settings} parameter notes. Chain: ${chain || "source -> EQ -> modulation -> dynamics"}. Reusable principle: ${idea}`;
});

const categoryBlocks = ["impact", "magic", "scifi", "environment", "creature", "workflow"].map((category) => {
  const items = records.filter((record) => record.category === category || (record.secondaryCategories || []).includes(category));
  return `- ${category}: ${items.length} videos. ${categoryPrinciple(category)}`;
});

const block = `${begin}

## Full Site Deep Rework Index (${today})

This block records the full-site rework pass requested by the user. The website now treats every analyzed video as a study module rather than a summary card. The minimum standard used in the site is:

- At least 10 concrete steps per video when evidence exists.
- Multiple clear screenshots per module, with preview images for page speed and full-resolution images for detail reading.
- Plugin/effect-chain notes distinguish confirmed visible values from inferred parameter direction.
- Every module includes effect-chain focus, parameter-adjustment logic, and practice checklist.
- If a tutorial does not reveal exact values, store the reusable decision rule instead of inventing numbers.

### Category-Level Retrieval Rules

${categoryBlocks.join("\n")}

### Video Modules

${rows.join("\n")}

### Reuse Pattern

When designing a new SFX from these learnings, retrieve by target role first:

1. Pick the closest category: impact, magic, sci-fi/UI, environment, creature, or workflow.
2. Copy the source-role decomposition, not the exact plugins.
3. Build the chain in stages: cleanup -> identity/scale -> motion/modulation -> texture/saturation -> space/tail -> dynamics/loudness.
4. For each plugin, ask whether it changes role, motion, frequency, space, dynamics, or final level.
5. Render variants and compare at matched loudness before choosing.

${end}`;

let skill = fs.readFileSync(skillPath, "utf8");
const pattern = new RegExp(`${begin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
if (pattern.test(skill)) {
  skill = skill.replace(pattern, block);
} else {
  skill = `${skill.trim()}\n\n${block}\n`;
}
fs.writeFileSync(skillPath, skill, "utf8");
console.log(JSON.stringify({ skillPath, records: records.length, blockLines: block.split(/\r?\n/).length }, null, 2));
