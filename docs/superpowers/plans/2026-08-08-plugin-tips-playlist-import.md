# 插件技巧播放列表全量导入 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox - [ ] syntax for tracking.

**Goal:** 将私密 YouTube 播放列表“插件技巧”的 20 个视频完整分析为独立中文网站模块，把网站与 Skill 记忆从 62 条提升到 82 条，并在全部验收后一次推送 GitHub Pages。

**Architecture:** 继续以 index.html 中的 records 和 imageManifest 为网站事实源，以 video-learnings.md 保存手工提炼知识，再由 export-site-memory.cjs 生成网站镜像记忆。视频与音频只存在于被忽略的 .work/runs/ 下，并使用真实 Video ID 作为目录名；四批各五条形成本地提交，最后统一合并和发布。

**Tech Stack:** 静态 HTML/CSS/JavaScript、Node.js CommonJS 校验工具、Python 3.11、yt-dlp、FFmpeg/FFprobe、PowerShell、GitHub Pages。

---

## File Map

- Create: tools/data/plugin-tips-playlist.json
  - 保存 20 条固定顺序、Video ID、时长和原始标题，供导入校验器读取。
- Create: tools/verify-plugin-tips-import.cjs
  - 校验前 N 条导入状态、总记录数、顺序、检索词、视觉资产、逐视频记忆和网站镜像记忆。
- Modify: index.html
  - 在 records 追加 20 个独立记录；同步 categoryCounts；在 imageManifest 注册每张步骤图。
