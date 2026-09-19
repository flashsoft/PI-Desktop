# ADR 0119: 事件驱动的子代理超时

- Status: Accepted for implementation; amended by ADR 0129
- Date: 2026-08-24
- Deciders: PI-Desktop core
- Related: D254, ADR 0062 (bounded subagents), ADR 0089 (background delegation),
  ADR 0129 (idle bounds silence, not slowness)

> **由 ADR 0129 修订。** 决策 2 中的事件白名单已被取代：现在每个
> `AgentEvent` 都会重置空闲计时器，且空闲默认值为 300 秒而不是
> 600 秒。决策 4 中名为 unlimited 的内置代理现在带有轮次兜底限制。
> 下文中对"只使用空闲时间"的否决，针对的是放弃总时长上限，而
> ADR 0129 保留了该上限。

## 背景

最初的 delegate 循环使用默认的轮次上限。因此，一个每轮执行一到两
次有效工具调用的 delegate 可能在它积极工作时被终止，并且无法区分
一个真正空闲的 worker 和一个正在等待长时间运行工具的 worker。

## 决策

1. 每个 delegate 有两个独立的看门狗：600 秒无活动，以及 21,600 秒
   的总运行时长。总计时器包含工具执行时间。
2. 活动指任何 delegate 轮次、消息或工具生命周期事件。空闲计时器在
   `tool_execution_start` 与匹配的 `tool_execution_end` 之间暂停，
   因此一次长时间的 Bash 调用由工具超时约束，而不是由 delegate 空闲
   超时约束。
3. 看门狗以 `timed_out` 终止 delegate，并附带
   `SUBAGENT_IDLE_TIMEOUT` 或 `SUBAGENT_DURATION_TIMEOUT` 之一。报告
   会携带最近的部分 assistant 输出（如果存在）。provider 失败、父级
   中止以及显式轮次上限保留其既有的结果。
4. `maxTurns` 是可选的。省略、`none` 和 `0` 表示不限制轮次；正的
   显式值仍然是有界的兜底，上限为 80。
5. 定义可以覆盖 `idle-timeout` 和 `max-duration`。空闲值被钳制在
   10–21,600 秒之间，时长值被钳制在 60–21,600 秒之间；非数值会发出
   警告并使用默认值。
6. 内置的 `explorer` 获得 `Bash`，用于有界的只读检查（如
   `git log`）；`code-reviewer` 保持只读。由于 Bash 可以产生变更，
   Explorer 继续使用既有的变更/权限分类。
7. 共享状态契约和桌面拓扑暴露 `timed_out`；渲染进程用英文和简体
   中文为其标注，并将其呈现为警告级结果。

## 考虑过的替代方案

- **提高轮次上限：** 否决，因为任何固定上限仍会终止一个正在积极
  工作的 delegate，并且在不同模型和工具密度下扩展性差。
- **只使用总时长：** 否决，因为 provider 或 delegate 可能在仍低于
  总体上限的情况下无限期卡住。
- **只使用空闲时间：** 否决，因为否则持续的模型/工具活动可能在
  没有硬性资源上限的情况下运行。
- **保持 Explorer 只读、不给 Bash：** 否决，因为这会阻止原生搜索
  工具无法表达的无害仓库检查命令；既有的权限路径对 Bash 仍然具有
  权威性。

## 后果

- 只要 delegate 保持活跃，就可以超过之前的 20–24 轮行为运行，同时
  空闲和总运行时长失败仍然是有界且可诊断的。
- 超时报告对 `TaskWait`、`TaskList` 和委派拓扑可见，包括其结构化
  错误码和计时日志条目。
- 显式设置 `maxTurns` 的定义保留了确定性的硬停止，适用于专门的或
  不受信的工作负载。
