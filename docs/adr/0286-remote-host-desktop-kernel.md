# ADR 0286: 远程宿主的桌面内核

- 状态：已接受，待实现
- 日期：2026-09-18
- 决策：D449
- 相关：ADR 0205（D373 / D374 / D375）、ADR 0285（D448）、
  `03-runtime/19-remote-agent-control-protocol.md` §3.4、§4、§5、§7、§8、
  `05-security/02-remote-control-security.md` §3.4、
  `06-delivery/07-remote-control-rollout.md` §2 R2

## 背景

ADR 0285 在两端交付了 `RACP-WS` 传输和配对。`pi-host` 包现在在回环地址上
绑定一个真实的 WebSocket 服务器并说冻结的契约；`packages/racp` 中的
`RacpClient` 用头部认证到达它。R2 桌面侧仍然缺少的是内核——让渲染进程
把远程会话当作本地会话一样对待的那段代码（规范 §3.4）。没有它，传输只能
从测试中观察到。

三个约束塑造了内核：

- 渲染进程绝不能感知传输。每一个现有的按会话 IPC 调用——覆盖 agent、
  会话、工具批准、ask-tool 和计划决议的 17 个通道——在
  `apps/desktop/src/lib/api.ts` 中都只有一个调用点，它不能知道应答来自
  `host-core` 还是来自某个已配对的宿主。
- 冻结的架构把 `apps/desktop/electron/main/index.ts` 钉在 1500 行
  （`scripts/check-architecture.mjs`）。每个新模块必须住在它之外；接线
  必须适配现有的组合根。
- 桌面不能打开自己的网络监听器（安全规范 §7）。所有出站流量通过 RACP
  客户端流向用户配对过的宿主，且每个注册都是按会话的，因此丢失的宿主
  不能静默劫持本地会话 id。

## 决策

桌面侧 R2 内核是五个模块加一个启动钩子，全部位于
`apps/desktop/electron/main/remote/`（模块状态）和
`apps/desktop/electron/main/bootstrap/`（启动状态）之下，外加一个新的
工作区依赖（`@pi-desktop/racp`）。

1. **单一拦截接缝：`backend-router.ts`。** 路由器从 `ipc/register.ts`
   的 `handle()` 包装器中被咨询；当没有为该调用的会话 id 注册
   `RemoteBackend` 时，它返回哨兵 `ROUTE_LOCAL`，本地处理器照常运行。
   一个会话只有在它的渲染进程可见 id
   （`remote:<hostKey>:<hostSessionId>`，镜像 `native-pi:`）有了显式注册
   之后才成为远程。这使远程支持在未启用时逐字节兼容，并防止本地 id 被
   意外路由。

2. **无状态的按请求会话 id。** `sessionIdForCall` 从以下位置恢复会话：
   第一个位置参数、`first.sessionId`、`first.id`（`sessionGet` 使用这种
   形态），或工具批准使用的
   `<remoteSessionId>#racp-approval:<hostApprovalId>` requestId。最后一种
   让 `toolResolvePermission` 无需关联映射即可路由：路由器把会话编码进
   它交给渲染进程的 id，渲染进程回显该 id 时再解码出来。

3. **传输无关的后端：`remote-backend.ts`。** 一个
   `createRemoteBackend({hostKey, client, ...})` 实例服务一个已配对宿主的
   所有会话——路由器把它注册在每个 id 之下。后端把 17 个通道翻译成
   RACP 请求，并把结果整形回 `apps/desktop/src/lib/api.ts` 对本地处理器
   已经返回的确切响应形态。远程配置未覆盖的通道（`agentSteer`、附件、
   仅桌面的设置）要么从 `handles()` 返回 false，要么抛出
   `CAPABILITY_UNAVAILABLE`，因此这些调用回退到本地处理器，而该会话的
   转录保持远程。

4. **两条合成规则，在不增加往返的情况下调和 schema 不匹配。**
   - 工具批准决议的线上载荷中没有会话 id，因此后端把
     `<remoteSessionId>#racp-approval:<hostApprovalId>` 编码进 requestId
     （§ 决策 2），并为 `approval/respond` 解码回来。
   - `plansResolve` 向渲染进程返回 `PlanResolutionResult`，但 RACP 的
     `approval/respond` 只返回 `RacpApprovalResult`。后端从请求身份合成
     一个最小的 `PlanProposal`，以乐观地关闭卡片；权威快照随随后的
     `session.changed` 事件到达并替换占位符。

