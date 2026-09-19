# ADR 0019: 工作面板子系统（内嵌浏览器、git 审查、文件浏览）

- 状态: 部分被 ADR 0108 和 ADR 0170 取代
- 日期: 2026-07-26
- 决策者: PI-Desktop 维护者
- 相关: [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [08-component-spec §5](../spec/04-ux/08-component-spec.md) ·
  [01-ipc-protocol §13a](../spec/03-runtime/01-ipc-protocol.md) ·
  [ADR 0108](0108-remove-built-in-interactive-terminal.md) ·
  [ADR 0170](0170-work-panel-browser-as-bundled-plugin.md)

## 背景

工作面板最初作为一个停靠界面引入，用于 workspace 审查、内嵌浏览器
预览、文件浏览和交互式 shell。每个界面都需要一个宿主拥有的边界，
因为沙箱化的渲染进程无法安全地自行执行 workspace 或窗口操作。

## 决策

保留的工作面板子系统是：

1. **浏览器。** Chrome 和 agent CDP 以内置插件 `pi.browser` 发布
   （ADR 0170）。Electron 主进程仍拥有 guest `WebContentsView`、
   导航策略、权限拒绝、外部弹出窗口处理和实测边界钳制。
2. **审查。** 消息拥有的审查快照和受保护的回滚仍是宿主集成的界面，
   由成功的 workspace Write/Edit artifacts 打开。
3. **文件。** 项目浏览由内置的 `pi.files` 插件通过公共的
   contributed-view 和文件系统 API 提供。
4. **Transcript 资源。** 文件和 URL artifacts 仍是由会话打开的
   会话作用域标签页，而不是通用启动器。

原先的交互式终端子系统不属于当前产品。其移除——包括桌面 IPC 和
打包清理——由 ADR 0108 定义。Agent Bash 是一个独立的非交互式
agent 工具，不是工作面板子系统。

## 后果

- 渲染进程保持沙箱化，原生 Browser/插件界面继续使用现有的实测
  边界和可见性规则。
- 审查和文件 artifacts 保留会话所有权，而项目浏览使用内置的
  Files 插件。
- 交互式 shell 访问由外部终端提供，而不是由 PI-Desktop 工作面板
  标签页提供。

## 考虑过的备选方案

- 把每个面板界面都做成 agent 工具被否决，因为用户驱动的浏览和
  审查会继承 agent 的权限、截断和审计语义。
- 给内置插件私有宿主能力被否决，因为这会绕过公共插件边界。
- 保留原先的交互式 shell 被 ADR 0108 否决，以移除其独立的原生
  和生命周期界面。
