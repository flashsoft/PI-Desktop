# 示例插件

用于开发、规格说明和集成测试的示例插件。在把这些示例当作 API 参考
之前，先阅读[从零到一的插件开发指南](../../docs/plugin-development.md)。

## hello

覆盖以下内容的参考示例：

- `commands`
- `ui.panel`
- `agentTools`
- `skills`
- `settings`
- `themes`
- 常驻 `services`
- 插件间 `bus`
- `permissions`

相关 spec：

- `docs/spec/07-plugins/01-plugin-system.md`
- `docs/spec/07-plugins/02-plugin-manifest-schema.md`
- `docs/spec/07-plugins/03-plugin-api.md`
- `docs/spec/07-plugins/05-plugin-lifecycle.md`
- `docs/spec/07-plugins/09-plugin-command-palette.md`

面板外框（chrome）契约：

- 在每个平台上，PI-Desktop 只拥有一条透明的 46px 拖拽带，以及右上角
  最小的三按钮窗口控制胶囊。
- 普通文档流中的面板内容会自动偏移到该拖拽带下方。不要再添加额外的
  46px 顶部 padding。
- 如果面板添加了 fixed 或 sticky 的顶部 UI，将其锚定在
  `top: var(--pi-plugin-titlebar-height, 46px)`。该 UI 归插件所有，
  其交互控件应加上 `-webkit-app-region: no-drag`。

## 计划中的示例

- `panel-basic`
- `agent-tool-basic`
- `skill-pack`
- `marketplace-mock-publisher`

## 官方插件市场仓库

已发布的插件存放在 [`vastsa/pi-desktop-plugins`](https://github.com/vastsa/pi-desktop-plugins)。

此处的本地示例仍可用于开发加载（`Load dev plugin`）。
插件市场安装应来自该仓库的 `catalog.json` + `packages/*.piplug`。


## 实用模板

优先使用官方仓库模板：

- https://github.com/vastsa/pi-desktop-plugins/tree/main/plugins/demo.workspace-summary
- 贡献指南：https://github.com/vastsa/pi-desktop-plugins/blob/main/CONTRIBUTING.md
