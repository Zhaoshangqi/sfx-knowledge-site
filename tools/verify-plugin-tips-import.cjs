const fs = require("fs");
const path = require("path");
const {
  stripCourseScaffolding,
  uniqueFacts
} = require("../src/knowledge-model.js");
const {
  renderEffectUse,
  renderRecord
} = require("./export-site-memory.cjs");

const baselineCount = 62;
const repoRoot = path.resolve(__dirname, "..");
const manifestPath = path.join(__dirname, "data", "plugin-tips-playlist.json");
const htmlPath = path.join(repoRoot, "index.html");
const learningsPath = path.join(
  repoRoot,
  "skills",
  "sfx-knowledge",
  "references",
  "video-learnings.md"
);
const memoryPath = path.join(
  repoRoot,
  "skills",
  "sfx-knowledge",
  "references",
  "site-video-memory.md"
);
const requiredArrays = [
  "coreIdeas",
  "steps",
  "plugins",
  "materials",
  "chainFocus",
  "parameterLogic"
];
const forbiddenMemoryPatterns = [
  ["Practice Checklist section", /^### Practice Checklist$/m],
  ["practice content", /复习|复刻时只调一个核心旋钮|复刻时只动一个核心参数|弱\/中\/强三版|3 个强度版本|练习/]
];

const failures = [];
let playlist = [];
let categoryCounts = {};
let records = [];
let imageManifest = {};

function fail(message) {
  failures.push(message);
}

function readText(filePath, label) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    fail(`Unable to read ${label}: ${error.message}`);
    return "";
  }
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`Unable to parse ${label} as JSON: ${error.message}`);
    return null;
  }
}

function parseDataBlock(html, name, nextName) {
  const startMarker = `const ${name} =`;
  const endMarker = `const ${nextName} =`;
  const start = html.indexOf(startMarker);
  const end = html.indexOf(endMarker, start + startMarker.length);

  if (start === -1 || end === -1 || end <= start) {
    fail(`Unable to locate ${name} before ${nextName} in index.html`);
    return null;
  }

  const block = html
    .slice(start + startMarker.length, end)
    .trim()
    .replace(/;\s*$/, "");
  return parseJson(block, `index.html ${name}`);
}

function parseCompleted(args, playlistTotal) {
  if (args.length === 0) return 20;
  if (args.length !== 2 || args[0] !== "--completed") {
    fail("Usage: node tools\\verify-plugin-tips-import.cjs [--completed N]");
    return null;
  }

  if (!/^\d+$/.test(args[1])) {
    fail(`Invalid --completed value: ${args[1]}`);
    return null;
  }

  const value = Number(args[1]);
  if (!Number.isSafeInteger(value) || value < 0 || value > playlistTotal) {
    fail(`Invalid --completed value: ${args[1]} (expected 0-${playlistTotal})`);
    return null;
  }
  return value;
}

function isNonemptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function fact(value) {
  const scalar = typeof value === "string"
    ? value
    : typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : "";
  const cleaned = stripCourseScaffolding(scalar.replace(/\s+/g, " ").trim());
  return cleaned;
}

function facts(items) {
  return uniqueFacts(arrayOrEmpty(items).map(fact));
}

function effectLines(effect) {
  return renderEffectUse(effect).split("\n").filter(Boolean);
}

function normalizedBlock(value) {
  const text = Array.isArray(value) ? value.join("\n") : String(value || "");
  return text.replace(/\r\n/g, "\n").trimEnd();
}

function playlistItemId(item) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return undefined;
  return item.id;
}

function pathEscapes(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative);
}

