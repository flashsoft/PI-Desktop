# 远程 Agent 控制目标架构

- 状态：目标规范；post-MVP
- 决策：D373 / ADR 0205，由 D374 和 D375 修订
- 范围：对 PI-Desktop Agent Host 的远程观察与控制
- 权威来源：`03-runtime/19-remote-agent-control-protocol.md`

## 1. 范围与状态

本文档规定从另一个客户端控制 PI-Desktop Agent 的目标架构。它不在
当前桌面版本中启用网络监听器，也不改变 `00-baseline.md` 或
ADR 0004 中冻结的 MVP 边界。

目标能力让经过认证的客户端可以：

- 发现并附加到 Agent Host 拥有的会话；
- 启动、排队、观察、停止和中断回合；
- 接收有序的 assistant、工具、批准和生命周期事件；
- 以桌面本地提供的同一套决策回答宿主拥有的权限、契约批准和输入
  请求；
- 在传输故障后重连而不丢失会话状态；以及
- 使用与本地回合相同的工作区、工具、秘密和权限边界。

该特性是一个控制面 API。它不是远程桌面串流、任意 shell 服务、
provider 代理，也不是本地 MCP 控制面的替代品。

D375 确定了各拓扑的交付顺序。第一个远程部署是桌面本身作为远程
客户端，经 SSH 隧道连接另一台机器上的无头 Host —— 这正是用户在
issue #176 和 #140 中要求的。第二个是在 Host 旁边运行的出站消息
集成（issue #100）。Gateway 路由和浏览器访问在本文和协议中保持
完整规定，但在需求信号或产品决策排期之前保持未排期。

## 2. 设计原则

1. **Agent Host 是权威来源。** 客户端是可断开连接的观察者和控制者。
   运行中的回合不属于任何浏览器标签或 Electron 窗口。
2. **语义契约与传输无关。** `RACP-WS` 是规范性 v1 绑定，首次部署
   在 SSH 隧道之上。`RACP-HTTP` 是同一契约的浏览器配置，未排期。
   `RACP-GRPC` 保留。每个交付的绑定暴露相同的会话、回合、事件、
   批准和附件语义。
3. **本地边界保持本地。** 无论宿主运行在哪里，Rust host-core 继续
   只与其可信的 Electron Main 或无头宿主监督者讲 stdio NDJSON
   JSON-RPC。Node pi sidecar 继续经宿主进程代理访问宿主服务。
4. **公共边缘是能力边界。** 远程客户端永远收不到原始 `host.proxy`、
   Electron IPC、host-core RPC、provider 凭据或任意操作目录。
5. **状态同步是显式的。** 每个持久远程事件都有 `{ epoch, sequence }`
   游标。重连使用游标或完整状态快照；从不依赖墙钟时间戳。
6. **变更幂等。** 丢失响应不得导致第二个回合、重复批准或重复的
   附件变更。
7. **绑定可替换。** 客户端可以按自身能力选择绑定，而不改变 Agent
   Host 的行为。
8. **Host 是无头的。** 会话与回合准入、回合队列、批准 broker、
   事件日志和快照构建器位于一个无 Electron 依赖的模块中。桌面
   IPC、本地 MCP 控制面、RACP 和消息集成都是这一个模块的调用方。
9. **远程会话完全存活在其 Host 上。** 它的转录、工具、工作区、
   权限和 provider 秘密都在运行 Host 的机器上。桌面显示并控制它；
   从不在本地执行远程工具，也不在显示状态之外存储远程转录。
10. **构造上用户本地。** 控制路径中没有项目运营的服务。每个凭据
    都由用户自己的 Host 签发，唯一的出站连接是到用户的 SSH 主机、
    用户配置的消息渠道、用户配置的模型 provider，以及只读的
    GitHub Releases 下载 `pi-host`（D385）。

## 3. 参考实现与设计输入

本设计借鉴但不整体采纳以下公开项目的模式：

