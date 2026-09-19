# ADR 0213: 在 host-core 中持久化宿主拥有的轮次队列

- Status: Accepted
- Date: 2026-09-10
- Decision: D386
- Related: ADR 0205 (D375), `03-runtime/04-data-storage.md` §4.6b,
  `03-runtime/06-host-rpc-protocol.md`,
  `02-architecture/05-remote-agent-control.md` §6

## Context

D375 把每会话的 prompt 队列从渲染进程内存移入 Host，并选择将其持久
化。无头 Agent Host 模块（`packages/agent-host`）拥有准入和排空，但
它需要一个能在重启后存活、且绝不会自行开始工作的存储。Rust
host-core 独占拥有 SQLite（冻结决策 12），因此该存储是 host-core 的
一张表和一个 RPC 界面，而不是该模块写入的文件。

## Decision

1. **Schema v15 添加 `turn_queue`。** 列：`id`、`session_id`（FK，
   级联）、`principal`、`idempotency_key`、`input_hash`、`content`、
   `attachments_json`、`permission_mode`、`position`、`created_at`；
   一个按会话的 `position` 索引和一个唯一的
   `(session_id, principal, idempotency_key)` 索引。v14→v15 迁移是增
   量式的：它创建表和索引，每条现有链都增加这一步骤，并像以往每次
   迁移一样保留一份 `pi.sqlite.v14.bak` 副本。
2. **四个增量 RPC 方法。** `session.queuePush` 在
   `(session, principal, idempotencyKey)` 上幂等：输入哈希匹配时返回
   现有条目；键被搭配其他输入复用时以 `IDEMPOTENCY_CONFLICT` 失败；
   会话已持有八个条目时以 `AGENT_BUSY` 失败。`session.queueList` 返回
   一个会话的条目，或按 position 顺序返回所有条目。
   `session.queueRemove` 删除一个条目。`session.queuePrioritize` 把一
   个条目移到其会话的头部（桌面的“立即发送”，RACP 的
   `turn/prioritize`）。协议版本保持 v11。
3. **存储绝不决定执行。** Agent Host 模块在 host-core 应答时恢复条
   目，把每个恢复的会话持有到某个控制器接入为止，且只在活动轮次的
   终止事件之后排空一个条目。启动栅栏仍然绝不重放或自动开始工作。
4. **渲染进程的内存队列被退役。** Composer 通过
   `agent/queue/push` 推送，镜像 `agent/event/queueChanged`，其“立即
   发送”是 `agent/queue/prioritize` 之后接一次优雅停止。

## Consequences

- 重启不再丢失排队的 prompt；它们以被持有的状态重新出现在快照的
  `queuedTurns` 中。
- 渲染进程切换落地之后，Host 的每个客户端看到同一个队列。
- 删除会话会级联到它的队列条目。
- 全新安装和每条迁移路径都产出 schema v15；`04-data-storage.md` 迁
  移链、基线和 README 都移动到 v15。

## Alternatives considered

- 像 D373 草案那样把队列保留在 Agent Host 内存中。被 D375 拒绝：重
  启会丢失 prompt。
- 在渲染进程的 `localStorage` 中持久化。被拒绝：对其他客户端和无头
  Host 不可见。
