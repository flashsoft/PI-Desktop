# 文档站点

## 状态

已接受。请参阅 [ADR 0079](/adr/0079-vitepress-documentation-site)。

## 决定

`docs/` 目录是 pnpm 内的独立 VitePress 项目
工作区。 Markdown 仍然是事实的来源； VitePress 供应本地
开发服务器，静态构建，本地搜索索引，代码突出显示，以及
版本化的导航 shell。

该站点是单一语言（简体中文）的文档站，所有规格页面直接生活在
`docs/spec/` 下并通过 `/spec/` 路由暴露。

对于根目录为 `docs`、`docs/vercel.json` 的 Vercel 部署
将 VitePress 构建输出声明为 `.vitepress/dist` 并启用 Vercel
`cleanUrls` 路由。这会保留无扩展的链接，例如 `/spec/README` 和
`/adr/README` 在直接页面刷新后工作而不是变成静态
托管 404。

现有 `spec/`、`adr/`、`project/` 和指南 Markdown 文件保持不变
因此存储库链接和评论历史记录保持稳定。规格页以中文为主要语言，
代码、协议字段和标识符保持英文原文。

## 本地命令

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
pnpm docs:check
```

生产构建是静态的，不需要运行时服务。这
网站可能会在开发或部署期间加载 Google Fonts，但内容
和搜索索引由 VitePress 在本地生成。

`pnpm docs:check` 运行 `scripts/check-docs.mjs`，对 `docs/` 下每个 Markdown 页面做校验：

1. 只有一个一级标题，`layout: home` 页面以 hero 代替；
2. 代码围栏成对，且同一张表格各行的列数一致；
3. ADR 目录：文件名为 `NNNN-slug.md`（或纯 slug）、一个决策编号只有一个归属、H1 声明该编号，并含 Status、Context、Decision 段；
4. `adr/README.md`：每条记录恰好一行索引，且行内链接只能指向拥有该编号的记录；
5. `docs/` 下所有 `ADR NNNN` 引用都能解析到记录，或解析到 `08-meta/decisions-log.md` 声明退役的编号；
6. `spec/NAV.md` 列出规格树中的每个页面，且 `spec/` 的章节目录必须保持 `01-product` 这样的编号。

该门禁由 `.github/workflows/docs-check.yml` 执行，覆盖应用 CI 工作流有意忽略的文档路径。

随后同一工作流会运行 VitePress 生产构建，验证渲染路由与每条内部链接。

## 内容规则

1. 中文是仓库文档（规格、ADR、指南）的主要语言；代码
   标识符和协议术语保持英文原文。
2. 规格页面以中文撰写完整散文，并逐字保留代码、协议字段
   和标识符。
3. 侧边栏源自 Markdown 树，因此新的规范不能
   被意外地从深度导航中遗漏。
4. 用户可见或协议可见的文档行为属于 E2E
   测试计划。
5. 导航应暴露最短的有用路径；仍保留深层文件
   可搜索并可直接链接。
