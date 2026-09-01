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

JSON 中的短 cue 永远是播放器覆盖字幕和精确同步的唯一来源。全文阅读区由 `SfxVideoSubtitles.paragraphsFor(track)` 在运行时把相邻 cue 投影成可点击段落；段落只改善阅读，不改写原文，也不生成新的时间轴。编辑者不得为了让全文稿更整齐而合并、拆分或挪动 JSON cue 时间。段落边界需要调整时，只修改投影规则，并继续验证每个 cue 恰好归属一个段落、文字流无丢失。

截至 `2026-09-01`，已验证覆盖为 **78 track + 0 noSpeech + 7 missing = 85**，总计 **22,797 cues**。因此不得声称所有视频均有字幕。

## 中英术语表维护

`src/sfx-glossary.js` 是人工维护的声音设计概念表。术语只解释“是什么”和“什么时候关注”，不写固定参数配方；产品名、插件名和厂商名保持原文，不翻译成概念词。新增 alias 时，中文可以按完整词组匹配，英文缩写和单词必须保留词边界，避免 `bus` 命中 `business`、`IR` 命中 `mirror` 这类误报。

站内只展示当前记录和已加载字幕实际命中的术语。匹配是只读索引，不改写记录、字幕或产品名；无相关术语时整段省略。维护后至少运行 `node --test tests\sfx-glossary.test.cjs tests\video-subtitles.test.cjs tests\youtube-caption-player.test.cjs tests\dual-index-site.test.cjs`，确认术语唯一、排序稳定、字段转义安全，并且全文段落与视频内短字幕仍各司其职。

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
.\.venv\Scripts\python.exe .\tools\transcribe-missing-subtitles.py --model large-v3 --device cuda --work-dir .\.work\subtitles VIDEO_ID
```

没有可用 CUDA 时，使用 CPU fallback；同样要求 `large-v3` 已缓存：

```powershell
.\.venv\Scripts\python.exe .\tools\transcribe-missing-subtitles.py --model large-v3 --device cpu --work-dir .\.work\subtitles VIDEO_ID
```

工具在 `.work` 中保存英文 Whisper candidate 和审查证据，candidate 的来源为 `site-owned-from-local-transcription`，且为待翻译审校状态。它不是可发布轨道：必须经过人工中文翻译、时间轴和术语审校后，才可将 `zh-CN` JSON 加入 `assets/subtitles/`，再生成 catalog。

`no-speech` 不是模型推断。即使全长 VAD/Whisper 得到零 accepted speech，模型/接口不能真正审听音频；只有人工全长听审后才能批准 `no-speech` override。否则使用带具体证据的 `missing`，这是可信且可维护的状态。

## 视频时间线人工核对

时间点必须在可见的 YouTube 播放器中逐项确认。站内字幕匹配只提供 seek 候选，不能自动写成 `reviewed`，也不能替代对画面、声音和当前视频 ID 的人工核对。评审服务只绑定 `127.0.0.1`，状态固定写入未跟踪的 `.work/timeline-review/review.json`：

```powershell
node .\tools\timeline-review-server.cjs --index .\index.html --work .\.work\timeline-review
node .\tools\apply-timeline-review.cjs --index .\index.html --review .\.work\timeline-review\review.json --dry-run --report .\.work\timeline-review\apply-report.json
node .\tools\apply-timeline-review.cjs --index .\index.html --review .\.work\timeline-review\review.json --write
```

在评审台中先确认播放器已就绪且视频 ID 正确，再记录每个步骤的开始时间；每个公开效果器案例还必须选择所属步骤，并确认对应截图或明确标记“已检查但无截图”。单条视频只有在时长、全部步骤和全部公开案例都完成后才会整体写回；候选时间、部分完成视频、旧步骤顺序、案例 ID 错位和越界时间都会拒绝应用。先运行 `--dry-run` 检查报告，确认 `failures` 为空和 `changedRecordIds` 符合本批范围后，才运行 `--write`。

批量人工核对期间可运行 `node .\tools\verify-portable-kit.cjs --allow-incomplete-timeline`，该开关只暂时放宽时间线完整度，公开案例身份和截图资产仍必须有效。最终发布必须去掉此开关，使默认校验达到 85/85 条已核对视频、964/964 个步骤时间、101/101 个公开案例时间与截图审查，以及 887/887 个步骤截图资产。

## 学习详情与证据导航

视频详情采用“播放器、快速结论、章节导航、时间线、效果器、术语、全文字幕、完整证据”的固定顺序。快速结论只保留摘要和最重要的三条设计思路；制作步骤、素材、插件链、参数原文、决策和来源必须完整保留在可展开的“完整证据”中，不能为了页面简短而截断或删减数据。

详情深链格式为 `#video=<record-id>&t=<seconds>&section=<section-id>`，其中章节只允许 `quick`、`steps`、`effects`、`glossary`、`transcript` 和 `evidence`。打开带时间的链接时，播放器定位到对应时间但不自动播放，必须等待用户操作。步骤时间、效果器案例时间和字幕段落都复用同一跳时行为，并在跳转后更新当前地址，便于复制和继续学习。

步骤截图和时间跳转是两个独立动作：点击图片只放大该张证据图，旁边的时间按钮才定位并播放视频，禁止把跳时按钮嵌套在图片按钮中。全文稿由站内字幕 cue 投影而来，点击段落可回到对应时间；播放窗口中的短字幕仍以原 cue 为唯一同步来源。

效果器档案按具体 `effectUses` 用法展示案例。案例截图只有在 `visual.kind === "video"` 且 `visual.useId === use.id` 时才能出现；禁止从同一视频的其他步骤、同一效果器的其他案例或官方产品图借图。没有归属截图时必须明确显示“已核对，暂无对应截图”。官方界面图只在效果器档案级别展示一次，不能伪装成案例证据；速查描述只回答“解决什么问题、何时使用、听感方向和注意点”，不展示参数清单。

## 安全与全量验证

绝不提交 `.work`、媒体、VTT、review/candidate、Cookie、登录态、token、API key、模型 checkpoint 或绝对本地路径。仓库只保存经过结构和来源校验、`reviewStatus` 可为 `draft` 或 `reviewed` 的站内 JSON 字幕、catalog、已审校的网站/Skill 内容、工具、测试和文档。

```powershell
node --check src\video-subtitles.js
node --check src\youtube-caption-player.js
node --check tools\batch-site-subtitles.cjs
.\.venv\Scripts\python.exe -m py_compile tools\transcribe-missing-subtitles.py
node tools\verify-portable-kit.cjs
git diff --check
node --test tests\*.test.cjs
.\.venv\Scripts\python.exe -m unittest discover -s tests -v
```

此 Windows/Node 组合必须以 `node --test tests\*.test.cjs` 跑全量 Node 测试，不能用 `node --test tests`。验证后检查 `git status --short` 和 `git diff --check`，只提交本次相关的文档及必要修复。
