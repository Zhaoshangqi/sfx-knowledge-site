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

const eol = html.includes("\r\n") ? "\r\n" : "\n";
const catalogJson = JSON.stringify(entries, null, 2).replace(/\n/g, eol);
const catalogJs = `const pluginReferenceCatalog = ${catalogJson};${eol}${eol}    `;
const existingCatalogPattern = /const pluginReferenceCatalog = [\s\S]*?;\r?\n\r?\n\s*const categoryById = /;
const categoryAfterObjectPattern = /};\r?\n\r?\n\s*const categoryById = /;
let next = html;
if (existingCatalogPattern.test(next)) {
  next = next.replace(existingCatalogPattern, `${catalogJs}const categoryById = `);
} else {
  next = next.replace(categoryAfterObjectPattern, `};${eol}${eol}    ${catalogJs}const categoryById = `);
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
