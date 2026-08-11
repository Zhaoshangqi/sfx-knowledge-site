const fs = require("fs");
const path = require("path");

const siteRoot = path.resolve(__dirname, "..");
const runRoot = path.resolve(siteRoot, "..", "runs");
const indexPath = path.join(siteRoot, "index.html");
const today = "2026-05-16";

const pluginCatalog = [
  { name: "Snap Heap", mention: /\bsnap\s+heap\b/i },
  { name: "Multipass", mention: /\bmultipass\b|\bkilohearts\s+multi\s*pass\b/i },
  { name: "Phase Plant", mention: /\bphase\s*plant\b/i },
  { name: "Serum 2", mention: /\bserum\s*2\b|\bxfer\s+serum\b/i },
  { name: "Soundtoys Effect Rack", mention: /\bsoundtoys\s+effect\s+rack\b|\bsound\s+toys\s+effect\s+rack\b/i },
  { name: "FilterFreak", mention: /\bfilter\s*freak\b/i },
  { name: "Tremolator", mention: /\btremolator\b/i },
  { name: "Decapitator", mention: /\bdecapitator\b/i },
  { name: "FabFilter Saturn 2", mention: /\bfabfilter\s+saturn(?:\s*2)?\b|\bsaturn\s*2\b/i },
  { name: "FabFilter Pro-Q 3", mention: /\bfabfilter\s+pro[- ]?q(?:\s*3)?\b|\bpro[- ]?q\s*3\b/i },
  { name: "FabFilter Pro-MB", mention: /\bfabfilter\s+pro[- ]?mb\b|\bpro[- ]?mb\b/i },
  { name: "FabFilter Pro-L 2", mention: /\bfabfilter\s+pro[- ]?l(?:\s*2)?\b|\bpro[- ]?l\s*2\b/i },
  { name: "FabFilter Pro-R", mention: /\bfabfilter\s+pro[- ]?r(?:\s*2)?\b|\bpro[- ]?r\s*2\b/i },
  { name: "EchoBoy", mention: /\becho\s*boy\b/i },
  { name: "Little AlterBoy", mention: /\blittle\s+alter\s*boy\b/i },
  { name: "Disperser", mention: /\bdisperser\b/i },
  { name: "Zynaptiq Unfilter", mention: /\bzynaptiq\s+unfilter\b/i },
  { name: "iZotope RX", mention: /\bizotope\s+rx\b/i },
  { name: "iZotope Vocoder", mention: /\bizotope\s+vocoder\b/i },
  { name: "Polyverse Manipulator", mention: /\bpolyverse\s+manipulator\b/i },
  { name: "H3000 Factory", mention: /\b(?:eventide\s+)?h3000(?:\s+factory)?\b/i }
];

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readTranscript(videoId) {
  const dir = path.join(runRoot, videoId || "");
  const clean = path.join(dir, "out", "subtitle_clean.txt");
  const json = path.join(dir, "out", "subtitle.json");
  if (fs.existsSync(clean)) return fs.readFileSync(clean, "utf8").replace(/\s+/g, " ").trim();
  if (fs.existsSync(json)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(json, "utf8"));
      return typeof parsed.text === "string" ? parsed.text.replace(/\s+/g, " ").trim() : "";
    } catch {
      return fs.readFileSync(json, "utf8").replace(/\s+/g, " ").trim();
    }
  }
  return "";
}

function sentenceAround(text, pattern) {
  if (typeof text !== "string" || !text) return "";
  const regex = pattern instanceof RegExp ? pattern : new RegExp(escapeRegExp(pattern), "i");
  const match = regex.exec(text);
  if (!match) return "";
  const start = Math.max(0, match.index - 120);
  const end = Math.min(text.length, match.index + match[0].length + 260);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 320);
}

