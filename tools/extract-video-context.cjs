const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const workRoot = process.env.SFX_WORK_DIR
  ? path.resolve(process.env.SFX_WORK_DIR)
  : path.join(repoRoot, ".work", "runs");
const ids = process.argv.slice(2);

if (!ids.length) {
  console.error("Usage: node tools/extract-video-context.cjs VIDEO_ID [VIDEO_ID ...]");
  process.exit(2);
}

function parseMetadata(runDir) {
  const jsonPath = path.join(runDir, "metadata.json");
  if (!fs.existsSync(jsonPath)) return {};
  return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

function toSeconds(stamp) {
  const match = stamp.match(/(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/);
  if (!match) return 0;
  return (Number(match[1] || 0) * 3600) + (Number(match[2]) * 60) + Number(match[3]) + Number(match[4]) / 1000;
}

function cleanCaption(text) {
  return text
    .replace(/<[^>]+>/g, "")
    .replace(/\[[^\]]+]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseVtt(vttPath) {
  if (!vttPath) return [];
  const blocks = fs.readFileSync(vttPath, "utf8").split(/\r?\n\r?\n/);
  const cues = [];
  let lastText = "";
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const timeIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeIndex < 0) continue;
    const start = toSeconds(lines[timeIndex].split("-->")[0].trim());
    const text = cleanCaption(lines.slice(timeIndex + 1).join(" "));
    if (!text || text === lastText) continue;
    lastText = text;
    cues.push({ start, text });
  }
  return cues;
}

function findSubtitle(runDir) {
  const dataDir = path.join(runDir, "data");
  if (!fs.existsSync(dataDir)) return "";
  const name = fs.readdirSync(dataDir).find((item) => /^subtitles\..+\.vtt$/i.test(item));
  return name ? path.join(dataDir, name) : "";
}

function formatTime(seconds) {
  const sec = Math.floor(seconds % 60).toString().padStart(2, "0");
  const min = Math.floor((seconds / 60) % 60).toString().padStart(2, "0");
  const hour = Math.floor(seconds / 3600);
  return hour ? `${hour}:${min}:${sec}` : `${min}:${sec}`;
}

for (const id of ids) {
  const runDir = path.join(workRoot, id);
  const metadata = parseMetadata(runDir);
  const cues = parseVtt(findSubtitle(runDir));
  const duration = Number(metadata.duration || 0);
  const chapters = metadata.chapters?.length
    ? metadata.chapters
    : [{ start_time: 0, end_time: duration, title: "Full Video" }];

  console.log(`\n=== ${id} ===`);
  console.log(`TITLE: ${metadata.title || metadata.fulltitle || ""}`);
  console.log(`CHANNEL: ${metadata.channel || metadata.uploader || ""}`);
  console.log(`DURATION: ${formatTime(duration || chapters.at(-1)?.end_time || 0)}`);
  console.log("CHAPTERS:");
  for (const chapter of chapters) {
    const start = Number(chapter.start_time || 0);
    const end = Number(chapter.end_time || duration || start + 60);
    const text = cues
      .filter((cue) => cue.start >= start && cue.start < end)
      .map((cue) => cue.text)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    console.log(`- ${formatTime(start)}-${formatTime(end)} ${chapter.title || ""}`);
    if (text) console.log(`  ${text.slice(0, 2400)}`);
  }
}