- Create/Modify: assets/shots/full/*
  - 保存关键步骤高清 PNG/WebP。
- Create/Modify: assets/shots/preview/*
  - 保存与高清图一一对应的轻量 WebP。
- Create when required: assets/motions/*
  - 只为静态图讲不清的参数或路由变化保存短 H.264 MP4 和 poster。
- Modify: skills/sfx-knowledge/references/video-learnings.md
  - 每个视频追加一条证据约束下的可复用知识。
- Regenerate: skills/sfx-knowledge/references/site-video-memory.md
  - 由 tools/export-site-memory.cjs 从 index.html 生成。
- Modify only if an acquisition defect is reproduced: tools/prepare-sfx-video.py
  - 保持当前输出契约；只针对已验证的 yt-dlp/YouTube 获取失败做最小修复。

## Per-Video Completion Contract

每个视频任务都必须完成以下结果，缺一项就不能提高 completed 数字：

1. .work/runs/ 下对应真实 Video ID 的目录中存在 local_prepare_summary.json，video_id 正确，frame_count 和 sheet_count 均大于 0，subtitle_only_allowed 为 false。
2. 从第一张到最后一张联系表检查完整时间线，再查看关键区段的原分辨率 frame_*.png。
3. 对应真实 Video ID 的运行目录中，analysis.md 记录章节、时间点、层角色、插件顺序、可见参数、作者口述、分析推断和最终图片键。
4. index.html 新记录使用中文标题；source 取 metadata.json 的 channel，缺失时取 uploader，再追加“ / 插件技巧”；keywords 包含独立词条“插件技巧”。
5. 每个关键步骤有 imageKey；imageManifest 对应 preview/full 文件真实存在。至少三个步骤有画面证据。
6. video-learnings.md 包含该 Video ID 的独立条目。
7. 运行 node tools/export-site-memory.cjs 后，site-video-memory.md 出现真实 ID 与中文标题，例如 “## Xl5u91oQv-k - Serum 金属断奏：用 Stepwise Morph 制作科幻纹理”。
8. node tools/verify-plugin-tips-import.cjs --completed N 返回 ok: true。

视觉资产发布命令使用分析笔记里已经确认的 frame 文件和图片键。下面以首条视频约 2:03 的帧与语义化图片键演示完整命令；执行前先在联系表和原图中确认该帧确实展示 Stepwise Morph，否则使用 analysis.md 中已经确认的具体帧号和图片键：

~~~powershell
$runRoot = ".work\runs\Xl5u91oQv-k"
$frameFile = Join-Path $runRoot "frames\frame_000123.png"
$fullFile = "assets\shots\full\Xl5u91oQv-k-serum-stepwise-morph.png"
$previewFile = "assets\shots\preview\Xl5u91oQv-k-serum-stepwise-morph.webp"
Copy-Item -LiteralPath $frameFile -Destination $fullFile -Force
ffmpeg -y -i $fullFile -vf "scale=960:-2:force_original_aspect_ratio=decrease" -c:v libwebp -quality 78 $previewFile
~~~

这条示例不会自动计入最终三张证据图；只有经过画面确认、登记进 analysis.md 并注册到 imageManifest 的图片才能计入完成数。

---

### Task 1: Create The Isolated Execution Worktree

**Files:**
- Read: docs/superpowers/specs/2026-08-08-plugin-tips-playlist-import-design.md
- Read: AGENTS.md
- Read: skills/sfx-knowledge/SKILL.md

- [ ] **Step 1: Invoke the required worktree skill**

Use superpowers:using-git-worktrees before creating the branch or worktree.

- [ ] **Step 2: Confirm the source checkout is clean**

Run:

~~~powershell
git status --short --branch
git log -2 --oneline
~~~

Expected: main is ahead of origin only by the approved design/plan commits and has no unstaged files.

- [ ] **Step 3: Create the feature worktree**

Run:

~~~powershell
git worktree add "E:\zhaoshangqi\AI\sfx-knowledge-site-plugin-tips" -b feature/plugin-tips-playlist-20
~~~

Expected: a new worktree on feature/plugin-tips-playlist-20.

- [ ] **Step 4: Establish the 62-record baseline**

Run in the new worktree:

~~~powershell
node tools\verify-portable-kit.cjs
~~~

Expected: ok true, records 62, uniqueVideoIds 62, siteMemoryCoverage 62/62, failures empty.

---

### Task 2: Prepare And Verify The Local Runtime

**Files:**
- Read: requirements.txt
- Read: tools/prepare-sfx-video.py
- Test: tools/prepare-sfx-video.py syntax

- [ ] **Step 1: Install FFmpeg when it is still missing**

Run:

~~~powershell
winget install --id Gyan.FFmpeg -e --accept-source-agreements --accept-package-agreements
~~~

Expected: FFmpeg installs successfully. Open a new shell after installation if PATH is refreshed only for new processes.

- [ ] **Step 2: Create the ignored Python environment**

Run:

~~~powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pip install --upgrade --pre yt-dlp
~~~

Expected: all commands exit 0; .venv remains ignored by Git.

- [ ] **Step 3: Verify required executables**

Run:

~~~powershell
ffmpeg -version
ffprobe -version
node --version
git --version
.\.venv\Scripts\python.exe -m yt_dlp --version
~~~

Expected: each command prints a version and exits 0.

- [ ] **Step 4: Verify script syntax**

Run:

~~~powershell
.\.venv\Scripts\python.exe -m py_compile tools\prepare-sfx-video.py
Get-ChildItem tools -Filter *.cjs | ForEach-Object { node --check $_.FullName }
~~~

Expected: Python exits 0 and every CJS file exits 0.

---

### Task 3: Add A Deterministic Playlist Import Gate

**Files:**
- Create: tools/data/plugin-tips-playlist.json
- Create: tools/verify-plugin-tips-import.cjs
- Test: tools/verify-plugin-tips-import.cjs

- [ ] **Step 1: Create the fixed playlist manifest**

Create tools/data/plugin-tips-playlist.json with exactly:

~~~json
[
  {"index":1,"id":"Xl5u91oQv-k","duration":"6:21","title":"Metallic Staccato sfx with Serum and using Stepwise Morph for cool Scifi textures"},
  {"index":2,"id":"kv0yNg1CPAk","duration":"13:07","title":"Sound Design - How To Make Anime SFX with Serum"},
  {"index":3,"id":"St6GD7CbdcM","duration":"9:06","title":"HOW TO TURN MONO INTO CINEMATIC SOUND / SOUND DESIGN FOR BEGINNERS"},
  {"index":4,"id":"eKCYZz98-N4","duration":"18:40","title":"How Tejo Rocket Explosions are made | Valorant Sound Design"},
  {"index":5,"id":"f9OrpDtedSI","duration":"18:09","title":"Creating Modern Explosions from Random Household Objects"},
  {"index":6,"id":"2cTDQ_MetsE","duration":"13:05","title":"hyper realistic weapon explosion using daily objects"},
  {"index":7,"id":"ceC_RDgx71s","duration":"6:47","title":"Route Audio From Your DAW Into Whoosh"},
  {"index":8,"id":"fYqe17OJRNM","duration":"7:23","title":"Sci-Fi and Anime Sound Design with Wave Shifter"},
  {"index":9,"id":"j4POSc1YeAo","duration":"24:01","title":"Modern Anime Sound Design: Using Sine Waves To Make Bubbly Melodic Pops"},
  {"index":10,"id":"C_5qPsn1GWY","duration":"8:03","title":"Creative Sound Design Using iZotope RX De-Clip"},
  {"index":11,"id":"ir8d3PUj5JU","duration":"23:09","title":"Alien Dragon Roar Sound Design: From Dog Toys To Monster Screams"},
  {"index":12,"id":"E_wGGNkVcrw","duration":"5:17","title":"this STOCK plugin turns any sound into LIQUID"},
  {"index":13,"id":"wWms0-ad6fw","duration":"20:01","title":"Heavy Rain, Water Drops & Open Windows Using White-Noise In Phase Plant"},
  {"index":14,"id":"xCorcGCP218","duration":"7:52","title":"TRANSFORCE | Transient Shaper Plug-In | Post Production"},
  {"index":15,"id":"v1IGAnVJylY","duration":"19:15","title":"Designing Impactful Transients and Debris"},
  {"index":16,"id":"LyNsYzCN5_A","duration":"31:18","title":"This what it sounds like when you die... as Clove in Valorant"},
  {"index":17,"id":"FuFfkk7dxcY","duration":"23:28","title":"Arc Raiders Style Explosions: Turning Shower Curtains Into Boomy Impacts"},
  {"index":18,"id":"NdGNqhV8cpM","duration":"6:48","title":"Creature Sound Design using Slime Bubbles"},
  {"index":19,"id":"yYUB55kMMV8","duration":"3:40","title":"Dark Magic Building Blocks"},
  {"index":20,"id":"cJ75ykkqV64","duration":"50:44","title":"How I made the sounds for Clove's Ult"}
]
~~~

- [ ] **Step 2: Write the import verifier**

Create tools/verify-plugin-tips-import.cjs with exactly:

~~~javascript
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const playlistPath = path.join(root, "tools", "data", "plugin-tips-playlist.json");
const htmlPath = path.join(root, "index.html");
const learningPath = path.join(root, "skills", "sfx-knowledge", "references", "video-learnings.md");
const memoryPath = path.join(root, "skills", "sfx-knowledge", "references", "site-video-memory.md");
const baselineCount = 62;

const argIndex = process.argv.indexOf("--completed");
const completed = argIndex >= 0 ? Number(process.argv[argIndex + 1]) : 20;
const playlist = JSON.parse(fs.readFileSync(playlistPath, "utf8"));

if (!Number.isInteger(completed) || completed < 0 || completed > playlist.length) {
  throw new Error("--completed must be an integer from 0 through " + playlist.length);
}
if (playlist.length !== 20) throw new Error("playlist manifest must contain 20 items");
if (new Set(playlist.map((item) => item.id)).size !== playlist.length) {
  throw new Error("playlist manifest contains duplicate IDs");
}
playlist.forEach((item, index) => {
  if (item.index !== index + 1) throw new Error("playlist index mismatch at position " + (index + 1));
});

const html = fs.readFileSync(htmlPath, "utf8");
const countsMatch = html.match(/const categoryCounts = ([\s\S]*?);\r?\n\r?\n\s*const records/);
const recordsMatch = html.match(/const records = ([\s\S]*?);\r?\n\r?\n\s*const imageManifest/);
const manifestMatch = html.match(/const imageManifest = ([\s\S]*?);\r?\n\r?\n\s*const pluginReferenceCatalog/);
if (!countsMatch || !recordsMatch || !manifestMatch) throw new Error("Could not parse index.html data blocks");

const categoryCounts = JSON.parse(countsMatch[1]);
const records = JSON.parse(recordsMatch[1]);
const imageManifest = JSON.parse(manifestMatch[1]);
const learning = fs.readFileSync(learningPath, "utf8");
const memory = fs.readFileSync(memoryPath, "utf8");
const failures = [];

if (records.length !== baselineCount + completed) {
  failures.push("record count expected " + (baselineCount + completed) + " but found " + records.length);
}
if (categoryCounts.all !== records.length) failures.push("categoryCounts.all does not match records length");
for (const categoryId of Object.keys(categoryCounts).filter((id) => id !== "all")) {
  const actual = records.filter((record) => (
    record.category === categoryId || (record.secondaryCategories || []).includes(categoryId)
  )).length;
  if (categoryCounts[categoryId] !== actual) failures.push("category count mismatch for " + categoryId);
}

const recordIds = records.map((record) => record.videoId).filter(Boolean);
if (new Set(recordIds).size !== recordIds.length) failures.push("duplicate videoId found");

const required = playlist.slice(0, completed);
const notYetExpected = playlist.slice(completed);
const importedIds = records.slice(baselineCount).map((record) => record.videoId);
if (JSON.stringify(importedIds) !== JSON.stringify(required.map((item) => item.id))) {
  failures.push("imported playlist order does not match manifest");
}

for (const item of required) {
  const record = records.find((candidate) => candidate.videoId === item.id);
  if (!record) {
    failures.push("missing record " + item.id);
    continue;
  }

  if (!/[\u3400-\u9fff]/.test(record.title || "")) failures.push("title is not Chinese for " + item.id);
  if (record.url !== "https://www.youtube.com/watch?v=" + item.id) failures.push("canonical URL mismatch for " + item.id);
  if (!/^.+ \/ 插件技巧$/.test(record.source || "")) failures.push("source format invalid for " + item.id);
  if (!(record.keywords || []).includes("插件技巧")) failures.push("keyword tag missing for " + item.id);
  if (!String(record.summary || "").trim()) failures.push("summary is empty for " + item.id);

  for (const field of ["coreIdeas", "steps", "plugins", "materials", "chainFocus", "parameterLogic", "practiceChecklist"]) {
    if (!Array.isArray(record[field]) || record[field].length === 0) failures.push(field + " is empty for " + item.id);
  }

  const evidenceSteps = (record.steps || []).filter((step) => step.imageKey);
  if (evidenceSteps.length < 3) {
    failures.push("fewer than three evidence steps for " + item.id);
  }

  for (const step of evidenceSteps) {
    const ref = imageManifest[step.imageKey];
    if (!ref) {
      failures.push("imageManifest missing " + step.imageKey);
      continue;
    }
    for (const field of ["preview", "full"]) {
      if (!ref[field] || !fs.existsSync(path.join(root, ref[field]))) {
        failures.push("missing " + field + " asset for " + step.imageKey);
      }
    }
    if (step.motion) {
      for (const field of ["src", "poster"]) {
        if (!step.motion[field] || !fs.existsSync(path.join(root, step.motion[field]))) {
          failures.push("missing motion " + field + " for " + item.id);
        }
      }
    }
  }

  if (!learning.includes(item.id)) failures.push("video-learnings missing " + item.id);
  if (!memory.includes("## " + item.id + " - ")) failures.push("site memory missing " + item.id);
}

for (const item of notYetExpected) {
  if (records.some((record) => record.videoId === item.id)) {
    failures.push("out-of-order playlist record present " + item.id);
  }
}

const report = {
  ok: failures.length === 0,
  completed,
  playlistTotal: playlist.length,
  records: records.length,
  uniqueVideoIds: new Set(recordIds).size,
  failures,
};

console.log(JSON.stringify(report, null, 2));
process.exit(failures.length ? 1 : 0);
~~~

- [ ] **Step 3: Run the green baseline**

Run:

~~~powershell
node tools\verify-plugin-tips-import.cjs --completed 0
~~~

Expected: ok true, completed 0, playlistTotal 20, records 62, uniqueVideoIds 62.

- [ ] **Step 4: Prove the gate fails before content exists**

Run:

~~~powershell
node tools\verify-plugin-tips-import.cjs --completed 1
~~~

Expected: exit 1 with record count expected 63 and missing record Xl5u91oQv-k.

- [ ] **Step 5: Commit the gate**

Run:

~~~powershell
git add tools\data\plugin-tips-playlist.json tools\verify-plugin-tips-import.cjs
git commit -m "Add plugin tips playlist import gate"
~~~

Expected: one commit containing only the manifest and verifier.

---

### Task 4: Prove Full-Frame Acquisition On Video 1

**Files:**
- Create ignored: .work/runs/Xl5u91oQv-k/*
- Read: tools/prepare-sfx-video.py

- [ ] **Step 1: Prepare the first video without browser-cookie export**

Run:

~~~powershell
.\.venv\Scripts\python.exe tools\prepare-sfx-video.py "https://www.youtube.com/watch?v=Xl5u91oQv-k" --max-height 1080 --frame-interval 1 --sheet-interval 10
~~~

Expected: exit 0 and a JSON summary under .work/runs/Xl5u91oQv-k.

- [ ] **Step 2: Verify the evidence gate**

Run:

~~~powershell
$summary = Get-Content -Raw -Encoding UTF8 ".work\runs\Xl5u91oQv-k\local_prepare_summary.json" | ConvertFrom-Json
if ($summary.video_id -ne "Xl5u91oQv-k") { throw "video_id mismatch" }
if ($summary.frame_count -le 0 -or $summary.sheet_count -le 0) { throw "visual evidence missing" }
if ($summary.subtitle_only_allowed -ne $false) { throw "subtitle-only gate changed" }
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 $summary.video_file
~~~

Expected: the checks exit 0 and ffprobe reports approximately 381 seconds.

- [ ] **Step 3: Stop on acquisition failure**

If Step 1 or Step 2 fails, invoke superpowers:systematic-debugging and keep the work at Task 4. Do not create a website record from subtitles or thumbnails. Resume Task 4 only after a readable video, positive frame count and valid duration are proven.

---

### Task 5: Add Video 1 - Serum Metallic Staccato

**Files:**
- Modify: index.html
- Create: assets/shots/full/Xl5u91oQv-k-*.png
- Create: assets/shots/preview/Xl5u91oQv-k-*.webp
- Modify: skills/sfx-knowledge/references/video-learnings.md
- Regenerate: skills/sfx-knowledge/references/site-video-memory.md

- [ ] Prepare and inspect every overview sheet and relevant full frame for Xl5u91oQv-k.
- [ ] Write .work/runs/Xl5u91oQv-k/analysis.md with Serum oscillator, Stepwise Morph, modulation, resampling and output-chain evidence.
- [ ] Add the Chinese record title “Serum 金属断奏：用 Stepwise Morph 制作科幻纹理”; primary category scifi; secondary categories workflow and impact; derive source from metadata according to the completion contract.
- [ ] Publish at least three evidence shots, register every imageKey in imageManifest, and append an independent video-learnings entry.
- [ ] Run node tools\export-site-memory.cjs, then node tools\verify-plugin-tips-import.cjs --completed 1.

Expected: records 63, uniqueVideoIds 63, failures empty.

---

### Task 6: Add Video 2 - Anime SFX With Serum

**Files:** index.html, assets/shots/full/kv0yNg1CPAk-*, assets/shots/preview/kv0yNg1CPAk-*, video-learnings.md, site-video-memory.md

- [ ] Run .\.venv\Scripts\python.exe tools\prepare-sfx-video.py "https://www.youtube.com/watch?v=kv0yNg1CPAk" --max-height 1080 --frame-interval 1 --sheet-interval 10.
- [ ] Inspect the whole timeline and record Serum source, envelope, LFO, pitch/filter motion, processing and rendering evidence in .work/runs/kv0yNg1CPAk/analysis.md.
- [ ] Add “Serum 动漫音效：从振荡器到高速能量变化”; primary category scifi; secondary categories magic and workflow; derive source from metadata according to the completion contract.
- [ ] Publish and register at least three evidence shots; append the independent video-learnings entry.
- [ ] Export site memory and run node tools\verify-plugin-tips-import.cjs --completed 2.

Expected: records 64 and failures empty.

---

### Task 7: Add Video 3 - Mono To Cinematic

**Files:** index.html, assets/shots/full/St6GD7CbdcM-*, assets/shots/preview/St6GD7CbdcM-*, video-learnings.md, site-video-memory.md

- [ ] Prepare St6GD7CbdcM at 1080p with one-second frames and ten-second sheets.
- [ ] Inspect the full timeline and document mono source treatment, stereo/space decisions, dynamics, layering and loudness-matched A/B evidence.
- [ ] Add “单声道变电影感：初学者的空间与层次处理”; primary category workflow; secondary categories environment and scifi; derive source from metadata according to the completion contract.
- [ ] Publish and register at least three evidence shots; append the independent video-learnings entry.
- [ ] Export site memory and run node tools\verify-plugin-tips-import.cjs --completed 3.

Expected: records 65 and failures empty.

---

### Task 8: Add Video 4 - Valorant Tejo Rocket Explosions

**Files:** index.html, assets/shots/full/eKCYZz98-N4-*, assets/shots/preview/eKCYZz98-N4-*, optional assets/motions/eKCYZz98-N4-*, video-learnings.md, site-video-memory.md

- [ ] Prepare eKCYZz98-N4 and verify approximately 1120 seconds of complete media.
- [ ] Inspect the full timeline and document Tejo rocket event structure, source layers, explosion chain, game-readability decisions and visible parameters.
- [ ] Add “Valorant Tejo 火箭爆炸音效拆解”; primary category impact; secondary categories scifi and workflow; derive source from metadata according to the completion contract.
- [ ] Publish evidence shots and only add a motion clip when automation or routing is not understandable in stills; append the independent video-learnings entry.
- [ ] Export site memory and run node tools\verify-plugin-tips-import.cjs --completed 4.

Expected: records 66 and failures empty.

---

### Task 9: Add Video 5 - Household Object Explosions

**Files:** index.html, assets/shots/full/f9OrpDtedSI-*, assets/shots/preview/f9OrpDtedSI-*, video-learnings.md, site-video-memory.md

- [ ] Prepare f9OrpDtedSI and inspect all sheets and key frames.
- [ ] Document household source recordings, transient/body/debris/tail roles, serial processing, bus treatment and failure corrections.
- [ ] Add “日常物件制作现代爆炸：录音、分层与处理”; primary category impact; secondary category workflow; derive source from metadata according to the completion contract.
- [ ] Publish and register at least three evidence shots; append the independent video-learnings entry.
- [ ] Export site memory and run node tools\verify-plugin-tips-import.cjs --completed 5.

Expected: records 67 and failures empty.

---

### Task 10: Verify And Commit Batch 1

**Files:** all Task 5-9 tracked outputs

- [ ] Run node tools\verify-portable-kit.cjs and expect records 67, uniqueVideoIds 67, coverage 67/67, failures empty.
- [ ] Run node tools\verify-plugin-tips-import.cjs --completed 5 and expect ok true.
- [ ] Run git diff --check and inspect git status --short for forbidden .work, video, audio or credential files.
- [ ] Open the local site and verify search “插件技巧” returns exactly five records with working detail and image expansion.
- [ ] Commit:

~~~powershell
git add index.html assets\shots\full assets\shots\preview assets\motions skills\sfx-knowledge\references\video-learnings.md skills\sfx-knowledge\references\site-video-memory.md
git commit -m "Add plugin tips playlist batch 1"
~~~

---

### Task 11: Add Video 6 - Hyper-Real Weapon Explosion

**Files:** index.html, assets/shots/full/2cTDQ_MetsE-*, assets/shots/preview/2cTDQ_MetsE-*, video-learnings.md, site-video-memory.md

- [ ] Prepare 2cTDQ_MetsE and verify complete 1080p-readable media.
- [ ] Document daily-object sources, weapon transient/body/mechanism/debris layers, visible effects and final output decisions.
- [ ] Add “日常物件制作超写实武器爆炸音效”; primary category impact; secondary categories workflow and scifi; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence shots and append the independent learning entry.
- [ ] Export memory and verify --completed 6.

Expected: records 68 and failures empty.

---

### Task 12: Add Video 7 - DAW Routing Into Whoosh

**Files:** index.html, assets/shots/full/ceC_RDgx71s-*, assets/shots/preview/ceC_RDgx71s-*, optional assets/motions/ceC_RDgx71s-*, video-learnings.md, site-video-memory.md

- [ ] Prepare ceC_RDgx71s and inspect the complete routing demonstration.
- [ ] Document DAW input/output devices, channel routing, Whoosh input, monitoring, recording and feedback-loop prevention.
- [ ] Add “将 DAW 音频路由到 Whoosh 的完整方法”; primary category workflow; secondary category scifi; derive source from metadata according to the completion contract.
- [ ] Add a short motion only if the route-switch sequence needs it; otherwise use still evidence.
- [ ] Export memory and verify --completed 7.

Expected: records 69 and failures empty.

---

### Task 13: Add Video 8 - Wave Shifter Sci-Fi And Anime

**Files:** index.html, assets/shots/full/fYqe17OJRNM-*, assets/shots/preview/fYqe17OJRNM-*, video-learnings.md, site-video-memory.md

- [ ] Prepare fYqe17OJRNM and inspect every section.
- [ ] Document Wave Shifter source, shifting mode, movement, distortion/filter interaction and rendering choices.
- [ ] Add “Wave Shifter 制作科幻与动漫音效”; primary category scifi; secondary categories magic and workflow; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning.
- [ ] Export memory and verify --completed 8.

Expected: records 70 and failures empty.

---

### Task 14: Add Video 9 - Sine-Wave Bubbly Pops

**Files:** index.html, assets/shots/full/j4POSc1YeAo-*, assets/shots/preview/j4POSc1YeAo-*, optional assets/motions/j4POSc1YeAo-*, video-learnings.md, site-video-memory.md

- [ ] Prepare j4POSc1YeAo and inspect all 24 minutes.
- [ ] Document sine source construction, pitch melody, amplitude envelope, bubbly modulation, transient shaping and final layering.
- [ ] Add “正弦波制作动漫气泡旋律弹跳音”; primary category magic; secondary categories scifi and workflow; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning.
- [ ] Export memory and verify --completed 9.

Expected: records 71 and failures empty.

---

### Task 15: Add Video 10 - RX De-Clip Creative Design

**Files:** index.html, assets/shots/full/C_5qPsn1GWY-*, assets/shots/preview/C_5qPsn1GWY-*, video-learnings.md, site-video-memory.md

- [ ] Prepare C_5qPsn1GWY and inspect the full before/after process.
- [ ] Document intentional clipping source, RX De-Clip modes/threshold evidence, artifacts, resampling and creative use boundaries.
- [ ] Add “iZotope RX De-Clip 的创意声音设计”; primary category workflow; secondary categories impact and scifi; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning.
- [ ] Export memory and verify --completed 10.

Expected: records 72 and failures empty.

---

### Task 16: Verify And Commit Batch 2

- [ ] Run portable verification and expect 72 records, 72 unique IDs and 72/72 coverage.
- [ ] Run plugin-tips verification with --completed 10 and expect ok true.
- [ ] Run syntax checks, git diff --check and forbidden-file inspection.
- [ ] Verify local search returns exactly ten “插件技巧” records on desktop and mobile.
- [ ] Commit with git commit -m "Add plugin tips playlist batch 2".

---

### Task 17: Add Video 11 - Alien Dragon Roar

**Files:** index.html, assets/shots/full/ir8d3PUj5JU-*, assets/shots/preview/ir8d3PUj5JU-*, video-learnings.md, site-video-memory.md

- [ ] Prepare ir8d3PUj5JU and inspect the complete creature build.
- [ ] Document dog-toy sources, throat/body/breath/mouth/threat layers, pitch/formant/granular processing and intelligibility checks.
- [ ] Add “狗玩具变异形龙吼：怪物声音设计”; primary category creature; secondary categories scifi and workflow; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning.
- [ ] Export memory and verify --completed 11.

Expected: records 73 and failures empty.

---

### Task 18: Add Video 12 - Stock Plugin Liquid Transformation

**Files:** index.html, assets/shots/full/E_wGGNkVcrw-*, assets/shots/preview/E_wGGNkVcrw-*, video-learnings.md, site-video-memory.md

- [ ] Prepare E_wGGNkVcrw and inspect each stock-plugin action.
- [ ] Document source choice, liquid modulation, rate/filter/feedback behavior, wet/dry balance and overprocessing failure mode.
- [ ] Add “用系统自带插件把任意声音变成液体”; primary category environment; secondary categories creature and magic; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning.
- [ ] Export memory and verify --completed 12.

Expected: records 74 and failures empty.

---

### Task 19: Add Video 13 - Phase Plant Rain And Water

**Files:** index.html, assets/shots/full/wWms0-ad6fw-*, assets/shots/preview/wWms0-ad6fw-*, optional assets/motions/wWms0-ad6fw-*, video-learnings.md, site-video-memory.md

- [ ] Prepare wWms0-ad6fw and inspect all 20 minutes.
- [ ] Document white-noise source, rain density, droplet envelopes, open-window filtering/space, modulation and scene transitions.
- [ ] Add “Phase Plant 白噪声合成暴雨、水滴与开窗声”; primary category environment; secondary categories workflow and scifi; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence; add motion only for modulation that cannot be explained by stills; append learning.
- [ ] Export memory and verify --completed 13.

Expected: records 75 and failures empty.

---

### Task 20: Add Video 14 - TRANSFORCE

**Files:** index.html, assets/shots/full/xCorcGCP218-*, assets/shots/preview/xCorcGCP218-*, video-learnings.md, site-video-memory.md

- [ ] Prepare xCorcGCP218 and distinguish confirmed plugin functions from product-demonstration claims.
- [ ] Document attack/sustain controls, source examples, post-production use cases, artifacts and comparison method.
- [ ] Add “TRANSFORCE 瞬态塑形器：后期制作应用”; primary category workflow; secondary category impact; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append a reference-only note wherever no production chain is shown.
- [ ] Export memory and verify --completed 14.

Expected: records 76 and failures empty.

---

### Task 21: Add Video 15 - Impactful Transients And Debris

**Files:** index.html, assets/shots/full/v1IGAnVJylY-*, assets/shots/preview/v1IGAnVJylY-*, video-learnings.md, site-video-memory.md

- [ ] Prepare v1IGAnVJylY and inspect all 19 minutes.
- [ ] Document transient/body/debris/tail layer roles, source timing, EQ/dynamics, spatial separation and final bus control.
- [ ] Add “设计有冲击力的瞬态与碎屑层”; primary category impact; secondary category workflow; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning.
- [ ] Export memory and verify --completed 15.

Expected: records 77 and failures empty.

---

### Task 22: Verify And Commit Batch 3

- [ ] Run portable verification and expect 77 records, 77 unique IDs and 77/77 coverage.
- [ ] Run plugin-tips verification with --completed 15 and expect ok true.
- [ ] Run syntax, asset, diff and forbidden-file checks.
- [ ] Verify local search returns exactly fifteen “插件技巧” records.
- [ ] Commit with git commit -m "Add plugin tips playlist batch 3".

---

### Task 23: Add Video 16 - Clove Death-State Sound

**Files:** index.html, assets/shots/full/LyNsYzCN5_A-*, assets/shots/preview/LyNsYzCN5_A-*, optional assets/motions/LyNsYzCN5_A-*, video-learnings.md, site-video-memory.md

- [ ] Prepare LyNsYzCN5_A and inspect all 31 minutes.
- [ ] Document player-state events, Alive/Dead relationship, gameplay information hierarchy, layers, parent routing, processing and middleware implications.
- [ ] Add “Valorant Clove 死亡状态音效设计”; primary category scifi; secondary categories magic and workflow; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning without duplicating the existing Clove smoke module.
- [ ] Export memory and verify --completed 16.

Expected: records 78 and failures empty.

---

### Task 24: Add Video 17 - ARC Raiders Style Explosions

**Files:** index.html, assets/shots/full/FuFfkk7dxcY-*, assets/shots/preview/FuFfkk7dxcY-*, video-learnings.md, site-video-memory.md

- [ ] Prepare FuFfkk7dxcY and inspect all 23 minutes.
- [ ] Document shower-curtain and household sources, low boom construction, transient/body/debris/tail timing, distortion/dynamics and ARC Raiders style decisions.
- [ ] Add “ARC Raiders 风格爆炸：浴帘变低沉冲击”; primary category impact; secondary categories workflow and scifi; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning.
- [ ] Export memory and verify --completed 17.

Expected: records 79 and failures empty.

---

### Task 25: Add Video 18 - Slime Bubble Creature

**Files:** index.html, assets/shots/full/NdGNqhV8cpM-*, assets/shots/preview/NdGNqhV8cpM-*, video-learnings.md, site-video-memory.md

- [ ] Prepare NdGNqhV8cpM and inspect the complete source-to-creature transformation.
- [ ] Document slime/bubble sources, wet mouth/body/air layers, pitch/formant/granular processing and transient readability.
- [ ] Add “用史莱姆气泡制作怪物声音”; primary category creature; secondary categories environment and magic; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence and append learning.
- [ ] Export memory and verify --completed 18.

Expected: records 80 and failures empty.

---

### Task 26: Add Video 19 - Dark Magic Building Blocks

**Files:** index.html, assets/shots/full/yYUB55kMMV8-*, assets/shots/preview/yYUB55kMMV8-*, video-learnings.md, site-video-memory.md

- [ ] Prepare yYUB55kMMV8 and inspect the entire 3:40 timeline.
- [ ] Document each visible dark-magic building block, its layer role, processing evidence and combination order; mark unseen chains as unconfirmed.
- [ ] Add “暗黑魔法声音构件”; primary category magic; secondary categories creature and scifi; derive source from metadata according to the completion contract.
- [ ] Publish/register at least three evidence shots and append learning.
- [ ] Export memory and verify --completed 19.

Expected: records 81 and failures empty.

---

### Task 27: Add Video 20 - Clove Ultimate

**Files:** index.html, assets/shots/full/cJ75ykkqV64-*, assets/shots/preview/cJ75ykkqV64-*, optional assets/motions/cJ75ykkqV64-*, video-learnings.md, site-video-memory.md

- [ ] Prepare cJ75ykkqV64 and inspect all 50:44 without relying on subtitles alone.
- [ ] Document the complete ultimate event sequence, player-state information, layer groups, plugin/routing evidence, variation behavior and in-game implementation reasoning.
- [ ] Add “Valorant Clove 终极技能音效制作”; primary category magic; secondary categories scifi and workflow; derive source from metadata according to the completion contract.
- [ ] Publish/register evidence; use motion only for routing or automation that stills cannot explain; append learning.
- [ ] Export memory and verify --completed 20.

Expected: records 82, uniqueVideoIds 82 and failures empty.

---

### Task 28: Verify And Commit Batch 4

- [ ] Run node tools\verify-portable-kit.cjs and expect records 82, uniqueVideoIds 82, siteMemoryCoverage 82/82, failures empty.
- [ ] Run node tools\verify-plugin-tips-import.cjs --completed 20 and expect ok true.
- [ ] Run syntax checks for every CJS file and prepare-sfx-video.py.
- [ ] Run git diff --check and confirm no raw video/audio, Cookie, login data, .work or .venv paths are staged.
- [ ] Commit with git commit -m "Add plugin tips playlist batch 4".

---

### Task 29: Perform Full Local Website QA

**Files:**
- Verify: index.html
- Verify: all new assets and records

- [ ] Open the local index.html with browser:control-in-app-browser.
- [ ] Confirm the header count is 82 and search “插件技巧” returns exactly 20 cards.
- [ ] Check all 20 cards have Chinese titles, channel source, step count, processing count and thumbnail fallback behavior.
- [ ] Open every new detail module and verify step order, plugin sections, materials, chain reasoning, parameter logic and practice checklist render.
- [ ] Check every evidence preview and full-size image; play every optional motion once.
- [ ] Test at a desktop viewport and a mobile viewport; verify no overlap, horizontal overflow, clipped controls or unreadable long titles.
- [ ] Run a final machine gate:

~~~powershell
node tools\export-site-memory.cjs
node tools\verify-portable-kit.cjs
node tools\verify-plugin-tips-import.cjs --completed 20
git status --short
~~~

Expected: both verifiers pass and only intentional final QA corrections appear.

- [ ] Commit any QA corrections with git commit -m "Polish plugin tips playlist modules".

---

### Task 30: Synchronize And Verify The Installed Skill

**Files:**
- Source: skills/sfx-knowledge/*
- Target: C:\Users\zhaoshangqi\.codex\skills\sfx-knowledge/*

- [ ] Install the repository skill with backup protection:

~~~powershell
powershell -ExecutionPolicy Bypass -File tools\install-sfx-skill.ps1 -Force
~~~

- [ ] Compare source and installed file hashes and require zero mismatches and zero extras.
- [ ] Run node tools\verify-portable-kit.cjs again and require 82/82.

---

### Task 31: Merge, Push And Verify GitHub Pages

**Files:** Git history and deployed GitHub Pages output

- [ ] Invoke superpowers:finishing-a-development-branch and review all commits and tests.
- [ ] Fetch origin and inspect whether origin/main advanced during the work.
- [ ] Integrate the feature branch into local main without discarding remote or user changes.
- [ ] Verify local main:

~~~powershell
node tools\verify-portable-kit.cjs
node tools\verify-plugin-tips-import.cjs --completed 20
git status --short --branch
~~~

Expected: both verifiers pass, main is clean and ready to push.

- [ ] Push main once:

~~~powershell
git push origin main
~~~

- [ ] Wait for GitHub Pages deployment, then use browser:control-in-app-browser to open https://zhaoshangqi.github.io/sfx-knowledge-site/.
- [ ] Confirm the live count is 82, search “插件技巧” returns 20, and at least one desktop and one mobile detail page load all evidence assets.
- [ ] Compare local HEAD with origin/main and report the deployed commit hash. The task is complete only after this live check passes.

---

## Final Evidence Checklist

- [ ] 20 playlist IDs present exactly once and in approved order.
- [ ] Four batch commits plus optional QA correction commit exist.
- [ ] 82 records, 82 unique IDs, 82/82 site-memory coverage.
- [ ] Search “插件技巧” returns exactly 20 locally and online.
- [ ] Every new module has at least three registered evidence steps.
- [ ] No raw video, full audio, browser credential, .work or .venv file is tracked.
- [ ] Installed Skill hashes match repository Skill hashes.
- [ ] origin/main and GitHub Pages both serve the verified final commit.