5. **纯事件桥：`remote-event-bridge.ts`。** RACP 事件被翻译为渲染进程的
   `IPC.event.agentMessage` / `IPC.event.sessionsChanged`。条目/轮次/工具
   载荷已经在 `payload.event` 中携带本地 `AgentEvent`，在按远程会话 id
   键控的 `AgentEventEnvelope` 下逐字转发。kind 为 `tool` 的
   `approval.requested` 变为带编码 requestId 的本地
   `tool_permission_request`；计划和目标批准搭乘随后的 `planning_state`
   事件，因而被丢弃。`onLifecycle` 回调为路由器发出
   `session.created`/`archived` 信号，无需对同一流的第二次订阅。

6. **每个已配对宿主一个协调器：`remote-host-connection.ts`。**
   `createRemoteHostConnection({hostKey, client, router, emit})` 组合后端、
   桥和路由器。它的 `open()` 序列消除了列出会话与接收生命周期事件之间
   的创建竞态：挂监听器 → 订阅宿主范围 → `session/list` → 逐会话订阅。
   `close()` 注销每个会话并丢弃内部状态；它幂等，且在 `open()` 之前调用
   也安全。

7. **带多监听器 `subscribe` 的 `RemoteHostClient` 接缝。** 连接消费
   `{request, subscribe}`。`packages/racp` 把 `RacpClient.onEvent` 暴露为
   单槽构造选项，这对事件桥 + 重同步看门狗 + 后续功能不够用。
   `racp-remote-host-client.ts` 是 `electron/main/remote/` 中唯一导入
   `@pi-desktop/racp` 的文件；它包装客户端，把回调扇出给每个
   `subscribe()` 监听器，并吞掉监听器的异常，使一个坏订阅者无法让其他
   订阅者失声。

8. **静态加密的注册表：`remote-host-registry.ts`。** 已配对宿主存放在
   `<dataDir>/remote-hosts.json`。设备令牌在写入前用 Electron 的
   `safeStorage` 加密，读取时解密；没有钥匙串访问权的窃得文件只暴露
   URL 和标签。注册表被注入一个 `EncryptionPort`（isAvailable /
   encryptString / decryptString），因此 Node 侧测试可以提供假实现而不
   引入 Electron。`upsert` 在钥匙串不可用时拒绝写入；`list` 丢弃任何无法
   解密的记录，而不是把一个会在下游认证失败的空令牌暴露出来。

9. **启动钩子：`bootstrap/remote-hosts.ts`。** `createRemoteHostsBoot(...)`
   读取注册表，为每个宿主打开一个适配器 + 一个连接，并返回
   `{open, closeAll}`。顺序打开——某个宿主的失败被记录并跳过，不是致命
   错误。空注册表（默认安装）是完整的 no-op：没有任何连接，没有后端
   注册，每个渲染进程调用继续逐字节命中本地处理器。
   `bootstrap/startup.ts` 在后台调用 `open()`，慢宿主绝不会拖延第一个
   窗口；`bootstrap/shutdown.ts` 从现有的关机 promise 调用 `closeAll()`，
   使已配对的 socket 在 host-core 拆除前排空。一个模块级的
   `activeRemoteHostsBoot` 句柄连接启动与关机，而不让 `index.ts` 超过
   1500 行上限。

## 内核保持的不变量

- **渲染进程传输无关。** 渲染进程的 `api.ts` 代码不提"远程"。它的会话
  id 可能带命名空间；它解析的每个响应形态都是本地的。
- **路由器默认关闭。** 没有注册 `RemoteBackend` 时，`route()` 对每个
  调用返回 `ROUTE_LOCAL`，现有处理器照常运行。在没有配对的情况下把内核
  加入构建是零行为变化。
- **静态最小权限。** 明文设备令牌从不落盘。`safeStorage` 不可用的环境
  不能写入令牌；它仍能读取该平台可用时已写入的内容。
