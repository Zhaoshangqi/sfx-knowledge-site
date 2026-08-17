const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");
const { validateTrack } = require("./batch-site-subtitles.cjs");
const siteData = require("./site-data.cjs");
const videoTimeline = require("../src/video-timeline.js");
const knowledgeModel = require("../src/knowledge-model.js");
const publicEffectUseManifest = require("./data/public-effect-use-ids.json");

const root = path.resolve(__dirname, "..");
const expectedSiteRecords = 84;
const expectedSteps = 947;
const expectedPublicCases = 97;
const expectedScreenshotSteps = 870;
const youtubeVideoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const required = [
  "index.html",
  "AGENTS.md",
  "README.md",
  "docs/learning-workflow.md",
  "requirements.txt",
  "src/video-subtitles.js",
  "skills/sfx-knowledge/SKILL.md",
  "skills/sfx-knowledge/references/sfx-knowledge.md",
  "skills/sfx-knowledge/references/video-learnings.md",
  "skills/sfx-knowledge/references/site-video-memory.md",
  "tools/prepare-sfx-video.py",
  "tools/extract-video-context.cjs",
  "tools/export-site-memory.cjs",
  "tools/build-site-subtitles.cjs",
  "tools/batch-site-subtitles.cjs",
  "tools/data/subtitle-status-overrides.json",
  "tools/install-sfx-skill.ps1",
];

const args = process.argv.slice(2);
const allowIncompleteTimeline = args.length === 1 && args[0] === "--allow-incomplete-timeline";
const failures = [];
if (args.length !== 0 && !allowIncompleteTimeline) {
  failures.push(`invalid verifier arguments: ${args.join(" ")}`);
}
for (const relative of required) {
  if (!fs.existsSync(path.join(root, relative))) failures.push(`missing ${relative}`);
}

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
let records = [];
let imageManifest = {};
try {
  const parsedSiteData = siteData.parse(html);
  records = parsedSiteData.records;
  imageManifest = parsedSiteData.imageManifest;
} catch (error) {
  failures.push(`invalid structured site data: ${error.message}`);
}
if (records.length !== expectedSiteRecords) {
  failures.push(`expected ${expectedSiteRecords} site records, found ${records.length}`);
}
const ids = [];
for (const [index, record] of records.entries()) {
  const videoId = record && typeof record === "object" ? record.videoId : undefined;
  if (typeof videoId !== "string" || !youtubeVideoIdPattern.test(videoId)) {
    failures.push(`invalid site record videoId at index ${index}`);
  } else {
    ids.push(videoId);
  }
}
const siteIdSet = new Set(ids);
if (siteIdSet.size !== ids.length) failures.push("duplicate videoId found in records");
if (ids.length !== expectedSiteRecords || siteIdSet.size !== expectedSiteRecords) {
  failures.push(
    `expected ${expectedSiteRecords} valid unique video IDs, ` +
    `found ${ids.length} valid and ${siteIdSet.size} unique`
  );
}

let publicUses = [];
const projectedUsesById = new Map();
try {
  for (const use of knowledgeModel.buildEffectUses(records)) {
    const id = use && typeof use.id === "string" ? use.id.trim() : "";
    if (!id) continue;
    if (projectedUsesById.has(id)) {
      throw new Error(`duplicate projected effect use ID: ${id}`);
    }
    projectedUsesById.set(id, use);
  }
  const seenPublicIds = new Set();
  for (const id of publicEffectUseManifest.useIds || []) {
    if (typeof id !== "string" || !id.trim()) {
      throw new Error("public effect use manifest contains a blank ID");
    }
    if (seenPublicIds.has(id)) {
      throw new Error(`duplicate public effect use ID: ${id}`);
    }
    seenPublicIds.add(id);
    if (projectedUsesById.has(id)) publicUses.push(projectedUsesById.get(id));
    else failures.push(`unresolved public effect use ID: ${id}`);
  }
  if (!allowIncompleteTimeline && seenPublicIds.size !== expectedPublicCases) {
    failures.push(`expected ${expectedPublicCases} public effect use IDs, found ${seenPublicIds.size}`);
  }
} catch (error) {
  failures.push(`invalid public effect use projection: ${error.message}`);
}

const timelineCoverage = videoTimeline.coverage(records, publicUses);
const timelineExpectations = {
  records: expectedSiteRecords,
  reviewedRecords: expectedSiteRecords,
  steps: expectedSteps,
  timedSteps: expectedSteps,
  publicCases: expectedPublicCases,
  timedPublicCases: expectedPublicCases,
  screenshotCasesReviewed: expectedPublicCases
};
if (!allowIncompleteTimeline) {
  for (const [field, expected] of Object.entries(timelineExpectations)) {
    if (timelineCoverage[field] !== expected) {
      failures.push(`timeline coverage ${field}: expected ${expected}, found ${timelineCoverage[field]}`);
    }
  }
}

