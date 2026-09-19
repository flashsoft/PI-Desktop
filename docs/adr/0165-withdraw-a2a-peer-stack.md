# ADR 0165: 撤回 A2A / Peer 协调栈

- 状态：已接受
- 日期：2026-09-05
- 决策者：PI-Desktop 核心团队
- 相关：D326、D277、D318、D321、D325、ADR 0062、ADR 0089、
  `03-runtime/02-agent-runtime.md` §5f.2、
  `03-runtime/03-tools-and-permissions.md` §10.2、
  `03-runtime/06-host-rpc-protocol.md` §3–§4、E2E-165
- 取代：ADR 0147、ADR 0162 和 ADR 0164。ADR 0138 和 ADR 0140 仍由
  ADR 0147 取代；本 ADR 撤回的是那些记录所描述的替代实现。历史 ADR
  文件予以保留。

## 背景

ADR 0138 引入了进程内子 agent peer 消息（`PeerSend` / `PeerInbox` /
`PeerWait`）。ADR 0140 将它们合并为一个 `Peer` 工具。ADR 0147 用
host-core 的 Agent2Agent（A2A）broker、`a2a.*` RPC 域、持久的 `a2a_*`
SQLite 表和委托 `A2A` 工具取代了该邮箱。随后 ADR 0162 解除了仅限同
会话的寻址；ADR 0164 / D325 为 Agent 模式父级提供了核心 `A2A` 工具，
使会话之间可以协调。

这套栈不再被需要。同级和父级对父级通道与现有的 `Task` / `TaskWait` /
`TaskList` / `TaskStop` 契约并存，增加了应用其余部分并未使用的协议
能力，且容易被模型忽略或误用。并发委托已经通过父级汇报；这已经足够。

## 决策

从产品中移除 A2A / Peer 协调栈：

1. **不再有 A2A 或 Peer 工具。** 这两个名字都不是核心 Agent 工具、
   可分配的子 agent 工具或 `ToolSearch` 结果。定义中列出 `A2A` 或
   `Peer` 的，与任何其他未知工具名一样处理：丢弃并给出解析警告。
2. **不再有 broker。** 删除 host-core 的 `a2a` 模块、内存注册表、遗留
   的进程内 `SubagentMailbox`，以及所有 `a2a.*` RPC 方法和
   `a2a.task.event` / `a2a.push` 通知。
3. **不再有父级或同级通道。** 并发委托只能通过编写自包含的报告来
   协调，由父级通过 `Task*` 收集。父级不发现、不通信、不等待其他会话。
4. **协议 v11。** 握手 `PROTOCOL_VERSION` 从 10 升至 11。`capabilities`
   数组不再声明 `"a2a"`。v10 的宿主或客户端在握手时被拒绝，与历次
   升级相同的精确匹配规则。
5. **Schema v13。** `SCHEMA_VERSION` 从 12 升至 13。`migrate_v12_to_v13`
   删除 A2A 表（`a2a_tasks`、`a2a_messages`、`a2a_artifacts`、
   `a2a_push_configs`）。新建数据库从不创建它们。v11→v12 步骤作为纯
   版本号升级保留在迁移链中，使现有备份和链式迁移继续可用；它不再
   创建 v13 会立即删除的表。

委托本身（ADR 0062 / ADR 0089）不变：`Task` 仍然展开有界 worker，
报告仍然在 `TaskWait` 之前不进入父级模型上下文，内置工具默认保持
只读。

## 后果

- 跨会话和同级消息不复存在。希望两个会话共享事实的用户在 prompt 中
  完成，而不是通过工具。
- 圆桌示例插件不再指示委托调用 `Peer` 或 `A2A`。它运行独立的并发
  `Task`，并由父级综合各报告，可选地将较早的报告馈入后一轮的 brief。
- 0.11.3（peer 消息）和 0.12.0（A2A）的历史变更日志条目作为已发布
  历史保留。产品 README 移除当前的 A2A 声明。
- ADR 0138、0140、0147、0162 和 0164 作为记录保留在磁盘上。