- [OpenAI Codex App Server](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
  在 stdio 和 WebSocket 上使用 JSON-RPC 形态的消息，分离线程、
  回合和条目，流式发送生命周期通知，并从服务器向客户端发送批准
  请求。
- [VS Code Agent Host](https://github.com/microsoft/vscode-docs/blob/main/docs/agents/concepts/agent-host.md)
  把 Agent 放在专用宿主中，保持宿主为状态来源，支持经 WebSocket
  的远程 JSON-RPC，并用快照和有序操作重新同步客户端。
- [MCP transports](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/specification/2025-03-26/basic/transports.mdx)
  展示了本地 stdio 上的 JSON-RPC 和独立进程 HTTP（可选
  server-sent events）。
- [Google A2A](https://github.com/a2aproject/A2A/blob/main/docs/specification.md)
  把规范数据模型和抽象操作与 JSON-RPC、gRPC 和 HTTP/JSON 绑定
  分离。

SSH 隧道拓扑遵循 VS Code Remote-SSH 和 JetBrains Gateway 模型：
服务器侧经用户自己的 SSH 会话引导，客户端经转发的 loopback 端口
访问它。

PI-Desktop 不复活已撤回的 subagent A2A/Peer 通道。ADR 0165 继续
管辖 `Task` subagent 协调。单独的官方 Session Orchestrator 插件
可以使用 ADR 0239 定义的宿主拥有、仅本地的协作 ledger；那条经过
评审的路径不是远程 Gateway 或 A2A 传输，也不改变远程控制目标。

## 4. 逻辑组件

| 组件 | 职责 | 不得拥有 |
|---|---|---|
| 远程客户端 | 渲染状态、发送用户意图、回答批准与输入请求 | 工作区权威、provider 凭据、最终权限决定、prompt 队列 |
| 桌面 RACP 客户端适配器（Electron Main） | 经现有 `lib/api.ts` 表面向渲染器呈现远程 Host；拥有 SSH 引导、配对和端口转发 | 第二个转录存储；远程工具的本地执行 |
| Agent Host | 拥有会话、回合、每会话回合队列、事件游标、附件记录、工具执行和生命周期 | 浏览器呈现状态 |
| 无头 Agent Host 模块（`packages/agent-host`） | 拥有会话/回合准入、回合队列、批准 broker、内存事件日志和快照构建器；向桌面 IPC、本地 MCP、RACP 和集成暴露一个类型化 API | Electron、渲染器或传输依赖；第二套权限或持久化实现 |
| `pi-host` 无头包 | 在远程机器上运行该模块、Node pi sidecar 和 Rust host-core，绑定 loopback，与桌面同版本，由引导脚本从 GitHub Releases 下载 | 桌面 UI、插件面板、其他 Host 的秘密 |
| 消息集成适配器 | 在 Host 进程中订阅宿主作用域事件，把脱敏摘要中继到出站渠道；把固定的命令词汇映射为回合和批准操作 | 自己的权限策略、入站监听器、原始转录内容 |
| 自托管 Gateway（未排期） | 准入 Host 签发的设备凭据、授权路由、维护 Host 链路、限流、审计、临时缓冲附件上传，以及（保留）推送脱敏摘要 | Provider 秘密、持久转录真相、任意 host-core 访问、上传窗口之外的附件字节 |
| Node pi sidecar | 运行 pi Agent 循环和 provider 流 | 远程认证、工作区策略、秘密存储 |
| Rust host-core | 拥有 SQLite、工具、工作区边界、权限与待处理权限表、秘密和持久的本地记录 | 公共网络监听器 |

第一阶段，逻辑 Agent Host 是 Electron Main 在其监督的 sidecar
旁边托管无头模块。`pi-host` 包在远程机器上运行同一个模块和监督。
两种部署中的外部契约相同。

## 5. 部署拓扑

### 5.1 当前本地桌面

此拓扑不变：

```text
PI-Desktop
├── Electron Main
│   ├── Renderer
│   ├── Node pi sidecar
│   └── Rust host-core
└── local MCP control plane (optional, loopback-only)
```

本地 MCP 端点仍由 ADR 0203 管辖。它不是远程 Gateway，也不能被
配置为绑定 LAN 或公共接口。

### 5.2 经 SSH 隧道的远程 Host（第一个远程拓扑）

```text
PI-Desktop (Remote Client)                    Remote machine
├── Renderer ── lib/api.ts ─┐                 ┌── pi-host (headless Agent Host)
├── Electron Main           │ RACP-WS over    │   ├── packages/agent-host
│   ├── RACP client adapter ┼─ SSH port ──────┼──▶│   ├── Node pi sidecar
│   └── local sessions      │ forward         │   │   └── Rust host-core (loopback)
│       (unchanged)         │                 │   └── workspace, ~/.agents, secrets
└── Rust host-core (local)  │                 └── sshd (user's own keys and config)
```

引导经用户自己的 SSH 会话运行，从不经 RACP：

1. 桌面用用户现有的配置和密钥打开 SSH。可以改为提供登录密码
   （ADR 0293）：它通过 askpass 助手交给 `ssh` 客户端，从不作为
   参数，并加密存储在桌面的安全存储中，以便重启后宿主可以重新
   连接。
2. 它上传一个小引导脚本，按桌面版本从 GitHub Releases 下载远程
   平台的 `pi-host` 包，验证已发布的 SHA-256，并安装到用户主目录
   下。没有到 GitHub 出站访问的机器在第一个版本中无法被引导。
3. 它启动绑定 loopback 的 `pi-host`，并经 SSH 通道收到一个一次性
   配对 token。
4. 它把一个本地端口转发到 Host 的 loopback 端口，以 header 配置
   连接 `RACP-WS`，把配对 token 换成桌面存入安全存储的设备 token。
5. Host 把该桌面设备记录为该 Host 的 `owner`。

远程 Host 的 provider 配置由引导步骤经同一 SSH 通道写入，作为
Host 本地配置。它从不跨越 RACP，因此
`05-security/02-remote-control-security.md` §7 的秘密边界不变。

Host 只绑定 loopback。仅当绑定地址和对端地址都是 loopback 且出示
有效设备 token 时，该端口才接受纯 `ws://`，因为 SSH 通道提供了
机密性，且 SSH 登录已经证明了对该机器的 shell 访问。非 loopback
绑定与之前一样要求 TLS 和设备 token。

### 5.3 自托管 Gateway（未排期）

```text
Browser / Native Client ── HTTPS or WSS ── Remote Gateway
                                             │
                          outbound WSS Host  │
                          link (relay)       │
                                             ▼
                                      Agent Host
                                      ├── pi sidecar
                                      └── Rust host-core
```

Agent Host 发起出站连接。Gateway 不需要用户桌面上的入站端口，也
不把 host-core 进程变成公共服务。Host 链路是中继配置
（`03-runtime/19-remote-agent-control-protocol.md` §11.4）：它复用
逻辑客户端连接，使服务器发起的批准请求到达正确的客户端，附件字节
在没有入站端口的情况下到达 Host。Gateway 保持从宿主身份到活跃
连接的短生命周期路由，可以排队控制面元数据，但不在 Agent Host
离线时排队非幂等的回合命令。PI 不运营 Gateway：如果该拓扑被排期，
用户在自己的基础设施上运行它，并以 Host 签发的设备凭据准入客户端
（D385）。规定它是为了契约不漂移；它未排期。

## 6. 所有权与权威

### 6.1 Agent Host 所有权

Agent Host 对以下事项具有权威：

- 会话与回合状态，包括每会话回合队列；
- 当前运行模式与权限模式，以及应用于远程发起回合的远程权限上限；
- 工作区/项目绑定；
- epoch 与 sequence 分配和重放保留；
- 批准与输入请求生命周期，包括客户端附加之前提出的请求；
- 附件所有权与哈希验证；
- 工具执行与结果分类；以及
- 崩溃、中止和不重放行为。

Gateway 和远程客户端必须把宿主响应视为权威。客户端的乐观状态仅
用于显示。

### 6.2 客户端角色

经过认证的 principal 按会话获得一个或多个有作用域的角色：

- `viewer`：读取会话元数据、历史，并订阅事件；
- `controller`：启动或排队回合，停止、中断或取消回合，回答输入
  请求，并上传输入；
- `approver`：解决策略允许的工具和契约批准；以及
- `owner`：管理会话成员、撤销客户端、归档会话。

角色是可叠加的，但从不绕过宿主策略。除非策略显式授予 `approver`
角色，`controller` 不能批准自己的请求。

一个会话中只能运行一个回合。允许多个 viewer。排队回合是包括本地
桌面在内的每个客户端共享的 Host 状态。并发变更由 Agent Host 串行
化，当其期望的会话修订过期时以冲突拒绝。由 Gateway 路由的
principal 启动的回合在 Host 的远程权限上限下运行
（`03-runtime/19-remote-agent-control-protocol.md` §7.3）。经 SSH
引导配对的桌面设备持有 `owner`，豁免该上限，因为对该机器的 SSH
访问已经超过上限所保留的一切；Host 策略
`applyCeilingToPairedDevices`（默认关闭）会重新应用它。

### 6.3 远程会话所有权划分

对于远程 Host 上的会话：

- **在远程 Host 上**：转录和 SQLite、回合和队列、内置工具目录和
  工作区边界、权限和会话授权、provider 秘密、来自该机器
  `~/.agents` 的 skills 和 subagent 定义、在该 Host 上配置的 MCP
  服务器，以及定时任务。
- **在桌面上**：窗口和外壳、本地会话、本地应用的设置 UI、插件
  面板、浏览器预览，以及通知的显示。
- **从桌面中继**：桌面通过 `tools/advertise` 通告其用户配置的
  MCP 服务器和不需要会话工作区的插件工具；它们以中继工具的形式
  出现在远程会话的目录中，并在桌面自己的插件权限下通过
  `tool/execute` 服务器请求在桌面上执行
  （`03-runtime/19-remote-agent-control-protocol.md` §9.4）。需要
  工作区或文件系统访问的插件工具被排除，因为会话根在 Host 上而
  它们会作用于桌面的文件系统。
- **工作面板**：文件列表、文件读取和工作树 diff 使用
  `03-runtime/19-remote-agent-control-protocol.md` §6.2 中针对远程
  会话根的 remote-host 配置操作；终端通过 `terminal/*` 操作在远程
  机器上运行，带有界重放环；浏览器预览保持本地。

### 6.4 Gateway 所有权（未排期）

Gateway 拥有身份到宿主的路由，而不是工作区状态。它可以存储：

- 宿主注册和连接健康；
- 用户/会话成员与撤销元数据；
- 限流计数器；
- 审计元数据；
- 短生命周期传输缓冲，包括仅在 Host 确认上传或过期之前的附件
  字节；以及
- （保留）脱敏批准与回合摘要的推送通知注册。

除非单独的产品决策显式授予该保留，否则它不得持久 provider API
key、原始工具参数、原始工具结果或完整转录。

Gateway 是自托管的，没有自己的身份来源：它以用户 Host 签发的设备
凭据准入客户端（D385）；见 `05-security/02-remote-control-security.md`
§3.1。OIDC 联合和 pi-backend 账户服务超出范围。

## 7. 传输配置

协议规范定义一个抽象操作模型和以下绑定：

| 配置 | 目标客户端 | 方向 | 状态 |
|---|---|---|---|
| 本地 stdio JSON-RPC | Electron Main 和 sidecar | 全双工 | 现有；不变 |
| `RACP-WS` WSS 上的 JSON-RPC | 经 SSH 作为远程客户端的桌面、原生客户端、Electron | 全双工 | 规范性 v1 绑定；首次部署在 SSH 隧道上 |
| `RACP-HTTP` HTTP/JSON + SSE | 浏览器和简单集成 | 命令加服务器流 | 浏览器配置；未排期 |
| `RACP-GRPC` TLS 上的 gRPC | 原生服务客户端 | 一元加服务器流 | 保留；不在 v1 一致性内 |
| Host 链路 `racp-hostlink.v1` | Gateway 到 Host | 复用全双工 | `RACP-WS` 分帧上的中继配置；随 Gateway 未排期 |

绑定中立的契约规定在
`03-runtime/19-remote-agent-control-protocol.md` 中。只有保持相同
状态转换、错误含义、授权范围、事件顺序和游标行为的绑定才可添加，
且它在交付前加入一致性夹具。

## 8. 会话与事件同步

每个会话有一个 Host 生成的 `epoch`，其内部持久事件的 `sequence`
单调递增。该对对那个会话从不复用。每个事件携带：

- `scope`（`session` 或 `host`）；
- `sessionId` 和可选 `turnId`；
- `eventId`；
- `epoch`，持久事件加 `sequence`，临时事件加 `afterSequence`；
- `revision`；
- 语义 `kind`；
- subagent 行的可选 `parentToolCallId` 和 `agentName`；以及
- 一个类型化负载，为回合作用域的 kind 携带共享的规范化
  `AgentEvent`。

持久事件是条目和生命周期边界、批准、输入和会话变更。临时事件是
流式增量、工具进度和活动阶段；它们实时投递，从不编号、从不重放，
也从不计入重放窗口。快照的 `activeItems` 携带增量累积的内容，
因此重连的客户端不会丢失任何它无法重建的东西。

第一个订阅响应包含快照及其 `cursor`。后续持久事件按 `sequence`
排序。重连提供 `after`：

```text
cursor in the current epoch and retained -> replay durable events with sequence > after
epoch changed or cursor evicted          -> resync.required + current snapshot
cursor ahead of the Host                 -> invalid cursor; client must refresh the snapshot
```

第一个实现把持久日志保存在 Agent Host 进程内存中；Host 重启开始
新 epoch，每个客户端从快照重新同步。Rust host-core 保持对 SQLite
的独家所有权（冻结决策 12）；把日志持久化在那里需要单独的 ADR。
Gateway 不得重新编号事件。如果 Gateway 重连 Host 链路，每个逻辑
客户端连接从其最后确认的游标恢复。客户端可以乐观渲染事件，但
必须丢弃重复、在持久缺口处暂停，并在继续之前应用快照。

## 9. 回合与批准路径

```text
Client -> initialize / attach / subscribe
Client -> turn/start (idempotency key, admission)
Host   -> accepted turn + cursor (turn.queued when queued)
Host   -> turn.started, ordered item events, ephemeral deltas
Host   -> approval/request or input/request (when policy requires a decision)
Client -> approval/respond | input/respond
Host   -> tool and item events
Host   -> turn.completed | turn.interrupted | turn.failed
Host   -> next queued turn starts
```

`turn/start` 是准入调用。它快速返回一个 `turnId`；不得把一个
HTTP 请求一直保持到模型执行结束。使用 `admission: "queue"` 时，
Host 把回合放进其每会话队列，并在活跃回合的终态事件和持久结算
之后释放它；当终态事件排空观察到运行时繁忙时，桌面必须在释放
回合所有权及其结算守护之后再次唤醒队列。关机不唤醒排队的工作。
队列是 Host 状态，由 host-core 持久化，重启后恢复，并保持到
controller 附加，因此本地桌面和每个远程客户端看到相同的待处理
prompt。客户端断开后回合继续。`turn/stop` 是在下一个
assistant/工具边界的优雅停止；`turn/interrupt` 是立即中止；两者
都是显式且幂等的。仅有传输断开绝不意味着停止或中断。

权限、Plan、Goal 和输入规则保持宿主拥有。远程客户端收到与桌面
提供的相同决策词汇：工具的 `allow-once`、`allow-session` 和
`deny`；Plan 和 Goal 契约的带显式权限模式的 `approve` 或
`reject`；以及 asktool 提示的逐问题回答或跳过。Plan 或 Goal
批准是比提交回合更长命的会话级转换。远程客户端不能选择未通告
的权限模式或直接执行工具；改变持久模式使用 remote-host 配置的
`session/configure`，且仅限空闲时，与本地完全一致。Gateway 路由
的回合从不超出 Host 的远程权限上限。批准寿命是 Host 策略：本地
默认保持 120 秒后拒绝，而当远程订阅者附加时默认为 30 分钟
（D375），有界且可由运营者调整，因为远程批准者很少在键盘前。

## 10. 故障与恢复模型

| 故障 | 要求的行为 |
|---|---|
| 客户端断开 | 保持回合运行；在重放窗口内保留持久事件 |
| 客户端重连 | 重新认证、附加，从游标重放或返回快照 |
| SSH 隧道断开 | 桌面适配器重建转发并按游标恢复；远程回合继续 |
| Gateway 断开 | Agent Host 以有界指数退避重试 Host 链路；本地回合继续 |
| Agent Host 不可用 | 以 `AGENT_UNAVAILABLE` 拒绝新变更；从不自动重放 |
| Agent Host 重启 | 新 epoch；客户端从快照重新同步；持久队列按序恢复并保持到 controller 附加；已开始的工作不重放 |
| Agent Host 崩溃 | 适用现有宿主恢复规则；被中断的工作从不自动重放 |
| 重复变更 | 对同一 principal 和 key 返回原始幂等结果 |
| 持久事件缺口 | 停止应用事件并请求快照；从不猜测中间状态 |
| 慢客户端 | 先丢弃临时事件；在丢失持久事件之前以可恢复游标断开 |
| 过期批准 | 返回 `APPROVAL_EXPIRED`；不执行该工具 |

## 11. 迁移边界

第一个实现交付无头 Agent Host 模块（`packages/agent-host`）。它
拥有会话与回合准入、每会话回合队列、批准 broker、带 epoch 的
内存事件日志和快照构建器，且没有 Electron 依赖。Electron Main
托管该模块，其 IPC 处理器变成它之上的适配器；该迁移可以是增量
的，模块先包裹现有处理器，然后吸收它们。RACP 服务器绑定到该
模块，从不从网络监听器绑定到渲染器 IPC、`host.proxy` 或 Rust
host-core RPC。本地 MCP 控制面（ADR 0203）现在不变，之后可以迁到
同一模块上。

两项本地变更伴随该模块：Rust host-core 通过 `permissions.pending`
读取暴露待处理权限表，使晚附加的客户端收到未决请求；渲染器的
内存 prompt 队列被 Host 拥有的回合队列取代，由 host-core 按其
自己的 ADR 和架构升版持久化（D375），然后才允许多于一个客户端
控制一个会话。

SSH 隧道里程碑在不改变线上契约的情况下增加两个部分：`pi-host`
包（把模块与 Node sidecar 和该平台的 host-core 二进制打包在一起）
和桌面 RACP 客户端适配器（位于 `lib/api.ts` 之下，因此渲染器无需
传输知识）。同一里程碑携带 `tools/advertise` / `tool/execute`
中继和 `terminal/*` 操作。消息集成是 Host 进程内该模块的又一个
调用方，完全不需要传输。

当本地桌面、`pi-host` 包以及（排期后）Gateway 路由暴露相同的
会话/回合/事件行为时，迁移即完成。

## 12. 验收标准

1. 远程客户端可以附加到会话，而不取得其工作区路径或秘密的所有权。
2. 发起客户端断开后回合继续。
3. 第二个客户端可以观察同一回合并接收相同的有序持久事件。
4. 重连要么重放所给游标之后的每个持久事件，要么返回带显式重同步
   原因的完整快照；流式增量从快照的活跃条目恢复。
5. 每个变更幂等，并限定在经认证的 principal 上。
6. 权限、契约和输入请求可以用完整的本地决策词汇远程回答，而不
   绕过宿主策略；晚附加的客户端能看到它附加之前提出的请求。
7. Rust host-core 在桌面上和远程机器上都保持网络不可达。
8. 每个交付的绑定对同一命令序列产生等效的领域结果。
9. 当前的本地 stdio JSON-RPC 和 loopback MCP 路径保持不变。
10. Gateway 路由的回合从不在 Host 的远程权限上限之上运行。
11. 无头 Agent Host 模块在没有 Electron 的情况下运行其测试套件，
    且桌面 IPC、本地 MCP 和 RACP 调用同一个模块。
12. 远程会话的转录、工具、工作区和秘密存活在远程 Host 上；桌面
    在显示状态之外不存储远程工作区的任何内容。
13. 远程会话的目录包含远程 Host 的工具加上桌面通告用于中继的
    工具；中继工具在桌面上执行，从不针对远程工作区。
14. 会话终端在远程机器上、会话根内运行，且只对策略允许的
    principal 打开。

## 13. 修订历史

D374（2026-09-10）在实现之前修订了 D373 目标：一个带浏览器配置
和保留 gRPC 绑定的规范性 v1 绑定、作为首个交付物的无头 Agent
Host 模块、Host 拥有的回合队列、带临时增量的
`{ epoch, sequence }` 游标、完整的本地批准词汇、Host 链路中继
配置、远程权限上限，以及远程批准寿命策略。

D375（2026-09-10）按记录的需求重排了拓扑顺序：桌面作为远程客户
端的 SSH 隧道远程 Host 先交付，出站消息集成第二，Gateway 和浏览
器拓扑保持已规定但未排期。它增加了 `pi-host` 包、桌面 RACP 客户
端适配器、SSH 引导和 loopback 规则、远程会话所有权划分，以及
SSH 配对 owner 设备的上限豁免。同日记录的设计门答复把反向工具
中继和终端放入 R2，从 GitHub Releases 下载 `pi-host`，在
host-core 中持久化回合队列，远程批准寿命默认 30 分钟，把配对设备
豁免做成 Host 策略，并把 Gateway 身份来源固定为 PI 账户服务。

D385（2026-09-10）使远程控制在构造上用户本地：没有项目运营的身
份或账户服务，处处使用 Host 签发的设备凭据，Gateway 只作为自托
管中继。
