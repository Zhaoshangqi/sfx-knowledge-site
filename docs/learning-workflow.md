# 音效视频学习与网站更新流程

## 目标

一条视频最终要留下三种可迁移产物：

1. 网站模块：方便人在手机或电脑上逐步骤学习。
2. Skill 记忆：方便 Codex 在后续设计音效时主动调用。
3. 可验证证据：高清步骤图、必要的流程动图和插件官方参考图。

网站与 Skill 共同构成完整视频干货档案，不生成练习、作业、打卡、难度、预计学习时间或课程任务。保留每一条有证据的制作决策、参数、路由、自动化动作、限制和失败尝试；字幕只用于定位证据，不能把字幕线索写成画面确认事实。

## 1. 准备环境

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
powershell -ExecutionPolicy Bypass -File .\tools\install-sfx-skill.ps1
```

确保 `ffmpeg -version`、`node --version` 和 `git --version` 可执行。登录限制视频可临时使用 `--cookies-from-browser chrome`，Cookie 由 `yt-dlp` 直接读取，不导出、不保存、不提交。

## 2. 获取 1080p 分析材料

```powershell
.\.venv\Scripts\python.exe .\tools\prepare-sfx-video.py "https://www.youtube.com/watch?v=VIDEO_ID" --max-height 1080 --frame-interval 1
```

输出位置：`.work/runs/VIDEO_ID/`。

- `data/video.*`：本机临时视频。
- `data/audio.wav`：48 kHz 立体声分析音频。
- `frames/frame_*.png`：原画幅高清抽帧。
- `sheets/overview_*.jpg`：快速扫全片的联系表。
- `metadata.json`：标题、频道、章节和时长。
- `local_prepare_summary.json`：本次准备结果。

字幕只用于定位：

```powershell
node .\tools\extract-video-context.cjs VIDEO_ID
```

如果视频下载失败，不能用字幕单独生成模块。先更新 `yt-dlp`、检查 FFmpeg/Node、尝试 Chrome 登录态；仍失败则记录为跳过。

## 3. 完整视觉分析

先扫联系表建立全片结构，再按章节检查 1080p 帧，最后回到关键时间段精看。每个结论要能回答：

- 画面正在发生什么声音事件？
- 该层承担 transient、body、texture、movement、tail、loop 还是 UI feedback？
- 插件位于哪一级，输入是什么，输出发生了什么？
- 数值是画面可见、作者口述，还是根据听感推断？
- 参数变化解决了什么问题，过量时会出现什么副作用？
- 该处理如何进入 REAPER、Wwise 或其他中间件？

优先记录因果链，不只抄插件名。例如：`清理低中频 -> 失真制造谐波 -> 动态 EQ 收尖锐 -> 调制制造运动 -> 独立尾音控制空间`。

## 4. 更新网站模块

`index.html` 内的 `records` 是模块事实来源。每个视频独立一条记录，沿用现有字段：

```text
id, title, videoId, url, source, category, secondaryCategories,
addedAt, updatedAt, updateNote, summary, coreIdeas, steps, plugins,
materials, keywords, tips, chainFocus, parameterLogic, effectUses（可选）
```

步骤图同时准备：

- `assets/shots/full/`：保持文字和参数可放大阅读。
- `assets/shots/preview/`：列表和详情初次打开使用的 WebP 小图。

动图使用 H.264 MP4，默认静止、点击播放；只截参数动作或处理对比所需的短片段。

### 准备网站自有中文字幕

播放器继续使用 YouTube 视频源，字幕显示、时间同步和全文跳转由网站控制，不依赖 YouTube 官方翻译。字幕准备只获取公开 VTT 文本，不下载媒体：

```powershell
yt-dlp --skip-download --write-auto-subs --sub-langs "zh-Hans,en-orig" --sub-format vtt -o ".work/subtitles/%(id)s.%(ext)s" "https://www.youtube.com/watch?v=VIDEO_ID"
```

把中文 VTT 转成经过校验的站点轨道 JSON：

```powershell
node .\tools\build-site-subtitles.cjs `
  --video-id VIDEO_ID `
  --input .work\subtitles\VIDEO_ID.zh-Hans.vtt `
  --language zh-CN `
  --source site-owned-from-public-captions `
  --review-status draft `
  --updated-at YYYY-MM-DD `
  --output .work\subtitles\VIDEO_ID.track.json
```

转换器会清除 WebVTT 标签、滚动重复、空白及纯音乐提示，并拒绝畸形时间轴。随后逐条核对中英文 VTT、原视频口述和现有视频记录，修正插件名、产品名与声音设计术语，再把轨道加入 `src/video-subtitles.js`。

字幕状态只有三种：

- `missing`：站内暂无字幕，视频仍可播放。
- `draft`：时间轴已可用，但术语或表述仍待人工核对。
- `reviewed`：时间轴、术语和正文已人工核对。

自动字幕和机器翻译不得直接标为 `reviewed`。`.work/subtitles/`、原始 VTT、原视频、音轨、Cookie 与登录态都不得提交；Git 只保存经过整理的站点字幕文本、代码和测试。

## 5. 写入 Skill 记忆

先把本条视频的可复用知识追加到：

```text
skills/sfx-knowledge/references/video-learnings.md
```

至少包含来源、领域、可复用模式、步骤/事件图、插件与处理笔记、设计原则和 `Use when` 检索词。随后把网站全部模块导出为第二份可检索镜像：

```powershell
node .\tools\export-site-memory.cjs
```

生成文件 `skills/sfx-knowledge/references/site-video-memory.md` 不手工修改。它用于防止网站已有模块漏进 Skill，并保留每条模块的参数逻辑、结构化效果器用法和证据边界。

## 6. 验证与发布

```powershell
node .\tools\verify-portable-kit.cjs
node --test .\tests\build-site-subtitles.test.cjs .\tests\video-subtitles.test.cjs .\tests\youtube-caption-player.test.cjs
node --check .\src\video-subtitles.js
node --check .\src\youtube-caption-player.js
node --check .\tools\build-site-subtitles.cjs
node --check .\tools\export-site-memory.cjs
node --check .\tools\extract-video-context.cjs
.\.venv\Scripts\python.exe -m py_compile .\tools\prepare-sfx-video.py
powershell -ExecutionPolicy Bypass -File .\tools\install-sfx-skill.ps1 -Force
git status --short
```

检查无误后只提交本条相关网站、压缩视觉资产、Skill 记忆和工具变更。推送后验证 GitHub 仓库与 Pages 页面均可访问。

## 迁移后的事实来源

- 人类学习界面：`index.html`。
- Codex 核心决策规则：`skills/sfx-knowledge/SKILL.md`。
- 历史手工记忆：`references/video-learnings.md` 和 `references/sfx-knowledge.md`。
- 网站完整镜像记忆：`references/site-video-memory.md`。
- 后续维护约束：根目录 `AGENTS.md`。
