# ADR 0013: 将设置导航整合为四个目标页

- 状态: 部分被 ADR 0026 取代
- 日期: 2026-07-26

## 背景

基线 0.4.0 在 D062–D065 中冻结了宽泛的、与 Codex 对齐的设置侧栏。
该目录包含 Personal、Integrations 和 Coding 分组，其中有独立的
Appearance 和 Providers 目标页以及大量占位行。已发布的本地优先
工作流需要更少的顶层选择，同时现有的整页外壳、内容卡片、provider
管理、会话导入和诊断功能必须保持可用。插件管理在主应用外壳中已有
专用目标页，不需要在设置中重复出现。

修改这些已冻结的视觉对齐决策需要明确的基线决策，而不是悄悄改写
历史行项。

## 决策

保留 D063/D070 的整页设置外壳、返回应用操作、搜索控件、侧栏度量、
内容卡片和主题行为。

将宽泛的分组目录替换为恰好四个目标页，顺序如下：

1. General
2. Configuration
3. Import sessions
4. About

Appearance 变为 General 内的一张卡片。Providers 变为 Configuration
内的一张卡片。两者都不再作为独立的侧栏目标页出现。不渲染任何
占位设置目标页。

Provider 设置的深层链接和内置命令指向 Configuration 内的 Providers
卡片。Import sessions 保留其专用设置目标页。插件管理保留在应用外壳
现有的 Plugins 目标页上，用户可以在那里加载、启用、禁用和卸载插件。

## 后果

- 设置侧栏更短，只包含已实现、有用的目标页。
- 主题控件仍可在 General 下发现。
- Provider 管理仍可从模型设置流程到达，不再占用额外的侧栏行。
- 插件管理仍可从应用外壳到达，无需在设置中重复。
- 整页外壳和已确立的浅色/深色视觉度量不变。
- spec 和 E2E 场景必须断言恰好四项的顺序和两个合并的区块。
- D090 取代 D062–D065 的导航/内容位置部分，包括其中 Plugins 的
  Settings/Integrations 位置，以及 D070 中 Account 专属的度量。

## 备选方案

### 保留宽泛的 Codex 目录

否决，因为空的和低价值的目标页会遮蔽已实现的本地工作流。

### 完全移除 Appearance 或 Providers

否决，因为主题选择和 provider 配置是必需的产品能力；整合在保留
它们的同时不再需要独立目标页。

## 参考

- `docs/spec/00-baseline.md`
- `docs/spec/04-ux/01-ui-ia.md`
- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D090)
