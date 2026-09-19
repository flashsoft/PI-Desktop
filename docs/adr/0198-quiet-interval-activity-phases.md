# ADR 0198: 为实时活动行上的每个静默间隔命名

- Status: Accepted
- Date: 2026-09-09
- Related: ADR 0175, ADR 0186, D338, D349, D365

## Context

ADR 0175 为三种静默等待添加了紧凑的运行时状态行：`waiting-model`、
`retrying` 和 `waiting-subagents`。但当运行时正在压缩上下文、恢复
静默响应、准备下一个 provider 请求，或等待其子工作在该行上不可见的
subagent 时，用户仍会看到一个没有解释的长时运行轮次。通用的
`Working…` 回退也掩盖了 `starting`。一个只显示 “Waiting for 2
subagents” 超过一分钟的父级等待，即使委托正在读取和搜索，看起来也
像是卡住了。

该行必须保持为单个紧凑的内联状态。它不得恢复 ADR 0175 之后被移除的
activity-group 当前状态胶囊，也不得流式转发原始子事件。

## Decision

扩展 `AgentActivity`，使每个用户可见的静默间隔都有命名的阶段，并用
运行目标的实时快照丰富 `waiting-subagents`：

1. `starting` 会被渲染，替代通用的 `Working…`。
2. `preparing` 覆盖工具批次结束之后、下一个 provider 请求之前的
   间隙。
3. `compacting` 覆盖进行中的检查点，并携带原因（`manual` /
   `threshold` / `overflow`）。
4. `recovering` 覆盖静默轮次重跑，直到重试请求发出为止。
5. `waiting-subagents` 保留 `subagentCount` 作为实时运行计数，并添加
   可选的 `agents[]`，包含 `name`、`lastPhase`（`waiting-model` |
   `thinking` | `tool`）和 `lastToolName`。快照在子工具开始/结束或
   思考开始时更新；token 级别的子事件不会发出新状态。

渲染进程仍然绘制一行紧凑的本地化状态行，并带单调递增的阶段计时器。
单 subagent 等待会命名该 agent 及其最新动作；多 agent 等待会列出每个
运行中的目标。思考、工具、回答和权限界面继续替换该行。不添加第二个
进度卡片或百分比。

## Consequences

- 静默的压缩、恢复和工具后间隙可以与卡死的轮次区分开。
- 对委托的父级等待可以展示这些委托正在做什么，而无需转发它们的事件
  流。
- 没有 `agents` 的旧版 `waiting-subagents` 载荷仍然渲染仅含计数的
  标签。
- ADR 0175 的粗粒度阶段规则仍然成立：子级内部细节不进入协议，仅以
  本有界快照的形式出现。

## Alternatives

### 在处理组上恢复当前状态胶囊

被拒绝，因为它与专用的运行时行重复，并且已经作为冗余界面元素被移除。

### 将原始 subagent 事件转发到父级状态行

被拒绝，因为这会扩大渲染进程协议，并在每个思考 token 上闪烁。粗粒度
的 `lastPhase` / `lastToolName` 快照足以解释等待。

### 为 starting、压缩和恢复保留通用的 `Working…`

被拒绝，因为这些间隔正是用户已经误读为轮次卡死的那些。

## References

- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-008c, E2E-094)
