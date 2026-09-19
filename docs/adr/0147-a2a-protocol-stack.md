# ADR 0147: 用于子代理协调的 A2A 协议栈

- Status: Superseded by ADR 0165
- Date: 2026-09-02
- Deciders: PI-Desktop core
- Related: D277, D318, D321, ADR 0062, ADR 0089, ADR 0100, ADR 0162, ADR 0164,
  `03-runtime/02-agent-runtime.md` §5f.2,
  `03-runtime/06-host-rpc-protocol.md` §4, E2E-165, E2E-165b, E2E-165c, E2E-165d
- Supersedes: ADR 0138 and ADR 0140. The in-process `SubagentMailbox` and the
  single `Peer` tool are removed. The coordination need those ADRs identified
  is preserved; the mechanism is replaced.
- Amended by: ADR 0162 lifts same-context-only addressing. ADR 0164 lets the
  parent agent register as `kind: "parent"` and call `A2A` to other parents;
  parents still cannot address subagents.

## 背景

ADR 0138 引入了会话作用域的 `SubagentMailbox` 和仅 delegate 可用的
对等工具；ADR 0140 把它们合并为带 `send | inbox | wait` 动作的单个
`Peer` 工具。两者都把协调完全保留在 Node agent-runtime sidecar 的
进程内：消息从不到达 host-core，不携带持久状态，除了运行时提供的
发送者名称之外没有任务生命周期、发现或授权模型。

该机制对兄弟之间有界的文本有效，但它是一个无法扩展的私有协议。它
没有任务状态机（消息是发后即忘）、没有 delegate 重启后可以重读的
持久历史、没有文本之外的类型化载荷、没有 delegate 可以查询的发现
界面，也没有能力模型——只有 sidecar 注入 `from` 这一事实。它还偏离
了业界的 Agent2Agent（A2A）协议，因此 PI-Desktop 构建的任何东西都
无法与该契约互操作，也无法对照它进行推理。

## 决策

用一个真正的 **A2A（Agent2Agent）协议栈**替换对等消息，其 broker
位于 Rust host-core 进程中。agent-runtime sidecar 中的每个子代理是
一个 A2A **客户端**，通过新的 `a2a.*` 方法域，经由既有的 stdio
JSON-RPC 2.0 / NDJSON 传输——即 `plans.*` 域使用的同一管道——触达
broker。没有 HTTP、gRPC 或 REST 服务器，也没有网络 OAuth 栈；整个
A2A 表面都绑定在本地传输上。

A2A 的七个支柱映射到本地语义：

| A2A pillar | Standard form | Local mapping |
|---|---|---|
| 传输 | HTTP + JSON-RPC / SSE | 既有的 stdio NDJSON JSON-RPC 2.0，新增 `a2a.*` 方法域 |
| Agent Card 发现 | `GET /.well-known/agent-card.json` | broker 持有内存中的 agent 注册表；`a2a.agents.list` 返回从每个 `SubagentDefinition`（name/description/skills）派生的卡片 |
| 任务状态机 | 服务器管理的任务生命周期 | host-core 中持久的 SQLite `a2a_tasks` 行：`submitted, working, input-required, auth-required, completed, canceled, failed, rejected`；后四种是终态且不再转换；broker 强制合法转换，`a2a.tasks.status` 驱动任务进入新状态。每个任务同时记录 `agentName`（服务它的 worker）和 `requesterName`（发送第一条消息的对等方） |
| 消息 / Parts | 类型化的 `Part` 联合 | `TextPart{kind:"text",text}` \| `FilePart{kind:"file",file:{name?,mimeType?,uri?,bytes?}}` \| `DataPart{kind:"data",data}`，在 TS（`packages/shared/src/a2a.ts`）和 Rust（`crates/host-core/src/a2a/types.rs`）中镜像 |
| 流式 | 基于 SSE 的 `message/stream` | Host→client JSON-RPC 通知 `a2a.task.event`，携带 `TaskStatusUpdateEvent` / `TaskArtifactUpdateEvent`，形态为 `{ recipient, contextId, event }`；路由**基于对方**——状态/终态事件路由给引发它的一方的对方（worker 的回复或完成唤醒 requester；requester 的跟进唤醒 worker），因此 agent 等待的是发给它自己的事件 |
| 推送通知 | Webhook 配置 | 宿主持有的推送配置（`a2a.tasks.pushNotificationConfig.set/get`）加上 `a2a.push` 通知 `{ recipient, contextId, taskId, token?, status }` |
| 认证 | OAuth / API key | 宿主签发的按 agent 能力令牌：`a2a.agents.register` 返回 `{ agentId, token }`，之后每个 `a2a.*` 调用携带该令牌，宿主校验它并据此授权寻址。令牌由运行时注入，模型永远不可见，保持了发送者 `from` 不可伪造的不变量 |

`contextId` 等于 `sessionId`，把任务与 requester 的会话归组。发现
和寻址跨越宿主上的每个活动 agent（ADR 0162）；无关者仍然无法读取
自己不是当事方的任务。

`a2a.*` 方法（除 `register` 外都携带 `token`）在
`03-runtime/06-host-rpc-protocol.md` §4 中规定；
`a2a.tasks.status({ token, id, state, message? })` 驱动任务进入新状态
（完成 / 失败 / 交互式暂停），对照状态表校验转换，并用 broker 持有
的 `from`/`contextId` 标记任何可选的 `message`。在运行时侧，面向
子代理的单个工具是 `A2A`（替换 `Peer`），动作为 `discover | send |
get | wait | complete | cancel`；`complete` 完成 delegate 服务的任务
并唤醒其 requester。

