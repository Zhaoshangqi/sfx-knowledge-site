const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "index.html");
const catalogPath = path.join(root, "assets", "plugin-shots", "catalog.json");

const html = fs.readFileSync(htmlPath, "utf8");
const generated = JSON.parse(fs.readFileSync(catalogPath, "utf8"));
const entries = generated.entries.map((entry) => ({
  title: entry.title,
  source: entry.source,
  aliases: entry.aliases,
  preview: entry.preview,
  full: entry.full,
  match: entry.match
}));

const catalogJs = `const pluginReferenceCatalog = ${JSON.stringify(entries, null, 2)};\n\n    `;
let next = html;
if (/const pluginReferenceCatalog = [\s\S]*?;\n\n\s*const categoryById = /.test(next)) {
  next = next.replace(/const pluginReferenceCatalog = [\s\S]*?;\n\n\s*const categoryById = /, `${catalogJs}const categoryById = `);
} else {
  next = next.replace(/};\n\n\s*const categoryById = /, `};\n\n    ${catalogJs}const categoryById = `);
}

if (next === html) {
  throw new Error("Failed to inject pluginReferenceCatalog");
}

fs.writeFileSync(htmlPath, next);
console.log(JSON.stringify({
  injected: entries.length,
  failures: generated.failures.length,
  htmlPath
}, null, 2));
