const fs = require("fs");
const path = require("path");

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
  "parameterLogic",
  "practiceChecklist"
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

function fileExists(relativePath) {
  return isNonemptyString(relativePath) && fs.existsSync(path.resolve(repoRoot, relativePath));
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

function validateRequiredRecord(record, item, learnings, memory) {
  const label = item.id;
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
    if (!fileExists(image.preview)) {
      fail(`Record ${label} image preview does not exist for ${imageKey}: ${image.preview}`);
    }
    if (!fileExists(image.full)) {
      fail(`Record ${label} image full path does not exist for ${imageKey}: ${image.full}`);
    }
  });

  steps.forEach((step, stepIndex) => {
    if (!step || !step.motion) return;
    if (!fileExists(step.motion.src)) {
      fail(`Record ${label} step ${stepIndex + 1} motion src does not exist: ${step.motion.src}`);
    }
    if (!fileExists(step.motion.poster)) {
      fail(`Record ${label} step ${stepIndex + 1} motion poster does not exist: ${step.motion.poster}`);
    }
  });

  if (!learnings.includes(label)) {
    fail(`video-learnings.md is missing ID ${label}`);
  }
  if (!memory.includes(`## ${label} - `)) {
    fail(`site-video-memory.md is missing heading prefix "## ${label} - "`);
  }
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

if (completed !== null) {
  const expectedRecordCount = baselineCount + completed;
  if (records.length !== expectedRecordCount) {
    fail(`records.length must be ${expectedRecordCount} for completed=${completed}; found ${records.length}`);
  }

  const required = playlist.slice(0, completed);
  const expectedIds = required.map((item) => item.id);
  const appendedIds = records.slice(baselineCount).map((record) => record && record.videoId);
  if (JSON.stringify(appendedIds) !== JSON.stringify(expectedIds)) {
    fail(
      `Imported record order mismatch after baseline: expected ${JSON.stringify(expectedIds)}, ` +
        `found ${JSON.stringify(appendedIds)}`
    );
  }

  playlist.slice(completed).forEach((item) => {
    if (videoIds.includes(item.id)) {
      fail(`Not-yet-expected playlist item is already present: ${item.id}`);
    }
  });

  const learnings = required.length > 0 ? readText(learningsPath, "video-learnings.md") : "";
  const memory = required.length > 0 ? readText(memoryPath, "site-video-memory.md") : "";
  required.forEach((item) => {
    const record = records.find((candidate) => candidate && candidate.videoId === item.id);
    validateRequiredRecord(record, item, learnings, memory);
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
