# ADR 0265：宿主持有 turn 队列的优先块与行动作

- Status: Accepted for implementation
- Date: 2026-09-15
- Amends: ADR 0213（持久化的宿主持有 turn 队列）、ADR 0118（渲染进程持有
  的排队 prompt 与 turn 边界停止）

## 背景

ADR 0213 把队列移入 host-core，并给「Send now」恰好一种形态：
`prioritize` 把条目的 `position` 重写到当前最小值之下，使该条目跳到整
个队列的头部。渲染进程把它镜像为单一的内存 `sendNowRequested` 标志，
在每个其他行上清除，这意味着任何时刻只有一行能等待下一个边界，两次
「Send now」点击解析为「最后一次点击胜出」。

排队行也只提供 Remove 和 Send now。用户不删除重打就无法更正排队的
prompt，也根本无法重排普通队列——尽管 Host 已经按持久的 `position`
排序。

## 决策

1. **提升块，按点击排序。** `turn_queue` 新增可空的 `priority` 列
   （schema v18）。提升条目在 session 内写入
   `COALESCE(MAX(priority), 0) + 1`，因此第一个提升最先投递，之后每个
   提升排在它后面。投递顺序是被提升条目按 `priority ASC, position ASC`，
   随后其余按 `position ASC`；普通队列保持自己的顺序。
2. **提升是单向的且拒绝幂等。** 提升已经携带 `priority` 的条目以
   `CONFLICT`/`ALREADY_PRIORITIZED` 失败，而不是静默地再次移动它。
   `session.queuePrioritize` 保持移动；乐观镜像做同样的事。
3. **被提升的行被锁定。** 因为 Host 已经承诺启动它，它的行禁用上移、
   下移、编辑和移除，其 Send now 按钮读作已定（`chat.sendNowPending`）。
   禁用的控件保留其 tooltip 和 `aria-disabled` 状态，使锁定得到解释而
   不是沉默。刻意没有取消提升的路径：提升不能被应用一半。
4. **普通队列的重排操作。** `session.queueReorder` 把条目的 `position`
   与请求方向上相邻的非提升邻居交换，并对缺失的条目、被提升的条目或
   块/队列边缘报告 `moved: false`。被提升的条目永远不是邻居，因此重
   排绝不会跨入优先块。渲染进程镜像一次交换，对边界无操作绝不触及
   Host。
5. **编辑把行送回 composer。** 编辑是渲染进程本地的：行被移除（通过
   现有的移除路径），其捕获的 `ComposerDraftSnapshot`——文本加内联文
   件引用——通过现有的 `composerPrefill` 通道替换 composer 输入。经
   token 剥离的 `content` 绝不用于重建 prompt。输入非空时该动作以
   toast 拒绝，空检查针对实时编辑器读取运行，因为草稿缓存不是按按键
   写入的。
6. **提升块作为相邻消息投递，而不是独立的 turn。** 提升本身仍不触碰
   运行中的 turn：渲染进程请求现有的优雅 `agent/stop`，块在下一个边
   界离开。第一个被提升的条目随后启动 turn，之后每个被提升的条目通
   过 Composer 现有的 steering 通道作为用户输入注入同一 turn。因此
   transcript 读作 `user: first`、`user: second`，模型回答一次。注入有
   界重试，因为运行时只接受活跃运行的输入；仍未投递的条目保持排队，
   在下一个边界作为自己的 turn 离开——这是先前的行为，绝不是丢失的
   prompt。被注入条目自己的 RACP turn 被取消：它的输入已由另一个 turn
   投递，任何客户端都不得被留下认为它仍在等待。
7. **Turn 的所有者对其结束是权威的。** 运行时终止事件不是可靠的释
   放：Main 丢弃命名它不再拥有的 turn 的事件（`isStaleTerminalEvent`），
   而中止可能根本不产生事件。留在模块内活跃的 turn 会永远持有其
   session 的队列——这正是「Send now，然后 Stop」让排队行搁浅的原
   因。因此 `finishTurn` 报告的结算在模块中关闭该 turn（标记为结算原
   因，取消其批准和输入）并让队列运行，而模块的 drain 请求在一次
   pass 运行期间被记住而不是被丢弃。

## 后果与验证

对现有通道没有破坏性变更：`agentQueuePrioritize` /
`session.queuePrioritize` 保留其名称并获得块语义，
`agentQueueReorder` / `session.queueReorder` 是增量的。现有行以
`priority = NULL` 迁移，因此升级的数据库保持其 FIFO 顺序和八条目上限。
行级单元覆盖位于 `turn_queue` 测试（提升顺序、重排、已提升行拒绝、
v16 升级）、`turn-queue.test.ts` / `agent-host.test.ts`（块顺序、权限）
和 `composer-send-state.test.mjs`（锁定、重排和编辑契约）。渲染旅程规
定为 E2E-QUEUE-promote-orders-delivery-by-click、
E2E-QUEUE-reorder-moves-plain-neighbours 和
E2E-QUEUE-edit-restores-draft-only-when-input-empty，在执行渲染 E2E 验
证之前保持 Draft。
