# ADR 0189: 父级致命错误中止遗留委托

- 状态：已接受，进入实现阶段
- 日期：2026-09-08
- 决策者：PI-Desktop 核心团队
- 相关：D352、D328、ADR 0166、ADR 0089、E2E-155

## 背景

D328 / ADR 0166 在父级带着运行中的委托*进入空闲*时保持持久轮次打开，
然后用它们的报告恢复父级。这条路径对停止调用工具的父级是正确的。

终止性的父级 provider 错误则不同。429 预算耗尽之后，Electron 已经把
持久轮次以 `error` 完成，渲染进程显示 Continue。遗留的委托——通常
运行在另一个未限流的模型上——让 `isRunning` 保持为 true，因此
Continue 被拒绝为 `AGENT_BUSY`（`session already has an active turn`）。
主对话看起来已结束，而 sidecar 仍然忙碌。

## 决策

1. **父级空闲仍然不中止委托。** 对于无致命错误、只是停止调用工具的
   父级，D328 不变。
2. **终止性父级错误会中止遗留委托。** 耗尽的限流、其他终止性
   provider/stream 错误、溢出恢复失败、mutation 预算终止和被拒绝的
   prompt 失败，都会中止运行中的委托、跳过恢复 prompt 并发出
   `agent_end`。
3. **会话对 Continue 变为空闲。** `turnHadError` 之后
   `getStatus().isRunning` 不再计入遗留委托。失败的 TurnOutcomeCard
   保持可见；之后的 `agent_end` 不得用 `completed` 覆盖它。
4. **后续父级 prompt 不继承上一轮次的委托。** 每次 `prompt()` /
   `executeApprovedPlan()` 提升轮次纪元，中止更早纪元的遗留运行，并且
   只自动恢复当前轮次中启动的委托。

不改变 IPC、存储或宿主协议。

## 后果

- 429（或其他终止性父级错误）之后的 Continue 被接受，即使 Gemini（或
  其他）子 agent 仍在运行。
- 遗留委托尚未报告的工作被中止，而不是写进一个已死的父级轮次。
- 带着存活委托的父级空闲仍显示存活轮次，直到报告投递。

## 已否决的替代方案

- **父级错误后让遗留委托继续运行。** 会话保持忙碌，Continue 为
  `AGENT_BUSY`。
- **不中止、只把遗留委托从 `isRunning` 中摘除。** 后续 Continue 轮次
  会与它们在工作区上竞争。
