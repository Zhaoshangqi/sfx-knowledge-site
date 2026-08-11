const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");

const verifier = path.resolve(__dirname, "..", "tools", "verify-plugin-references.cjs");

test("plugin reference verifier accepts CRLF HTML", () => {
  const workdir = fs.mkdtempSync(path.join(os.tmpdir(), "plugin-reference-verifier-"));
  const html = [
    "const records = [];",
    "const imageManifest = {};",
    "",
    "const pluginReferenceCatalog = [];",
    "",
    "const categoryById = {};",
  ].join("\r\n");

  try {
    fs.writeFileSync(path.join(workdir, "index.html"), html, "utf8");
    const result = spawnSync(process.execPath, [verifier], {
      cwd: workdir,
      encoding: "utf8",
    });

    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).records, 0);
  } finally {
    fs.rmSync(workdir, { recursive: true, force: true });
  }
});

test("known error-page captures are excluded from generated reference catalogs", () => {
  const root = path.resolve(__dirname, "..");
  const source = fs.readFileSync(path.join(root, "tools", "prepare-plugin-reference-shots.cjs"), "utf8");
  const assetCatalog = JSON.parse(fs.readFileSync(path.join(root, "assets", "plugin-shots", "catalog.json"), "utf8"));
  const blockedSlugs = [
    "izotope-stutter-edit-2",
    "izotope-rx",
    "izotope-ozone",
    "izotope-trash",
    "izotope-vocalsynth",
    "ableton-vocoder"
  ];

  for (const slug of blockedSlugs) {
    assert.doesNotMatch(source, new RegExp(`\\["${slug}"`));
    assert.ok(!assetCatalog.entries.some((entry) => entry.slug === slug), `${slug} remains in catalog.json`);
  }
});
