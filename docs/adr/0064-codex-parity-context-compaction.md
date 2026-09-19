# ADR 0064: 与 Codex 对齐的上下文压缩

- 状态： 已接受
- 日期： 2026-08-06
- 决策者： PI-Desktop 核心
- 修订： ADR 0061 / ADR 0030 / D158 / D200；经 ADR 0136 修订

## 背景

ADR 0061 让压缩不可感知，并引用 Codex 作为这样做的参照。事后阅读 Codex 源
码发现，它的四个条款与 Codex 实际做法相反，且其背景节中的一个事实性陈述是
错的：

| Codex | ADR 0061 |
| --- | --- |
| 压缩只有同步；任何地方都没有预计算 | 检查点在 provider 空闲窗口预计算（条款 4） |
| 自动压缩阈值作用域默认是整个上下文；`BodyAfterPrefix` 是可选的 | 后台触发衡量自上次检查点以来的增量（条款 2） |
| 每次压缩都发出 `ContextCompaction` 轮次条目**和** `EventMsg::Warning` | 成功的压缩不通知任何人且不留行（条款 7、8） |
| `new_context` 是真正的面向模型的工具，由 `Feature::TokenBudget` 门控 | "Codex 也完全没有任何模型侧压缩工具"（第 31 行）；该工具被移除（条款 6） |
| 压缩后模型上下文保留最近的**用户**消息（≤20k token）加摘要 | 保留尾部保留完整的最近轮次，包括 assistant 与 tool 消息 |
| 两个家族：LLM 摘要压缩与无摘要的翻滚进入新窗口 | 一个家族，总是摘要 |
| 两级预算提醒（`TokenBudgetReminder`，然后 `AutoCompactFallbackPrompt`），每窗口各一次 | 完全没有面向模型的提示（条款 6） |

以上各项的源码锚点：

- `core/src/compact.rs` —— `COMPACT_USER_MESSAGE_MAX_TOKENS = 20_000`；
  `build_compacted_history_with_limit()` 按最新优先遍历历史，只保留用户消
  息，截断越过限制的那一条，`reverse()` 回顺序，然后追加摘要；`:384` 在
  每次压缩后抛出 `EventMsg::Warning`。
- `core/src/compact_token_budget.rs` —— 无摘要路径运行相同的压缩生命周
  期，发出相同的 `ContextCompaction` 轮次条目，然后调用
  `start_new_context_window()`。
- `session/mod.rs:3665 start_new_context_window()` —— 历史被清空为初始上
  下文加轮次上下文条目，`message: String::new()`。
- `session/turn.rs:423` ——
  `should_roll_over = needs_follow_up && (take_new_context_window_request() || token_limit_reached)`：
  触发在轮次边界内联评估。
- `session/token_budget.rs:66 maybe_record()` —— 第一级在
  `remaining <= reminder_threshold_tokens`，第二级在 `remaining == 0 &&
  allow_fallback`，每个窗口各认领一次。
- `tools/spec_plan.rs:994` 与 `tools/handlers/new_context_window_spec.rs` ——
  `new_context`，无参数，描述为 "Start a new context window. Does
  not clear, reset, or otherwise affect environment state."

用户明确要求与 Codex 对齐，被告知这会推翻他们前一轮要求的不可感知目标，
并再次确认。只有一条 ADR 0061 条款凭自身价值成立*且*与 Codex 一致：隐藏
调优旋钮。Codex 从模型元数据读取保留与留存值，也从不询问用户。

## 决策

压缩遵循 Codex 的机制。ADR 0030 的硬边界、ADR 0049 的保留尾部恢复、
ADR 0061 的模型窗口推导预算以及 ADR 0061 的 `buildCheckpoint` /
`installCheckpoint` 拆分全部保留；ADR 0061 条款 2、4、6、7、8 被替换。

1. **仅内联。** 所有后台预计算被删除：`pendingBackgroundCheckpoint`、
   `backgroundCompaction`、`backgroundAbort`、`checkpointBaselineTokens`、
   `backgroundLimit`，以及 `tool_execution_start`、`prompt()` 与运行
   `finally` 中的三个调用点。`prepareNextTurn()` 重新估算预算，并在总量越
   过 `hardLimit` 时同步压缩。增量作用域的触发随之一并消失——不再有第二
   个阈值需要它守护。
