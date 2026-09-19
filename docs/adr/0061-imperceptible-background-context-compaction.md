# ADR 0061: 不可感知的前后上下文压缩

- 状态： 已接受（条款 2、4、6、7、8 经 ADR 0064 修订）
- 日期： 2026-08-06
- 决策者： PI-Desktop 核心
- 修订： ADR 0030 / ADR 0049 / D158

## 背景

ADR 0030 的轮次边界守护是正确的：超过硬预算时不发出 provider 请求，且
ADR 0049 为每次自动失败提供持久的保留尾部恢复。但它不够无感。压缩以五种
方式向用户宣告自己：

- 每次成功的自动压缩都弹出 info toast；
- `compaction_start` 设置 `isRunning`，因此在用户没有请求任何东西运行时，
  运行状态与 spinner 会跳动；
- 软边界注入一条瞬态指令，要求模型调用 `CompactContext`，这会消耗一次模型
  轮次并在 transcript 中留下一行工具活动；
- 压缩只在 `tokens >= hardLimit` 时运行，所以它总发生在用户等待回复的时
  刻，最坏情况下摘要输入接近整个窗口；
- 设置暴露 `reserveTokens`、`keepRecentTokens` 与启用开关，让用户负责调优
  一个安全机制。

Codex（`codex-rs/core/src/session/context_window.rs`、
`state/auto_compact_window.rs`）展示了两个值得采纳的想法：给触发分级而不
是用一条硬边，以及按当前上下文前缀之后的*增量*而不是总量来衡量触发
（`AutoCompactTokenLimitScope::BodyAfterPrefix`）。

> ADR 0064 更正：本节原本还写道"Codex 也完全没有任何模型侧压缩工具——
> 由宿主决定并执行。"这是错的。Codex 有 `new_context`
> （`tools/handlers/new_context_window_spec.rs`），由
> `Feature::TokenBudget` 门控，且上述两个想法都不是 Codex 的默认：
> `BodyAfterPrefix` 是可选的，Codex 也没有可供分级触发的预计算。

现有实现的一个性质让后台工作成本低廉：`entriesWithCompaction()` 通过
`throughMessageId` 定位检查点并把它拼接进条目列表，锚点之后的一切保持不
变。因此提前计算的检查点在尾部持续增长时仍可安装，预计算不需要新的不变
量。

固定的 `reserveTokens: 16_384` / `keepRecentTokens: 20_000` 默认值也是一
个独立于可见性的真实缺陷：它们把相同的绝对数字同时应用到 32k 窗口和 1M
窗口。

## 决策

压缩变成宿主持有的、用户无法感知的后台活动。阻塞性硬边界不变，仍是安全
网。

1. **分级预算，从模型窗口推导。** `contextBudget()` 保持 ADR 0030 定义的
   `hardLimit` 与 `requestHeadroom` 不变，并新增
   `backgroundLimit = floor(hardLimit * 0.7)` 作为预计算触发。
   `keepRecentTokens` 推导为 `clamp(hardLimit * 0.2, 8k, 64k)`，仍以硬预算
   的一半封顶。软边界及其 `softGap` 被删除。
2. **增量触发作用域。** 后台预计算同时要求 `tokens >= backgroundLimit`，
   以及自最新检查点安装时记录的基线以来至少增长 `keepRecentTokens`。没有
   增量测试，一个停在后台限制之上的大保留尾部会每一轮都请求新摘要却什么
   也不减少。硬边界继续衡量总量，因为那是 provider 的真实约束。
3. **生成与安装分离。** `buildCheckpoint()` 运行准备、预算预检与摘要请
   求，不持久化任何东西，也不触碰 `activeCompaction`。
   `installCheckpoint()` 重新估算，通过 host-core 追加，更新
   `activeCompaction`，并发出 `compaction_end`。阻塞路径是两者背靠背组
   合，因此 threshold、overflow 与手动行为不变。
4. **仅 provider 空闲窗口。** 后台摘要请求恰好从两个地方启动：
   `tool_execution_start`（模型流已结束且下一个请求尚未发出）与 `prompt()`
   的 `finally`（用户正在阅读结果）。后台摘要绝不与流式轮次共享 provider
   连接：`prepareNextTurn()` 在下一个请求之前等待任何在途构建。后台工作
   刻意不设置 `compactionInProgress`，因为该标志喂给
   `getStatus().isRunning`。
