# PI-Desktop 插件开发：从零到一

本指南是从一个空文件夹到一个经过测试的 `.piplug` 安装包的最短完整
路径。它描述 PI-Desktop 当前发布的插件运行时。当本指南与
specification 不一致时，以 [`docs/spec/07-plugins`](spec/07-plugins/README.md)
下的文件为规范契约。

## 1. 插件能添加什么

一个插件可以贡献以下一种或多种能力：

| 能力 | 用途 | 主要构件 |
|---|---|---|
| 命令 | 全局搜索中的一个显式动作 | `contributes.commands`、`pi.commands.register` |
| 面板 | 一个小型隔离 HTML 界面 | `ui.panel`、`ui.panel` 权限、`window.pluginBridge` |
| 悬浮挂件 | 透明、无边框的伴生窗口——圆形 orb，而不是矩形 | `ui.panel` 权限、`"ui": { "shape": "widget" }`、`window.pluginBridge` |
| 工作面板视图 | 停靠在应用右侧工作面板中的界面 | `contributes.views`、`ui.view` 权限、`window.pluginBridge` |
| Agent 工具 | Agent 可以调用的函数 | `contributes.agentTools`、`pi.agent.registerTool` |
| 一次性补全 | 针对用户模型的宿主补全 | `pi.models.list`、`pi.session.getLlmContext`、`pi.agent.complete` |
| Skill | Agent 按需加载的指令 | `contributes.skills`、`agent.prompt.inject` 权限 |
| 主题 | 设计 token 覆盖 | `contributes.themes`、`ui.theme` 权限 |
| MCP 服务器 | 从本地或远程 MCP 服务器发现的工具 | `contributes.mcpServers`、MCP 权限 |
| 服务 | 由宿主监督的常驻工作 | `contributes.services`、`background.service` 权限 |
| 消息总线 | 插件之间按约定类型化的事件 | `contributes.bus`、bus 权限 |

插件入口代码运行在专用 Node 进程中。面板运行在沙箱化、上下文隔离、
无 Node 集成的 Electron 窗口中。两个界面的调用都要经过宿主拥有的
权限网关。

> **信任边界：**权限模型管的是 `pi.*` 宿主 API 和面板桥接。它还不是
> 针对插件入口进程直接使用原始 Node API 的操作系统级沙箱。只在你
> 信任来源时才加载开发插件和第三方安装包，并优先使用宿主 API 而不是
> 直接的 Node 文件或网络访问。见[安全 specification](spec/07-plugins/04-plugin-security.md)。

## 2. 前置条件

走推荐的应用优先路径，你需要：

- 一个可运行的 PI-Desktop 构建；
- 一个用于插件的空文件夹；以及
- 一个文本编辑器。
- 要导入带 npm 依赖的 pi 扩展目录，`PATH` 上必须有系统 `npm` 可执行文件。发布构建不附带独立的 Node/npm；没有它，PI-Desktop 会报告警告，且被导入的依赖无法加载。

走仓库 CLI 路径，你还需要 Node.js 22.19 或更新、pnpm 10 或更新，
以及本仓库的一份检出。devkit 和 SDK 目前是私有工作区包，因此不要
假设在本仓库之外 `npm install @pi-desktop/plugin-devkit` 可用。

## 3. 创建第一个插件

### 方案 A：在 PI-Desktop 中创建

1. 打开 **Plugins**（Extensions 页面）。
2. 打开头部溢出菜单，选择 **New plugin from template**。
3. 选择 `panel-basic`。
4. 选择一个空文件夹。

PI-Desktop 会写入起始文件，把该文件夹作为开发插件加载，并把它打开
为当前项目。插件立即生效。

四个内置模板是：

| 模板 | 初始内容 | 权限 |
|---|---|---|
| `panel-basic` | 命令和 HTML 面板 | `ui.panel` |
| `agent-tool-basic` | Agent 可调用的 echo 工具 | `agent.tool.register` |
| `skill-pack` | 一份 skill 文档 | `agent.prompt.inject` |
| `full-demo` | 命令、面板、工具、skill 和设置 | 这些功能所用的权限 |

脚手架拒绝非空目标目录，因此不会静默覆盖已有项目。

### 方案 B：用仓库 CLI 创建

从 PI-Desktop 仓库根目录：

```bash
pnpm install
pnpm --filter @pi-desktop/plugin-devkit... build
pnpm pi-plugin init panel-basic ../my-first-plugin \
  --id local.my-first-plugin \
  --name "My First Plugin"
```

然后打开 PI-Desktop，进入 **Plugins**，选择 **Load development plugin**，
并选择 `../my-first-plugin`。

发布的插件使用反向域名 id，例如 `com.example.workspace-summary`。
`local.` 前缀是私有插件的实用约定。保持 id 稳定：设置、数据、授权、
更新和包名都以它为键。

## 4. 理解生成的文件

`panel-basic` 模板产出：

