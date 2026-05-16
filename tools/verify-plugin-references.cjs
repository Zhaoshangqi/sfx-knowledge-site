const fs = require("fs");

const html = fs.readFileSync("index.html", "utf8");
const records = JSON.parse(html.match(/const records = ([\s\S]*?);\n\s*const imageManifest/)[1]);
const catalog = JSON.parse(html.match(/const pluginReferenceCatalog = ([\s\S]*?);\n\n\s*const categoryById/)[1]);

function normalize(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[()（）'’`"]/g, " ")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function referencesFor(plugin) {
  const pluginName = normalize(plugin.name);
  const matches = [];
  for (const ref of catalog) {
    let bestAlias = "";
    for (const alias of ref.aliases || []) {
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias) continue;
      if (pluginName === normalizedAlias || pluginName.includes(normalizedAlias)) {
        if (normalizedAlias.length > bestAlias.length) bestAlias = normalizedAlias;
      }
    }
    if (bestAlias) matches.push({ ref, alias: bestAlias, score: bestAlias.length });
  }
  matches.sort((a, b) => b.score - a.score || a.ref.title.localeCompare(b.ref.title));
  const selected = [];
  for (const candidate of matches) {
    const hiddenByLongerMatch = selected.some((item) => item.alias.includes(candidate.alias) && item.alias !== candidate.alias);
    if (!hiddenByLongerMatch) selected.push(candidate);
  }
  return selected.slice(0, 4).map((candidate) => candidate.ref);
}

let total = 0;
let withOfficial = 0;
let withoutOfficial = 0;
let missingAssets = 0;
const examples = [];

for (const record of records) {
  for (const plugin of record.plugins || []) {
    total += 1;
    const official = referencesFor(plugin);
    if (official.length) withOfficial += 1;
    else {
      withoutOfficial += 1;
      examples.push(`${record.videoId}: ${plugin.name}`);
    }
    for (const ref of official) {
      if (!fs.existsSync(ref.preview) || !fs.existsSync(ref.full)) missingAssets += 1;
    }
  }
}

const result = {
  records: records.length,
  totalPluginCards: total,
  catalog: catalog.length,
  withOfficial,
  withoutOfficial,
  missingAssets,
  examples: examples.slice(0, 10)
};

console.log(JSON.stringify(result, null, 2));
if (missingAssets) process.exit(1);
