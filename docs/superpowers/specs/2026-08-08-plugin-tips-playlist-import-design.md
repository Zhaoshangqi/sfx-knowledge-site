# 插件技巧播放列表全量导入设计

## 背景

YouTube 私密播放列表“插件技巧”包含 20 个游戏音效与声音设计视频，总时长 5:16:14。当前网站有 62 条独立视频记录，播放列表中的 20 个视频 ID 均未出现，因此本次完成后网站应达到 82 条唯一记录。

用户已授权通过登录后的 YouTube 会话读取私密播放列表，并批准在全部内容通过验收后直接推送 GitHub Pages。登录态只用于读取和准备本机分析材料，不进入仓库。

## 目标

1. 按播放列表顺序完整分析 20 个视频，每个视频形成独立中文网站模块。
2. 为关键制作步骤保留可核查的高清画面证据和移动端预览图。
3. 将每条视频的可复用知识同步到 `sfx-knowledge` Skill，并生成完整网站镜像记忆。
4. 四批内容全部通过验证后一次性发布，使网站记录、唯一视频 ID 和 Skill 覆盖均达到 82。

## 非目标

- 不重做网站整体 UI、导航或数据架构。
- 不提交原始 YouTube 视频、完整音轨、Cookie、登录态、API Key 或 `.work` 缓存。
- 不用字幕代替视觉分析，不为看不到的插件、参数或路由编造结论。
- 不在 20 条全部验收前向 `main` 推送部分成果。

## 播放列表清单

| 批次 | 序号 | Video ID | 时长 | 原始标题 |
| --- | ---: | --- | ---: | --- |
| 1 | 1 | `Xl5u91oQv-k` | 6:21 | Metallic Staccato sfx with Serum and using Stepwise Morph for cool Scifi textures |
| 1 | 2 | `kv0yNg1CPAk` | 13:07 | Sound Design - How To Make Anime SFX with Serum |
| 1 | 3 | `St6GD7CbdcM` | 9:06 | HOW TO TURN MONO INTO CINEMATIC SOUND / SOUND DESIGN FOR BEGINNERS |
| 1 | 4 | `eKCYZz98-N4` | 18:40 | How Tejo Rocket Explosions are made / Valorant Sound Design |
| 1 | 5 | `f9OrpDtedSI` | 18:09 | Creating Modern Explosions from Random Household Objects |
| 2 | 6 | `2cTDQ_MetsE` | 13:05 | How to make hyper realistic weapon explosion sound using daily objects |
| 2 | 7 | `ceC_RDgx71s` | 6:47 | Route Audio From Your DAW Into Whoosh |
| 2 | 8 | `fYqe17OJRNM` | 7:23 | Sci-Fi and Anime Sound Design with Wave Shifter |
| 2 | 9 | `j4POSc1YeAo` | 24:01 | Modern Anime Sound Design: Using Sine Waves To Make Bubbly Melodic Pops |
| 2 | 10 | `C_5qPsn1GWY` | 8:03 | Creative Sound Design Using iZotope RX De-Clip |
| 3 | 11 | `ir8d3PUj5JU` | 23:09 | Alien Dragon Roar Sound Design: From Dog Toys To Monster Screams |
| 3 | 12 | `E_wGGNkVcrw` | 5:17 | this STOCK plugin turns any sound into LIQUID |
| 3 | 13 | `wWms0-ad6fw` | 20:01 | Heavy Rain, Water Drops and Open Windows Using White Noise in Phase Plant |
| 3 | 14 | `xCorcGCP218` | 7:52 | TRANSFORCE / Transient Shaper Plug-In / Post Production |
| 3 | 15 | `v1IGAnVJylY` | 19:15 | Designing Impactful Transients and Debris |
| 4 | 16 | `LyNsYzCN5_A` | 31:18 | This what it sounds like when you die as Clove in Valorant |
| 4 | 17 | `FuFfkk7dxcY` | 23:28 | Arc Raiders Style Explosions: Turning Shower Curtains Into Boomy Impacts |
| 4 | 18 | `NdGNqhV8cpM` | 6:48 | Creature Sound Design using Slime Bubbles |
| 4 | 19 | `yYUB55kMMV8` | 3:40 | Dark Magic Building Blocks |
| 4 | 20 | `cJ75ykkqV64` | 50:44 | How I made the sounds for Clove's Ult |

## 分支与批次策略

- 从最新 `main` 创建独立工作分支 `feature/plugin-tips-playlist-20`。
- 严格按播放列表顺序处理四批，每批五条，避免遗漏并保持可恢复进度。
- 每批形成一个本地提交；批次提交不推送，不触发不完整的 Pages 发布。
- 四批完成且最终验收通过后，将工作分支合并到 `main` 并一次推送。
- 若工作期间远端 `main` 更新，先获取远端状态并在最终发布前安全整合，不覆盖其他人的修改。

## 单视频处理流程

