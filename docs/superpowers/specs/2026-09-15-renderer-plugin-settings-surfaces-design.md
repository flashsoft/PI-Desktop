# 渲染进程插件设置界面设计

## 问题

`contributes.settingsDestinations` 目前在 Electron `WebContentsView`
中打开每个插件页面。在 Windows 和 Linux 上，这个子级原生界面总是
合成在主渲染进程之上，并带有不透明的后备画布。即使插件文档及其
CSS 是透明的，它也无法透出主渲染进程绘制的风景背景。结果就是
Nexus Scenic Themes 背后那个可见的黑色矩形。

这个矩形无法用插件主题 CSS 修正：它在文档的合成器之外。让
BrowserWindow 透明会危及原生调整大小、拖拽和 Windows/Linux 窗口
控件行为；在子视图内复制背景则会产生一个无法同步的第二画布。

## 决策

Settings 目的地将变为由渲染进程合成的沙箱化 iframe 界面。宿主渲染
进程在既有 Settings 布局中拥有它们的位置；插件只提供页面文件，并
通过宿主控制的消息桥接通信。

既有的原生 `PluginViewHost` 仍是工作面板视图的实现。它不用于
Settings 目的地。

## 资源模型

主进程将在 `app.whenReady()` 之前注册一个安全的标准
`plugin-settings:` 协议。URL 形如：

```
plugin-settings://<plugin-id>/<plugin-relative-entry-or-resource>
```

处理器只在以下全部条件成立时解析资源：

1. `<plugin-id>` 当前已加载，且拥有已授予的 `ui.settings` 权限。
2. 请求的路径保持在该插件的包内。
3. 该包声明了一个 Settings 目的地，其解析后的入口在同一个包内。
4. 资源扩展名属于宿主的静态页面格式（HTML、CSS、JavaScript、图片、
   字体或媒体），并有已知的 MIME 类型。

处理器以 `no-store`、`nosniff` 和宿主编写的 CSP 作答。CSP 只允许
同源的脚本 / 样式 / 图片 / 字体，加上声明的 `plugin-asset:` 图片；
它拒绝网络连接、被其他页面嵌套、object、worker、表单提交和导航。
即使 iframe 共享应用 BrowserWindow 的 Electron session，这也保持了
无网络出口的契约。

HTML 入口在插件脚本之前收到一个宿主编写的桥接脚本。它不会收到
Node、Electron、主渲染进程的 preload 桥接，也不会与宿主页面建立
同源关系。

## 桥接模型

嵌入页面收到与今天面板桥接公开形状相同的 `window.pluginBridge`：

```ts
window.pluginBridge.invoke(channel, payload?)
window.pluginBridge.on(event, handler)
```

桥接由注入的宿主脚本和 `postMessage` 实现，而不是 preload。宿主
React 组件只接受来自它自己的 iframe 窗口的消息，校验消息信封和
生成的请求 id，并通过一个新的主进程 IPC 端点转发调用。主进程校验
活动的插件 / 目的地，然后调用既有的
`PluginRuntime.invokePanelBridge`。因此，既有的固定通道、权限、审计
和插件身份检查仍然是权威。插件无法调用渲染进程 IPC、触碰
Settings React 树、选择另一个插件 / 目的地，或发送跨插件请求。

宿主外观和语言环境通过一条单向的初始桥接消息送达。既有的已批准
桥接事件（包括 `appearance:changed`）只转发给匹配的活动目的地。

## 生命周期与布局

`PluginSettingsDestination` 在既有 `.settings-content-inner` 流中渲染
单个 iframe。它没有原生边界 IPC，无法遮住标题栏、Windows/Linux
控件、调整大小边缘、侧边栏或 Settings 边栏。iframe 随它的常规
Settings 内容区域扩展；外层渲染进程保留滚动所有权和常规 Settings
几何。

核心导航、插件禁用 / 卸载 / 重载、入口缺失和加载失败会移除
iframe，并把用户带回 General。Settings 目的地不会创建、缓存或挂载
任何 `WebContentsView`。因此 Settings 页面与 `.app-scenic-backdrop`
保持在同一个渲染进程合成平面上。

## 安全与兼容性

- 每个 Settings iframe 都带 `sandbox`。它只包含 `allow-scripts`；
  刻意排除 `allow-same-origin`、弹窗、下载、顶层导航、表单和
  pointer-lock。
- 插件目的地页面保持包内本地。远程请求、动态资源 URL 和任意
  CSS/DOM 注入仍然不可用。
- 插件面板和工作面板视图保留其隔离的 `WebContentsView` 架构；其
  几何和桥接契约不变。
- 普通 Settings 和所有非插件主题保留其既有 DOM、布局、原生控件
  处理和样式。
- 宿主不会让 BrowserWindow 透明，也不会在插件界面上添加第二个
  风景背景。

## 验证

契约测试将证明协议注册与严格 CSP、沙箱化 iframe 所有权、不存在
Settings `WebContentsView` 调用、消息来源与目的地校验、生命周期
清理，以及受保护的原生几何。聚焦的构建 / 类型检查将伴随既有的
插件主题测试。手动验证将覆盖在每个风景主题激活时，在核心
Settings 与 Nexus Scenic Themes 之间切换，以及 Windows/Linux 上的
原生标题控件。