function assetPathFailure(relativePath, allowedDirectory) {
  if (!isNonemptyString(relativePath)) return "must be a nonempty path";
  if (
    path.isAbsolute(relativePath) ||
    path.win32.isAbsolute(relativePath) ||
    path.posix.isAbsolute(relativePath)
  ) {
    return "must be relative";
  }
  if (relativePath.split(/[\\/]+/).includes("..")) {
    return "must not contain .. traversal";
  }

  const allowedRoot = path.resolve(repoRoot, allowedDirectory);
  const resolvedPath = path.resolve(repoRoot, relativePath);
  if (pathEscapes(allowedRoot, resolvedPath)) {
    return `must be under ${allowedDirectory}`;
  }

  try {
    if (!fs.statSync(resolvedPath).isFile()) return "must resolve to a file";
    if (pathEscapes(fs.realpathSync(allowedRoot), fs.realpathSync(resolvedPath))) {
      return `must resolve under ${allowedDirectory}`;
    }
  } catch (error) {
    return `does not resolve to a readable file (${error.code || error.message})`;
  }
  return null;
}

function validateAssetPath(relativePath, allowedDirectory, label) {
  const reason = assetPathFailure(relativePath, allowedDirectory);
  if (reason) fail(`${label} ${reason}: ${relativePath}`);
}

function parseMarkdownBlocks(markdown) {
  const blocks = [];
  let current = null;
  let inFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      if (current) current.lines.push(line);
      continue;
    }
    if (!inFence && line.startsWith("## ") && !line.startsWith("### ")) {
      current = { heading: line, lines: [line] };
      blocks.push(current);
    } else if (current) {
      current.lines.push(line);
    }
  }
  return blocks;
}

function sectionLines(block, heading, label) {
  const indexes = [];
  block.lines.forEach((line, index) => {
    if (line === heading) indexes.push(index);
  });
  if (indexes.length !== 1) {
    fail(`${label} must contain exactly one ${heading} section; found ${indexes.length}`);
    return [];
  }
  const start = indexes[0] + 1;
  let end = block.lines.length;
  for (let index = start; index < block.lines.length; index += 1) {
    if (block.lines[index].startsWith("### ")) {
      end = index;
      break;
    }
  }
  return block.lines.slice(start, end);
}

function requireLines(lines, expectedLines, label) {
  expectedLines.forEach((expectedLine) => {
    if (!lines.includes(expectedLine)) fail(`${label} is missing exact line: ${expectedLine}`);
  });
}

function validateManifest() {
  if (!Array.isArray(playlist)) {
    fail("Playlist manifest must be an array");
    playlist = [];
    return;
  }
  if (playlist.length !== 20) {
    fail(`Playlist manifest must contain 20 items; found ${playlist.length}`);
  }

  const ids = new Set();
  playlist.forEach((item, position) => {
    const expectedIndex = position + 1;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      fail(`Playlist item ${expectedIndex} must be an object`);
      return;
    }
    if (item.index !== expectedIndex) {
      fail(`Playlist index at position ${expectedIndex} must be ${expectedIndex}; found ${item.index}`);
    }
    if (!isNonemptyString(item.id)) {
      fail(`Playlist item ${expectedIndex} has no ID`);
    } else if (ids.has(item.id)) {
      fail(`Playlist ID is duplicated: ${item.id}`);
    } else {
      ids.add(item.id);
    }
    if (!/^\d+:\d{2}$/.test(item.duration || "")) {
      fail(`Playlist item ${expectedIndex} has invalid duration: ${item.duration}`);
    }
    if (!isNonemptyString(item.title)) {
      fail(`Playlist item ${expectedIndex} has no title`);
    }
  });
}

