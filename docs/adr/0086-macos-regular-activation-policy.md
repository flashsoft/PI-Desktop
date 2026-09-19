# ADR 0086: 保持 macOS 使用 regular 激活策略

- Status: Accepted
- Date: 2026-08-14
- Deciders: PI-Desktop core
- Related: D223, E2E-127, ADR 0072, ADR 0078, ADR 0080

## 背景

全局插件启动器（ADR 0072）是一个无边框、置顶的面板，应当出现在
用户正在做的任何事情之上，因此其窗口向 Electron 请求了
`setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })`。在
macOS 上，该选项不是按窗口的标志：Electron 通过对整个进程调用
`TransformProcessType(kProcessTransformToUIElementApplication)` 来实
现它，因为 macOS 10.14 及以后只允许 accessory 应用把窗口浮在另一
个应用的全屏 Space 之上。于是该进程变成了 UIElement 应用，
PI-Desktop 从 Dock 和 Cmd+Tab 中消失了。

随后 ADR 0080 将启动器创建移入启动预热，因此即使启动器从未被打
开，该转换也会在每次启动时执行。窗口本身仍在屏幕上，这使症状看
起来像是窗口管理器的 bug，而不是激活策略的变化。

最小化会把主窗口隐藏到托盘（ADR 0078），而 macOS 只从
`applicationShouldHandleReopen:` ——即 Dock 点击或重新启动——发出
Electron 的 `activate` 事件。Cmd+Tab 和 App Exposé 不会触达它，因
此即使应用重新被列出，被托盘隐藏的窗口也没有键盘路径可以回来。

## 决策

1. PI-Desktop 在其整个生命周期内都是一个 regular（前台）macOS 应
   用。任何代码路径都不得转换进程类型：启动器传入
   `skipTransformProcessType: true`，且 `app.dock.hide()` 和
   `app.setActivationPolicy` 不得进入主进程。Dock 和 Cmd+Tab 中的
   存在性是一条不变量，而不是某个窗口选项的副作用。
2. 启动器保留其 collection behavior：它加入每个常规 Space，并浮在
   PI-Desktop 自己的全屏窗口之上。它不覆盖其他应用的全屏 Space；
   macOS 将该能力保留给 accessory 应用，而在那种情况下激活会切换
   Space。
3. macOS 激活通过 `did-become-active` 以及 `activate` 还原外壳，前
   提是应用已启动、未在退出且没有可见窗口。Cmd+Tab 和 App Exposé
   可以把被托盘隐藏的窗口带回来，而显示启动器或插件面板不会把主
   窗口一起带到前面。
4. 测试断言启动器的调用形态和激活处理器，使未来的窗口选项无法再
   悄悄把应用变回 accessory。

## 后果

- 应用始终可以从 Dock、Cmd+Tab、App Exposé 和托盘到达。
- 启动器无法覆盖其他应用的全屏 Space。从那样的 Space 调用它会激
  活 PI-Desktop 并切换 Space，这是普通前台应用的行为。
- 面板焦点不变：在两种策略下，`show()` 都会激活应用并使面板成为
  key window，因此 ADR 0080 的延迟优化工作不受影响。

## 替代方案

- 在每次显示启动器前后切换策略（之前 `app.dock.hide()`，之后
  `app.dock.show()`）。它能恢复全屏覆盖，但每次调用都会让 Dock 图
  标闪烁，给 ADR 0080 优化过的路径增加工作，保留一个 Cmd+Tab 看
  不到应用的窗口，并且一旦某次恢复被遗漏，应用就会永久处于
  accessory 状态。
- 完全去掉 `visibleOnFullScreen`。同样能修复 Dock 问题，但启动器也
  将不再覆盖 PI-Desktop 自己的全屏窗口，毫无收益。
- 将 PI-Desktop 作为 `LSUIElement` 托盘应用发布。这与 ADR 0078 的
  常驻主窗口以及产品的主窗口形态相矛盾。覆盖其他应用的全屏
  Space 需要一个独立的 accessory 辅助进程，而不是在拥有主窗口的
  应用中做进程级转换。