```text
my-first-plugin/
├── manifest.json
├── main.js
├── README.md
└── renderer/
    └── index.html
```

- `manifest.json` 声明身份、入口点、贡献点和请求的权限。
- `main.js` 在插件进程中运行，导出生命周期钩子。
- `renderer/index.html` 在隔离的面板窗口中运行。
- `README.md` 说明如何开发和打包这个具体的插件。

分发包必须包含可直接执行的 JavaScript、HTML、CSS 和资产。PI-Desktop
加载插件时不会安装依赖，也不会编译 TypeScript。如果你使用
TypeScript 或第三方包，在检查和打包之前把它们 bundle 或编译进插件
目录。

## 5. 手工构建最小插件

下面三个文件展示完整的「命令到面板」路径。

### `manifest.json`

```json
{
  "schemaVersion": 1,
  "id": "local.my-first-plugin",
  "name": "My First Plugin",
  "version": "0.1.0",
  "description": "Opens a panel and shows a greeting.",
  "main": "main.js",
  "ui": {
    "panel": "renderer/index.html",
    "title": "My First Plugin",
    "width": 480,
    "height": 360
  },
  "contributes": {
    "commands": [
      {
        "id": "my-first-plugin.open",
        "title": "My First Plugin: Open Panel",
        "keywords": ["hello", "panel"]
      }
    ]
  },
  "permissions": ["ui.panel"],
  "engines": {
    "piDesktop": ">=0.1.0"
  },
  "activationEvents": [
    "onCommand:my-first-plugin.open",
    "onStartup"
  ]
}
```

`schemaVersion`、`id`、`name`、`version` 和 `main` 是必填项。每个
文件路径都相对插件根目录，且必须保持在根目录之内。只声明插件实际
需要的权限。

### `main.js`

```js
async function onLoad() {
  await pi.commands.register({
    id: "my-first-plugin.open",
    title: "My First Plugin: Open Panel",
    keywords: ["hello", "panel"],
    run: async () => {
      await pi.ui.openPanel({ title: "My First Plugin" });
      await pi.ui.showToast("Hello from My First Plugin");
    },
  });
}

async function onUnload() {
  await pi.commands.unregister("my-first-plugin.open");
}

module.exports = { onLoad, onUnload };
```

宿主把 `pi` 注入为全局对象。`onLoad` 和 `onUnload` 不接收参数。
CommonJS 是最简单的入口格式；当入口是 ES module 时也会加载 ESM。
模块求值加 `onLoad` 有 15 秒预算。`onUnload` 有 5 秒预算且是尽力
而为，因此要及时释放定时器和订阅。

目前只会触发 `onLoad` 和 `onUnload`。manifest 中的其他生命周期名
称为计划中的完整生命周期保留。

### `renderer/index.html`

PI-Desktop 在每个平台上都把面板托管在一个无边框窗口中。宿主恰好
保留一条透明的 46 CSS px 拖拽带，并在右上角渲染一个最小的固定
胶囊，包含最小化、最大化 / 还原和关闭按钮。面板标题、工具栏和所有
其他可见 UI 都归插件。普通文档流中的内容会自动偏移到拖拽带下方，
因此不要再添加额外的 46px 顶部 padding 来补偿。拖拽带在胶囊之外
不可点击；开发面板会显示一条关于此约束的提示。

如果面板用 `position: fixed` 或 `position: sticky` 做顶部工具栏，
把它锚定在宿主拖拽带下方，而不是使用 `top: 0`：

```css
.panel-toolbar {
  position: sticky;
  top: var(--pi-plugin-titlebar-height, 46px);
  -webkit-app-region: drag;
}

.panel-toolbar button {
  -webkit-app-region: no-drag;
}
```

宿主不会注入面板标题。做视口高度计算时也要考虑 46px 拖拽带：
`height: calc(100dvh - var(--pi-plugin-titlebar-height, 46px))`。

### 悬浮挂件

整个界面是一个小悬浮形状——语音 orb、计时器、状态灯——的插件，
在 manifest 中声明 `"ui": { "shape": "widget" }`，而不是接受一个带
工具栏条的矩形。面板随后以透明、无边框窗口打开：

- 没有 46px 拖拽带，也没有胶囊；`--pi-plugin-titlebar-height` 为 `0px`
- 空白区域拖拽窗口，而标准控件——或任何标记了
  `data-pi-plugin-no-drag` 的元素——保持可点击
- 在界面上右键打开宿主菜单：关闭、最小化、置顶
- `ui.width` / `ui.height` 最小生效到 120×120，`ui.alwaysOnTop`
  把挂件固定在其他窗口之上
- 页面可以读取 `document.documentElement.dataset.piPluginPanelShape`
  （`panel` | `widget` | `view`），让同一个 HTML 入口适配每种摆放
  位置

