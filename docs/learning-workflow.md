# 音效视频学习与网站维护流程

## 目标

每条视频保留三类可迁移产物：网站记录、`sfx-knowledge` Skill 记忆，以及可验证的视觉/流程证据。字幕只用于定位证据和站内阅读，不能替代完整视频画面分析或被写成画面确认事实。

## 视频记录与视觉分析

1. 获取可检查的完整视频画面，目标上限为 1080p；只拿到字幕时，不生成凑数的分析模块。
2. 全时间线检查声音设计目标、素材角色、处理顺序、参数方向、路由和设计理由；区分画面确认、作者口述、音频可辨与分析推断。
3. 在 `index.html` 中为每个视频保留独立记录和详情页，更新后运行 `node .\tools\export-site-memory.cjs`。
4. 图片放在 `assets/shots/preview/` 和 `assets/shots/full/`；仅在静态图不足以表达变化时使用带 poster 的 H.264 MP4，避免 GIF。

网站与 Skill 是完整视频干货档案：不生成练习、作业、打卡、难度、预计学习时间或课程任务；保留每一条有证据的制作决策、参数、路由、自动化动作、限制和失败尝试。网站记录沿用 `id, title, videoId, url, source, category, secondaryCategories, addedAt, updatedAt, updateNote, summary, coreIdeas, steps, plugins, materials, keywords, tips, chainFocus, parameterLogic, effectUses（可选）`。`effectUses` 记录结构化效果器用法和证据边界。

本地视频准备仍只写入 `.work/runs/`：

```powershell
.\.venv\Scripts\python.exe .\tools\prepare-sfx-video.py "https://www.youtube.com/watch?v=VIDEO_ID" --max-height 1080 --frame-interval 1
```

## 站内中文字幕模型

YouTube 只提供播放源；站内字幕不依赖 YouTube 官方翻译。`src/video-subtitles.js` 是 catalog，按视频懒加载 `assets/subtitles/<11 位视频 ID>.json`，播放器提供时间同步覆盖层、全文稿、seek、CC 和全屏。

发布的每条 JSON 轨道必须为：

```json
{
  "videoId": "Xl5u91oQv-k",
  "language": "zh-CN",
  "source": "site-owned-from-public-captions",
  "reviewStatus": "draft",
  "updatedAt": "2026-08-12",
  "cues": [{ "start": 0.0, "end": 2.4, "text": "中文字幕" }]
}
```

`source` 取值为 `site-owned-from-public-captions` 或 `site-owned-from-local-transcription`；`reviewStatus` 为 `draft` 或 `reviewed`。cues 按时间升序、互不重叠，并且正文非空。catalog 中每个网站视频恰有一个条目：`track` 条目镜像轨道元数据并指向 JSON，`missing` 或 `no-speech` 条目则不带 asset。

截至 `2026-08-13`，已验证覆盖为 **75 track + 0 noSpeech + 7 missing = 82**，总计 **21,252 cues**。因此不得声称所有视频均有字幕。

## 公共字幕导入与 catalog

公共字幕批处理只下载公开 VTT 到 `.work`，随后将经过校验的中文轨写入 `assets/subtitles/`：

```powershell
node .\tools\batch-site-subtitles.cjs fetch-public --index .\index.html --work .\.work\subtitles
node .\tools\batch-site-subtitles.cjs import --input .\.work\subtitles --output .\assets\subtitles --updated-at YYYY-MM-DD
node .\tools\batch-site-subtitles.cjs catalog --index .\index.html --tracks .\assets\subtitles --overrides .\tools\data\subtitle-status-overrides.json --module .\src\video-subtitles.js --report .\.work\subtitle-coverage-report.json
```

`import` 默认跳过已存在的 `assets/subtitles/<11 位视频 ID>.json`，保护已有人工修改。审阅 VTT 和 JSON 的时间轴、中文、插件名、产品名和术语后，保留 JSON 为 `draft` 或改为 `reviewed`，然后只重跑 `catalog`。仅当已另行备份且确认要以输入 VTT 覆盖人工修改时，才显式向 `import` 命令加入 `--force`。`catalog` 从 `index.html`、站内 JSON 和状态 overrides 生成有序 catalog，并把 total、tracks、publicCaptions、localTranscriptions、noSpeech、missing 和 cues 写入 coverage report；不要手动维护 catalog。

## 本地转写审查门禁

公开字幕缺失时，可以用 large-v3 生成本地审查证据：

先按本机 CPU/CUDA 环境安装匹配版本的 `torch` 与 `torchaudio`，再安装转写依赖：

```powershell
# 从 PyTorch 安装选择器取得与本机 CPU/CUDA 匹配的 torch + torchaudio 命令并先执行。
.\.venv\Scripts\python.exe -m pip install -r .\requirements-transcription.txt
```

CUDA 命令要求 `torch.cuda.is_available()` 为真，并且 `large-v3` 已在 Whisper 缓存中；工具会拒绝隐式下载模型：

```powershell
python .\tools\transcribe-missing-subtitles.py --model large-v3 --device cuda --work-dir .\.work\subtitles VIDEO_ID
```

没有可用 CUDA 时，使用 CPU fallback；同样要求 `large-v3` 已缓存：

```powershell
python .\tools\transcribe-missing-subtitles.py --model large-v3 --device cpu --work-dir .\.work\subtitles VIDEO_ID
```

工具在 `.work` 中保存英文 Whisper candidate 和审查证据，candidate 的来源为 `site-owned-from-local-transcription`，且为待翻译审校状态。它不是可发布轨道：必须经过人工中文翻译、时间轴和术语审校后，才可将 `zh-CN` JSON 加入 `assets/subtitles/`，再生成 catalog。

`no-speech` 不是模型推断。即使全长 VAD/Whisper 得到零 accepted speech，模型/接口不能真正审听音频；只有人工全长听审后才能批准 `no-speech` override。否则使用带具体证据的 `missing`，这是可信且可维护的状态。

## 安全与全量验证

绝不提交 `.work`、媒体、VTT、review/candidate、Cookie、登录态、token、API key、模型 checkpoint 或绝对本地路径。仓库只保存经过结构和来源校验、`reviewStatus` 可为 `draft` 或 `reviewed` 的站内 JSON 字幕、catalog、已审校的网站/Skill 内容、工具、测试和文档。

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

此 Windows/Node 组合必须以 `node --test tests\*.test.cjs` 跑全量 Node 测试，不能用 `node --test tests`。验证后检查 `git status --short` 和 `git diff --check`，只提交本次相关的文档及必要修复。
