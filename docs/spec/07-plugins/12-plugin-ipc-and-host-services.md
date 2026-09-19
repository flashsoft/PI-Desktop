# 12. 插件 IPC 与宿主服务

## 1. 目标

补全插件相关的宿主服务与 UI IPC，使实现不依赖临时约定。

## 2. 主进程服务

```text
PluginManager
 ├─ PluginRegistryStore
 ├─ ManifestValidator
 ├─ PackageInstaller
 ├─ PermissionGateway
 ├─ ContributionRegistry
 │ ├─ CommandRegistry
 │ ├─ AgentToolRegistry
 │ ├─ SkillRegistry
 │ ├─ ThemeRegistry
 │ └─ McpServerRegistry
 ├─ PluginRuntimeBroker
 │ ├─ ServiceSupervisor
 │ └─ MessageBus
 ├─ PluginPanelHostService
 └─ MarketClient
```

## 3. UI IPC（新增）

### plugin 域
- `plugin/list`
- `plugin/detail`
- `plugin/loadDev` —— 打开文件夹选择器，并把该文件夹*声明*的权限作为
  一次权限评审返回；此时尚未注册任何内容
- `plugin/loadDevConfirm` —— 对该评审的回答：把文件夹注册为开发插件，
  并以已接受的权限加载它；这些权限成为此后每次热重载衡量所依据的上限
- `plugin/reload` —— 解析已注册的插件路径，将 manifest 与记录的批准
  对比；如果 manifest 现在要求更多权限，则返回一次评审，否则在
  Electron main 中直接重载
- `plugin/reloadConfirm` —— 对该评审的回答：按已接受的权限重载，并刷新
  开发插件的权限上限
- `plugin/installFromPath` ✅
- `plugin/installFromPackage` ✅
- `plugin/enable`
- `plugin/disable`
- `plugin/uninstall`
- `plugin/reload`
- `plugin/getLogs`
- `plugin/getPermissions`
- `plugin/grantPermissions`
- `plugin/revokePermissions`
- `plugin/openDataDir`
- `plugin/openInstallDir`
- `plugin/openPanel`
- `plugin/setAutoUpdate`
- `plugin/themes` ✅ —— 每个已加载插件经净化的主题 CSS，供主题选择器
  和注入的 `<style>` 元素使用
- `plugin/services` ✅ —— 常驻服务状态（`starting` | `running` |
  `stopped` | `failed`）加重启次数，供插件页面的标记使用

### commandPalette 域
- `commandPalette/search`
- `commandPalette/execute`
- `commandPalette/listRecent`

### market 域（已实现）
- `market/search`
- `market/getDetail`
- `market/install`
- `market/checkUpdates`
- `market/applyUpdates`
- `market/listProviders`（目前只有单一官方 provider）

## 4. 事件（main → renderer）

- `plugin/event/changed`（安装/启用变化）
- `plugin/event/loadError`
- `plugin/event/permissionRequired`
- `market/event/updateAvailable`

已交付的 `pluginChanged` 事件携带 `reason`，以便渲染器决定要重新获取
什么：`install`、`loadDev`、`enable`、`disable`、`uninstall`、`crash`、
`service`、`market.install`、`market.applyUpdates`、`themes`（运行时的
`themes.upsert` / `themes.remove`）。`service` 在每次监督状态转换时
触发，是其中开销最小的一种 —— 只有服务列表需要重新加载。

`settingsChanged`（`pi-desktop/app/event/settingsChanged`）在**宿主**
于渲染器路径之外写入应用设置时携带一个设置补丁 —— 目前只有插件的
`app.setTheme`（`{ theme }`）。渲染器把补丁合并进自己的 store，外壳
随即绘制新的偏好。

Panel 桥接的固定通道还包括 `app.setTheme`、`themes.upsert`、
`themes.remove` 与 `themes.list`（都要求 `ui.theme`）。

## 4.1 事件（host → 插件进程）

broker 还会向插件的 `utilityProcess` 下发单向帧：

```text
{ t: "event", event: "bus.message", subscriptionId, message }
```

