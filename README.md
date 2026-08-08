# 音效知识库

这是音效学习网站与制作方法的便携仓库。它同时保存：

- `index.html`：可直接发布的音效知识库网站。
- `assets/`：高清步骤截图、移动端预览图、插件官方图和流程动图。
- `skills/sfx-knowledge/`：可安装到 Codex 的音效知识 Skill、历史知识和逐视频记忆。
- `tools/`：1080p 视频准备、网站记忆导出、Skill 安装和完整性检查工具。
- `AGENTS.md`：后续分析视频、更新记忆和维护网站时必须遵守的项目规则。

在线网站：[https://zhaoshangqi.github.io/sfx-knowledge-site/](https://zhaoshangqi.github.io/sfx-knowledge-site/)

## 换电脑继续

```powershell
git clone https://github.com/Zhaoshangqi/sfx-knowledge-site.git
cd sfx-knowledge-site
powershell -ExecutionPolicy Bypass -File .\tools\install-sfx-skill.ps1
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
node .\tools\verify-portable-kit.cjs
```

另外安装并加入 `PATH`：

- Git
- Python 3.11+
- Node.js 20+
- FFmpeg / FFprobe

详细流程见 [docs/learning-workflow.md](docs/learning-workflow.md)。

## 准备新视频

```powershell
.\.venv\Scripts\python.exe .\tools\prepare-sfx-video.py "YOUTUBE_URL" --max-height 1080 --cookies-from-browser chrome
```

脚本只准备本机分析材料，输出到被 Git 忽略的 `.work/runs/`。字幕只能辅助定位，不能代替逐帧视觉分析；如果拿不到视频画面，停止该条分析，不生成字幕凑数模块。

## 更新记忆与发布

网站记录更新后重新导出 Skill 的网站镜像记忆并检查：

```powershell
node .\tools\export-site-memory.cjs
node .\tools\verify-portable-kit.cjs
powershell -ExecutionPolicy Bypass -File .\tools\install-sfx-skill.ps1 -Force
```

原视频、浏览器 Cookie、API Key、虚拟环境和 `.work/` 分析缓存不得提交。GitHub 仓库只保存可公开复用的网站、压缩后的教学视觉资产、方法和知识记忆。