2. **Codex 的保留形态。** `codexShapedPreparation()` 保持
   `prepareCompaction()` 的切点（及其轮次边界与轮次拆分处理），然后把
   `turnPrefixMessages` 与 `retainedTail` 折回 `messagesToSummarize`，使摘
   要覆盖整个被压缩范围，并把保留尾部重建为仅用户消息：
   `selectRetainedUserMessages()` 按最新优先遍历被压缩范围加上前一个检查点
   的保留用户消息，直到
   `COMPACTION_RETAINED_USER_MESSAGE_MAX_TOKENS = 20_000`（以硬预算的一半
   封顶，使留存本身无法填满小窗口），截断越过限制的消息而不是丢弃它，再
   反转回时间顺序。把尾部折进摘要不是可选的：`prepareCompaction()` 只摘要
   切点之下，所以不这样做而过滤尾部会静默丢失没有任何东西摘要过的
   assistant 与 tool 内容。丢弃 assistant 消息也会丢弃其工具调用，因此不
   会有孤儿 `tool_use` 到达 provider。
3. **内部开关之后的两个家族。** `CompactionStrategy = "summary" |
   "fresh_window"` 从构造选项解析，然后是 `PI_DESKTOP_COMPACTION_STRATEGY`，
   默认 `"summary"`。`fresh_window` 不发出摘要请求：它安装一个保留尾部为
   空、带固定 `CONTEXT_ROLLOVER_SUMMARY` 标记文本的检查点，然后走完完全相
   同的生命周期——预算重新估算、`session.appendCompaction`、
   `compaction_end`、transcript 行、警告——镜像 Codex 把 token 预算翻滚建
   模为普通压缩的做法。该开关不到达 `AppSettings`、设置或 i18n。
4. **`new_context` 回归。** 该工具无参数，原样携带 Codex 的描述；执行它只
   设置 `pendingModelCompaction` 并返回家族的翻滚消息。`prepareNextTurn()`
   在 `pendingModelCompaction || tokens >= hardLimit` 时压缩，匹配 Codex 的
   `should_roll_over`。该名称在 `activeTools()`、`isCoreTool()`、契约模式允
   许列表以及 host-core 免确认允许列表
   （`crates/host-core/src/permissions.rs`）中同步，在那里它替换
   `"CompactContext"`。
5. **两级提醒，每窗口各一次。** 令 `remaining = hardLimit - tokens`：第一
   级在 `remaining <= clamp(hardLimit * 0.15, 8k, 32k)`，陈述剩余预算并请
   模型开始收尾；第二级在 `remaining <= 2_000`，告诉它立即写下必须存活的
   东西。每级认领一次，两个认领在安装检查点时重置。提醒追加到当前轮次的
   系统 prompt，并在 `finally` 中恢复——与 `SILENT_TURN_NUDGE` 同一机制—
   —因此它从不进入 transcript 或持久历史。
6. **整条检查点链是持久的。** `read_compactions()` 与
   `write_transcript_with_compactions()` 替换它们只保留最新的前身；
   `sessions.rs` 校验、fork 并重映射每条记录，并向会话详情负载添加
   `compactions: Vec<CompactionRecord>`，保持 `compaction` 为其最后一个元
   素。每次压缩一行 transcript 要求该链挺过重启、迟来的截断与 fork。
7. **每次压缩一行 transcript，且每次都有警告。** `compaction_end` 携带
   `mark?: ContextCompactionMark`（`id`、`throughMessageId`、`generation`、
   `summaryTokens`、`summarized`）而不是 ADR 0061 的 `status`，并完全去掉
   `phase`；持久记录在会话打开或 fork 时提供相同的标记。
   `buildTranscriptEntries()` 在锚点消息之后插入 `kind: "compaction"` 条
   目，结束包含它的任何 assistant 轮次，并丢弃锚点已不存在的标记。成功的
   压缩也弹出无条件警告 toast；回退、overflow 与手动 toast 保留，因为每一
   个都说了更具体的事情。上下文检查器保留其行，现在读取最新标记。