function validateCategories() {
  if (!categoryCounts || typeof categoryCounts !== "object" || Array.isArray(categoryCounts)) {
    fail("categoryCounts must be an object");
    return;
  }
  if (categoryCounts.all !== records.length) {
    fail(`categoryCounts.all must equal records.length; found ${categoryCounts.all} and ${records.length}`);
  }

  const categoryNames = Object.keys(categoryCounts).filter((name) => name !== "all");
  const recomputed = Object.fromEntries(categoryNames.map((name) => [name, 0]));
  records.forEach((record) => {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      fail("Every record must be an object");
      return;
    }
    if (record.secondaryCategories !== undefined && !Array.isArray(record.secondaryCategories)) {
      fail(`Record ${record.videoId || record.id || "<unknown>"} secondaryCategories must be an array`);
    }
    const secondaryCategories = Array.isArray(record.secondaryCategories)
      ? record.secondaryCategories
      : [];
    const memberships = new Set([record.category, ...secondaryCategories]);
    memberships.forEach((category) => {
      if (!Object.prototype.hasOwnProperty.call(recomputed, category)) {
        fail(`Record ${record.videoId || record.id || "<unknown>"} has unknown category: ${category}`);
      } else {
        recomputed[category] += 1;
      }
    });
  });

  categoryNames.forEach((category) => {
    if (categoryCounts[category] !== recomputed[category]) {
      fail(
        `categoryCounts.${category} must equal recomputed membership; ` +
          `found ${categoryCounts[category]} and ${recomputed[category]}`
      );
    }
  });
}

function validateLearningBlock(record, learningBlocks) {
  const label = record.videoId;
  const sourceLine = `- Source: \`https://www.youtube.com/watch?v=${label}\``;
  const matches = learningBlocks.filter((block) => block.lines.includes(sourceLine));
  if (matches.length !== 1) {
    fail(
      `video-learnings.md must contain exactly one entry block with source ${sourceLine}; ` +
        `found ${matches.length}`
    );
    return;
  }

  const block = matches[0];
  if (!isNonemptyString(block.heading.slice(3))) {
    fail(`video-learnings.md entry for ${label} must have a nonempty heading`);
  }

  for (const field of ["Domain", "Reusable pattern", "Use when"]) {
    const prefix = `- ${field}:`;
    const fieldLines = block.lines.filter((line) => line.startsWith(prefix));
    if (fieldLines.length !== 1 || !isNonemptyString(fieldLines[0].slice(prefix.length))) {
      fail(`video-learnings.md entry for ${label} must have one nonempty ${field} field`);
    }
  }

  for (const field of [
    "Step / event map",
    "Plugin and processing notes",
    "Design principles learned"
  ]) {
    const heading = `- ${field}:`;
    const indexes = [];
    block.lines.forEach((line, index) => {
      if (line === heading) indexes.push(index);
    });
    if (indexes.length !== 1) {
      fail(`video-learnings.md entry for ${label} must have exactly one ${field} section`);
      continue;
    }
    const start = indexes[0] + 1;
    let end = block.lines.length;
    for (let index = start; index < block.lines.length; index += 1) {
      if (/^- [A-Z]/.test(block.lines[index])) {
        end = index;
        break;
      }
    }
    const items = block.lines.slice(start, end).filter((line) => /^  -\s+\S/.test(line));
    if (items.length === 0) {
      fail(`video-learnings.md entry for ${label} ${field} must contain list items`);
    }
  }
}