自己绘制轮廓——`border-radius: 50%`、自己的阴影、溢出形状的光晕
——并保持形状之外的页面背景透明，让窗口隐没在形状后面。其他一切
——`window.pluginBridge`、权限、设置——都与面板相同。

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>My First Plugin</title>
  </head>
  <body>
    <h1>My First Plugin</h1>
    <button id="hello">Show toast</button>
    <script>
      document.getElementById("hello").addEventListener("click", async () => {
        await window.pluginBridge.invoke("ui.showToast", {
          message: "Hello from the panel",
        });
      });
    </script>
  </body>
</html>
```

面板不会收到全局 `pi` 对象。它只收到 `window.pluginBridge`，任意
Electron IPC 通道都不可用。

## 6. 添加能力

### 6.1 Agent 工具

声明工具及其权限：

```json
{
  "contributes": {
    "agentTools": [
      {
        "name": "summarize_text",
        "description": "Summarize text supplied by the agent.",
        "risk": "low",
        "schema": {
          "type": "object",
          "properties": {
            "text": { "type": "string" }
          },
          "required": ["text"]
        }
      }
    ]
  },
  "permissions": ["agent.tool.register"]
}
```

在 `onLoad` 期间注册匹配的处理器：

```js
await pi.agent.registerTool({
  name: "summarize_text",
  description: "Summarize text supplied by the agent.",
  risk: "low",
  schema: {
    type: "object",
    properties: { text: { type: "string" } },
    required: ["text"],
  },
  execute: async (args, context) => {
    context.log("summarize_text called");
    const text = String(args?.text ?? "");
    return { summary: text.slice(0, 120) };
  },
});
```

在 `onUnload` 中注销它。宿主以插件命名空间化的名字把它暴露给模型，
应用常规的 Agent 权限策略，审计执行，并强制 110 秒的插件侧超时。
插件工具在 Plan 模式下不可用。

### 6.2 Skill

添加一个文件，例如 `skills/release-notes.md`：

```markdown
---
name: Release notes
description: Use when the user asks for release notes or a changelog entry.
---

# Release notes

