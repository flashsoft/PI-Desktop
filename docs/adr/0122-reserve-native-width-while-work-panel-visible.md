# ADR 0122: 工作面板可见时保留原生宽度

- Status: Superseded by ADR 0151
- Date: 2026-08-25
- Related: [01-ui-ia](../spec/04-ux/01-ui-ia.md) ·
  [08-component-spec §5](../spec/04-ux/08-component-spec.md) ·
  [09-interaction-patterns §8](../spec/04-ux/09-interaction-patterns.md) ·
  [01-ipc-protocol](../spec/03-runtime/01-ipc-protocol.md) · decision D255
- Supersedes: ADR 0033; restores the native-reservation behavior from ADR 0032

## 背景

工作面板作为流内 flex 兄弟元素被正确渲染，但渲染进程开始对每种
状态都请求 `0` 的原生保留宽度。因此当面板折叠时，Electron 窗口
停留在更大的尺寸上，主聊天窗格扩张进被释放的面板列。这使应用的
右边缘保持固定，而不是回到纯聊天窗口的边界。

目标交互是：面板停靠时聊天宽度保持稳定——当显示工作区允许时，
窗口增宽以腾出空间；折叠路径对称地把窗口恢复到打开面板之前的
边界。

## 决策

1. 工作面板在渲染进程中保持为固定宽度的流内 flex 列。
2. 在展示打开的面板之前，通过 `window/setWorkPanelReservation` 请求
   等于其已提交宽度的原生保留。
3. 面板在退出动画期间保持挂载，然后请求保留宽度 `0`，仅在请求成功
   后才卸载。这使折叠能从原生窗口释放面板宽度，而不会出现中间的
   呈现跳动。
4. 继续根据渲染进程测量的面板矩形来定位原生 Browser
   `WebContentsView`；原生保留只为流内面板腾出空间，并不持有其内容
   几何。
5. 保留既有的目标状态、感知显示区域的保留行为：当工作区受限时
   Main 会限制增加的宽度，逆转任何由保留引起的 x 偏移，并让原生
   边缘调整大小仍归 Main 持有。

## 后果

- 只要显示器能提供已提交的保留宽度，面板打开期间会话宽度保持稳定。
- 折叠或关闭面板会把应用缩回其基础边界，而不是让聊天吃掉释放出的
  面板宽度。
- 在受限显示器上，面板保持固定，聊天只吸收无法避免的保留缺口。
- 既有的渲染进程到 Main 的 IPC 接缝、幂等几何规划器和退出动画生命
  周期继续使用。
- 临时的可见面板保留从持久化的启动边界中移除，因此重新启动仍以
  用户的纯聊天窗口尺寸开始。

## 备选方案

### 保留 ADR 0033 的固定窗口内部停靠

否决，因为折叠面板会让应用窗口比用户打开面板前的边界更宽，并导致
聊天扩张进面板的空间。

### 面板以覆盖层呈现、不分配 flex 空间

否决，因为面板会覆盖聊天内容，并丢失既有的键盘、调整大小和原生
Browser 几何契约。

## 参考

- `docs/adr/0033-internal-dock-work-panel.md`
- `apps/desktop/src/App.tsx`
- `apps/desktop/electron/main/work-panel-window.ts`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-056)
- `docs/spec/08-meta/decisions-log.md` (D255)
