# ADR 0203: 用于桌面操作的本地 MCP 控制面

- Status: Accepted
- Date: 2026-09-09
- Decision: D370 (amended by D372)

## Context

PI-Desktop 已经为项目、会话、pi Agent、工作区视图、插件、设置和其他
桌面操作提供了类型化的 Electron 主进程 IPC。该界面对渲染进程可用，
因此外部 Agent 若要驱动一个运行中的桌面，就需要第二个应用专属的集成。
远程 Gateway / WebUI 控制边界在基线决策 #20 和 ADR 0004 下仍然不在
范围内。

## Decision

- 在 Electron 主进程内添加一个可选的 Streamable HTTP MCP 服务器。
  仅在设置 `PI_DESKTOP_MCP_CONTROL=1` 时启动，并绑定到 `127.0.0.1`；
  可选的 `PI_DESKTOP_MCP_PORT` 选择本地端口，默认为 37123。
- 针对回环主机名校验任何提供的 `Origin`，以防止来自远程 Web 内容的
  DNS 重绑定攻击。非浏览器的 MCP 客户端可以省略 `Origin`。
- 在 Electron 用户数据目录中持久化一个随机的 256 位 bearer token，
  并在 `mcp-control.json` 中发布当前 URL、token、PID 和活动状态。
  在平台支持 POSIX 权限时，以 `0600` 模式写入 token 和清单。
- 将每个暴露的调用委托给现有已注册的主进程 IPC 处理器。为常见的
  项目/会话/Agent/工作区流程提供命名工具，并在显式的、带风险标记的
  目录之上提供一个通用的 `pi_desktop_invoke`。`pi_control_describe`
  是该目录的发现界面。
- 对危险的通用操作和破坏性命名工具要求 `confirm: true`，包括
  `session/configure`（权限模式）。`confirm` 是 agent 的确认，而不是
  桌面用户提示。排除密钥 get/set/delete 通道、provider/OAuth/MCP 密钥
  写入路径、设置写入，以及仅渲染进程的原生选择器/对话框通道（包括
  `plugin/loadDev`）。从接受的参数中剔除形似密钥的字段。新的 IPC 处理
  器不会被自动暴露。
- 只绑定回环地址；`initialize` 协商 `2025-06-18` 或兼容的
  `2025-03-26` 取值，绝不回显不受支持的版本。对文本载荷和
  `structuredContent` 都做有界限制。在宿主关闭之前用
  `closeAllConnections` 停止服务器，并将连接清单标记为非活动。
- 在成功的**变更类**项目/会话/Agent 调用之后，复用现有的
  `pi-desktop/session/event/changed` 渲染进程事件，并增量添加项目和
  选择字段。诸如 `session/get` 的读取不会刷新可见的桌面。

## Consequences

外部本地 Agent 可以通过标准 MCP 客户端打开项目、创建或检查会话、
发送提示、观察状态，并调用经过审查的桌面操作。渲染进程和外部 Agent
通过相同的 IPC 处理器和会话刷新路径汇合，因此没有重复的授权或持久
化逻辑。

该端点授予本地客户端在其调用的操作上等同于运行中桌面的权限。回环
绑定、可选启动、bearer 认证、有界请求/结果、显式操作审查和确认门槛
限制了意外暴露，但无法防御能够读取用户应用数据目录或 token 的不可信
进程。远程客户端、密钥材料、原生选择器和远程 Gateway 语义仍然被排除。

## Amendment (D372)

将第一版目录收窄为项目/会话/Agent/工作区流程加上经过审查的读取。
`session/configure` 是危险的，因为它可以设置
`permissionMode: "auto"`。即使某个保留的操作接受通用对象，密钥材料
也会从参数中被剔除。监听地址在绑定之后被断言为回环地址。渲染进程
会话刷新仅限变更类操作。

## Verification

`apps/desktop/test/mcp-control.test.mjs` 和
`apps/desktop/test/mcp-control-wiring.test.mjs` 覆盖 token 认证、协议
协商、工具发现、项目/会话派发、危险操作确认（包括 session
configure）、密钥剔除、目录排除、回环绑定拒绝、仅限变更的渲染进程
刷新，以及非活动的关闭清单。E2E-220 记录了完整的 Electron 旅程；按
仓库策略，完整的本地桌面 E2E 仍然推迟。