1. 优先使用仓库准备工具获取最高不超过 1080p 的完整视频、48 kHz 分析音频、元数据、全片抽帧和联系表，输出到 `.work/runs/<videoId>/`。
2. 本地完整媒体可用时，核对视频时长、画面可读性和音频完整性；字幕仅用于搜索和时间定位。
3. 若 YouTube 媒体 URL 在已验证的当前网络中持续被会话绑定或 403 阻断，可改用已授权的认证浏览器证据模式：验证播放器实际时长，检查完整时间轴、官方 storyboard 和关键时点的全尺寸播放器画面，并在分析笔记中记录来源与限制。该模式没有本地音频时，禁止写成本地听音结论。
4. 明确区分画面确认值、作者口述和分析推断。无法确认的数值不进入确定性描述。
5. 在 `index.html` 的既有 `records` 数据中新增独立记录，不合并多个视频。
6. 为每个关键步骤生成 `assets/shots/full/` 高清图和 `assets/shots/preview/` 轻量预览图。
7. 只有参数变化、路由切换或前后对比无法用静态图讲清时，才在 `assets/motions/` 增加短 H.264 MP4 和轻量 poster。
8. 将可复用原则追加到 `skills/sfx-knowledge/references/video-learnings.md`。
9. 运行 `node tools/export-site-memory.cjs`，保证新增模块同步进入 `site-video-memory.md`。
10. 运行单条和批次级检查后，再进入下一条。

## 网站记录标准

每条记录沿用现有字段和渲染方式，至少包含：

- `id`、中文 `title`、`videoId`、原始 `url`、来源频道和日期。
- 主分类、辅助分类、关键词，以及统一检索词“插件技巧”。
- `summary`：教程真正解决的问题。
- `coreIdeas`：可迁移的设计原则。
- `steps`：顺序、动作、细节、参数证据和图片键。
- `plugins`：插件名称、用途、设置与调参逻辑。
- `materials`：源素材与每层职责。
- `chainFocus`：完整效果链的因果关系。
- `parameterLogic`：先调什么、听什么以及何时停止。
- `practiceChecklist`：能够实际复刻的练习。

来源或关键词中统一包含“插件技巧”，使现有搜索框无需新增 UI 即可筛出 20 条播放列表记录。

## 视觉资产规则

- 关键步骤截图必须能看清插件型号、参数区域、时间线或路由关系。
- 高清图只在详情放大时加载；列表和详情初次打开使用 WebP 预览图。
- 官方插件图只使用已核对型号的官方图片，并优先复用仓库现有插件参考图。
- 不为装饰性画面增加截图；每张图必须支持一个具体制作结论。
- 产品演示或成品展示若没有制作界面，只记录可观察的事件结构和设计原则，不反推插件链。

## 获取失败与证据边界

- 获取失败时依次检查公开单视频 URL、仓库准备工具、当前已授权登录会话和受支持的媒体准备方式。
- 不导出、不保存、不提交浏览器 Cookie 或凭据。
- 单条完成允许两种证据模式：本地完整媒体模式，或认证浏览器全时轴视觉证据模式。后者必须验证实际时长、覆盖从开头到结尾的时间轴、检查 storyboard 与关键时点可读画面，并在 `analysis.md` 写明 `acquisition_mode`、画面来源和没有本地音频时的结论边界。
- 认证浏览器模式下，字幕只能用于定位和作者口述归因；插件、参数、路由和自动化仍必须由可读画面确认。没有本地音频时不得声称已完成主观听音、响度、频谱或动态判断。
- 只有字幕、缩略图、未覆盖完整时间轴或低清不可读画面时，该条保持未完成，不能创建占位记录。
- 某条未达到证据标准时，整项任务保持未完成，不进行最终发布。
- 已完成批次保留本地提交和 `.work` 状态，修复获取问题后从未完成条目继续。

## 验证策略

### 每条视频

- Video ID 在网站中唯一。
- 关键结论有对应画面、口述或明确标注的推断依据。
- 高清图、预览图和可选 motion 路径存在且能加载。
- 中文标题、来源、日期、分类和播放列表检索词完整。
- `video-learnings.md` 与导出的 `site-video-memory.md` 均包含该 Video ID。

### 每批五条

- 运行 `node tools/export-site-memory.cjs`。
- 运行 `node tools/verify-portable-kit.cjs`。
- 检查全部 `.cjs` 脚本语法和 `prepare-sfx-video.py` 语法。
- 检查 Git 变更只包含本批网站记录、允许提交的视觉资产、Skill 记忆和必要工具变更。
- 在本地网站抽查新增详情页、图片放大、返回列表、搜索和移动端布局。

### 最终发布门槛

- 网站记录总数为 82。
- 唯一 Video ID 数为 82。
- `site-video-memory` 覆盖为 `82/82`，验证失败数为 0。
- 搜索“插件技巧”准确返回本次 20 条记录。
- 桌面和手机视口下无文字重叠、横向溢出、破图或失效交互。
- Git 中不存在原视频、完整音轨、Cookie、登录信息、`.work` 或其他本机临时文件。
- 仓库版与本机安装的 `sfx-knowledge` 文件哈希一致。
- `HEAD` 与将要推送的提交一致，工作树干净。

## 发布与线上验证

1. 安装仓库中的最新版 `sfx-knowledge`，已有不同版本时先由安装脚本备份。
2. 合并工作分支到本地 `main`，确认提交历史和差异范围。
3. 推送 `main` 到 GitHub，等待 GitHub Pages 部署完成。
4. 打开线上网站验证总记录数、搜索“插件技巧”的 20 条结果，以及至少一个桌面和一个手机视口的详情页。
5. 只有线上验证通过后，任务才算完成。

## 验收标准

- 播放列表 20 个 Video ID 全部对应网站独立记录，无遗漏、无重复。
- 每条记录符合仓库的完整视觉分析和可复刻步骤标准。
- 20 条均有 Skill 学习条目，并进入网站镜像记忆。
- 本地验证与线上验证均通过，网站最终为 82 条记录和 `82/82` 记忆覆盖。
- GitHub Pages 已展示全部新内容，且未泄露任何私密播放列表凭据或本机分析材料。
