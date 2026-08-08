const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const required = [
  "index.html",
  "AGENTS.md",
  "README.md",
  "docs/learning-workflow.md",
  "requirements.txt",
  "skills/sfx-knowledge/SKILL.md",
  "skills/sfx-knowledge/references/sfx-knowledge.md",
  "skills/sfx-knowledge/references/video-learnings.md",
  "skills/sfx-knowledge/references/site-video-memory.md",
  "tools/prepare-sfx-video.py",
  "tools/extract-video-context.cjs",
  "tools/export-site-memory.cjs",
  "tools/install-sfx-skill.ps1",
];

const failures = [];
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`missing ${relative}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const match = html.match(/const records = ([\s\S]*?);\r?\n\r?\n\s*const imageManifest/);
if (!match) failures.push("index.html records block not found");
const records = match ? JSON.parse(match[1]) : [];
const ids = records.map((record) => record.videoId).filter(Boolean);
if (new Set(ids).size !== ids.length) failures.push("duplicate videoId found in records");

const siteMemoryPath = path.join(root, "skills", "sfx-knowledge", "references", "site-video-memory.md");
const siteMemory = fs.existsSync(siteMemoryPath) ? fs.readFileSync(siteMemoryPath, "utf8") : "";
const missingMemory = ids.filter((id) => !siteMemory.includes(`## ${id} - `));
if (missingMemory.length) failures.push(`site memory missing ${missingMemory.length} video ids: ${missingMemory.join(", ")}`);

const skill = fs.readFileSync(path.join(root, "skills", "sfx-knowledge", "SKILL.md"), "utf8");
if (!/^---\r?\nname: sfx-knowledge\r?\ndescription: .+\r?\n---/s.test(skill)) failures.push("invalid sfx-knowledge frontmatter");
if (!skill.includes("site-video-memory.md")) failures.push("SKILL.md does not reference site-video-memory.md");

const ignore = fs.readFileSync(path.join(root, ".gitignore"), "utf8");
for (const rule of [".venv/", ".work/", "cookies*.txt", ".env"]) {
  if (!ignore.includes(rule)) failures.push(`.gitignore missing ${rule}`);
}

const textExtensions = new Set([".md", ".txt", ".json", ".js", ".cjs", ".mjs", ".py", ".ps1", ".html", ".yml", ".yaml"]);
const sensitive = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /gh[oprsu]_[A-Za-z0-9]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /(?:api[_ -]?key|password|secret)\s*[:=]\s*["'][^"']{8,}["']/i,
];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if ([".git", ".work", ".venv", "node_modules", "assets"].includes(entry.name) || entry.name.startsWith(".chrome-")) continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (textExtensions.has(path.extname(entry.name).toLowerCase())) {
      const content = fs.readFileSync(full, "utf8");
      if (sensitive.some((pattern) => pattern.test(content))) failures.push(`sensitive token pattern in ${path.relative(root, full)}`);
    }
  }
}

walk(root);

const report = {
  ok: failures.length === 0,
  records: records.length,
  uniqueVideoIds: new Set(ids).size,
  siteMemoryCoverage: `${ids.length - missingMemory.length}/${ids.length}`,
  siteMemoryBytes: Buffer.byteLength(siteMemory),
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
