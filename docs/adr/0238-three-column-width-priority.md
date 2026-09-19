# ADR 0238：在三栏 shell 中优先考虑 MainChat

- Status: Accepted (sidebar width clamp amended by [ADR 0290](0290-resizable-sidebar-collapse-threshold.md))
- Date: 2026-09-13
- Amends: [ADR 0226](0226-reserve-chat-width-for-composer-controls.md) ·
  [ADR 0151](0151-internal-work-panel-dock.md) ·
  [ADR 0033](0033-internal-dock-work-panel.md) — D167/ADR 0033/ADR 0151 中固定的
  `244..720px` 钳制被下方的实时预算取代
- Related: [ADR 0033](0033-internal-dock-work-panel.md) ·
  [ADR 0151](0151-internal-work-panel-dock.md) ·
  [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [07-ui-design-system §10](../spec/04-ux/07-ui-design-system.md) ·
  [08-component-spec §1 and §5](../spec/04-ux/08-component-spec.md) ·
  [09-interaction-patterns §8](../spec/04-ux/09-interaction-patterns.md) ·
  E2E-LAYOUT-three-column-width-priority

## 背景

渲染进程 shell 在固定客户区内有三个处于文档流中的列：展开的侧栏、
MainChat 和工作面板。ADR 0033 和 ADR 0151 使原生窗口边界不受面板影响，
但 shell 仍没有明确的宽度优先级。ADR 0226 的 515px 聊天预留和固定的
`244px–720px` 面板区间让指针拖拽调整、键盘调整、侧栏切换和窗口调整各自
遵循不同规则，而窄窗口可能把 MainChat 压到其下限，同时展开的侧栏仍保持
完整宽度。

## 决策

1. MainChat 有 `450px` 的硬性最小值，由 composer 工具栏展开行（加号按钮、
   模式和权限 chip、model/thinking chip、enhance 和 send 按钮）加上其
   边距推导得出。工作面板最大值是该下限和展开侧栏之后剩余的客户区宽度
   （`clientWidth - mainChatMinimum - expandedSidebarWidth`）；没有固定的
   像素上限，因此宽窗口会持续把宽度分配给面板，直到 MainChat 达到其下限。
   共享的渲染进程预算函数被指针预览、键盘调整、面板呈现、侧栏变化和
   shell 尺寸观察共同使用。
2. 当展开的侧栏会使 MainChat 触及 450px 下限时，渲染进程立即通过现有的
   已挂载 `sidebar-out` 动画收起侧栏。在该动画仍占据 flex 空间期间，共享
   预算继续计入侧栏，使 MainChat 保持在 450px 或以上。工作面板的首选宽度
   仍是用户持久化的目标值，因此侧栏让位后面板可以继续增长。
3. 手动重新打开侧栏优先消耗工作面板宽度。它在可能的情况下保留当前
   MainChat 宽度；如果会跌破 450px 下限，则以 `460px` 为目标。此重开路径
   可能持久化一个低于常规 `244px` 呈现最小值的正值紧凑面板宽度。
4. 自动侧栏收起只记忆到工作面板关闭为止。关闭面板会恢复由布局机制收起
   的侧栏。手动收起侧栏、手动重开以及随后再次手动收起会清除该记录。
5. 窗口本身保持固定。任何面板动作都不请求正值的原生预留：渲染进程将
   `window/setWorkPanelReservation` 保持为零，Main 将每个有效请求归一化为
   `{ requested: 0, reserved: 0 }`，不应用面板宽度或 x 偏移几何
   （ADR 0033 / ADR 0151）。受支持的窗口最小值保持 `1040×700`，它已经
   超过 `mainChatMinimum + panelMinimum`，因此在每个受支持的窗口尺寸下
   面板最小值都能满足。
6. 面板头部暴露一个预览（最大化）开关。预览模式开启时，MainChat 完全不
   渲染，面板占据侧栏旁的整个客户区（`clientWidth - expandedSidebarWidth`）；
   因此 450px 的 MainChat 下限在设计上被暂停，因为没有聊天列需要保护。
   退出预览模式会恢复先前的面板宽度，并保留用户最后选择的侧栏状态；该
   模式是瞬态的（绝不持久化，随面板结束），并且绝不改变原生边界。由于
   此模式下 MainChat 缺席，AppShell 提供一个窗口级 46px chrome 行，包含
   New Task、侧栏和原生窗口控件。收起侧栏的预览在左侧保留共享的
   `--ds-window-lead-inset`：窗口化 macOS 为 88px，全屏为 8px（D433）。
   命中区域修订（2026-09-16）：chrome 行及其 spacer 既不声明 drag 也不
   声明 no-drag，并在控件之外透传指针事件。面板头部是预览窗格内唯一的
   拖动所有者。其实际边框盒在两种侧栏状态下都排除左侧 shell-action 通道
   加 8px 间隙，包括展开侧栏的 New Task。除收起侧栏的窗口化 macOS（88px）
   外，所有平台使用 8px 左内缩。现有的右侧原生控件边界排除保持不变。
   头部高度的背景绘制填充被排除的通道，不叠加不透明控件覆盖层。原生
   指针点击和窗口拖动需要原生验证；渲染进程几何和 DOM/CDP 事件派发并不
   是原生命中测试的证明。

## 后果

- MainChat 不会被任何受支持的 shell 宽度变化压缩到 450px 以下；侧栏是
  让位的列。
- 受限窗口在当前布局中显示更窄的工作面板，而持久化的首选宽度在空间恢复
  时仍然可用。
- composer 工具栏现在处理 450px 到其舒适布局之间的宽度，而不再依赖
  515px 预留，因此其控件组在低于该宽度时会省略或重排。
- 不改变宿主协议、SQLite schema、插件契约、安全边界或原生窗口几何。

## 被拒绝的替代方案

### 保留 ADR 0226 的 515px 聊天预留

被拒绝，因为它让侧 dock 优先级保持隐式，并且无法在自动侧栏让位行为下
满足 450px 硬下限——而正是该行为使 MainChat 在固定窗口中保持可用。

### 让侧栏连续调整以保留每一列

被拒绝，因为在此交互中侧栏仍是离散的展开/收起列。其用户选择的首选宽度
不会被窗口压力悄悄改变。

### 将已提交的面板宽度镜像到原生窗口边界

被拒绝，因为扩展应用窗口正是 ADR 0033 和 ADR 0151 移除的对外行为。窗口
最小值已经保证 `mainChatMinimum + panelMinimum`，因此预算总是可以满足，
无需触碰原生边界。

## 参考

- `apps/desktop/src/lib/work-panel-resize.ts`
- `apps/desktop/src/components/workpanel/WorkPanel.tsx`
- `apps/desktop/src/features/app/useAppShellRuntime.tsx`
- `apps/desktop/src/features/app/AppShell.tsx`
- `apps/desktop/src/styles/chat-shell.css`