Write one line per user-visible change. Use imperative mood and put the newest
change first.
```

声明它并带上必需的权限：

```json
{
  "contributes": {
    "skills": ["skills/release-notes.md"]
  },
  "permissions": ["agent.prompt.inject"]
}
```

prompt 会收到一份简短的 skill 目录；完整正文按需读取。每个插件最多
贡献 32 个 skill，每个文件最多 128 KiB，描述上限 240 个字符。没有
`agent.prompt.inject` 的 skill 会被忽略而不是加载。

### 6.3 设置与私有数据

在 manifest 中声明默认值：

```json
{
  "contributes": {
    "settings": [
      {
        "key": "greeting",
        "title": "Greeting",
        "type": "string",
        "default": "Hello"
      }
    ]
  }
}
```

从插件进程读取和更新：

```js
const settings = await pi.plugin.getSettings();
await pi.plugin.setSettings({ greeting: "Welcome" });
const dataPath = await pi.plugin.getDataPath();
```

设置和数据路径对插件 id 私有。已安装 Plugins 页面会为 `string`、
`number`、`boolean`、`select`、`json` 和 `shortcut` 字段生成控件。
shortcut 字段必须指明一个已声明的命令：

```json
{
  "key": "openShortcut",
  "title": "Open panel shortcut",
  "type": "shortcut",
  "default": "Mod+Shift+H",
  "command": "hello.open",
  "scope": "plugin"
}
```

插件快捷键只在获得焦点的 PI-Desktop 窗口中生效，并会对照应用快捷键
表检查。尚不支持全局注册。用户编辑后插件会收到
`plugin:settingsChanged`。不要把凭据放进 `manifest.json` 或源码管理。

### 6.4 工作区文件、剪贴板、网络与通知

这些 API 需要显式权限：

| 权限 | 插件进程 API | 面板桥接通道 |
|---|---|---|
| `fs.read` | `pi.fs.readText`、`pi.fs.glob`、`pi.fs.list`、`pi.fs.requestDirectory` | `fs.readText`、`fs.glob`、`fs.list` |
| `fs.write` | `pi.fs.writeText` | `fs.writeText` |
| `fs.delete` | `pi.fs.remove` | 不暴露 |
| `clipboard.read` | `pi.clipboard.readText`、`pi.clipboard.getHistory` | `clipboard.readText`、`clipboard.getHistory` |
| `clipboard.write` | `pi.clipboard.writeText` | `clipboard.writeText` |
| `net.fetch` | `pi.net.fetch` | `net.fetch` |
| `shell.openExternal` | `pi.shell.openExternal` | `shell.openExternal` |
| `notify` | `pi.ui.notify`、`pi.ui.getNotificationPermission`、`pi.ui.requestNotificationPermission`、`pi.ui.showNativeNotification` | `ui.notify`、`ui.getNotificationPermission`、`ui.requestNotificationPermission`、`ui.showNativeNotification` |

展示目录树时用 `fs.list` 而不是 `fs.glob`：它一次返回一个目录
（按名称排序，包含目录），让用户按需展开，而不是等待一次上限 500
条匹配的整库遍历。两者遵守相同的读取范围。

文件权限只是声明的一半：`manifest.fs` 说明每种模式可以触碰哪些
路径（见 §6.5）。路径相对该模式的根。绝对路径和 `..` 逃逸会被拒绝，
离开根的符号链接也会被拒绝。`fs.remove` 是非递归的，把路径移入操作
系统回收站，且不能移除根本身。`net.fetch` 接受 HTTP(S)，且只能到达
`manifest.net.domains` 中列出的主机；`openExternal` 接受 HTTP(S) 和
`mailto:` URL。

`pi.ui.notify` 显示应用内 Toast。原生通知是显式开启的：在
`pi.ui.showNativeNotification(...)` 之前调用
`pi.ui.requestNotificationPermission()`。返回的权限是尽力而为的，
因为 Electron 没有暴露跨平台的只读 OS 权限 API；`unknown` 表示平台
尚未报告结果，`unsupported` 表示桌面通知不可用。原生插件通知不会
进入 PI-Desktop 持久的任务通知收件箱。点击一条已投递的通知会还原并
聚焦主窗口，但不会激活会话。

面板桥接还暴露 `ui.showToast`、`ui.closePanel`、`plugin.getSettings`
和 `workspace.get`。宿主自身不实现的通道会转发给你的
`onPanelInvoke(channel, payload)`，因此面板可以通过你定义的通道与
自己的插件通信；没有导出 `onPanelInvoke` 的插件会收到 `UNSUPPORTED`。

### 6.5 文件范围

`fs.read` / `fs.write` / `fs.delete` 决定你的插件能否触碰文件。
`manifest.fs` 决定能触碰哪些：

```json
{
  "permissions": ["fs.read", "fs.write", "fs.delete"],
  "fs": {
    "read": { "scope": ["**/*"] },
    "write": { "scope": ["docs/**", "*.md"] },
    "delete": { "own": true, "scope": ["dist/**"] }
  }
}
```

- `scope` glob 相对根目录。`*` 匹配一个路径段，`**` 跨越分隔符。
- **读取**可以声明整棵树。**写入和删除不可以**——整树模式无法通过
  校验，因为出口允许清单让宽泛的读取变得安全，而没有任何东西能让
  宽泛的写入变得安全。
- 超出声明范围的访问不是错误：PI-Desktop 会询问用户（拒绝 / 允许
  一次 / 允许本会话）。声明你需要的范围，让插件不会在每次调用时
  打扰用户；拒绝会以 `PERMISSION_DENIED` 返回。
- 有些路径无论你声明什么都会被拒绝：`.env*`、SSH 和云凭据、
  `*.pem`、`.git/**`，以及 PI-Desktop 自己的数据目录。它们也不会
  出现在 `fs.glob` 结果中。

**删除。** `own: true` 允许移除你的插件自己写入的文件，不需要 scope
也不弹提示——这是清理自己产出的正确默认。（如果用户在你写入之后
编辑过该文件，它就不再算你的。）删除任何其他文件需要 `scope`。
每次删除都是非递归的、进入操作系统回收站，并且每分钟超过 50 次
就会被中断，因此批量清理应该有节奏地进行，而不是 `glob` 加循环。

**在工作区之外工作。** 在某个模式上设置 `"root": "userSelected"`
并调用 `pi.fs.requestDirectory()`：用户挑选一个目录，你在其中获得
完整能力，无需声明 scope。句柄保存在内存中，插件进程退出即失效，
因此每个会话都要重新请求。

**旧名称。** `fs.read.workspace`、`fs.write.workspace` 和
`fs.delete.workspace` 仍能加载，但会被削减——写不可达任何路径，
删除只可达你自己的产出——直到 manifest 声明了 `fs`。Plugins 页面
会告知用户发生了这件事。

### 6.6 网络访问

`net.fetch` 让你的插件发起请求；`manifest.net.domains` 说明能去哪里：

```json
{
  "permissions": ["net.fetch"],
  "net": { "domains": ["api.example.com", "*.githubusercontent.com"] }
}
```

条目是裸主机名——不带 scheme、端口或路径——前导的 `*.` 覆盖该域名
及其子域名。裸 `*` 在安装时被拒绝。

这份列表是宿主拥有的**每一条**出站路径的唯一允许清单，不只是
`pi.net.fetch`：你的面板自己的 `fetch`、`<img>`、`<script>` 和样式表
加载同样受它约束（沙箱面板仍有网络栈），你声明的远程 HTTP MCP
服务器也一样。面板中的 `window.open` 一律被拒绝。

省略、为空或格式错误的 `net.domains` 意味着**完全没有出口**，即使
已授予 `net.fetch`。重定向被手动跟随并重新检查，因此被允许的主机
无法把请求弹回给你未声明的主机。把资产打进插件包里，而不是从一个
你本来还得声明的 CDN 加载它们。

`fetch` 返回服务器应答的内容，包括 `429` 和 `Retry-After`：宿主
绝不会重试你的插件发出的请求，因此限速后的退避是你自己的策略，
而不是隐藏的宿主行为。返回 `>= 400` 的调用仍会被审计，记为
`ok: false` 并带上响应声明的延迟。

### 6.7 主题

声明一个 CSS 文件和 `ui.theme`：

```json
{
  "contributes": {
    "themes": [
      {
        "id": "midnight",
        "label": "Midnight",
        "path": "themes/midnight.css",
        "base": "dark"
      }
    ]
  },
  "permissions": ["ui.theme"]
}
```

在该 CSS 中覆盖 PI-Desktop 设计 token。宿主会净化贡献的 CSS，拒绝
import 和非 data URL，每个文件上限 256 KiB，每个插件最多八个主题。
用户在 Settings 中选择主题。

### 6.8 工作面板视图

视图是停靠在应用右侧工作面板中的界面，与 Review、Terminal、Browser
和 Files 并列。它是与 `ui.panel` 相同的隔离页面——你可以复用同一个
HTML——但它显示在主窗口内部而不是独立窗口，适合用户在阅读对话时
随时查阅的内容：变更列表、文件树、issue 队列。

```json
{
  "contributes": {
    "views": [
      {
        "id": "changes",
        "title": { "en": "Changes", "zh-CN": "改动" },
        "icon": "diff",
        "entry": "views/changes.html",
        "order": 10
      }
    ]
  },
  "permissions": ["ui.view"]
}
```

按需声明多个；每个都会成为面板头部菜单中的独立一行。`title` 可以
是普通字符串，也可以是 `{ en, "zh-CN" }` 对象。`order` 对行排序，
默认为声明顺序。

`icon` 是来自固定列表的 token，宿主从自己的图标集绘制——`bell`、
`book`、`bot`、`branch`、`browser`、`chat`、`clock`、`diff`、`files`、
`folder`、`image`、`key`、`link`、`list-checks`、`palette`、`plug`、
`pull-request`、`search`、`server`、`shield`、`sparkles`、`target`、
`terminal`、`workflow`、`wrench`。插件不能提供自己的 SVG，因为图标
绘制在宿主外框内。未知 token 不是错误：它会渲染成一个字母磁贴，
`pi-plugin check` 会对其告警。

在页面内部，`window.pluginBridge` 的行为与面板窗口完全一致。唯一的
区别是外框：停靠的视图没有窗口控件和拖拽带，因此读取
`--pi-plugin-titlebar-height` 而不是硬编码 `46px`，同一个文件就能
在两种摆放位置下正确布局。

```css
body {
  /* 0px docked, 46px in a panel window. */
  padding-top: calc(var(--pi-plugin-titlebar-height, 0px) + 12px);
}
```

视图受到与面板窗口相同的约束：沙箱页面、无 Node、插件自己的持久
session partition，网络限于 `manifest.net.domains`（§6.6）。它也受
启用范围过滤——被限制在特定项目的插件不会在其他项目中提供它的
视图。

`examples/plugins/hello` 在 `views/greetings.html` 提供了一个可工作
的视图，PI-Desktop 自带的文件视图也是以同样方式构建的内置插件——
`apps/desktop/resources/plugins/pi.file-manager` 是一个完整的、非玩具
级的视图示例，通过公开桥接触达工作区：`fs.openDefault` 和
`fs.reveal` 用于这两个只能由宿主执行的动作，插件自己读写的一切则
走它自己的 `onPanelInvoke` 通道。

### 6.9 MCP 服务器

MCP 服务器是声明式的。本地服务器需要 `mcp.server.local`；远程服务器
需要 `mcp.server.remote`：

```json
{
  "contributes": {
    "mcpServers": [
      {
        "id": "docs",
        "label": "Documentation tools",
        "transport": "stdio",
        "command": "bin/docs-server",
        "args": ["--stdio"],
        "env": {
          "DOCS_TOKEN": { "setting": "docsToken" }
        }
      },
      {
        "id": "issues",
        "transport": "http",
        "url": "https://mcp.example.com/tools",
        "headers": {
          "Authorization": { "setting": "issuesAuthorization" }
        }
      }
    ]
  },
  "permissions": ["mcp.server.local", "mcp.server.remote"]
}
```

stdio 命令必须是在 `PATH` 上能找到的裸命令或插件相对的可执行文件；
绝对路径被拒绝。远程 URL 可使用 HTTP 或 HTTPS，且主机必须列在
`net.domains` 中；非 loopback 的 HTTP 是未加密的，只在受信任的网络
上使用。设置引用只读取本插件的设置——宿主环境和 Provider 密钥绝不
会被转发。MCP 工具遵循与手写插件工具相同的 Agent-only 策略和命名
空间化。

### 6.10 常驻服务与消息总线

声明服务 id 和允许的主题：

```json
{
  "contributes": {
    "services": [
      { "id": "watcher", "label": "Workspace watcher" }
    ],
    "bus": {
      "publish": ["example.index.ready"],
      "subscribe": ["example.build.*"]
    }
  },
  "permissions": [
    "background.service",
    "bus.publish",
    "bus.subscribe"
  ]
}
```

注册匹配的处理器：

```js
let unsubscribe;