function validateSiteMemoryRecord(record, memoryBlocks) {
  const label = record.videoId;
  const headingPrefix = `## ${label} - `;
  const matches = memoryBlocks.filter((block) => block.heading.startsWith(headingPrefix));
  if (matches.length !== 1) {
    fail(`site-video-memory.md must contain exactly one block for ${label}; found ${matches.length}`);
    return;
  }

  const block = matches[0];
  const expectedHeading = `${headingPrefix}${record.title}`;
  if (block.heading !== expectedHeading) {
    fail(`site-video-memory.md heading for ${label} must be exactly: ${expectedHeading}`);
  }
  requireLines(
    block.lines,
    [
      `- Source: \`${record.url}\``,
      `- Creator: ${record.source || "Unknown"}`,
      `- Summary: ${fact(record.summary)}`
    ],
    `site-video-memory.md block for ${label}`
  );

  const coreIdeaLines = sectionLines(block, "### Core Ideas", `site-video-memory.md block for ${label}`);
  requireLines(
    coreIdeaLines,
    facts(record.coreIdeas).map((idea) => `- ${idea}`),
    `site-video-memory.md Core Ideas for ${label}`
  );

  const stepLines = sectionLines(block, "### Step / Event Map", `site-video-memory.md block for ${label}`);
  const expectedSteps = [];
  arrayOrEmpty(record.steps).forEach((step, index) => {
    if (!isNonemptyString(step && step.name) || !isNonemptyString(step && step.detail)) {
      fail(`Record ${label} step ${index + 1} must have a nonempty name and detail`);
      return;
    }
    expectedSteps.push(`${fact(step.order)}. **${fact(step.name)}**: ${fact(step.detail)}`);
    requireLines(
      stepLines,
      facts(step.params).map((param) => `   - ${param}`),
      `site-video-memory.md step parameters for ${label}`
    );
  });
  requireLines(stepLines, expectedSteps, `site-video-memory.md Step / Event Map for ${label}`);

  const pluginLines = sectionLines(
    block,
    "### Plugin and Processing Notes",
    `site-video-memory.md block for ${label}`
  );
  const expectedPlugins = [];
  arrayOrEmpty(record.plugins).forEach((plugin, index) => {
    if (!isNonemptyString(plugin && plugin.name) || !isNonemptyString(plugin && plugin.purpose)) {
      fail(`Record ${label} plugin ${index + 1} must have a nonempty name and purpose`);
      return;
    }
    expectedPlugins.push(`- **${fact(plugin.name)}**: ${fact(plugin.purpose)}`);
    requireLines(
      pluginLines,
      facts(plugin.settings).map((setting) => `  - ${setting}`),
      `site-video-memory.md plugin settings for ${label}`
    );
  });
  requireLines(pluginLines, expectedPlugins, `site-video-memory.md plugins for ${label}`);

  const listSections = [
    ["### Materials / Layer Sources", arrayOrEmpty(record.materials)],
    ["### Effect-Chain Reasoning", arrayOrEmpty(record.chainFocus)],
    [
      "### Key Decisions and Evidence Boundaries",
      [...arrayOrEmpty(record.parameterLogic), ...arrayOrEmpty(record.tips)]
    ]
  ];
  for (const [heading, items] of listSections) {
    const lines = sectionLines(block, heading, `site-video-memory.md block for ${label}`);
    requireLines(
      lines,
      facts(items).map((item) => `- ${item}`),
      `site-video-memory.md ${heading.slice(4)} for ${label}`
    );
  }

  requireLines(
    block.lines,
    [`- Use when: ${facts(record.keywords).join("; ")}`],
    `site-video-memory.md Use when for ${label}`
  );
}

function validateStructuredEffectUses(record, memoryBlocks) {
  const effects = arrayOrEmpty(record && record.effectUses).filter((effect) => (
    effect && typeof effect === "object" && !Array.isArray(effect)
  ));
  if (effects.length === 0) return;

  const label = fact(record.videoId);
  const matches = memoryBlocks.filter((block) => block.heading.startsWith(`## ${label} - `));
  if (matches.length !== 1) return;
  const lines = sectionLines(
    matches[0],
    "### Structured Effect Uses",
    `site-video-memory.md block for ${label}`
  );
  effects.forEach((effect) => {
    requireLines(
      lines,
      effectLines(effect),
      `site-video-memory.md structured effects for ${label}`
    );
  });
}

