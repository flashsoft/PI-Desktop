# ADR 0151: 工作面板保持在固定的应用窗口内部

- Status: Accepted
- Date: 2026-09-03
- Related: [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [08-component-spec §5](../spec/04-ux/08-component-spec.md) ·
  [09-interaction-patterns §8](../spec/04-ux/09-interaction-patterns.md) ·
  [01-ipc-protocol](../spec/03-runtime/01-ipc-protocol.md) · E2E-056 · E2E-167
- Supersedes: ADR 0122 and the work-panel boundary clauses of ADR 0146
- Restores the internal-dock direction from ADR 0033

## 背景

工作面板已经作为流内 flex 兄弟元素渲染，但 ADR 0122 让渲染进程
请求匹配的原生保留。因此每当面板打开或折叠时，Electron 都会增宽
然后再缩小整个应用窗口。面板应该表现得像左侧边栏：其宽度取自既有
的客户区，MainChat 在它旁边重排。

原生 Browser `WebContentsView` 不需要更大的窗口。它根据渲染进程
测量的面板矩形定位，该矩形在面板位于既有客户区内部时仍然有效。

## 决策

1. 工作面板保持为固定宽度的右侧流内 flex 列。打开和折叠在零与已
   提交的 `244..720px` 宽度之间动画其 flex 分配，不改变原生
   BrowserWindow 边界。*（由 ADR 0238 修订：已提交宽度由实时的三列
   预算约束，而不是固定的 `244..720px` 范围，且展开的侧边栏在
   MainChat 到达其 360px 下限会让出空间；此处其他条款均保留。）*
2. 渲染进程把 `window/setWorkPanelReservation` 接缝保持为零。Main
   把每个有效请求归一化为 `{ requested: 0, reserved: 0 }`，从不应用
   面板宽度或 x 偏移几何。
3. 面板的内左边缘分隔条由渲染进程持有。向左移动使面板长入
   MainChat 的内部空间；向右移动把空间还给 MainChat。指针预览按帧
   合并，释放时提交偏好宽度，Escape/取消/失去捕获恢复按下时的宽度。
4. 原生窗口边缘和角落继续调整应用窗口大小，但绝不调整或保留工作
   面板。偏好的面板宽度保持渲染进程本地，并独立于原生窗口边界
   持久化。
5. Browser 视图继续使用渲染进程测量的面板矩形，并在面板退出动画
   之前分离，因为原生视图无法跟随渲染进程 CSS 动画。

## 后果

- 打开和折叠不再移动窗口边缘或改变用户的应用边界；面板像左侧边栏
  一样可见地占据内部空间。
- MainChat 的最小宽度权衡由 ADR 0226 修订：即使固定的客户区无法
  让每个侧边停靠都以偏好宽度显示，渲染进程也为 Composer 保留
  515px 的聊天保留。
- 原生保留和聊天宽度 IPC 形态保留为兼容性接缝，但当前渲染进程不
  把它们用于面板呈现或调整大小。
- 原生窗口边界持久化不再需要移除临时的面板几何。

## 被否决的替代方案

### 保留 ADR 0122 的原生保留

否决，因为扩张整个应用窗口正是本次改动要移除的外在行为。

### 面板以覆盖层呈现、不分配 flex 空间

否决，因为这会覆盖聊天内容，并破坏已测量的 Browser 表面、键盘
顺序和连续重排。

## 参考

- `docs/adr/0033-internal-dock-work-panel.md`
- `docs/adr/0122-reserve-native-width-while-work-panel-visible.md`
- `docs/adr/0146-separate-work-panel-and-chat-resize-ownership.md`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/components/workpanel/WorkPanel.tsx`
- `apps/desktop/electron/main/index.ts`
