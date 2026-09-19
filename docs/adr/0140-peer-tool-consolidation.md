# ADR 0140: 将三个对等工具合并为一个 `Peer` 工具

- Status: Superseded by ADR 0147
- Date: 2026-08-31
- Deciders: PI-Desktop core
- Related: D277, ADR 0138, ADR 0062, ADR 0089, ADR 0147,
  `03-runtime/02-agent-runtime.md` §5f, E2E-165, E2E-165b
- Amends: ADR 0138 clauses 2 and 3. The mailbox semantics, the caps, and every
  boundary ADR 0138 established are unchanged; this decision only changes the
  *tool surface* a delegate declares and calls.

> 由 ADR 0147 取代。本 ADR 确定的单个 `Peer` 工具被针对 host-core
> A2A broker 的 `A2A` 工具（actions `discover | send | get | wait |
> cancel`）替代。保留本文档是因为"一个工具优于三个"的计数论证延续
> 到了 A2A 工具表面，也因为 `SUBAGENT_A2A_TOOLS = ["A2A"]` 是本 ADR
> 定义的 `SUBAGENT_PEER_TOOLS = ["Peer"]` 映射的直接后继。

## 背景

ADR 0138 以三个仅 delegate 可用的工具——`PeerSend`、`PeerInbox` 和
`PeerWait`——引入了对等消息，可声明在定义的 `tools:` 列表中。选择
启用的 delegate 写 `tools: [..., "PeerSend", "PeerInbox", "PeerWait"]`，
其生成器会物化三个独立的工具。

这种拆分有一个计数问题。对等消息是一种能力：它在运行中的 delegate
之间携带有限的文本。为它列出三个机器工具名会夸大定义声明的工具
数量，迫使圆桌简报在每个使用点写出三个名字，并让父级的 `Task` 工具
目录读起来像对等消息是三种不相关的能力。这些操作在每次调用中也是
互斥的——delegate 要么发送、要么读取、要么等待——因此它们绝不会在
一次调用中组合，而这正是 `action` 参数适用的形态。

## 决策

把三个工具合并为**一个 `Peer` 工具**，由必需的 `action` 参数选择：

- `Peer(action="send", to?, text, topic?, inReplyTo?)` — 原
  `PeerSend`：向一个运行中的对等方投递便条，省略 `to` 时投递给所有
  对等方。广播计为一次发送。
- `Peer(action="inbox", from?)` — 原 `PeerInbox`：取走排队的消息并
  列出运行中的对等方；绝不阻塞。
- `Peer(action="wait", timeoutSeconds?, from?)` — 原 `PeerWait`：
  阻塞直到有消息到达、超时到期、最后一个对等方离开或运行被中止。

ADR 0138 的其他内容完全按原决定保留：

- `SUBAGENT_PEER_TOOLS` 现在是 `["Peer"]`；`isSubagentPeerTool` 和
  `subagentUsesPeerMessaging` 保持其含义（声明了对等工具 → 对等消息
  开启）。
- `action` 是唯一必需的参数（`PEER_ACTIONS` 字面量的 `Type.Union`）；
  所有操作专属参数都是可选的，并在分发体内校验。省略或未知的
  `action` 回退到 `inbox`——只读、绝不阻塞的操作——安全的默认值。
- 该工具仍在生成时按 delegate 构建，仍闭包持有运行时提供的 peer
  id，仍**不在 `toolCatalog` 中**，因此父级无法触达它。
- 邮箱（会话作用域的 `SubagentMailbox`，join/leave/send/drain/wait，
  上限为 2,000 字符、80 字符主题、64 条收件箱消息、每次运行 60 次
  发送、120 秒等待上限）不受影响。操作名 `send`、`inbox`、`wait`
  与邮箱的 `send`、`drain` 和 `waitForMessages` 方法一一对应。

## 后果

- 启用对等的定义现在声明一个工具：`tools: [..., "Peer"]`，指南可以
  把该能力作为一个整体描述。
- `Peer` 工具在一个 `execute` 内分发，因此三个操作共享一个参数表面
  和一个记录运行了哪个 `action` 的 `details` 形态；transcript 仍将
  该调用记录为一次由 `parentToolCallId` 和 `agentName` 归因的单个
  对等工具调用。
- 圆桌示例、agent-runtime 指南块和委派圆桌条目都引用
  `Peer(action=...)` 而不是三个名字。
- ADR 0138 的四个不变量仍然是硬性的：`Peer` 工具绝不得进入
  `toolCatalog`；发送者名称必须保持由运行时提供；已落定的 delegate
  必须离开邮箱；等待上限必须保持在 300 秒空闲看门狗之下。
- 未解决：没有新增。跨会话消息、与父级的消息、嵌套委派和持久的
  对等历史保持不做，与 ADR 0138 完全一致。

## 考虑过的替代方案

- **保留三个工具：** 否决，因为促成此决策的请求明确表示契约应读作
  一个工具；三个名字还会夸大每个计数表面和每份简报。
- **带三个布尔操作标志的 `Peer` 工具：** 否决——每次调用恰好运行
  一个操作，因此互斥布尔会招致无效调用，而 `action` 枚举在构造上
  排除了它们。
- **保留操作名为独立工具但隐藏在单个声明名之后：** 否决——这种
  折中保留了额外的 transcript 和目录表面，同时增加了一个令人困惑
  的声明↔运行时映射。
