# ADR 0060: 在 RPC 锁下归档 Regenerate 分支

- 状态： 已接受
- 日期： 2026-08-06
- 决策者： PI-Desktop 核心
- 相关： D119（transcript 文件存储）、D109（regenerate 历史分页器）、
  ADR 0041（解耦消息持久化）

## 背景

Electron 主进程中的轮次完成逻辑用一次跨四个宿主调用的读-改-写来归档已完成
的 regenerate 分支：`session.get`、`session.listRevisions`、
`session.saveRevision`，然后是 `session.replaceMessages`，用来在用户根上打
印分页器元数据（`revisionRootId` / `revisionCount` / `activeRevision`）。

assistant 与 tool 消息不走这条路径。它们经由应用持有的
`PersistenceOutbox`（ADR 0041），通过 `session.appendMessage` 异步到达
SQLite。因此两条路径竞争，`session.get` 可能观测到比它正在归档的轮次少一
条消息的 transcript。

`session.replaceMessages` 是整 transcript 重写：它删除会话的所有索引行，
并从调用方的数组重写 transcript 文件。在 outbox 冲刷完成之前拍摄的快照会
被作为事实写回，因此其间追加的消息会从 transcript 文件和索引中同时被删
除。一个已观测到的会话正是这样丢失了最后的 assistant 消息——模型调用成
功（`outcome=ok`、`providerStatus=200`），追加也成功了，而仅为打印的重写在
62 ms 之后从过期快照落地。这次重写还丢弃了每行的 `turn_id`，因为重新插入
的索引行没有携带轮次归属。

在那个案例中写入的元数据是空操作：根已携带预期的 `revisionCount` /
`activeRevision`。一次只为幂等打印的重写摧毁了一条消息。

## 决策

1. 轮次完成调用一个新的宿主方法 `session.saveActiveRevision`，它在持有宿主
   状态锁的同时，在单个 RPC 内完成读取、归档与打印。没有 transcript 快照
   跨越进程边界，也不存在让并发 `session.appendMessage` 被覆盖的窗口。
2. 分页器打印恰好重写一行 transcript（`transcripts::update_message`），其
   他每一行原样复制。文件在该函数内重新读取，因此在任何调用方自己的读取
   之后追加的行都能存活。元数据打印再也不能让 transcript 付出最新消息的
   代价。
3. Electron 主进程在调用之前冲刷持久化 outbox，并在 outbox 无法冲刷时跳过
   归档（带警告）。一旦用户翻回某个分支，不完整的分支归档会永远静默出
   错，所以不归档是更好的失败。
4. `session.replaceMessages` 在重写后保留每条幸存消息的所属 `turn_id`。
   剩余调用方（regenerate 截断、工具评审状态）不再从索引剥离轮次归属。
5. `session.replaceMessages` 被文档化为只对在调用期间持有整个 transcript
   的调用方安全。从 Electron 主进程对它做读-改-写不是受支持的模式。
6. 新方法是加法式的，协议版本保持 9。宿主与 Electron 在同一产物中发布，
   没有该方法的宿主会让调用失败，而调用方已把这种情况记录为跳过归档而不
   是当作数据丢失。v9 客户端依赖的任何东西都不变。

## 已考虑的备选方案

- **等待 outbox 并保留四调用重写：** 缩小窗口但不关闭它。追加路径上的任
  何未来写入者都会重新打开它，且破坏性原语仍留在轮次完成路径中。已拒绝。
- **通过定向 `session.updateMessage` RPC 打印，并把归档留在 Electron：**
  仍是两次宿主调用，且归档在锁外读取快照，所以即使存活 transcript 幸存，
  归档的分支仍可能缺少最后一条消息。已拒绝。
- **让 `session.replaceMessages` 合并未知的更新消息：** 在一个契约是"这就
  是 transcript"的方法中做隐式合并，会让 regenerate 截断无法删除任何东
  西。已拒绝。
- **把协议版本提升到 10：** 不会换来任何协商，因为握手已要求一起发布的组
  件之间精确相等，还迫使编辑五个无关的冻结契约守卫。已拒绝。

## 后果

- 在 regenerate 之后完成的轮次不再可能丢失最后的 assistant 消息，归档的
  分支包含完整轮次。
- `turn_id` 在 transcript 重写后存活，因此按轮次查询与诊断在 regenerate 与
  工具评审更新之后保持准确。
- Electron 主进程持有更少的 transcript 逻辑：分支根查找、修订索引运算与打
  印现在位于 host-core 并带单元测试，其中包括一个在归档读取之后追加消息的
  测试。
- 已被之前行为丢失的数据不可恢复；该消息在重写后的 transcript 与归档的修
  订负载中都不存在。
