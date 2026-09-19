# ADR 0033: 内部停靠工作面板（不做原生窗口扩展）

- 状态: 被 ADR 0122 取代；内部停靠方向由 ADR 0151 恢复
- 日期: 2026-07-30
- 相关: [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [08-component-spec §5](../spec/04-ux/08-component-spec.md) ·
  [09-interaction-patterns §8](../spec/04-ux/09-interaction-patterns.md) ·
  [01-ipc-protocol](../spec/03-runtime/01-ipc-protocol.md) · 决策 D163
- 部分取代: ADR 0032

## 背景

ADR 0032 把工作面板做成了停靠的 flex 列，但为了保持聊天宽度稳定，
预留了等于面板已提交宽度的*原生窗口宽度*。主进程把 OS 窗口（在显示
工作区内）扩大该宽度，并把原生浏览器 `WebContentsView` 放置在扩展
区域内。用户可见的结果是打开面板会**放大整个应用窗口**——读起来像
面板"向外单独扩张"，而不是在现有窗口内占用空间。

ChatGPT 和 WorkBuddy 保持窗口固定，让侧面板从客户区内部取得空间，
把会话推向左边。这正是所要求的行为。

调查表明窗口扩展只是一种*腾地方*的机制：

- 原先的交互式终端标签页不使用原生视图；ADR 0108 完全移除了该界面。
- 原生 `WebContentsView`（宿主浏览器 guest 和插件视图）通过
  `setBounds` 从**渲染进程实测的**面板矩形定位（见
  `BrowserPane.setBounds` 和 `PluginViewTab`）。该视图合成在渲染
  进程内容之上，所以必须告诉它放在哪里——但该矩形是在面板视觉上
  所在的任何位置实测的，与窗口是否扩大无关。

因此原生宽度预留对正确性不是必需的：如果面板成为*固定*窗口的一个
流内列，实测矩形已经落在窗口内，浏览器视图无需任何窗口扩展就会
跟随它。

## 决策

1. 工作面板是**固定**客户区内的一个固定宽度流内 flex 列。打开它
   会把 `MainChat` 向左重排；它绝不扩大 OS 窗口。
2. 渲染进程始终请求原生预留宽度 `0`
   （`api.setWorkPanelReservation(0)`）。主进程不再为面板改变窗口
   边界。`window/setWorkPanelReservation` IPC 作为稳定的接缝保留；
   主进程返回空预留（`{ requested: 0, reserved: 0 }`）。
3. 原生浏览器 `WebContentsView` 继续通过 `browserSetBounds` 从渲染
   进程实测的面板矩形定位。它正确就位不需要任何窗口扩展。
4. 默认已提交宽度为 **420px**（既定基线），在不变的 `364..720px`
   钳制范围内。*（已被决策 D167 取代：默认值为 280px，钳制范围为
   `244..720px`；此处其余各条款均有效。）*
   *（经 ADR 0238 修订：`244..720px` 钳制成为生效的三列预算——
   最小 244px，无固定最大值，MainChat 下限 360px。）*
5. 原生窗口边缘调整大小只改变 `MainChat`，现在通过普通的重排实现
   （面板在内部并保持其已提交宽度）。

## 后果

- OS 窗口尺寸在打开 / 折叠 / 分隔条提交之间保持稳定；只有
  `MainChat` 重排。这与 ChatGPT / WorkBuddy 一致。
- 在小窗口上，当面板以较宽宽度打开时，`MainChat` 可能被压到其
  360px 可读性目标以下——这与 ChatGPT 接受的权衡相同，在此也可以
  接受。
- 几何逻辑更简单：预留机制被保留但处于惰性，因此渲染进程→主进程
  IPC 接口面及其测试保持有效。
- 持久化的 normal 边界已经排除预留宽度；预留始终为 `0` 时它们就
  是用户的窗口尺寸，这正是期望的重启行为。
- 退出动画和原生视图退出前分离逻辑不变。

## 备选方案

### 保留 ADR 0032（预留原生宽度，扩展窗口）

否决：为给面板腾地方而扩展整个窗口正是用户想要移除的"向外单独
扩张"行为。它也让面板感觉与窗口内布局脱节。

### 用独立的覆盖窗口裁剪原生视图

否决：相比实测流内矩形没有收益，却增加了第二个窗口、焦点/遮挡
复杂性和另一种失败模式。

## 参考

- `docs/adr/0032-reserve-native-width-for-the-docked-work-panel.md`
  （被部分取代）
- `apps/desktop/src/App.tsx`（预留目标设为 `0`）
- `apps/desktop/src/lib/work-panel-resize.ts`（`WORK_PANEL_DEFAULT_WIDTH`）
- `apps/desktop/src/components/workpanel/PluginViewTab.tsx`（从实测矩形
  调用 `pluginViewSetBounds`）
- `apps/desktop/electron/main/browser-view.ts`（`BrowserPane.setBounds`）
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-056)
- `docs/spec/08-meta/decisions-log.md` (D163)
