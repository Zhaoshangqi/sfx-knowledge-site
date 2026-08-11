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

test("generated plugin catalog is the canonical inline catalog", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const source = fs.readFileSync(path.join(root, "tools", "prepare-plugin-reference-shots.cjs"), "utf8");
  const assetCatalog = JSON.parse(fs.readFileSync(path.join(root, "assets", "plugin-shots", "catalog.json"), "utf8"));
  const match = html.match(/const pluginReferenceCatalog = ([\s\S]*?);\r?\n\r?\n\s*const categoryById/);
  assert.ok(match, "missing inline pluginReferenceCatalog");
  const inlineCatalog = JSON.parse(match[1]);
  const generatedCatalog = assetCatalog.entries.map(({ title, source, aliases, preview, full, match }) => ({
    title,
    source,
    aliases,
    preview,
    full,
    match
  }));

  assert.deepEqual(inlineCatalog, generatedCatalog);
  const proQ = generatedCatalog.find((entry) => entry.aliases.includes("FabFilter Pro-Q 3"));
  assert.ok(proQ);
  assert.equal(proQ.title, "FabFilter Pro-Q 4（当前继任版本参考）");
  assert.match(proQ.match, /视频内 Pro-Q 3 的界面与参数以步骤证据为准/);
  assert.match(source, /FabFilter Pro-Q 4（当前继任版本参考）/);
});
