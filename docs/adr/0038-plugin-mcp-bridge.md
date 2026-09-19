# ADR 0038: 在 Electron 主进程中桥接插件声明的 MCP 服务器

- 状态: 已接受
- 日期: 2026-07-31
- 相关: [Plugin manifest schema](../spec/07-plugins/02-plugin-manifest-schema.md)、
  [Plugin security](../spec/07-plugins/04-plugin-security.md)、
  [ADR 0008](0008-plugin-runtime-isolation-target.md)、
  [ADR 0142](0142-allow-non-loopback-http-mcp.md)

## 背景

插件路线图列出了一个"MCP 插件类型"，但背后没有任何实现。想要暴露
MCP 服务器工具的插件必须把每个工具重新实现为插件 agent 工具并自行
代理流量——重复的工作，而且代理发生在宿主无法检查的插件代码中。

两个约束塑造了这个设计。第一，agent 已经有一条可行的插件工具路径：
`plugin_<pluginIdSafe>_<toolName>` 从模型流经 sidecar 到 host-core
的权限门，再流出到 Electron 主进程（`07-plugins/12` 附录）。任何
复用该路径的东西都免费继承超时、审计轨迹和按插件的禁用开关。第二，
MCP 服务器是顶着同一个名字的两种非常不同的东西：我们派生的本地
可执行文件，和我们向其发送参数的远程端点。它们的失败方式不同，
泄漏方式也不同。

## 决策

1. MCP 服务器**在 manifest 中声明**，绝不在运行时打开。
   `contributes.mcpServers` 携带 `{ id, label?, transport }` 加上恰好
   一种 transport 的字段——`stdio` 使用 `command` / `args` / `env`，
   `http` 使用 `url` / `headers`。混用两者的 manifest 在 host-core
   和 SDK 校验器中都无法通过校验。
2. 两种 transport 携带**独立的权限**：stdio 用 `mcp.server.local`，
   HTTP 用 `mcp.server.remote`。运行本地二进制和把工具参数发给第三
   方是不同的同意，所以权限文案把各自写清楚。
3. 客户端位于 `apps/desktop/electron/main/plugin-mcp.ts`，讲协议
   `2025-06-18`：`initialize`、`tools/list`、`tools/call`。帧格式是
   stdio 管道上的 NDJSON，或带 SSE 响应的 streamable HTTP。预算：
   10 秒完成握手，每次调用 100 秒（在插件工具 110 秒预算之下，后者
   又在 host-core 的 120 秒之下），每行 stdio 4MB，每个插件 8 个
   服务器。2048 个工具、100 页 `tools/list`、整个遍历 30 秒，以及
   重复或畸形的游标——打破任何界限的服务器被拒绝而不是被截断。
   连接是惰性的——声明一个服务器在工具被调用之前没有成本——拆解
   跟随插件卸载。
4. 发现的工具注册到**现有的**插件工具映射中，名为
   `plugin_<pluginIdSafe>_<serverId>_<toolName>`，因此模型与服务器
   之间的任何位置都不存在新的路由。
5. 每个发现的工具都以 `risk: "medium"` 注册。名称、schema 和描述
   来自第三方服务器；来自该来源的自我声明风险级别不是证据。
6. 凭据**只**通过 `{ "setting": "<key>" }`（D018）从插件自己的设置
   解析。stdio 子进程接收 `PATH`、临时目录/语言区域变量、
   `PI_PLUGIN_ID` 和声明的值——而不是宿主环境，后者持有 provider
   密钥。`command` 必须是裸的 PATH 名称或位于插件目录内；`url`
   可以使用 `http` 或 `https`，非 loopback 的 HTTP 受 ADR 0142 和
   插件网络白名单约束。

## 后果

- 插件把 MCP 服务器作为 manifest 条目发布，其工具以正确的命名空间、
  审计和超时呈现给 agent。
- 审查一个插件能触达什么意味着阅读它的 manifest：每个端点和可执行
  文件都是声明的文本，而不是运行时决策。
- 目录大小是协议防护，不是提示预算：有 300 个工具的服务器贡献全部
  300 个，因为 MCP 工具作为 `ToolSearch` 之后的延迟按需条目到达模型，
  只有宣传它们的提示块有上限。打破防护（数量、页数、游标、时间）的
  服务器被拒绝且不贡献任何东西，而不是用其目录的前缀灌爆提示。
- 因为 MCP 工具与手写的插件工具在同一个映射中，禁用插件会同时移除
  两者，插件崩溃会同时失去两者。
- 远程服务器看得到工具参数。宿主侧再多小心也改变不了这一点；权限
  及其文案的存在是为了让用户做决定。

## 备选方案

### 只做 stdio

否决。托管的 MCP 端点很常见，只做 stdio 会迫使插件作者把它们包进
一个本地 shim 进程——多一个进程外加一个无法审查的代理，两方面都
比一个声明的 HTTP(S) URL 更糟。

### 独立的 `type: "mcp"` 插件种类

否决。它需要自己的生命周期、自己的管理 UI 和自己的工具路由。现有
插件类型上的一个贡献点原样复用安装、启用/禁用、权限和审计。

### 让插件进程拥有 MCP 连接

否决。那样连接会活在插件自己的代码背后，在代理层视野之外，宿主既
无法给工具集合设上限，也无法让凭据避开插件的触及。

### 信任服务器声明的工具风险

否决。风险驱动 host-core 的确认流程。由被检查方选择的值不能作为
检查的门禁。