const screenshotSteps = records.flatMap((record) => (
  Array.isArray(record && record.steps)
    ? record.steps.filter((step) => step && typeof step.imageKey === "string" && step.imageKey)
    : []
));
let resolvedScreenshotAssets = 0;
for (const step of screenshotSteps) {
  const asset = imageManifest[step.imageKey];
  let complete = Boolean(asset && typeof asset === "object" && !Array.isArray(asset));
  if (!complete) {
    failures.push(`missing imageManifest entry: ${step.imageKey}`);
  }
  for (const size of ["preview", "full"]) {
    const relative = complete && typeof asset[size] === "string" && asset[size] ? asset[size] : "";
    if (!relative || !fs.existsSync(path.join(root, relative))) {
      complete = false;
      failures.push(`missing ${size} asset: ${step.imageKey}`);
    }
  }
  if (complete) resolvedScreenshotAssets += 1;
}
if (!allowIncompleteTimeline && screenshotSteps.length !== expectedScreenshotSteps) {
  failures.push(`step screenshot coverage: expected ${expectedScreenshotSteps}, found ${screenshotSteps.length}`);
}
if (!allowIncompleteTimeline && resolvedScreenshotAssets !== expectedScreenshotSteps) {
  failures.push(`resolved step screenshot assets: expected ${expectedScreenshotSteps}, found ${resolvedScreenshotAssets}`);
}

const subtitleModulePath = path.join(root, "src", "video-subtitles.js");
const subtitleRoot = path.join(root, "assets", "subtitles");
let subtitleRootIsDirectory = false;
try {
  const subtitleRootStat = fs.lstatSync(subtitleRoot);
  if (subtitleRootStat.isSymbolicLink()) {
    failures.push("assets/subtitles root is a symlink or junction");
  } else if (!subtitleRootStat.isDirectory()) {
    failures.push("assets/subtitles is not a directory");
  } else {
    subtitleRootIsDirectory = true;
  }
} catch (error) {
  if (error.code === "ENOENT") failures.push("missing assets/subtitles directory");
  else failures.push(`unable to inspect assets/subtitles root: ${error.message}`);
}
const subtitleModule = fs.existsSync(subtitleModulePath)
  ? fs.readFileSync(subtitleModulePath, "utf8")
  : "";
const catalogPattern = /\/\* SUBTITLE_CATALOG_START \*\/\s*var rawCatalog\s*=\s*([\s\S]*?);\s*\/\* SUBTITLE_CATALOG_END \*\//g;
const catalogMatches = [...subtitleModule.matchAll(catalogPattern)];
let subtitleCatalog = [];

if (catalogMatches.length !== 1) {
  failures.push("subtitle catalog marker block not found exactly once");
} else {
  const expression = catalogMatches[0][1];
  try {
    try {
      subtitleCatalog = JSON.parse(expression);
    } catch (jsonError) {
      subtitleCatalog = vm.runInNewContext(`(${expression})`, Object.create(null), {
        timeout: 100,
        contextCodeGeneration: { strings: false, wasm: false },
      });
    }
    if (!Array.isArray(subtitleCatalog)) throw new Error("catalog is not an array");
  } catch (error) {
    failures.push(`invalid subtitle catalog: ${error.message}`);
    subtitleCatalog = [];
  }
}

const catalogIds = [];
const referencedSubtitleJson = new Set();
for (const [index, entry] of subtitleCatalog.entries()) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry) ||
      !/^[A-Za-z0-9_-]{11}$/.test(entry.videoId || "") ||
      !["track", "no-speech", "missing"].includes(entry.contentStatus)) {
    failures.push(`invalid subtitle catalog entry at index ${index}`);
    continue;
  }

  catalogIds.push(entry.videoId);
  if (entry.contentStatus !== "track") {
    if (Object.prototype.hasOwnProperty.call(entry, "asset")) {
      failures.push(`non-track subtitle entry has asset: ${entry.videoId}`);
    }
    continue;
  }

  const expectedAsset = `assets/subtitles/${entry.videoId}.json`;
  if (entry.asset !== expectedAsset) {
    failures.push(`invalid subtitle asset for ${entry.videoId}: ${String(entry.asset)}`);
    continue;
  }
  referencedSubtitleJson.add(expectedAsset);
  if (!subtitleRootIsDirectory) continue;
  const assetPath = path.resolve(root, ...expectedAsset.split("/"));
  if (!fs.existsSync(assetPath) || !fs.lstatSync(assetPath).isFile()) {
    failures.push(`missing subtitle asset ${expectedAsset}`);
    continue;
  }
  try {
    const realSubtitleRoot = fs.realpathSync.native(subtitleRoot);
    const realAssetPath = fs.realpathSync.native(assetPath);
    const relativeAsset = path.relative(realSubtitleRoot, realAssetPath);
    if (relativeAsset === ".." || relativeAsset.startsWith(`..${path.sep}`) || path.isAbsolute(relativeAsset)) {
      failures.push(`subtitle asset escapes assets/subtitles: ${expectedAsset}`);
      continue;
    }
    const track = JSON.parse(fs.readFileSync(assetPath, "utf8"));
    validateTrack(track, expectedAsset);
    const metadataFields = ["videoId", "language", "source", "reviewStatus", "updatedAt"];
    const mismatches = metadataFields.filter((field) => track[field] !== entry[field]);
    if (mismatches.length) {
      failures.push(
        `subtitle asset metadata mismatch for ${expectedAsset}: ${mismatches.join(", ")}`
      );
    }
  } catch (error) {
    failures.push(`invalid subtitle asset ${expectedAsset}: ${error.message}`);
  }
}