function validateRequiredRecord(record, item, learningBlocks, memoryBlocks) {
  const label = playlistItemId(item);
  if (!isNonemptyString(label)) return;
  if (!record) {
    fail(`Missing required playlist record: ${label}`);
    return;
  }
  if (!/[\u3400-\u9fff]/u.test(record.title || "")) {
    fail(`Record ${label} must have a Chinese title`);
  }
  const canonicalUrl = `https://www.youtube.com/watch?v=${label}`;
  if (record.url !== canonicalUrl) {
    fail(`Record ${label} must use canonical URL ${canonicalUrl}`);
  }
  if (!isNonemptyString(record.source) || !/^.+ \/ 插件技巧$/u.test(record.source.trim())) {
    fail(`Record ${label} source must be a nonempty channel followed by " / 插件技巧"`);
  }
  if (!Array.isArray(record.keywords) || !record.keywords.includes("插件技巧")) {
    fail(`Record ${label} keywords must contain exact entry "插件技巧"`);
  }
  if (!isNonemptyString(record.summary)) {
    fail(`Record ${label} must have a nonempty summary`);
  }

  requiredArrays.forEach((field) => {
    if (!Array.isArray(record[field]) || record[field].length === 0) {
      fail(`Record ${label} must have a nonempty ${field} array`);
    }
  });

  const steps = Array.isArray(record.steps) ? record.steps : [];
  const illustratedSteps = steps.filter((step) => isNonemptyString(step && step.imageKey));
  if (illustratedSteps.length < 3) {
    fail(`Record ${label} must have imageKey on at least 3 steps; found ${illustratedSteps.length}`);
  }

  steps.forEach((step) => {
    if (!step || !Object.prototype.hasOwnProperty.call(step, "imageKey")) return;
    const imageKey = step.imageKey;
    if (!isNonemptyString(imageKey)) {
      fail(`Record ${label} has an empty imageKey`);
      return;
    }
    const image = imageManifest[imageKey];
    if (!image || typeof image !== "object") {
      fail(`Record ${label} imageKey is missing from imageManifest: ${imageKey}`);
      return;
    }
    validateAssetPath(
      image.preview,
      "assets/shots/preview",
      `Record ${label} image preview for ${imageKey}`
    );
    validateAssetPath(
      image.full,
      "assets/shots/full",
      `Record ${label} image full path for ${imageKey}`
    );
  });

  steps.forEach((step, stepIndex) => {
    if (!step || !step.motion) return;
    validateAssetPath(
      step.motion.src,
      "assets/motions",
      `Record ${label} step ${stepIndex + 1} motion src`
    );
    validateAssetPath(
      step.motion.poster,
      "assets/motions",
      `Record ${label} step ${stepIndex + 1} motion poster`
    );
  });

  validateLearningBlock(record, learningBlocks);
  validateSiteMemoryRecord(record, memoryBlocks);
}