function stripTerminalSeparators(value, includeCommas = false) {
  const normalized = value.trim();
  const tailClass = includeCommas ? "[\\s,，。．.;；]" : "[\\s。．.;；]";
  const uncertainty = new RegExp(`((?:[?？!！…]|\\.{2,})+)${tailClass}*$`, "u").exec(normalized);
  if (uncertainty) {
    return `${normalized.slice(0, uncertainty.index)}${uncertainty[1]}`.trim();
  }
  return normalized.replace(new RegExp(`${tailClass}+$`, "u"), "").trim();
}

function normalizeSettingFact(value) {
  if (typeof value !== "string") return "";
  return stripTerminalSeparators(value);
}

function joinSettingFacts(settings, limit = Infinity) {
  return (Array.isArray(settings) ? settings : [])
    .slice(0, limit)
    .map(normalizeSettingFact)
    .filter(Boolean)
    .join("；");
}

function normalizedEvidence(value) {
  return stripTerminalSeparators(String(value || "").replace(/\s+/g, " "), true);
}

function appendUncertainty(context, match) {
  const suffix = context.slice(match.index + match[0].length).match(/^\s*(\.{2,}|[?？!！…])/u)?.[1] || "";
  return normalizedEvidence(`${match[0]}${suffix}`);
}

function extractParameterEvidence(context) {
  if (typeof context !== "string" || !context.trim()) return [];

  const results = [];
  const seen = new Set();
  const labeledRanges = [];
  const add = (value) => {
    const normalized = normalizedEvidence(value);
    const key = normalized.toLowerCase();
    if (!normalized || seen.has(key)) return;
    seen.add(key);
    results.push(normalized);
  };
  const unit = "(?:milliseconds?|seconds?|semitones?|cents?|kHz|MHz|Hz|ms|dB|BPM|st|s|x|%)";
  const label = "(?:bands?|mix|wet|dry|depth|feedback|drive|gain|level|pitch|formant|cutoff|frequency|freq|attack|release|threshold|ratio|rate|voices?|carrier(?:\\s+enhance)?|stereo\\s+depth)";
  const labeledPattern = new RegExp(
    `\\b${label}\\b\\s*(?:(?:=|:)\\s*|(?:is|at|to)\\s+)?-?\\d+(?:\\.\\d+)?(?:\\s*[/:-]\\s*-?\\d+(?:\\.\\d+)?)?\\s*${unit}?(?=\\s|[,.;!?，。；！？…]|$)`,
    "gi"
  );
  const unitPattern = new RegExp(
    `-?\\d+(?:\\.\\d+)?\\s*${unit}(?=\\s|[,.;!?，。；！？…]|$)`,
    "gi"
  );
  const uncertaintySuffix = "(?:[?？!！…]|\\.{2,})?";
  const bareYearAtEnd = new RegExp(`\\b(?:19|20)\\d{2}${uncertaintySuffix}$`, "u");
  const explicitUnitAtEnd = new RegExp(`${unit}${uncertaintySuffix}$`, "i");

  for (const match of context.matchAll(labeledPattern)) {
    const value = appendUncertainty(context, match);
    if (bareYearAtEnd.test(value) && !explicitUnitAtEnd.test(value)) continue;
    add(value);
    labeledRanges.push([match.index, match.index + match[0].length]);
  }
  for (const match of context.matchAll(unitPattern)) {
    const start = match.index;
    const end = start + match[0].length;
    if (labeledRanges.some(([rangeStart, rangeEnd]) => start < rangeEnd && end > rangeStart)) continue;
    add(appendUncertainty(context, match));
  }

  return results.slice(0, 12);
}

