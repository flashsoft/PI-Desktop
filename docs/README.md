# PI-Desktop 文档

`docs/` 是一个 VitePress 项目。发布的站点从 [`index.md`](index.md) 开始；
仓库的中文技术事实来源组织在 `spec/` 和 `adr/` 之下。

## 本地命令

```bash
pnpm docs:dev
pnpm docs:build
pnpm docs:preview
pnpm docs:check
```

## 目录说明

- `spec/` 和 `adr/` 存放中文为主的技术文档，由 `pnpm docs:check` 校验。
- `image/` 存放仓库 README 中嵌入的图片；`public/` 存放站点自身使用的
  资源（品牌标识、截图）。
- `project/` 保存历史规划记录；当前状态以 changelog 和 GitHub Issues
  为准。

## 入口

- [文档站点首页](index.md)
- [快速指南](guide/index.md)
- [Specification 索引](spec/README.md)
- [ADR 索引](adr/README.md)
- [插件开发](plugin-development.md)
- [视觉验证](project/2026-08-13-docs-redesign-verification.md)

全部仓库文档以简体中文撰写；代码、协议字段与标识符保持英文原样。
生成的侧边栏会随着 Specification 集合的增长保持目录树完整。