pi.services.register({
  id: "watcher",
  start: ({ log }) => log("watcher started"),
  stop: () => {},
});

unsubscribe = await pi.bus.subscribe("example.build.*", async (message) => {
  await pi.bus.publish("example.index.ready", {
    source: message.from,
    at: message.at,
  });
});
```

卸载时调用 `unsubscribe()`。插件不会收到自己发出的总线消息。把主题
视为对任何订阅匹配的已安装插件公开；绝不要把密钥放进载荷。

### 6.11 Agent 扩展（pi ExtensionAPI 模块）

插件可以发布运行在 agent 进程内部的代码：一个按 pi CLI
`ExtensionAPI` 编写的模块，与 pi 扩展使用同一契约。它注册工具、
斜杠命令，以及每个轮次、工具调用和 Provider 请求上的钩子。声明
模块和 `agent.extension` 权限：

```json
{
  "contributes": { "agentExtensions": ["src/index.ts"] },
  "permissions": ["agent.extension"]
}
```

```ts
// src/index.ts
import { Type } from "typebox";
import { defineTool } from "@earendil-works/pi-coding-agent";

export default function (pi) {
  pi.registerTool(defineTool({
    name: "fx_add", label: "Add", description: "Adds two numbers",
    parameters: Type.Object({ a: Type.Number(), b: Type.Number() }),
    async execute(_id, { a, b }) {
      return { content: [{ type: "text", text: String(a + b) }], details: {} };
    },
  }));
  pi.on("tool_call", (event) =>
    event.toolName === "Bash" ? { block: true, reason: "not here" } : undefined,
  );
  pi.registerCommand("greet", {
    description: "Say hello",
    async handler(args, ctx) {
      const name = await ctx.ui.input("Your name?");
      ctx.ui.notify(`Hello ${name} ${args}`);
    },
  });
}
```

使用之前需要知道的：

- **它不在沙箱中。** 模块运行在 agent 进程中，拥有与 agent 自身
  工具相同的访问能力。`agent.extension` 是用户显式确认的高风险
  权限；只列模块而没有它，manifest 会被拒绝。
- **TypeScript 可以。** 模块用 jiti 加载，因此 `.ts` 不需要构建
  步骤。`typebox`、`@earendil-works/pi-agent-core`、
  `@earendil-works/pi-ai` 和 `@earendil-works/pi-coding-agent` 解析到
  应用自带的副本；`@earendil-works/pi-tui` 解析到一个惰性 stub，
  终端 UI 调用什么都不做，只显示为诊断信息。
- **工具是延迟的。** 与插件工具一样，模型通过 `ToolSearch` 按需
  激活它们。与核心或插件工具重名的会被拒绝并给出诊断。
- **斜杠命令**出现在输入框的 `/` 菜单和全局搜索中，把该行剩余
  部分作为 `args`。`ctx.ui.input` / `select` / `confirm` 打开原生
  对话框；`ui.notify` 是 toast。
- **受支持的成员**列在 spec 07-plugins/16 §5。不支持的
  （`setWidget`、`registerMessageRenderer`、`navigateTree` 和其他
  仅终端的界面）是惰性的，只报告在插件行的详情中，绝不抛出。
- **现有 pi 扩展**无需改动：Plugins → 溢出菜单 → "Import pi
  extension" 会把一个文件或目录包装成生成的插件。如果目录声明了
  生产或可选依赖，PI-Desktop 先运行 `npm install --package-lock-only
  --omit=dev --legacy-peer-deps --no-audit --no-fund --ignore-scripts`，
  校验生成的 registry-only lockfile，然后以同样的安全旗标运行
  `npm ci`。直接依赖规格会跨 production、optional、dev 和 peer
  字段检查；git 解析被禁用，且不会运行任何第三方生命周期脚本。
  需要构建脚本的原生模块会以诊断失败——在插件目录内针对 Electron
  头文件重新构建它（`npx @electron/rebuild -v <electron version>`）
  来修复。失败的安装会清理半成品依赖并报告警告 toast，不会阻塞
  导入；只有当扩展确实加载失败时，插件行才显示加载错误。

## 7. 权限设计

权限既在 `manifest.json` 中声明，也由用户授予。未声明或未授予的
API 调用以 `PERMISSION_DENIED` 失败。

| 风险 | 权限 |
|---|---|
| 低 | `ui.panel`、`ui.view`、`ui.theme`、`notify` |
| 中 | `clipboard.read`、`clipboard.write`、`fs.read`、`shell.openExternal`、`background.service`、`bus.publish`、`bus.subscribe`、`audio.playback.background`、`keyboard.globalShortcut` |
| 高 | `fs.write`、`fs.delete`、`agent.tool.register`、`agent.prompt.inject`、`net.fetch`、`mcp.server.local`、`mcp.server.remote`、`audio.capture.background`、`net.websocket` |

`keyboard.globalShortcut` 和 `net.websocket` 已实现。`pi.audio.*`
存在且可调用，其方法保留权限门，但当前宿主还没有设备后端：在设备
服务落地、把拒绝替换为真实采集和播放之前，已授权的调用会得到一个
带错误码的、被审计的 `UNSUPPORTED` 拒绝，`onInputFrame` /
`offInputFrame` 则同步抛出同样的错误码。

有两个权限除了名字还携带声明的范围，且两者都会展示给用户：文件
模式的 `manifest.fs`（§6.5）和出口的 `manifest.net.domains`（§6.6）。
两者都失败关闭——缺失或空的声明不授予任何东西，因此对它们只字不
提的插件什么也够不到。

请求尽可能小的集合。给已加载的开发插件新增权限不会通过热重载生效：
PI-Desktop 会中止重载，并要求用户重新加载该文件夹，以便评审新的
授权。就此而言，扩大 `manifest.fs` 也算新增权限。移除权限在重载
时生效。

完整的映射与策略见[权限矩阵](spec/07-plugins/13-plugin-permissions-matrix.md)。

## 8. 开发与调试

### 热重载

开发插件在首次加载文件夹后、以及应用重启后都会被监视。变更在
300 ms 防抖后重载。`.git`、`node_modules`、`dist`、`target` 和常见
编辑器临时文件被忽略。

一次重载执行 `unload → validate → load`。面板内存不保留。语法或
manifest 错误会卸载坏掉的版本但保持 watcher 活动；保存修复即可
恢复。最多同时监视 16 个开发插件。

### 验证每个贡献点

- 从全局搜索运行命令（`Cmd/Ctrl+K` 或 `Cmd/Ctrl+Shift+P`）。
- 从命令或插件行打开面板。
- 在 Agent 模式下让 Agent 调用贡献的工具。
- 请求一个与 skill 描述匹配的任务，然后检查该 skill 是否被选中。
- 在 Settings 中选择贡献的主题。
- 查看插件行的服务状态和重启次数。

### 日志与失败

加载、崩溃、权限、工具、网络、服务和总线活动都记录在应用日志中。
打开 **Settings → Info → Logs**，然后搜索插件 id。当存在持久化的
加载错误时，面向用户的加载和热重载失败也会以 toast 和插件行的形式
出现。

宿主 API 失败抛出带 `code` 的 `Error`，常见的是
`PERMISSION_DENIED`、`NOT_FOUND`、`INVALID_ARGUMENT`、`TIMEOUT`、
`UNSUPPORTED`、`LIMIT_EXCEEDED` 或 `RATE_LIMITED`。在可选操作外围
捕获错误，并在诊断中包含错误码，同时不要记录密钥。

## 9. 检查、打包与安装

从仓库根目录运行校验：

```bash
pnpm pi-plugin check ../my-first-plugin
```

`check` 报告阻塞性错误和非阻塞警告。它用与安装相同的规则校验
manifest、引用文件、权限、路径包含、符号链接、包大小和文件数。
也要审查警告，尤其是未使用和高风险的权限。

只用 devkit 打包：

```bash
pnpm pi-plugin pack ../my-first-plugin
```

结果是：

```text
../my-first-plugin/dist/local.my-first-plugin-0.1.0.piplug
```

命令会打印包的 SHA-256。`.piplug` 是 store-only（未压缩）ZIP；普通
`zip` 默认参数通常会产出安装器拒绝的归档。devkit 排除 `.git`、
`node_modules` 和 `dist`，拒绝符号链接，并强制最多 2,000 个文件和
50 MiB。

测试用户实际收到的产物：

1. 打开 **Plugins**。
2. 从头部溢出菜单选择 **Install plugin package**。
3. 选择生成的 `.piplug`。
4. 审查权限并安装。
5. 重复上一节的贡献点检查。
6. 禁用再启用，验证清理和启动行为。
7. 卸载它，确认它的贡献点消失。

Agent 也可以在每种运行模式下执行 `PluginCheck`。
`PluginScaffold` 和 `PluginPack` 是 Agent 模式工具，且被限制在当前
工作区。

### 用 `pi-plugin publish` 准备插件中心提交

`publish` 打包插件，并把包固定到构建它时所在的 git commit，使插件
中心可以重新构建并比对产物：

```bash
pnpm pi-plugin publish ../my-first-plugin [--out <dir>] [--ref <ref>] [--channel stable|beta] [--allow-dirty]
```

命令运行同样的 `check` 和 `pack` 步骤，然后读取插件仓库的
`origin` remote 和 `HEAD`。SSH remote 会被改写为规范的 `https://`
形式；内嵌凭据或非 HTTPS scheme 的 remote 被拒绝。除非传入
`--allow-dirty`，工作树必须是干净的；`--allow-dirty` 产出的提交
中心无法复现，并会打印警告。固定的 `ref` 是给定时的 `--ref`，否则
是指向 `HEAD` 的标签 `refs/tags/<tag>`；没有标签时提交裸 commit
并给出警告。插件相对仓库根的路径会被记录，因此插件可以放在子
目录中。

