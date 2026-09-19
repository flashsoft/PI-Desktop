# ADR 0220: 保持 Windows 工作面板界面元素用途单一

- Status: Accepted
- Date: 2026-09-11
- Deciders: PI-Desktop desktop UI maintainers
- Amends: D154, D357, ADR 0195
- Related: [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [07-ui-design-system](../spec/04-ux/07-ui-design-system.md) ·
  [08-component-spec](../spec/04-ux/08-component-spec.md) ·
  [09-interaction-patterns](../spec/04-ux/09-interaction-patterns.md) ·
  E2E-067

## Context

在 Windows 上，打开的工作面板标题栏把活动资源的关闭按钮放在视口固定
的面板开关和原生最小化/最大化/关闭按钮簇旁边。在窄宽度下，两个关闭
图标读起来像重复的右上角动作，标题栏变得难以扫读。

## Decision

1. 打开的工作面板标题栏暴露一个紧凑的资源切换器。关闭资源由其现有
   的统一上下文菜单行负责，这使关闭动作紧邻它所影响的资源，而不在
   窗口界面元素上再增加一个 `X`。
2. 视口固定的工作面板开关仍然是唯一的面板级折叠控件。Windows/Linux
   原生窗口控件保留在其固定的右边缘带中。
3. Subagent 详情使用返回箭头回到资源列表，因此它的导航动作在视觉上
   与资源关闭和原生窗口关闭都有区分。
4. 该变更仅限渲染进程的呈现和交互。它不改变面板状态所有权、资源生
   命周期、窗口几何、IPC、协议或存储。

## Consequences

- Windows 右上角行有一个清晰的窗口关闭动作和一个分离的面板开关。
- 资源关闭仍然可以通过键盘可操作的统一菜单使用，且不再可能被误认
  为关闭应用程序。
- 标题栏放弃了一个直接点击的关闭入口，换来一个稳定、不那么拥挤的
  动作簇。

## Alternatives considered

- **保留标题栏资源 `X` 并缩小原生控件：** 被拒绝；原生窗口控件必须
  保持平台尺寸的点击目标。
- **再添加一个面板专属的关闭或折叠图标：** 被拒绝；D357 和
  ADR 0195 让视口固定的开关成为唯一的面板级折叠控件。