if (new Set(catalogIds).size !== catalogIds.length) {
  failures.push("duplicate videoId found in subtitle catalog");
}
const catalogIdSet = new Set(catalogIds);
const missingCatalogIds = [...siteIdSet].filter((id) => !catalogIdSet.has(id));
const orphanCatalogIds = [...catalogIdSet].filter((id) => !siteIdSet.has(id));
if (subtitleCatalog.length !== expectedSiteRecords ||
    catalogIdSet.size !== expectedSiteRecords ||
    siteIdSet.size !== expectedSiteRecords ||
    missingCatalogIds.length || orphanCatalogIds.length) {
  failures.push(
    `subtitle catalog coverage ${catalogIdSet.size}/${expectedSiteRecords}; ` +
    `missing: ${missingCatalogIds.join(", ") || "none"}; ` +
    `orphan: ${orphanCatalogIds.join(", ") || "none"}`
  );
}

const mediaExtensions = new Set([
  ".aac", ".aiff", ".avi", ".flac", ".m4a", ".mka", ".mkv", ".mov",
  ".mp3", ".mp4", ".mpeg", ".mpg", ".ogg", ".opus", ".wav", ".webm",
]);

function portablePath(filename) {
  return path.relative(root, filename).split(path.sep).join("/");
}

function inspectSubtitleBoundary(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    const relative = portablePath(full);
    if (entry.isSymbolicLink()) {
      failures.push(`symlink under assets/subtitles: ${relative}`);
    } else if (entry.isDirectory()) {
      inspectSubtitleBoundary(full);
    } else {
      const extension = path.extname(entry.name).toLowerCase();
      if (mediaExtensions.has(extension)) failures.push(`media file under assets/subtitles: ${relative}`);
      if (extension === ".json" && !referencedSubtitleJson.has(relative)) {
        failures.push(`unreferenced subtitle JSON: ${relative}`);
      }
    }
  }
}

if (subtitleRootIsDirectory) {
  inspectSubtitleBoundary(subtitleRoot);
}

const tracked = spawnSync("git", ["ls-files", "-z", "--", ".work", "assets/subtitles"], {
  cwd: root,
  encoding: "utf8",
  windowsHide: true,
});
if (tracked.error || tracked.status !== 0) {
  failures.push(`unable to inspect tracked portable-kit files: ${tracked.error ? tracked.error.message : tracked.stderr.trim()}`);
} else {
  const trackedPaths = tracked.stdout.split("\0").filter(Boolean);
  const trackedPathSet = new Set(trackedPaths);
  for (const trackedPath of trackedPaths) {
    if (trackedPath === ".work" || trackedPath.startsWith(".work/")) {
      failures.push(`tracked file under .work: ${trackedPath}`);
    }
    if (trackedPath.startsWith("assets/subtitles/") &&
        mediaExtensions.has(path.extname(trackedPath).toLowerCase())) {
      failures.push(`tracked media file under assets/subtitles: ${trackedPath}`);
    }
  }
  for (const referenced of referencedSubtitleJson) {
    if (!trackedPathSet.has(referenced)) {
      failures.push(`referenced subtitle JSON is not tracked: ${referenced}`);
    }
  }
}

const siteMemoryPath = path.join(root, "skills", "sfx-knowledge", "references", "site-video-memory.md");
const siteMemory = fs.existsSync(siteMemoryPath) ? fs.readFileSync(siteMemoryPath, "utf8") : "";
const missingMemory = [...siteIdSet].filter((id) => !siteMemory.includes(`## ${id} - `));
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
  uniqueVideoIds: siteIdSet.size,
  timelineGate: allowIncompleteTimeline ? "allowed-incomplete" : "complete-required",
  timelineCoverage,
  screenshotStepAssets: `${resolvedScreenshotAssets}/${screenshotSteps.length}`,
  subtitleCatalogCoverage: `${catalogIdSet.size}/${expectedSiteRecords}`,
  subtitleAssets: referencedSubtitleJson.size,
  siteMemoryCoverage: `${siteIdSet.size - missingMemory.length}/${expectedSiteRecords}`,
  siteMemoryBytes: Buffer.byteLength(siteMemory),
  failures,
};
console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
