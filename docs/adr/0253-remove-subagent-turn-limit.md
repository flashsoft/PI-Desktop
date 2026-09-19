# ADR 0253：移除子 Agent 的 turn 上限

- Status: Accepted
- Date: 2026-09-15
- Deciders: PI-Desktop core
- Related: D423, ADR 0062, ADR 0063, ADR 0089, ADR 0119, ADR 0126, ADR 0166,
  ADR 0189, ADR 0210, `03-runtime/02-agent-runtime.md` §5f,
  `04-ux/06-settings-ia.md` §7, E2E-155,
  E2E-SUBAGENT-legacy-turn-limit-frontmatter-is-ignored
- Supersedes: ADR 0062、ADR 0063、ADR 0119、ADR 0126、ADR 0166 和 ADR 0210
  的 `maxTurns` 条款。历史 ADR 文件保留。本记录移除那些记录所描述的
  字段；不改变它们的其他条款。

## 背景

ADR 0062 引入子 Agent 作为有边界的 worker，并给定义一个 `maxTurns`
frontmatter 上限。ADR 0119 使该键可选——省略、`none` 和 `0` 表示不限，
显式值被钳制到 80。ADR 0126 和 ADR 0063 把该字段带入解析器和 Subagent
编辑器。ADR 0166 随后撤回了空闲和时长看门狗，但刻意保留 `maxTurns`
作为剩余的定义级终止开关，D328 记录了「显式 `maxTurns` 和 10 的并发
上限保留」。ADR 0210 为同级的 `maxTokens` 上限复用了相同的宽松键拼写
规则。

这个上限无法被正确地推理，因为父级看不到委派者的实时工作。它无法区分
一个再有一轮就收敛的委派者和一个永远不会收敛的委派者，因此唯一诚实的
上限是「足够大」，而这等于没有上限。已发布的值是任意的（60、50、40、
80），编辑器默认就是不限，而且失败模式比它解决的问题更糟：到达上限的
委派者在任务中途被杀死，以 `truncated` 和一份部分报告浮现——这种状态
对用户和父级模型来说都读作失败，且两者都无法恢复。

剩余的终止路径都是显式且可观察的：父级 agent 的 `TaskStop`、用户的
Stop，以及终态父级错误中止残留项（ADR 0189）。turn 计数不属于其中任何
一个。

## 决策

1. **删除该机制。** 委派者没有 turn 上限。它在完成时、父级调用
   `TaskStop` 时、用户 Stop 时，或终态父级错误中止它时结束。没有
   `truncated` 结果，也没有与 turn 相关的终止路径。

2. **从契约中移除 `maxTurns`。** 该字段离开 `SubagentDefinition`、
   frontmatter 解析器及其无效/钳制警告、`MAX_SUBAGENT_MAX_TURNS`、
   `UserSubagentRecord` / `UserSubagentInput`、host-core 注册表（记录、
   输入、frontmatter 解析、文档渲染、`MAX_TURNS_CEILING`）、五个内置
   文档、`SUBAGENT_PRESETS` 和 Subagent 编辑器的 Advanced 披露区。
   host-core 输入结构体继续忽略未知字段，因此仍发送 `maxTurns` 的渲染
   进程不会失败。

3. **旧文档继续加载。** `maxTurns`、`max-turns` 和 `max_turns` 变成未
   识别的 frontmatter 键，与所有其他未知键完全一样被忽略：没有错误、
   没有警告，定义仍解析，也没有任何东西重写用户文件。因此声明了上限
   的定义会静默地失去它。

4. **移除 `truncated` 状态。** `SubagentRunStatus` 丢弃它，渲染进程的
   `SubagentOutcome` 联合、每个语言环境的 `chat.subagentStatus` 目录
   条目，以及委派拓扑的「finished with warnings」计数也随之丢弃。
   `timed_out` 保留在类型中，尽管产生它的看门狗已被撤回（D328），因为
   没有其他记录撤回它。

5. **不改协议，不改 schema。** `PROTOCOL_VERSION` 保持 11，
   `SCHEMA_VERSION` 保持 16。该移除在两个方向上都被容忍：旧渲染进程
   多出的 `maxTurns` 字段被 host-core 忽略（输入结构体不拒绝未知字段），
   新渲染进程直接省略它，而 `truncated` 是 sidecar 无法再发出的值。
   存储从未涉及——注册表解析 Markdown frontmatter，没有任何列存储该
   上限。

## 后果

- 循环的委派者现在会一直运行，直到用户 Stop 它或父级调用 `TaskStop`。
  这种暴露对每一个省略 `maxTurns` 的定义早已存在——那是默认值和编辑器
  自己的初始状态，D328 也带着它发布。
- 依赖该上限的现有用户文档在没有提示的情况下失去它。迁移路径就是本
  ADR 所记录的：用 Stop 或 `TaskStop` 停止委派者，并把停止条件写进
  prompt 正文——委派者本来就在那里被告知它的工作何时完成。
- Settings 不再为 turn 提供「不限」的拼写，因为已经没有上限可表达。
  Advanced 披露区保留 model、thinking、输出上限和 scope 字段。
- 内置定义各自失去一行 frontmatter，不再携带一个没有推导依据的数字。
- E2E-155 步骤和拓扑的警告计数随状态和内置兜底而变化。新的忽略契约
  由 E2E-SUBAGENT-legacy-turn-limit-frontmatter-is-ignored 以及
  `packages/shared`、`packages/agent-runtime` 和 `crates/host-core` 中的
  单元测试覆盖。

## 被拒绝的替代方案

- **提高上限，或让每个内置项不限。** 保留一个无法被正确设置的旋钮，
  保留 `truncated` 状态及其用户可见文案，并且仍会在任意点把委派者
  杀死在任务中途。
- **继续解析该键并对其警告。** 未知 frontmatter 键已经被静默忽略，
  因此警告会让 `maxTurns` 成为唯一带特殊诊断的键，而定义仍忽略它。
  D328 的 `idle-timeout` / `max-duration` 先例是相反的情况：那些键仍
  存在，只是不再武装，所以它们保留解析警告。
- **保留字段但永不执行。** 什么都不做的契约字段比没有字段更糟：编辑
  器会继续提供它，settings API 会继续往返它，`truncated` 会作为 UI 仍
  须渲染的死界面留在状态联合中。