没有回复帧，也没有背压：投递是 fire-and-forget，因此卡住的订阅者无法
拖住发布者。子进程把消息分发给为 `subscriptionId` 注册的处理函数以及
任何 `pi.events.on` 监听器；抛异常的处理函数只记录日志，绝不致命。
正是这条通道最终让 `pi.events.on` / `off` 成为现实（见
[03-plugin-api.md](03-plugin-api.md) §5）。

## 5. ContributionRegistry 行为

### 注册
- key 必须唯一
- 插件命令共享前缀：`plugin.<pluginId>.<commandId>`
- 插件工具前缀策略：`plugin_<pluginIdSafe>_<toolName>`（实现中固定）

### 查询
- 命令面板只查询已启用 + 加载成功的贡献
- Agent 能看到已注册的工具；无论风险或授权状态如何，Plan 都收不到
  插件工具

### 注销
- 禁用/卸载/卸载加载时移除一切，包括停止常驻服务、断开 MCP 服务器、
  丢弃总线订阅，以及把该插件的主题从选择器中移除

## 6. RuntimeBroker 调用链

插件 API 调用：

```text
plugin runtime
 → RPC to PluginRuntimeBroker
 → PermissionGateway.check
 → Host service execute
 → audit log
 → response
```

### 6.1 实时能力的 allowlist 名称与审计操作

broker 的 `HOST_API_ALLOWLIST` 增加了三个已实现的条目，全部以
`keyboard.globalShortcut` 为门控：

- `keyboard.registerGlobalShortcut`
- `keyboard.unregisterGlobalShortcut`
- `keyboard.listGlobalShortcuts`

它们的审计操作是 `keyboard.globalShortcut.register`、
`keyboard.globalShortcut.unregister` 和 `keyboard.globalShortcut.trigger`
（一次已触发的快捷键）。register 与 trigger 条目记录 accelerator 和
command；绝不记录任何按键事件和输入文本。

socket 能力已实现：`net.websocket.connect` / `net.websocket.send` /
`net.websocket.close` 注册在同一个 allowlist 中，以 `net.websocket`
为门控。其审计操作是 `net.websocket.connect` 与
`net.websocket.close`（插件 id 和结果，绝不记录负载、头部或密钥），
外加一次被拒绝的 `net.websocket.send`；成功的 send 不做审计。帧只以
宿主事件 `net:websocket:open`、`net:websocket:message`、
`net:websocket:close` 和 `net:websocket:error` 的形式回传给所属插件。

audio 名称注册在同一个 allowlist 中：`audio.getInputDevices`、
`audio.openInput`、`audio.closeInput`、`audio.getCaptureState`、
`audio.onInputFrame`、`audio.offInputFrame`、`audio.openOutput`、
`audio.writeOutput`、`audio.stopOutput` 和 `audio.closeOutput`。
权限门控先执行，因此未授权的调用与其他受门控 API 一样，在
`audio.capture.background` / `audio.playback.background` 下以
`PERMISSION_DENIED` 被拒绝。该宿主还没有设备后端，所以每个通过门控的
调用都会被审计为一次 `UNSUPPORTED` 拒绝 ——
`{ api: "audio.<method>", ok: false, errorCode: "UNSUPPORTED" }` ——
并以该错误码拒绝；两个同步注册辅助函数
`audio.onInputFrame` / `audio.offInputFrame` 会同步抛出该错误。为设备
服务预留的审计操作名：`audio.input.open` / `audio.input.close`、
`audio.output.open` / `audio.output.stop` / `audio.output.close`
（ADR 0257）。

## 7. PanelHost 交互

- 打开面板时创建隔离视图
- 传入 pluginId / 主题 token
- 关闭时销毁视图与消息订阅。需要 `webContents` 身份的清理要在窗口
  销毁前复制该 id；`closed` 处理函数不得在已销毁的窗口上读取
  `webContents`，否则宿主会抛出未捕获的
  `TypeError: Object has been destroyed`。
- preload 暴露 `pluginBridge.getDroppedFilePath(file)`，但不向页面暴露
  Node。面板可以携带该路径调用 `fs.registerDropped`；宿主一次性消费一
  条与发送方绑定的最近拖放记录，并为 `fs.stat` / `fs.readRange` 发放一
  次单文件读取授权。

