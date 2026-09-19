# ADR 0162: 跨会话 A2A 寻址

- 状态：已被 ADR 0165 取代
- 日期：2026-09-05
- 决策者：PI-Desktop 核心团队
- 相关：D318、D277、ADR 0147、ADR 0062、ADR 0089、
  `03-runtime/02-agent-runtime.md` §5f.2、
  `03-runtime/06-host-rpc-protocol.md` §4、E2E-165、E2E-165b、E2E-165c
- 修订：ADR 0147。本地 A2A broker、capability-token 认证、类型化 parts、
  持久任务生命周期以及父级不可调用 A2A 的边界均保持不变。
  仅解除"仅限同一上下文"的寻址限制。

## 背景

ADR 0147 将每个 A2A agent 绑定到 `contextId = sessionId`，并以
`A2A_CROSS_CONTEXT_DENIED` 拒绝跨上下文的发现、发送和任务访问。这与它
所替代的进程内邮箱一致——后者按构造就是会话作用域的。

broker 本身已经是进程全局的：host-core 中一个内存注册表、一条 sidecar
JSON-RPC 管道，以及每个会话一个 `DesktopAgentRuntime`。来自不同会话的
agent 已经位于同一个 map 中；隔离只是一个过滤器。因此，两个打开会话中
的并发工作即使两个委托都位于同一宿主本地，也无法共享一个事实、一个
文件认领或一个圆桌席位。

剩余的风险在于身份而非传输。peer id 在单个会话内唯一（`discussant`、
`discussant-2`），但跨会话不唯一，因此两个聊天都可能运行 `discussant`。
任务将这些 id 存为 `agentName` / `requesterName`，而 sidecar 会把
`a2a.task.event` 广播给每个会话运行时。天真地解除过滤器会让错误的
`discussant` 读到任务，或被另一个会话的事件唤醒。

## 决策

允许在同一宿主上跨会话进行 A2A 发现与寻址。

1. **`a2a.agents.list` 返回所有其他存活 agent**，而不仅是调用方的
   `contextId`。每张 Agent Card 携带 `contextId`（其注册时所属的会话
   id），使委托可以区分同会话 peer 与其他会话 peer。调用方自己的卡片
   仍然排除在外。
2. **`a2a.message.send` 可寻址任何已注册的 peer。** 当 `to` 省略时，
   broker 仍优先选择同会话 peer（保留现今的"唯一另一个 peer"默认
   行为），其次才选择唯一的其他会话 peer。
3. **任务访问以成员关系为准，而非上下文。** 调用方必须是任务的
   `requesterName` 或 `agentName`。无关者——无论是否同会话——仍以
   `A2A_UNKNOWN_AGENT` 失败。`A2A_CROSS_CONTEXT_DENIED` 为保持传输
   兼容性保留在错误码列表中，但不再产生。任务上的 `contextId` 仍然是
   请求方的会话 id，并继续约束 `A2A_MAX_TASKS_PER_CONTEXT`。
4. **存活 peer id 在注册表内唯一。** 在 `a2a.agents.register` 时，如果
   `card.name` 已被占用，broker 会为其追加后缀（`discussant-2`……）并
   返回唯一化后的 `agentId`。运行时将该 id 应用于委托的 A2A 工具、
   等待队列和 prompt，使任务上的 `agentName` / `requesterName` 不会与
   另一个存活 agent 冲突。
5. **事件携带 `recipientContextId`。** `a2a.task.event` 和 `a2a.push` 的
   结构为 `{ recipient, recipientContextId, contextId, … }`。每个会话
   运行时仅在 `recipientContextId` 等于其 `sessionId` 时投递事件（字段
   省略时保持现今的同会话投递）。这阻止了共享 sidecar 管道上的广播为
   错误的会话排队工作。
6. **不变的边界（由 ADR 0164 修订）。** 已终结的委托会被注销。仍然
   没有嵌套委托，也没有远程或跨机器传输。父级对父级的 A2A 属于
   ADR 0164；父级仍然不能寻址子 agent。

## 后果

- 两个位于不同打开会话中、具备 A2A 能力的委托可以互相发现、创建持久
  任务并完成对方往返。
- 常见情况下同会话 A2A 不变：名字唯一、省略 `to` 选择另一个本地
  peer、事件仍唤醒本地等待者。
- 第二个会话中名为 `discussant` 的定义，在第一个会话已持有
  `discussant` 时可能注册为 `discussant-2`。委托会被告知其分配到的
  peer id。
- `A2A_CROSS_CONTEXT_DENIED` 仍是有文档记录的错误码但不再使用。新的
  跨会话失败为 `A2A_UNKNOWN_AGENT`、`A2A_UNKNOWN_TASK` 或
  `A2A_NO_PEERS`。
- 未解决：嵌套委托和任何网络 A2A 绑定。父级对父级 A2A 在 ADR 0164
  中决策。注销后的名字复用（后来的 `discussant` 读到仍指向
  `discussant` 的陈旧任务）与现今的会话内风险相同。

## 已考虑的替代方案

- **保持同会话隔离：** 否决。用户可见的需求是会话间协调，而 broker
  已经是全局的；该拒绝是遗留的邮箱边界，而非传输限制。
- **按 `(name, contextId)` 寻址而不唯一化名字：** 否决。任务将
  `agentName` / `requesterName` 持久化为字符串；两个存活的 `bob`
  agent 都会通过成员检查。注册时唯一化保持了该契约。
- **将存储的名字限定为 `name@contextId`：** 否决。这会把会话 id 泄露
  到模型读取的每一条任务摘要中，且仍然需要在共享管道上做事件过滤。