手动 `/compact` 不变，仍保持快速失败。设置仍不暴露压缩控件，仍忽略持久化
的 `contextCompaction` 值（ADR 0061 条款 9）。

### 刻意偏离 Codex 之处

- **摘要位置。** Codex 把摘要追加在保留的用户消息之后。pi-agent-core 中的
  `buildSessionContext()` 在 `entry.retainedTail` 之前发出
  `createCompactionSummaryMessage(summary)`，该顺序不由我们选择。两种顺序
  呈现相同内容。
- **任务边界。** ADR 0136 收窄保留尾部：活跃轮次只保留其最新的用户消
  息，而已完成轮次的检查点尾部为空，使下一个 prompt 不会被误认为已完成工
  作的延续。
- **`hardLimit` 推导。** Codex 在窗口的 90% 处压缩；我们保留 ADR 0030 的
  "窗口 − 输出预留"。Codex 承受得起更松的数字，因为它有单独的全窗口守
  护；我们没有，而过大的请求是硬性 provider 错误。
- **工具注册。** Codex 把 `new_context` 门控在 `Feature::TokenBudget` 之
  后，所以它只为无摘要家族存在。我们在两个家族中都注册它，因为要求是模
  型拥有该工具。`get_context_remaining` 未实现；提醒改为携带数字。
- **提醒阈值与文本。** Codex 从按模型元数据读取两者。我们没有这样的数据
  源，因此阈值从守护使用的同一个 `hardLimit` 推导，措辞是我们自己的。
- **提醒投递。** Codex 注入合成历史条目。我们没有让历史条目留在
  transcript 之外的通道，所以提醒改为按轮次追加到系统 prompt——效果等
  价，且无持久化风险。

## 后果

- 压缩在用户再次等待的时刻付费。这是对齐的代价；Codex 也付。ADR 0061 的
  零等待属性没有了。
- 压缩后的模型上下文更小也更有损：除经由摘要外，没有 assistant 推理和工
  具输出存活。可见 transcript 不受影响，所以对用户没有任何丢失。
- 摘要输入现在是整个被压缩范围而不是范围减去尾部，所以每次摘要请求比
  ADR 0061 下更大——但次数更少，因为触发又变回一条硬边。
- 压缩又可以从 transcript 审计，恢复了 ADR 0061 反转掉的 ADR 0030 可见性
  属性。
- 每次压缩都用警告打断用户。这是有意的：只有用户能决定改为开始新会话，
  而在多次压缩之后，那通常是更好的答案。
- 模型可以提早、刻意地压缩，也可以忽略提醒——硬边界仍在。
- 无摘要家族已实现但在发布构建中不可达。它的存在是为了让机制完整且可测
  试，而不是作为产品选项。

## 备选方案

### 保留后台预计算并添加可见行与警告

已拒绝。用户要的是 Codex 的机制，不是它的超集，而且在无关轮次边界安装的
预计算检查点会让行的位置任意。

### 把保留尾部过滤为用户消息但不折进摘要

已拒绝，这是正确性 bug：`prepareCompaction()` 只摘要切点之下，所以尾部内
被丢弃的 assistant 与 tool 消息将不被任何东西覆盖。

### 设置 `keepRecentTokens: 0` 并让 `prepareCompaction()` 产生空尾部

已拒绝。当最后一个条目是工具结果时，`findCutPoint()` 回退到最早的有效切
点，这会丢弃远比预期多的内容。

### 在设置中暴露家族开关

已拒绝。Codex 不暴露它，且没有用户能从一个设置行判断"完全不要摘要"与
"一次摘要请求"的优劣。

## 参考

- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/03-runtime/04-data-storage.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D158, D200, D203)
- `codex-rs/core/src/compact.rs`、`compact_token_budget.rs`、
  `session/token_budget.rs`、`tools/handlers/new_context_window_spec.rs`
  （行为参考）
