# 音效知识库整站学习清晰度改造设计

## 状态

- 设计方向：用户已授权持续规划并直接调整。
- 改造范围：站点首页壳层、视频案例索引、效果器索引、视频详情、效果器详情和移动端排版。
- 内容边界：继续以 82 个视频案例和 27 个证据充分的效果器档案为事实来源，不补写未被视频或画面支持的参数、听感和用法。

## 目标

1. 让读者在首屏直接进入内容，不被大面积介绍和控件挡住。
2. 让读者可以从“我想解决什么声音问题”出发查找效果器，而不必先知道插件名。
3. 让列表适合快速扫描，详情适合连续阅读，并保持两处内容一致。
4. 让截图承担证据作用，明确说明截图来自哪里、应该看什么。
5. 在桌面、平板和手机上保持紧凑、清晰、无重叠的工具书式排版。

## 信息架构

站点继续使用单页双索引结构，不新增账户、练习、收藏或参数教程。

### 顶部壳层

- 顶栏保留品牌，并把统计信息改为“视频、效果器、分类”三个有学习意义的数据。
- 介绍区缩短为站点名称和一句用途说明，不使用营销式大标题。
- 视图切换、搜索、来源和排序合并到紧凑的工具栏；移动端保持可触摸，但不让控件占满一整屏。

### 视频案例索引

- 显示明确的区块标题和一句用途说明。
- 分类按钮在窄屏横向滚动，避免六个分类换成多行后推迟内容出现。
- 卡片保留标题、来源、步骤数、处理点和摘要；摘要限制显示高度，完整内容在详情页阅读。
- 卡片提供简洁的可访问名称，不让屏幕阅读器重复朗读整张卡片。

### 效果器索引

- 增加“全部、清理与控制、冲击与密度、运动与节奏、音高与音色、空间与尾部、颗粒与变形”七个学习目标入口。
- 目标标签只承担导航，不增加新结论。每个效果器由独立的人工映射表归类，映射必须覆盖且只能引用已发布的 27 个规范名称。

#### 权威学习目标映射

下表是效果器学习目标分类的唯一权威清单。规范名称和目标 ID 必须按表中内容精确匹配；每行目标 ID 的顺序同样属于契约。

| 规范名称 | 目标 ID |
| --- | --- |
| Dawesome Love | `granular-transform` |
| FabFilter Pro-MB | `cleanup-control`, `impact-density` |
| FabFilter Pro-Q 3 | `cleanup-control`, `pitch-tone` |
| FabFilter Saturn 2 | `impact-density`, `granular-transform` |
| iZotope RX De-click | `cleanup-control` |
| iZotope Stutter Edit 2 | `motion-rhythm`, `granular-transform` |
| Kilohearts Phase Plant | `pitch-tone`, `motion-rhythm` |
| Kilohearts Snap Heap | `space-tail`, `motion-rhythm` |
| Melda MAutoPitch | `pitch-tone` |
| MeldaProduction MTremolo | `motion-rhythm`, `space-tail` |
| Minimal Audio Wave Shifter | `pitch-tone`, `motion-rhythm` |
| Morph EQ | `pitch-tone`, `motion-rhythm` |
| NI Transient Master | `impact-density`, `cleanup-control` |
| Oeksound Soothe2 | `cleanup-control`, `impact-density` |
| Polyverse Manipulator | `pitch-tone`, `impact-density` |
| Sonic Academy Kick 3 | `impact-density` |
| Soundtheory Gullfoss | `cleanup-control` |
| Soundtoys Crystallizer | `granular-transform`, `space-tail` |
| Soundtoys Decapitator | `impact-density` |
| Soundtoys FilterFreak | `motion-rhythm`, `pitch-tone` |
| Soundtoys PhaseMistress | `motion-rhythm`, `space-tail` |
| Stepwise Morph | `pitch-tone`, `granular-transform` |
| Unfiltered Audio Indent 2 | `cleanup-control`, `impact-density` |
| UVI Shade | `motion-rhythm`, `space-tail` |
| Valhalla FreqEcho | `space-tail`, `pitch-tone` |
| Waves Enigma | `motion-rhythm`, `space-tail` |
| Waves Z-Noise | `cleanup-control` |

- 列表改为紧凑的图文档案行。先显示“听感结果”，再显示“适用输入”和“处理动作”。
- 搜索命中的可见文字高亮，帮助读者理解为什么得到该结果。
- 无结果时提供清空筛选的明确操作。

### 效果器详情

- 第一视区先回答“能得到什么”，再说明“适合什么输入”和“怎么处理”。
- 证据截图与三行说明同屏出现；截图下显示来源、步骤或时间点。
- 每张截图增加“看图重点”，内容直接来自对应视频步骤名称，不另行推断参数。
- 第一张证据截图作为主要案例，其余截图归入“更多视频案例”。

### 视频详情

- 保持设计目标、设计思路、素材与分层、完整流程、效果链、效果器用法、证据边界和来源的既有顺序。
- 收紧标题、元信息和各章节间距，保持长文的阅读节奏。
- 不删减底层记录；只调整展示层级和排版。

## 视觉方向

- 整体保持纸张底色、深色文字和青色交互强调，但减少大面积渐变和装饰。
- 页面以全宽工具栏和无框内容区为主；卡片只用于可点击的重复档案。
- 圆角不超过 8px；文字不随视口宽度缩放。
- 效果器卡片使用横向缩略图加内容的紧凑布局，手机端再切回单列。
- 结果文字使用最强层级，输入和动作使用较弱层级，来源和数量保持辅助层级。

## 交互与状态

- 切换视频/效果器视图时保留各自的搜索、来源和目标状态。
- 效果器目标筛选与搜索、来源筛选共同生效，并同步更新结果数。
- 打开详情、返回列表和从效果器案例跳回视频的现有哈希路由保持不变。
- 键盘可操作视图切换、筛选、卡片、详情返回和截图放大。

## 验证

- 自动化测试覆盖学习目标映射完整性、筛选组合、搜索高亮、无结果重置、可访问标签和详情证据文案。
- 运行全部 Node 测试、Python 测试、脚本语法检查、便携包验证和 `git diff --check`。
- 在 1440x1000、833x579 和 390x844 视口检查首屏内容密度、文字换行、卡片高度、筛选滚动、详情截图及无重叠。

## 非目标

- 不增加练习、课程进度、打卡、收藏、评分或登录。
- 不增加固定参数、预设值和通用插件百科文案。
- 不重新分析、下载或发布原始 YouTube 音视频。
- 不改变 GitHub Pages 的纯静态部署方式。