5. **过期在安装时检查，失败静默。** 预计算的检查点在下一个轮次边界或用
   户 prompt 处被消费，仅当它所基于的检查点仍然活跃、其
   `throughMessageId` 锚点仍存在于 `fullEntries` 中、且它仍适配*当前*模型
   的预算。任何未命中都会丢弃它并落入现有的阻塞路径。失败的后台构建被丢
   弃，不持久化、不发事件、也不走 ADR 0049 回退：保留尾部属于硬边界，它
   仍在那里接住后台工作遗漏的一切。
6. **无面向模型的压缩。** `CompactContext`、`<context_management>` 提示以
   及 host-core 免确认允许列表中的 `"CompactContext"` 条目被移除。触发完
   全是确定性且宿主驱动的。
7. **静默。** `compaction_start` 与 `compaction_end` 携带可选的
   `phase?: "background" | "blocking"`（缺失表示 `blocking`；按 ADR 0047
   的加法式原则，协议版本不变）。成功的自动压缩——后台或阻塞——不通知
   任何人：无 toast、无运行状态变化、无 transcript 行。保留三个 toast，每
   个都跟在用户已经看到的事情之后：`retained_tail` 回退（警告）、overflow
   重试（警告）、手动 `/compact` 结果。
8. **上下文检查器是唯一可见痕迹。** `compaction_end` 携带
   `status: { generation, summaryTokens }`，持久的 `SessionDetail.compaction`
   在会话打开或 fork 时提供相同信息。检查器渲染一行——
   `Compacted N× · summary ≈X`——没有检查点时什么都不渲染。世代计数器乘
   坐在检查点不透明的 `details` 值内，host-core 原样持久化它，因此无需记
   录 schema 变更。
9. **无设置。** 设置中的压缩卡片、其搜索关键词、其 i18n 键与主进程透传被
   移除。持久化的 `contextCompaction` 值被刻意忽略：否则曾经关闭压缩的用
   户将没有开关可以重新打开。`ContextCompactionSettings` 类型作为 runtime
   的构造期覆盖保留，以便测试构建禁用压缩的会话。

手动 `/compact` 不变，仍保持快速失败。

## 后果

- 常见情况下用户从不等待压缩。摘要请求与工具执行或空闲会话重叠，轮次边
  界只安装已完成的检查点。
- 摘要输入更小更便宜，因为硬限制的 0.7 是比硬限制本身小得多的历史。
- 越过后台限制的会话为可能用不到的摘要付了费。0.7 是成本权衡：越过该点
  之后到达硬限制几乎不可避免，所以 token 很少被浪费，而更低的比率会让短
  会话为从不使用的摘要付费。
- 小窗口与大窗口模型现在得到成比例的预算，而不是一对绝对 token 数。
- 失去模型侧工具消除了一类浪费的轮次与一种 transcript 产物，也消除了模
  型忽略、推迟或重复该请求的可能。确定性触发没有覆盖到的任何东西都没有
  丢失。
- 压缩不再能从 transcript 审计。检查器行、持久检查点记录与生命周期事件仍
  在，因此诊断是可能的；随意观察则不行。这是对 ADR 0030"作为工具活动行
  保持可见/持久"的一次被接受的反转。
- 用户无法再从 UI 禁用自动压缩。因为禁用的守护意味着过大的 provider 请
  求，这正是预期结果。
- 两个 provider 空闲窗口并非全部。从不运行工具、且 prompt 之间从不空闲的
  会话仍在硬边界同步压缩，与之前完全一样。

## 备选方案

### 与流式轮次并发压缩

已拒绝。它能消除最后一点延迟，但同一 provider 连接上的两个同时请求会招
致限流（已在 Bedrock 上观测到），并把单个用户动作的可见成本翻倍。

### 在后台压缩之外保留软边界提示

已拒绝。有了确定性预计算，该提示只增加它一直有的失败模式——一次浪费的
轮次、一行 transcript、一个可以随意忽略它的模型。

### 保留设置旋钮但藏在开发者开关后面

已拒绝。这些值现在从模型窗口推导；覆盖会重新引入小窗口/大窗口缺陷，而一
个隐藏的安全守护开关比没有开关更糟。

### 压缩时显示低调的内联指示器

已拒绝。任何持久的指示器都会让用户意识到一个他们无法行动的机制。检查器
已经为想到要问的人回答了这个问题。

## 参考

- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D158, D200)
- `codex-rs/core/src/session/context_window.rs`（行为参考）
