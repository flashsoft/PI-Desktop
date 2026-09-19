# ADR 0153: 在 transcript 旁为流式回复做检查点

- Status: Accepted (amended 2026-09-06 by D327)
- Date: 2026-09-05
- Deciders: PI-Desktop core
- Related: D119, D287, D288, D299, D327, E2E-010, E2E-171, E2E-184, ADR 0030, ADR 0041

## 背景

Spec 04 让 assistant 和工具行在其结束事件时持久化：agent 运行时发出
一次 `message_end`，Electron 主进程通过持久化 outbox 追加该行。在此
之前用户看着流式输出的一切只存在于渲染进程和 sidecar 的内存中。
agentic 回复会流式输出数分钟，而应用经常被退出或重启。因此回复
中途的退出、sidecar 崩溃或重启会丢失整个回复：启动清扫把该轮次
标记为 `aborted`，重新打开的会话显示提示词而下面什么都没有。本周
的会话日志显示一天内有八个这样的轮次。

两个较小的缺陷加剧了问题。`before-quit` 先销毁 host-core，然后直接
杀死 sidecar，因此即使一个回复已经到达其最终消息也无法被持久化。
而渲染进程的 Stop 路径对长会话会重读持久的 transcript、用它替换
实时行、并从该快照重写 transcript；运行时的中止最终行通常还在
outbox 中，因此重写会立即隐藏回复，且如果追加恰好落在中间还可能
删除它。同样的重写还会把渲染进程 64 KB 显示截断的行写回覆盖完整
的行。

## 决策

1. **检查点文件，而不是 transcript 行。** Host-core 持有
   `sessions/<id>.inflight.json`：一个原子替换的对象，保存会话的流式
   assistant 消息及其轮次 id。Electron 主进程观察 `message_update`，
   保留最新快照，并最多每 1.5 秒调用一次
   `session.saveInflightMessage`，带尾随写入。把检查点作为
   transcript 行追加被否决：一个数分钟的回复会留下几十份近似副本，
   使文件膨胀并扭曲物理行分页窗口。
2. **落定规则。** 同一 id 的最终 `session.appendMessage` 删除该文件。
   `session.endTurn` 对 `completed`/`error` 删除它；当被要求
   `recoverInflight`（sidecar 已消失）时把它提升为一个 `aborted`
   assistant 行；对普通的 `aborted`（用户 Stop）则保留它不动，使
   运行时自己的最终行可以取代它。宿主启动提升每一个最终行从未落地
   的残留检查点。对应 id 已被索引的检查点会被丢弃，因此最终行落地
   时仍在途中的写入无法复活它。检查点绕过 outbox；delegate 的回复
   不做检查点。
3. **退出先落定轮次。** `before-quit` 冲刷检查点，通过 sidecar 中止
   活动轮次，并在 host-core 存活期间最多等待 2 秒让中止行排空，
   然后销毁宿主和 sidecar。
4. **渲染进程 Stop 绝不重写已开始的回复。** 落定在内存中进行；持久
   副本是运行时的中止行或被提升的检查点。未回复提示词的撤销和消息
   删除只从完整持久 transcript 与实时行合并后的结果重写，且撤销在
   该合并上重新求值。

## 后果

- 退出或崩溃时的丢失有界：回复的最后 1.5 秒加上仍在运行的工具行；
  重新打开的会话显示提示词和作为 `aborted` 行的部分回复，位于一个
  `aborted` 轮次之下。
- 每个流式会话每个间隔一次小文件写入；SQLite 中没有新增内容。
  `session.endTurn` 获得 `recoverInflight` 和 `recovered`。
- 会话删除会随其他会话文件一起移除检查点文件。
- Spec 01 §5.3、04 §2.1 和 §4.7、06、07 §5；E2E-171；D299。

## 修订 (2026-09-06) — 已完成的回复在进程重启后存活 (D327)

Issue #42 显示，完全退出后出现了 D324 为进程内会话切换修复过的同
样只有用户消息的 transcript。两条落定规则丢弃了一个仍只在 outbox
中的已完成回复：

1. `message_end` 在入队之前调用 `settle()`，因此宿主检查点最多落后
   1.5 秒，且已完成快照的尾随写入被取消。
2. `completed`/`error` 的 `session.endTurn` 即使在该 id 尚未被索引时
   也删除检查点。启动恢复随后拒绝提升一个其轮次已经 `completed`
   的残留检查点。再加上握手后一次发后即忘的 outbox 冲刷，冷
   `session.get` 只画出用户行。

修订：

- Electron 主进程先为已完成的 `message_end` 快照做检查点，然后
  `settleIf`，使该写入期间开始的新轮次不会被清掉。
- `completed`/`error` 的 endTurn 只在最终行已被索引时删除检查点。
  未索引的残留检查点保留给 outbox 或启动使用。
- 启动/恢复提升一个其轮次为 `completed` 的残留检查点时，该行写为
  `complete` 而不是 `aborted`。其他残留检查点保持 `aborted`。
- 宿主握手在渲染进程可以 `session.get` 之前**等待**持久化 outbox
  排空，然后调用 `session.recoverInflightMessages`（修订 ADR 0041）。
  启动恢复跳过已完成的残留检查点，使已完成的 outbox 行胜出。同一
  outbox 中的工具行由该排空覆盖；它们仍不做检查点。

退出仍然（有界地）等待活动轮次。outbox 文件写入之后的硬杀死由
被等待的握手排空恢复。该持久化之前的硬杀死由已完成的检查点恢复。
