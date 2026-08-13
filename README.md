# 音效知识库

这是音效学习网站、视频学习方法和 `sfx-knowledge` Skill 的便携仓库。

- `index.html`：可直接发布的网站和 82 个视频记录的事实来源。
- `assets/subtitles/`：站内自有的逐视频中文 JSON 字幕轨。
- `src/video-subtitles.js`：字幕 catalog、按视频懒加载和状态查询。
- `tools/`：视频准备、字幕导入/catalog 生成、转写审查和便携性检查工具。
- `AGENTS.md`：维护规则；开始工作前先读 `skills/sfx-knowledge/SKILL.md`。

在线网站：[https://zhaoshangqi.github.io/sfx-knowledge-site/](https://zhaoshangqi.github.io/sfx-knowledge-site/)

## 环境与验证

```powershell
git clone https://github.com/Zhaoshangqi/sfx-knowledge-site.git
cd sfx-knowledge-site
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
node .\tools\verify-portable-kit.cjs
```

需要 Git、Python 3.11+、Node.js 20+ 和 FFmpeg/FFprobe。完整维护流程见 [docs/learning-workflow.md](docs/learning-workflow.md)。

## 站内字幕现状

截至 `2026-08-13`，已验证覆盖为 **82** 个视频：**75** 条站内中文字幕轨、**0** 条 `no-speech`、**7** 条 `missing`，共 **21,252** 个 cues。不要把这表述为“全部视频都有字幕”；`missing` 是有证据、可播放且应如实保留的状态。

详情页使用 YouTube 作为播放源，但不依赖 YouTube 官方翻译：播放器按视频懒加载站内轨，支持时间同步覆盖层、全文稿、点击跳转、CC 和全屏。

## 每条轨道的 JSON

`assets/subtitles/VIDEO_ID.json` 是唯一可发布的字幕正文，固定结构如下：

```json
{
  "videoId": "VIDEO_ID",
  "language": "zh-CN",
  "source": "site-owned-from-public-captions",
  "reviewStatus": "draft",
  "updatedAt": "YYYY-MM-DD",
  "cues": [
    { "start": 0.0, "end": 2.4, "text": "中文字幕" }
  ]
}
```

`source` 只能是 `site-owned-from-public-captions` 或 `site-owned-from-local-transcription`；本地转写进入站内前仍必须是 `zh-CN`。`reviewStatus` 只能是 `draft` 或 `reviewed`。每个 cue 必须有非负、递增且不重叠的秒级 `start`/`end`，以及非空 `text`。

catalog 位于 `src/video-subtitles.js`，每个视频恰有一项：有轨道时为 `contentStatus: "track"` 并镜像上述元数据和 `asset`；无轨道时为 `contentStatus: "missing"` 或经人工听审批准的 `"no-speech"`。不要手写 catalog，使用下方生成命令。

## 公共字幕导入

只获取公开字幕文本，不下载媒体。临时 VTT 始终留在被忽略的 `.work`：

```powershell
node .\tools\batch-site-subtitles.cjs fetch-public --index .\index.html --work .\.work\subtitles
node .\tools\batch-site-subtitles.cjs import --input .\.work\subtitles --output .\assets\subtitles --updated-at YYYY-MM-DD
node .\tools\batch-site-subtitles.cjs catalog --index .\index.html --tracks .\assets\subtitles --overrides .\tools\data\subtitle-status-overrides.json --module .\src\video-subtitles.js --report .\.work\subtitle-coverage-report.json
```

人工检查时间轴、中文、插件名和术语后，保留 `draft` 或把对应 JSON 改为 `reviewed`；随后再次运行 `catalog`，审阅 JSON、catalog 和 `.work\subtitle-coverage-report.json` 的差异。

## 本地转写审查

公开字幕缺失时，可生成仅供审查的本地证据：

```powershell
python .\tools\transcribe-missing-subtitles.py --model large-v3 --device cuda --work-dir .\.work\subtitles VIDEO_ID
```

该工具只在 `.work` 写入 candidate/review 证据。Whisper candidate 是英文，状态为待翻译审校，不能直接进入 `assets/subtitles/`；完成中文翻译、时间轴和术语人工审校后，才可创建 `zh-CN` 轨道，并将来源标为 `site-owned-from-local-transcription`。

`no-speech` 只能由人工对全长音频听审后批准。模型置信度、VAD、频谱或零 accepted segment 都不足以证明无语音；无法完成听审或证据仍不充分时，维持 `missing`。这不是失败兜底，而是对当前已知事实的准确表达。

## 安全边界

绝不提交 `.work`、媒体、原始 VTT、review/candidate 证据、Cookie、登录态、token、API key、模型 checkpoint 或本机绝对路径。只提交已审校的站内 JSON 字幕、catalog、工具、测试和面向维护者的文档。

## 全量命令

```powershell
node --check src\video-subtitles.js
node --check src\youtube-caption-player.js
node --check tools\batch-site-subtitles.cjs
python -m py_compile tools\transcribe-missing-subtitles.py
node tools\verify-portable-kit.cjs
git diff --check
node --test tests\*.test.cjs
python -m unittest discover -s tests -v
```

在此 Node/Windows 环境中，Node 全量测试使用 `node --test tests\*.test.cjs`，不要写成 `node --test tests`。
