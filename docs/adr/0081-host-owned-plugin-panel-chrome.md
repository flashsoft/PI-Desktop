# ADR 0081: 宿主拥有的跨平台插件面板外框

- Status: Accepted
- Date: 2026-08-13
- Deciders: PI-Desktop core
- Related: D118, D129, D218, ADR 0021, ADR 0025

## 背景

插件面板运行在独立的沙箱 `BrowserWindow` 实例中，加载插件自己的
HTML。这些窗口此前使用 Electron 默认边框，因此其标题栏与
PI-Desktop 主窗口不一致，且在 macOS、Windows 和 Linux 之间存在
实质性差异。

面板页面不能被信任以使用主渲染进程 preload 或任意的窗口控制桥
接。宿主外框也不得依赖插件 CSS，而现有插件布局需要从新标题栏下
方开始，同时不丢失原有的顶部内边距。

## 决策

1. 插件面板采用与主窗口相同的平台分流：macOS 使用 `hiddenInset`，
   红绿灯按钮位于 `{x:16,y:16}`；Windows 和 Linux 使用无边框窗口，
   由渲染进程绘制控件。
2. 现有的沙箱插件面板 preload 在闭合 Shadow DOM 中安装一个宿主
   拥有的 46px 标题栏。它渲染 manifest 中的面板标题，并在插件
   body 计算出的顶部内边距之外再偏移 46px。它还发布
   `--pi-plugin-titlebar-height: 46px`，供必须位于宿主外框下方的
   fixed/sticky 插件 UI 使用。
3. Windows/Linux 通过一个 Electron 本地固定动作元组暴露最小化、
   最大化/还原和关闭。Electron Main 仅在发送者属于一个存活的插件
   面板时才接受该动作，并且只把最大化状态发布回该面板。
4. 公开的 `window.pluginBridge` 接口不新增窗口原语。现有的按插件
   会话分区、沙箱、上下文隔离以及经权限检查的面板桥接保持不变。
5. 控件带有本地化的无障碍名称、可见的键盘焦点、随主题变化的
   浅色/深色表面以及减弱动态效果行为。重新打开已最小化的面板会
   还原并聚焦现有窗口。
6. 开发中的面板会收到仅供宿主显示的 46px 安全区标题栏提醒。已安
   装的面板不显示此编写提示。

## 后果

- 插件面板在三个发布平台上都与主应用外框视觉对齐，且未授予插件
  更广泛的 Electron 访问能力。
- 插件 CSS 无法为闭合的标题栏树设置样式，尽管插件仍可替换自己的
  文档，从而移除 preload 注入的视觉元素。这不会授予任何能力，也
  不跨越面板沙箱。
- 宿主在插件内容上方保留 46px。刻意将视口固定内容钉在 `top: 0`
  的面板必须使用注入的 `--pi-plugin-titlebar-height` 变量来考虑
  标题栏。
- 私有窗口控制通道仍位于 host-core 协议 v9 之外。

## 替代方案

### 保留 Electron 默认面板边框

被拒绝，因为它保留了不一致的产品外框，并使 Windows/Linux 面板在
视觉上与主应用脱节。

### 将主窗口控制 API 暴露给插件 JavaScript

被拒绝，因为插件桥接应保持限于已声明的插件能力，不得获得通用的
原生窗口权限。

### 在主渲染进程 DOM 中托管插件内容

被拒绝，因为这会为了一个纯视觉改动削弱现有的独立窗口、独立分区
隔离模型。

## 参考

- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-024D)
- `docs/spec/07-plugins/01-plugin-system.md`
- `docs/spec/07-plugins/04-plugin-security.md`
