# ADR 0226: 为 Composer 控件预留聊天宽度

- Status: Accepted
- Date: 2026-09-11
- Amends: [ADR 0151](0151-internal-work-panel-dock.md)
- Related: [07-ui-design-system §10](../spec/04-ux/07-ui-design-system.md) ·
  [08-component-spec §1 and §11](../spec/04-ux/08-component-spec.md) · E2E-168

## Context

侧边栏和流内工作面板都可以从 MainChat 分走 flex 空间。当剩余的聊天列
变得太窄时，浮动 composer 工具栏会挤压其本地化徽章或让其控件组换
行。与侧边坞的视觉重叠不是输入界面可以接受的回退。

## Decision

MainPane 及其聊天界面预留 515px 最小宽度。该预留属于聊天 flex 项，
因此侧边栏和工作面板的调整大小手势无法消耗或覆盖 composer 所需的空
间。

Composer 工具栏以 `flex-wrap: nowrap` 保持单行，其左右控件组是不可压
缩的 flex 项。模式和权限标签保持单行，并在其本地化文本超过可用标签
槽位时使用徽章内的省略号。

工作面板保持为流内的、渲染进程拥有的列，不请求正数的原生窗口预留；
本决策只改变 MainChat 在渲染进程外壳内保留的最小空间。

## Consequences

- 侧边栏和工作面板调整大小时，composer 控件行保持可读。
- 在受限的客户端宽度下，外壳可能需要比原生最小值更多的水平空间才能
  同时显示每个固定宽度列；composer 预留优先于 flex 压缩和重叠。
- 515px 最小值是 MainPane 布局的共享渲染进程/测试契约。

## Alternatives rejected

### 在窄于阈值时让工具栏换行

被拒绝，因为工具栏在侧边坞手势期间会变高，底部控件不再呈现为一个稳
定的动作行。

### 允许侧边坞与 composer 重叠

被拒绝，因为它隐藏输入动作，并造成指针/焦点歧义。

## References

- `apps/desktop/src/styles/chat-shell.css`
- `apps/desktop/src/styles/composer.css`
- `apps/desktop/src/lib/work-panel-resize.ts`
