# ADR 0285: `packages/racp` 中的 `RACP-WS` 传输

- 状态：已接受，待实现
- 日期：2026-09-18
- 决策：D448
- 相关：ADR 0205（D373 / D374 / D375）、ADR 0284（D447）、
  `03-runtime/19-remote-agent-control-protocol.md` §3、§4、§8、§11.1、§14a、
  `05-security/02-remote-control-security.md` §3.4、§5.1

## 背景

R0 把 RACP 契约冻结为 typebox schema，R1 交付了无头的 Agent Host 模块。
但还没有任何东西在两个进程之间搬运 JSON-RPC 帧：该模块此前只被
Electron IPC 驱动。R2 需要在 SSH 隧道两侧实现规范化的 `RACP-WS` 绑定——
一个由 `pi-host` 包绑定在回环地址上的服务器，和一个由 Electron 主进程
运行的客户端——并且需要安全规范 §3.4 的设备令牌配对，该内容安全规范
有描述但尚无代码实现。

## 决策

1. **新的工作区包 `packages/racp` 容纳该绑定的两端。** 它只依赖
   `shared`、`agent-host` 和 `ws`。服务器核心（`RacpServer`）和客户端核心
   （`RacpClient`）接受注入的传输，因此同一份代码在生产中跑在 `ws` 上、
   在测试中跑在内存对上；`bindRacpWebSocket` 和 `wsClientTransport` 是
   `ws` 适配器。
2. **服务器是模块之上的薄目录。** `RACP_OPERATIONS` 中的每个操作都通过
   目录的角色规则分发；会话、轮次、事件、批准和输入操作直接调用 Agent
   Host 模块；远程宿主配置（会话目录变更、项目、工作区读取、终端）通过
   `pi-host` 实现的 `RacpHostOperations` 接口走。服务器从不触碰 host-core
   RPC、文件系统或 pty（安全规范 §7）。
3. **头部配置认证，使用 Host 签发的设备令牌。** upgrade 请求必须携带
   `Authorization: Bearer`；URL 中的令牌、非回环对端、错误的路径、缺失
   子协议或二进制帧，都在任何 RPC 之前被拒绝。令牌为 `pdt1.`（设备）或
   `ppt1.`（配对）前缀，以 SHA-256 哈希存储，常量时间比较。配对令牌单次
   使用且会过期；它认证一个无特权的连接，该连接只能调用
   `connection/pair`，由后者铸造一个 `owner` 设备。
4. **三个目录新增，全部在远程宿主配置中：** `connection/pair`、
   `project/register` 和 `project/browse`。六个错误码加入共享错误注册表：
   `PAIRING_FAILED`、`PAIRING_TOKEN_EXPIRED`、`CAPABILITY_UNAVAILABLE`、
   `REMOTE_PATH_NOT_FOUND`、`REMOTE_PATH_FORBIDDEN`，以及桌面侧的连接错误码
   `HOST_DISCONNECTED`、`HOST_BOOTSTRAP_FAILED`、`HOST_VERSION_MISMATCH`、
   `REMOTE_AUTH_FAILED`、`REMOTE_CONNECTION_FAILED`、`REMOTE_FORWARD_FAILED`。
   `connection/initialize` 增加 `server.hostId`。协议留空的绑定细节记录在
   规范 §14a。
5. **重连归客户端，重放归 Host。** 客户端以有界退避重连，用
   `HOST_DISCONNECTED` 拒绝掉线连接上的在途调用，且绝不重发它们；它记住
   每个会话的最后持久游标，以便调用方带 `after` 重新订阅。Host 以重放
   应答，或以快照加 `resyncReason` 应答，与模块此前对 IPC 的做法完全相同。
   掉线的连接释放其订阅和终端附加，不触碰任何轮次。
6. **`StartTurnParams.input.userMessageId`** 从 `turn/start` 的
   `input.messageId` 穿过队列记录一路传到运行时，使远程客户端能像渲染
   进程通过 IPC 那样保持其乐观的用户行 id（D288）。

## 后果

- `pi-host` 在模块和 `RuntimeService`（ADR 0284）之上组合 `RacpServer` +
  `bindRacpWebSocket`；桌面适配器组合 `RacpClient` + `wsClientTransport`。
- 规范 §14 中不需要机器边界的那些一致性行为（握手、授权、幂等、队列
  顺序、批准决定、游标重放、驱逐、epoch 变更、慢客户端、无重复执行的
  重连）是 `packages/racp` 中的测试，不依赖 Electron 运行。
- 附件和工具中继被宣告为不可用（`attachments: false`、
  `toolRelay: false`），其操作以 `CAPABILITY_UNAVAILABLE` 失败；它们随各自
  的改动落地。
- 服务器绑定 outright 拒绝非回环地址，而不是提供 TLS 路径；非回环部署
  是后续的决策。
- 服务器绑定直接拒绝非回环地址，而不是提供 TLS 路径；非回环部署
## 考虑过的替代方案

- **先在 Electron 主进程内运行 RACP（开发用回环端点）。** 本次改动拒绝：
  唯一排期的客户端是桌面，而第一个服务器是 `pi-host`；桌面侧的监听器
  会增加一个没有消费者的网络面。
- **头部配置之外再加 cookie 配置。** 被拒绝：它属于未排期的浏览器里程碑
  （D375）。
- **静态共享密钥代替配对。** 被安全规范 §3.2 和 §3.4 拒绝：配对令牌必须
  单次使用，并转化为可以单独吊销的按设备凭据。