function uniqueStrings(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (typeof value !== "string" || !value.trim()) return false;
    const key = value.replace(/\s+/g, " ").trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectPlugins(record, transcript) {
  const existingPlugins = Array.isArray(record?.plugins) ? record.plugins : [];
  const plugins = existingPlugins.map((plugin) => {
    if (!plugin || typeof plugin !== "object" || Array.isArray(plugin)) return plugin;
    return {
      ...plugin,
      ...(Array.isArray(plugin.settings) ? { settings: plugin.settings.slice() } : {})
    };
  });

  const transcriptText = typeof transcript === "string" ? transcript : "";
  for (const entry of pluginCatalog) {
    if (!entry.mention.test(transcriptText)) continue;

    const context = sentenceAround(transcriptText, entry.mention);
    const parameters = extractParameterEvidence(context);
    const leads = [];
    if (context) leads.push(`字幕定位线索（需画面确认）：${context}`);
    if (parameters.length) leads.push(`字幕参数线索（需画面确认）：${parameters.join("；")}`);

    const existingIndex = plugins.findIndex((plugin) =>
      plugin && typeof plugin === "object" && typeof plugin.name === "string" && entry.mention.test(plugin.name)
    );
    if (existingIndex >= 0) {
      const existing = plugins[existingIndex];
      plugins[existingIndex] = {
        ...existing,
        settings: uniqueStrings([
          ...(Array.isArray(existing.settings) ? existing.settings : []),
          ...leads
        ])
      };
      continue;
    }

    plugins.push({
      name: entry.name,
      purpose: `字幕明确提及 ${entry.name}；具体处理对象、链路位置与用途需画面确认。`,
      settings: leads
    });
  }

  return plugins;
}

function enrichLearning(record, plugins, transcript) {
  void record;
  void transcript;
  const factualPlugins = (Array.isArray(plugins) ? plugins : [])
    .filter((plugin) => plugin && typeof plugin.name === "string" && plugin.name.trim());
  const chainFocus = factualPlugins.map((plugin, index) => {
    const purpose = typeof plugin.purpose === "string" ? plugin.purpose.trim() : "";
    return `${index + 1}. ${plugin.name}${purpose ? `：${purpose}` : ""}`;
  });
  const parameterLogic = factualPlugins.flatMap((plugin) => {
    const settings = joinSettingFacts(plugin.settings, 2);
    return settings ? [`${plugin.name} 参数逻辑：${settings}`] : [];
  });

  return { chainFocus, parameterLogic };
}

function mergeEnrichedRecord(record, { steps, plugins, learning } = {}) {
  const safeRecord = record && typeof record === "object" ? record : {};
  const factualLearning = Object.fromEntries(
    Object.entries(learning && typeof learning === "object" && !Array.isArray(learning) ? learning : {})
      .filter(([key]) => key !== "practiceChecklist")
  );

  return {
    ...safeRecord,
    updatedAt: today,
    updateNote: `${today} 自动返工：仅补充字幕明确提及的产品名和待画面确认的定位线索；未取得证据的内容保持不变。`,
    ...(Array.isArray(steps) ? { steps } : {}),
    ...(Array.isArray(plugins) ? { plugins } : {}),
    ...factualLearning
  };
}

function enrichRecord(record, { transcript, readTranscriptFn = readTranscript, forceAuto = false } = {}) {
  void forceAuto;
  const safeRecord = record && typeof record === "object" ? record : {};
  const existingPlugins = Array.isArray(safeRecord.plugins) ? safeRecord.plugins : [];
  const transcriptText = typeof transcript === "string"
    ? transcript
    : readTranscriptFn(safeRecord.videoId);
  const plugins = detectPlugins(safeRecord, transcriptText);

  if (JSON.stringify(plugins) === JSON.stringify(existingPlugins)) {
    return {
      record,
      changed: false,
      generated: 0,
      status: existingPlugins.length ? "no-new-evidence" : "insufficient-evidence"
    };
  }

  const learning = enrichLearning(safeRecord, plugins, transcriptText);
  return {
    record: mergeEnrichedRecord(safeRecord, { plugins, learning }),
    changed: true,
    generated: 0,
    status: "subtitle-leads-added"
  };
}

function parseSiteData(html) {
  const recordsMatch = html.match(/const records = ([\s\S]*?);\r?\n\r?\n\s*const imageManifest/);
  const manifestMatch = html.match(/const imageManifest = ([\s\S]*?);\r?\n\s*const categoryById/);
  if (!recordsMatch || !manifestMatch) {
    throw new Error("Could not locate records or imageManifest in index.html");
  }

  return {
    recordsMatch,
    manifestMatch,
    records: JSON.parse(recordsMatch[1]),
    imageManifest: JSON.parse(manifestMatch[1])
  };
}

function reconcileImageManifest(records, imageManifest, assetExists) {
  for (const record of records) {
    for (const step of Array.isArray(record?.steps) ? record.steps : []) {
      const key = step?.imageKey;
      if (!key || imageManifest[key]) continue;
      const candidates = [".webp", ".jpg", ".png"].map((extension) => ({
        preview: `assets/shots/preview/${key}${extension}`,
        full: `assets/shots/full/${key}${extension}`
      }));
      const found = candidates.find((candidate) =>
        assetExists(path.join(siteRoot, candidate.preview)) &&
        assetExists(path.join(siteRoot, candidate.full))
      );
      if (found) imageManifest[key] = found;
    }
  }
}

function runEnrichment(options = {}) {
  const html = typeof options.html === "string"
    ? options.html
    : fs.readFileSync(indexPath, "utf8");
  const { recordsMatch, manifestMatch, records, imageManifest } = parseSiteData(html);
  const forceAuto = Object.prototype.hasOwnProperty.call(options, "forceAuto")
    ? Boolean(options.forceAuto)
    : process.argv.includes("--force-auto");
  const enrichRecordOptions = options.enrichRecordOptions || {};
  const writeSite = typeof options.writeSite === "function"
    ? options.writeSite
    : (nextHtml, targetPath) => fs.writeFileSync(targetPath, nextHtml, "utf8");
  const writeReport = typeof options.writeReport === "function"
    ? options.writeReport
    : (payload, targetPath) => fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), "utf8");
  const log = typeof options.log === "function" ? options.log : console.log;
  const assetExists = typeof options.assetExists === "function" ? options.assetExists : fs.existsSync;

  let changed = 0;
  let generated = 0;
  let insufficientEvidence = 0;
  const outcomes = records.map((record) => {
    const result = enrichRecord(record, { forceAuto, ...enrichRecordOptions });
    if (result.changed) changed += 1;
    generated += result.generated;
    if (result.status === "insufficient-evidence") insufficientEvidence += 1;
    return result;
  });
  const enrichedRecords = outcomes.map((outcome) => outcome.record);
  reconcileImageManifest(enrichedRecords, imageManifest, assetExists);

  const nextRecords = JSON.stringify(enrichedRecords, null, 2);
  const nextManifest = JSON.stringify(imageManifest, null, 2);
  const nextHtml = html.replace(recordsMatch[1], nextRecords).replace(manifestMatch[1], nextManifest);
  writeSite(nextHtml, indexPath);

  const report = enrichedRecords.map((record, index) => {
    const steps = Array.isArray(record.steps) ? record.steps : [];
    const plugins = Array.isArray(record.plugins) ? record.plugins : [];
    const settings = plugins.reduce(
      (sum, plugin) => sum + (Array.isArray(plugin.settings) ? plugin.settings.length : 0),
      0
    );
    return {
      videoId: record.videoId,
      title: record.title,
      steps: steps.length,
      shots: steps.filter((step) => step?.imageKey).length,
      plugins: plugins.length,
      settings,
      chainFocus: Array.isArray(record.chainFocus) ? record.chainFocus.length : 0,
      parameterLogic: Array.isArray(record.parameterLogic) ? record.parameterLogic.length : 0,
      status: outcomes[index].status
    };
  });

  const reportPath = path.join(siteRoot, "tools", "rework-report.json");
  const reportPayload = { changed, generated, total: enrichedRecords.length, report };
  writeReport(reportPayload, reportPath);
  log(JSON.stringify({ changed, generated, total: enrichedRecords.length, reportPath }, null, 2));

  return {
    changed,
    generated,
    total: enrichedRecords.length,
    insufficientEvidence,
    reportPath,
    report,
    nextHtml
  };
}

if (require.main === module) {
  runEnrichment();
}

module.exports = {
  detectPlugins,
  enrichLearning,
  enrichRecord,
  extractParameterEvidence,
  mergeEnrichedRecord,
  normalizeSettingFact,
  runEnrichment
};