- **有界关机。** `closeAll` 在处理插件、sidecar 和 MCP 处置的同一个
  `Promise.allSettled` 块中、在 `host-core` 被处置之前关闭每个已配对
  socket，使在途的远程轮次能通过活着的 socket 发出它们的中止。

## 范围外

内核对"已配对宿主应答渲染进程调用并流式推送事件"是完整的。排期到 R2
后续阶段的有：

- **配对 UX（渲染进程 + IPC）。** 输入 URL 和配对令牌、完成交换、存储
  设备令牌的设置界面。注册表 API 已就绪；界面尚未。
- **SSH 引导（第 4 阶段）。** 一个检测系统 `ssh`、下载 `pi-host-bundle`
  （用 ADR 0285 发布管线的 SHA-256 校验）、启动远程二进制并打开 `-L`
  隧道的监督器。今天每个已配对宿主都假设回环 URL 已存在。
- **终端工作面板客户端（第 5 阶段）。** RACP 终端事件今天被事件桥丢弃；
  工作面板会话客户端将消费它们。
- **反向工具中继（第 6 阶段）。** 一个 `RelayToolPort` 桥，让 agent host
  针对远程会话运行本地桌面工具。属于 agent-host 和 pi-host，不属于
  `packages/racp`。
- **重同步看门狗。** `resync.required` 事件今天被丢弃；连接层最终将按
  每个会话的最后游标重建订阅（`RacpClient.cursorFor`）。
- **多监听器契约。** `subscribe()` 今天恰好有一个消费者（事件桥）；第
  3b 阶段的重同步看门狗将是第二个。

## 考虑过的替代方案

- **从每个按域 IPC 处理器做路由。** 17 个处理器中的每一个都得知道"远程"
  并重复同样的分发。被拒绝：上帝模块会膨胀，且任何新通道都要接线两次。
- **把远程知识烘焙进渲染进程。** 渲染进程可见的 `remote:` 前缀迫使
  `api.ts` 分支，每个 store 切片最终都会感知传输。被规范 §3.4 拒绝。
- **让连接层自己构造 RacpClient。** 会把协调器耦合到 `packages/racp`，并
  使单元测试无法在没有真实客户端的情况下运行。被拒绝，改用注入的
  `RemoteHostClient` 接缝。
- **单监听器的 `RemoteHostClient`。** 更简单，但迫使重同步看门狗和事件桥
  共享同一个回调。被拒绝：它们的关注点相互独立，订阅也应如此。
- **明文注册表。** 读写更简单，但被攻破的备份会把一个能认证真实
  `pi-host` 的设备令牌交给攻击者。被安全规范 §3.4 拒绝。

## 测试

每个模块都有一个 `node --test` fixture，在隔离中演练接缝（假 RACP 客户端、
假加密、假路由器）。RACP 适配器针对真实的内存测试工具
（`@pi-desktop/racp/test-harness`）运行，因此它的扇出和生命周期契约是与
生产工厂构建的同一个客户端对照检查的。完整桌面测试套件在内核开启下运行
2120+ 个测试并全部通过；不为内核单独排期任何 `test:e2e:*` 场景，因为在
配对落地之前它是死代码。

## 后果

- 桌面今天就能托管一个已配对的远程 `pi-host`；向
  `<dataDir>/remote-hosts.json` 添加 URL 和设备令牌（通过 `safeStorage`
  静态加密）即可让内核连接、注册会话并把事件流进现有的渲染进程，不需要
  其他任何开关或设置。
- `apps/desktop` 现在依赖 `@pi-desktop/racp`，且 racp 包发布了
  `./test-harness` 导出子路径。两处变更都是增量添加。
- `apps/desktop/electron/main/index.ts` 保持在恰好 1500 行。启动/关机桥
  是 `bootstrap/remote-hosts.ts` 内的一个模块级句柄——小、可控，且当
  R2b 让接线住进更宽的 remote-hosts 服务对象后容易移除。
- 任何第 4–7 阶段的工作（SSH 引导、终端工作面板客户端、反向工具中继、
  配对 UX）都插入现有接缝——路由器、事件桥、注册表——无需重访传输层。
