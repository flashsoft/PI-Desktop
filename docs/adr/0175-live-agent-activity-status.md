# ADR 0175: 用实时 agent 活动状态解释安静的活动轮次

- 状态：已接受
- 日期：2026-09-07

## 背景

Transcript 已经在第一个模型或工具事件之前显示紧凑的 `Working…` 行，并
为具体的思考和工具活动显示内联行。但 provider 请求在第一个事件之前仍
可能花费很长间隔，而有界的重试退避或父级侧的委托任务等待可能不包含
任何 transcript 行。在这些间隔中，唯一可见的信号是 Stop 按钮和一个通用
的本地计时器。用户无法分辨轮次是在正常等待、重试，还是在等待委托工作
（Issue #56）。

## 决策

用一个可选的、运行时拥有的 `AgentActivity` 值扩展现有的规范化 `status`
事件：

1. `starting` 覆盖初始的 prompt 交接。
2. `waiting-model` 在 provider 请求发出时开始，持续到第一个 assistant
   事件。
3. `retrying` 覆盖可中止的 provider 退避，并在可用时携带尝试次数和
   计算出的延迟。
4. `waiting-subagents` 覆盖父级侧对委托工作的收敛等待，并携带运行中
   目标的数量。

sidecar 从拥有 provider 请求、重试延迟和委托等待的同一边界发出这些
阶段。当 assistant 输出开始或轮次到达终止事件时清除阶段。渲染进程按
会话存储最新状态，并渲染一条紧凑的、本地化的内联行，带单调递增的
阶段计时器。该行不是第二张进度卡片，不声称完成百分比，也不改变
Stop 或中止语义。

## 后果

- 安静的活动轮次能解释其当前的运行时拥有的等待，而不增加装饰性或
  重复的进度界面。
- 重试生命周期在 transcript 中保持静默，而重试退避变得可观察且仍可
  取消。
- 会话切换保持隔离，因为状态按会话 id 键控，并随终止事件和会话删除
  而清除。
- 状态刻意保持粗粒度：provider 内部细节和子 agent 子事件不进入渲染
  进程协议，除非它们解释了上述某种用户可见的等待。

## 替代方案

### 对所有等待保留通用的 Working 行

否决，因为它无法区分正常的 provider 等待与重试或委托等待——这正是
Issue #56 报告的歧义。

### 添加常驻的多步骤进度卡片

否决，因为 agent 轮次没有可靠的总步数或百分比模型，且现有的活动轮次
契约保持 transcript 下部界面内联而紧凑。

### 发出原始的 provider 或子 agent 事件

否决，因为它会暴露不稳定的实现细节，并产生超出用户所需的协议面。
运行时拥有的阶段提供了最小的有用解释。

## 参考

- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`（E2E-008c、E2E-094）
- GitHub Issue #56