function validateSiteMemory(memory) {
  forbiddenMemoryPatterns.forEach(([label, pattern]) => {
    if (pattern.test(memory)) fail(`site-video-memory.md contains forbidden ${label}`);
  });

  const countMatches = [...memory.matchAll(/^Records:[ \t]*(\d+)[ \t]*$/gm)];
  if (countMatches.length !== 1) {
    fail(`site-video-memory.md must contain exactly one Records line; found ${countMatches.length}`);
  } else if (Number(countMatches[0][1]) !== records.length) {
    fail(
      `site-video-memory.md Records must equal records.length; ` +
        `found ${countMatches[0][1]} and ${records.length}`
    );
  }

  const memoryBlocks = parseMarkdownBlocks(memory);
  const headingIds = memoryBlocks.map((block) => {
    const match = block.heading.match(/^## ([A-Za-z0-9_-]+) - /);
    if (!match) {
      fail(`site-video-memory.md has malformed record heading: ${block.heading}`);
      return undefined;
    }
    return match[1];
  });
  const recordIds = records.map((record) => record && record.videoId);
  if (headingIds.length !== recordIds.length) {
    fail(
      `site-video-memory.md heading count must equal records.length; ` +
        `found ${headingIds.length} and ${recordIds.length}`
    );
  }
  const mismatchIndex = recordIds.findIndex((videoId, index) => headingIds[index] !== videoId);
  if (mismatchIndex !== -1) {
    fail(
      `site-video-memory.md heading IDs/order mismatch at position ${mismatchIndex + 1}; ` +
      `expected ${recordIds[mismatchIndex]}, found ${headingIds[mismatchIndex] || "<missing>"}`
    );
  }

  records.forEach((record, index) => {
    const block = memoryBlocks[index];
    if (!block) return;
    const expected = normalizedBlock(renderRecord(record));
    const actual = normalizedBlock(block.lines);
    if (actual === expected) return;

    const expectedLines = expected.split("\n");
    const actualLines = actual.split("\n");
    const lineCount = Math.max(expectedLines.length, actualLines.length);
    let difference = 0;
    while (difference < lineCount && expectedLines[difference] === actualLines[difference]) {
      difference += 1;
    }
    fail(
      `site-video-memory.md block for ${fact(record && record.videoId) || index + 1} ` +
        `does not exactly match exporter projection at line ${difference + 1}; ` +
        `expected ${JSON.stringify(expectedLines[difference] || "<end>")}, ` +
        `found ${JSON.stringify(actualLines[difference] || "<end>")}`
    );
  });
  return memoryBlocks;
}

const manifestText = readText(manifestPath, "playlist manifest");
if (manifestText) {
  const parsedManifest = parseJson(manifestText, "playlist manifest");
  if (parsedManifest !== null) playlist = parsedManifest;
}
validateManifest();

const completed = parseCompleted(process.argv.slice(2), playlist.length);
const html = readText(htmlPath, "index.html");
if (html) {
  categoryCounts = parseDataBlock(html, "categoryCounts", "records") || {};
  records = parseDataBlock(html, "records", "imageManifest") || [];
  imageManifest = parseDataBlock(html, "imageManifest", "pluginReferenceCatalog") || {};
}

if (!Array.isArray(records)) {
  fail("records must be an array");
  records = [];
}
if (!imageManifest || typeof imageManifest !== "object" || Array.isArray(imageManifest)) {
  fail("imageManifest must be an object");
  imageManifest = {};
}

const videoIds = records.map((record) => record && record.videoId);
const uniqueVideoIds = new Set(videoIds);
videoIds.forEach((videoId, index) => {
  if (!isNonemptyString(videoId)) {
    fail(`Record at position ${index + 1} must have a nonempty videoId`);
  }
});
if (uniqueVideoIds.size !== videoIds.length) {
  const duplicates = [...new Set(videoIds.filter((id, index) => videoIds.indexOf(id) !== index))];
  fail(`Record videoIds must be unique; duplicated: ${duplicates.join(", ")}`);
}

validateCategories();
const memory = readText(memoryPath, "site-video-memory.md");
const memoryBlocks = validateSiteMemory(memory);
records.forEach((record) => validateStructuredEffectUses(record, memoryBlocks));

if (completed !== null) {
  const expectedRecordCount = baselineCount + completed;
  if (records.length !== expectedRecordCount) {
    fail(`records.length must be ${expectedRecordCount} for completed=${completed}; found ${records.length}`);
  }

  const required = playlist.slice(0, completed);
  const expectedIds = required.map(playlistItemId);
  const appendedIds = records.slice(baselineCount).map((record) => record && record.videoId);
  if (JSON.stringify(appendedIds) !== JSON.stringify(expectedIds)) {
    fail(
      `Imported record order mismatch after baseline: expected ${JSON.stringify(expectedIds)}, ` +
        `found ${JSON.stringify(appendedIds)}`
    );
  }

  playlist.slice(completed).forEach((item) => {
    const itemId = playlistItemId(item);
    if (isNonemptyString(itemId) && videoIds.includes(itemId)) {
      fail(`Not-yet-expected playlist item is already present: ${itemId}`);
    }
  });

  const learnings = required.length > 0 ? readText(learningsPath, "video-learnings.md") : "";
  const learningBlocks = parseMarkdownBlocks(learnings);
  required.forEach((item) => {
    const itemId = playlistItemId(item);
    const record = records.find((candidate) => candidate && candidate.videoId === itemId);
    validateRequiredRecord(record, item, learningBlocks, memoryBlocks);
  });
}

const report = {
  ok: failures.length === 0,
  completed,
  playlistTotal: playlist.length,
  records: records.length,
  uniqueVideoIds: uniqueVideoIds.size,
  failures
};

console.log(JSON.stringify(report, null, 2));
if (!report.ok) process.exitCode = 1;
