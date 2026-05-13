# 音效知识库网页

这是一个独立的静态网页仓库。仓库根目录的 `index.html` 是入口页面，包含音效制作视频分析、步骤截图索引、插件处理点和可复用制作原则；截图文件放在 `assets/shots/`，由网页按需加载。

## 查看方式

直接打开：

```text
index.html
```

这个网页不依赖电脑上的本地截图目录，截图资源已经随仓库发布在 `assets/shots/` 中。把仓库复制到其他电脑，或部署到任意静态网页托管服务，都可以直接查看。

## 部署方式

这个仓库适合直接部署为静态站点：

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel 静态站点
- 任意能托管 `index.html` 的网页服务器

## 更新内容

上游分析结果通常从 `D:\AI\音频学习\音效知识库.html` 或生成器同步到本目录的 `index.html`。更新后提交即可：

```powershell
git status
git add .
git commit -m "Update sound effects knowledge base"
```

## 文件说明

- `index.html`：静态网页入口，包含页面、数据、筛选、搜索和更新时间排序
- `assets/shots/preview/`：移动端和详情页优先加载的轻量预览图
- `assets/shots/full/`：点击放大时使用的高清步骤截图
- `.nojekyll`：让 GitHub Pages 直接按静态网页发布