结果是 `dist/<id>-<version>.submission.json`（或 `--out`），一份
`schemaVersion: 1` 载荷，包含 `pluginId`、`version`、`channel`、
`source` 固定（`repository`、`ref`、`commit`、`path`）、`artifact`
（`publisher-release` 模式、文件名、SHA-256、大小）、声明的
`permissions`，以及按插件、版本、commit 和产物稳定的
`idempotencyKey`——因此重试的提交不是新发布。把 `.piplug` 附加到
该 commit 的一个 release 上，然后把载荷提交给插件中心。中心会从
forge 重新解析来源，不信任记录的值。

## 10. 准备一次发布

分享安装包之前：

1. 使用稳定的反向域名插件 id。
2. 按语义化版本更新 `version`。
3. 把 `engines.piDesktop` 设为你实际支持的版本。
4. 在插件 README 中记录每个命令、设置、工具输入、权限和外部服务。
5. 添加 changelog 和许可证。
6. 把所有生成的 JavaScript 和资产构建进插件文件夹。
7. 运行 `pi-plugin check` 并解决每个错误和意外警告。
8. 运行 `pi-plugin pack`，并在干净的应用状态下安装生成的包。
9. 把打印的 SHA-256 记录在发布产物旁边。

面向官方插件市场，把包和目录元数据提交到
[`vastsa/pi-desktop-plugins`](https://github.com/vastsa/pi-desktop-plugins)，
并遵循该仓库的 `CONTRIBUTING.md`。市场目录是一个独立仓库；在这里
添加插件并不会发布它。

签名不是当前的信任原语。包 SHA-256 和显式权限审查是已实现的基线；
路线图细节见[签名与更新 specification](spec/07-plugins/08-plugin-signing-updates.md)。

## 11. 故障排查

| 症状 | 可能原因 | 修复 |
|---|---|---|
| `manifest.json is missing` | 选错了目录 | 选择根目录包含 `manifest.json` 的目录 |
| `main entry missing` | `main` 指向未构建的源码 | 先编译 / bundle，或修正相对路径 |
| 面板打不开 | 文件缺失、`ui.panel` 缺失或权限缺失 | 声明面板路径和 `ui.panel`；重载以获得新授权 |
| 视图不在工作面板菜单里 | 缺少 `ui.view`、入口文件缺失，或插件的启用范围排除了当前项目 | 声明 `ui.view`，确认 `views[].entry` 存在，并把范围设为全局或本项目 |
| 视图显示字母磁贴而不是图标 | 未知的 `views[].icon` token | 使用受支持列表中的 token；`pi-plugin check` 会对未知 token 告警 |
| `pluginBridge` 不可用 | HTML 在普通浏览器中打开 | 在 PI-Desktop 面板内测试桥接调用 |
| 工具从不出现 | 贡献点、注册或授权缺失 | 对齐 `agentTools`、`registerTool` 和 `agent.tool.register`；使用 Agent 模式 |
| Skill 从不生效 | 权限缺失或元数据太弱 | 添加 `agent.prompt.inject` 和具体的 `name`/`description` front matter |
| 保存报 `PERMISSION_DENIED` | manifest 扩大了权限 | 重新加载开发文件夹并审查新授权 |
| 语法错误后热重载停止 | 坏掉的插件被卸载 | 保存修正后的文件；watcher 保持活动 |
| 安装包因压缩被拒绝 | 归档是用通用 ZIP 工具做的 | 用 `pi-plugin pack` 重新构建 |
| MCP 服务器无法启动 | transport 字段、命令、URL、设置或权限无效 | 运行 `pi-plugin check`，然后按插件 id 查日志 |
| 服务反复重启 | `start` 抛异常或插件进程退出 | 让 `start` 幂等，在 `stop` 中清理，并检查重启日志 |

## 12. 参考地图

- [示例插件](https://github.com/vastsa/PI-Desktop/tree/main/examples/plugins)
- [插件系统概览](spec/07-plugins/01-plugin-system.md)
- [Manifest schema](spec/07-plugins/02-plugin-manifest-schema.md)
- [宿主 API](spec/07-plugins/03-plugin-api.md)
- [生命周期](spec/07-plugins/05-plugin-lifecycle.md)
- [打包](spec/07-plugins/06-plugin-packaging.md)
- [开发者体验](spec/07-plugins/10-plugin-devex.md)
- [权限](spec/07-plugins/13-plugin-permissions-matrix.md)
- [Hello 参考插件](https://github.com/vastsa/PI-Desktop/tree/main/examples/plugins/hello)