事件路由**基于对方**。任务创建把新任务寻址给 worker；对既有任务的
`a2a.message.send`、`a2a.tasks.status` 和 `a2a.tasks.cancel` 把
`a2a.task.event`（以及终态且有推送配置时的 `a2a.push`）路由给调用
方的对方——worker 的回复或完成唤醒 requester，requester 的跟进唤醒
worker；`a2a.tasks.resubscribe` 重新发向调用方自己。这闭合了委派
往返：此前 worker 的完成从不到达 requester。delegate 的 `A2A` 工具
在生成/落定时按委派注册/注销，并闭包持有宿主签发的令牌。
`SUBAGENT_A2A_TOOLS = ["A2A"]` 替换 `SUBAGENT_PEER_TOOLS = ["Peer"]`。
ADR 0164 额外把父级注册为 `kind: "parent"`，并把 `A2A` 放入 Agent
模式目录，仅供父级对父级使用。

边界由 broker 强制执行：`A2A_MAX_TEXT_CHARS = 16000`，
`A2A_MAX_FILE_BYTES = 20MB`，`A2A_MAX_TASK_HISTORY = 256`，
`A2A_MAX_TASKS_PER_CONTEXT = 128`，`A2A_MAX_SENDS_PER_RUN = 200`，
`A2A_MAX_STREAM_WAIT_SECONDS = 120`，`A2A_DEFAULT_STREAM_WAIT_SECONDS = 30`。
错误使用 JSON-RPC 数字码 `1400`，`data.errorCode` 为
`A2A_UNKNOWN_TOKEN`、`A2A_UNKNOWN_AGENT`、`A2A_UNKNOWN_TASK`、
`A2A_CROSS_CONTEXT_DENIED`、`A2A_INVALID_TRANSITION`、`A2A_TASK_TERMINAL`、
`A2A_SEND_CAP`、`A2A_NO_PEERS`、`A2A_PAYLOAD_TOO_LARGE` 之一。

## 非目标

- **不做 gRPC、HTTP 或 REST 绑定。** 唯一的传输绑定是本地 stdio
  JSON-RPC 管道。`/.well-known/agent-card.json` 发现端点和 SSE /
  webhook 传输被映射到本地 RPC，而不是真正提供服务。
- **不做真正的 OAuth。** 授权是宿主签发的内存能力令牌，而不是网络
  OAuth 或 API key 交换。
- **不做跨机器或远程 agent。** 每个 agent 都是本机上一个本地会话的
  子代理；宿主进程之外没有 agent。同一宿主机上的跨会话寻址是允许的
  （ADR 0162）。

## 后果

- **协议 v10 和 schema v12 是破坏性变更。** `PROTOCOL_VERSION` 从 9
  升到 10，`app.handshake` 能力数组现在包含 `"a2a"`；无法声明 `a2a`
  的旧宿主在握手时、UI 可交互之前被拒绝。`SCHEMA_VERSION` 从 11 升
  到 12：`migrate_v11_to_v12` 新增 `a2a_agents`、`a2a_tasks`、
  `a2a_messages`、`a2a_artifacts` 和 `a2a_push_configs`。
  `a2a_messages` 的主键是复合的 `(task_id, message_id)`，使客户端
  提供的消息 id 无法跨任务冲突，且每个变更调用（任务创建、既有任务
  发送、状态更新）在单个 SQLite 事务中持久化其多个写入。能力令牌
  仅在内存中，注销时失效。
- 协调现在是持久且可检查的：任务及其消息历史在 SQLite 中存活，
  因此 delegate 可以用 `a2a.tasks.get` 重读任务，生命周期可审计，
  这不同于破坏性读取的邮箱。
- 载荷是类型化的（`TextPart`/`FilePart`/`DataPart`）而不是纯文本，
  因此 delegate 可以在上述边界内交换文件和结构化数据。
- 伪造发送者的不变量在构造上被保持：能力令牌由运行时注入、从不
  暴露给模型，因此 delegate 既不能冒充其他 agent，也不能寻址自己
  不拥有的任务。
- 被取代 ADR 的边界仍然成立：`A2A` 工具绝不进入父级的
  `toolCatalog`；已落定的 delegate 被注销并使其令牌失效；流式等待
  上限（120s）保持在 300 秒空闲看门狗之下。
- 未解决：与父级的消息、嵌套委派，以及任何远程或跨机器传输。跨
  会话寻址由 ADR 0162 决定。

## 考虑过的替代方案

- **保留进程内邮箱（ADR 0138/0140）：** 否决。它无法携带任务生命
  周期、持久历史、类型化载荷、发现或真正的授权模型，而且是一个
  其他组件无法推理的私有契约。
- **在 host-core 中运行真正的 A2A HTTP/SSE 服务器：** 否决。它会为
  一个纯本地、同会话的协调需求增加网络监听器、OAuth 栈和跨机器
  表面。把 A2A 语义绑定到既有的 JSON-RPC 管道上，可以获得协议形态
  而完全没有那些攻击面。
- **把 broker 放在 sidecar 而不是 host-core：** 否决。持久的任务
  状态、迁移和能力令牌权威属于已经持有 SQLite 和安全边界的进程；
  sidecar 持有的 broker 会重复持久化，并且无法在 sidecar 重启后
  存活。