Panel 桥接的文件通道按如下方式做权限门控：

| 通道 | 所需权限 |
|---|---|
| `fs.readText`、`fs.stat`、`fs.readRange`、`fs.readPreview`、`fs.openDefault`、`fs.reveal`、`fs.glob`、`fs.list` | `fs.read` |
| `fs.registerDropped` | `fs.read` 外加一次真实拖放手势 |
| `fs.writeText` | `fs.write` |

## 8. 故障隔离

- 插件 API 超时：返回 TIMEOUT
- 运行时崩溃：标记 load_error，清理贡献
- 面板崩溃：只关闭面板，不卸载插件（可提示重载）

**已实现（2026-07-29，ADR 0008）：** broker 位于
`electron/main/plugin-runtime.ts`，每个插件调用都是发往该插件自有
`utilityProcess` 的请求。预算：load 15s、生命周期钩子 5s、command 30s、
tool 110s（低于 host-core 的 120s 工具预算）。进程退出时，broker 以
`PLUGIN_CRASHED` 拒绝未完成的调用，注销该插件的命令与工具，关闭其面板，
写入一条 `plugin.crash` 审计记录，并向渲染器发出 toast 和
`pluginChanged`。

## 9. 验收

1. 插件列表 IPC 可用
2. 命令面板 IPC 可以执行插件命令
3. 启动/停止触发贡献注册/注销
4. 市场 IPC 在 mock provider 下端到端运行（后续里程碑）

## 附录：agent-tool 分发协议（M5 已实现）

插件 agent 工具在桌面运行器（Electron main）中执行，而权限门控与结果
信封留在 host-core：

1. 模型调用 `plugin_<pluginIdSafe>_<toolName>`；sidecar 像对待任何内置
   工具一样把它转发给宿主的 `tools.execute`。
2. host-core 先解析持久的运行模式。在 Agent 下走正常权限流程（风险、
   会话授权、120s 超时），然后发出通知 `plugins.execute`
   `{ executionId, sessionId, toolCallId, toolName, args, turnId }`。
   `turnId` 是运行时回身份，原样转发，以便插件工具上下文可以与
   `session:turnEnded` 事件匹配。
3. Plan 调用在宿主策略步骤以 `PLUGIN_DISABLED_IN_PLAN` 失败；它们永远
   不会到达 Electron 或插件运行时。Agent 调用继续，由 Electron main
   执行已注册的插件工具 JS，并通过 RPC `plugins.resolveExecution`
   `{ executionId, ok, content, errorCode? }` 作答。
4. host-core 结算该挂起执行，并向 sidecar 返回标准的
   `ToolsExecuteResult`。分发超时映射为 `TOOL_TIMEOUT`；未知/未加载的
   工具映射为 `TOOL_NOT_FOUND`。

面向模型的注册表按 prompt 增加插件工具：main 把已注册的定义
（`fullName`、描述、JSON-schema 参数）传给 `agent.prompt`，运行时将
它们保存在延迟目录中，而不是把每个 schema 都序列化进第一个请求。模型
通过本地 `ToolSearch` 工具加载匹配的插件工具；下一个回合收到选中的
schema，然后使用上面同一条宿主权限/分发路径。由协议冒烟场景 E2E-024
和运行时加载场景 E2E-008a 覆盖。

从插件的 MCP 服务器发现的工具以
`plugin_<pluginIdSafe>_<serverId>_<toolName>` 进入同一个注册表，因此
上面的步骤 1–4 不变；只有步骤 3 内部不同，改为转发给 MCP 客户端而不是
插件 JS。

Skills 使用一条独立、更简单的路径。目录（id、name、description）是
基础系统提示的一部分，`Skill` schema 本身也延迟在 `ToolSearch` 之后，
其正文由一个由 Electron main 直接提供的本地 `Skill` 工具获取 ——
sidecar 从不持有 skill 文本，skill 文档只在模型主动索要时才送达模型
（D174/D185）。
