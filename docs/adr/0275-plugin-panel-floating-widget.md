# ADR 0275：插件面板的浮动 widget 放置

- Status: Accepted for implementation
- Date: 2026-09-17
- Deciders: PI-Desktop core
- Related: [ADR 0081](0081-host-owned-plugin-panel-chrome.md) ·
  [ADR 0092](0092-plugin-owned-panel-surface.md) ·
  [ADR 0093](0093-plugin-panel-strict-drag-band.md) ·
  [ADR 0110](0110-plugin-panel-chrome-spacing-contract.md) ·
  [07-plugins/03-plugin-api](../spec/07-plugins/03-plugin-api.md)

## 背景

每个插件面板都是一个无边框 `BrowserWindow`，保留 46px 宿主拖动带，并在
其右上角携带一个三控件胶囊（ADR 0092、ADR 0093、ADR 0110）。这种语法
适合显示内容的面板，不适合整个界面是一个小圆形伴侣的插件——语音球、
计时器、状态灯。

这样的插件今天无法存在。宿主绘制不透明背景，强制 360×280 最小值，并
在页面顶部绘制胶囊。作者得到的是一个带工具条的矩形，而不是浮动球体；
使面板 chrome 工作的透明条带，在一个根本不是矩形的形状周围读作接缝。
Electron 已经可以托管透明窗口，而插件界面本身——preload bridge、
session 分区、权限闸门、出口策略——无需改变即可允许它。

## 决策

1. Manifest 可以声明 `"ui": { "shape": "widget" }`。`"panel"` 保持默认；
   缺席或 `"panel"` 值保持今天的行为不变。
2. Widget 窗口是 `transparent: true`，具有完全透明的
   `backgroundColor`、`hasShadow: false`、`frame: false`、
   `maximizable: false`、`fullscreenable: false` 和 `skipTaskbar: true`。
   插件绘制自己的轮廓、阴影和光晕。
3. Widget 没有 46px 带，也没有胶囊。Preload 发布
   `--pi-plugin-titlebar-height: 0px`，绝不应用旧的增量偏移，而是在整
   个窗口上安装拖动映射：空白处拖动，而标准控件和每个标记
   `data-pi-plugin-no-drag` 的元素保持可点击。其机制是 ADR 0093 的绘穿
   段映射，应用到整个矩形。
4. 胶囊是面板唯一的关闭手段（ADR 0093 §4），因此宿主在 widget 界面自
   己的上下文菜单之后拥有等效菜单：关闭、最小化和置顶开关。它作为一
   个新的 `contextMenu` 动作沿现有的发送方校验窗口控制通道传输，因此
   `window.pluginBridge` 仍不获得任何窗口原语。
5. `ui.width` / `ui.height` 对 widget 尊重到 120×120（面板的最小值保
   持 360×280）。`ui.alwaysOnTop` 默认 `false`；`ui.resizable` 对
   widget 默认 `false`，对面板默认 `true`。
6. Preload 在页面脚本运行之前，把放置发布为
   `document.documentElement.dataset.piPluginPanelShape`（`panel` |
   `widget` | `view`），因此一个 HTML 入口无需 bridge 往返即可服务每
   种放置。
7. 插件界面的其余部分不变：相同的 preload、相同的 `pluginBridge` 通
   道、相同的权限闸门、相同的按插件 session 分区、相同的出口策略、相
   同的本地化规则。Widget 不需要新权限。
8. `manifest.ui.shape`、`ui.alwaysOnTop` 和 `ui.resizable` 由 Plugin SDK
   在安装时校验，携带在共享 manifest 类型中，并由 host-core 的
   `PluginUiMeta` 解析，因此 Rust 目录和 TypeScript 宿主对契约达成一
   致。

## 后果

- 插件可以是浮动球：透明、小巧、在它请求时置顶、可从其空白处拖动，
  并且即使插件从未绘制关闭按钮，也能从宿主菜单关闭。
- 46px 带、胶囊和 v2 间距契约对面板和 docked 视图保持原样；现有插件
  和已安装的包不受影响。
- 放置是按插件的 manifest 选择，不是按页面的：同一 HTML 入口可以通过
  读取发布的放置和标题栏变量，服务面板、widget 和 docked 视图。
- Widget 界面多了一条要记录的指针规则：必须接收点击的元素要么是标准
  控件，要么携带 `data-pi-plugin-no-drag`；其他一切都拖动窗口。
