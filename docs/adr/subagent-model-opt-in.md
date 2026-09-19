# ADR: 将 subagent 模型选入与定义 pin 分离

- 状态：已接受，待实现
- 日期：2026-09-13
- 相关：D278、ADR 0062、ADR 0089、ADR 0237、E2E-166、issue #286、#386

## 背景

Electron 把定义 pin 和可自动选择的模型解析进同一个携带凭据的
`subagentProviders` 映射。把映射中的每个 key 都当作一次 `Task.model`
选择，既会把私有 pin 暴露出去，又会绕过 main 在按需路径上的
`availableForSubagents` 检查。定义 pin 表达的是某一个委派的默认模型，
而不是允许任何委派都选择该模型。

## 决策

在内部的 Electron 到 sidecar 启动负载、运行时选项和复用比较中新增一个
可选的 `subagentModelKeys: string[]` 字段。Main 只包含那些在已启用
provider 上被独立标记为 `availableForSubagents` 的成功解析绑定。复用一个
已解析的 pin 不会跳过这个独立的选入决策。`subagentProviders` 继续携带
所有已解析绑定，因此现有的定义默认值保持可用。如果一个已选入行的
vendor/model 别名与来自另一行的绑定冲突，main 使用该行的精确 provider
ID 作为覆盖 key；一个账户的选入不能授权另一个账户 pin 的凭据。

运行时使用这些独立的 key 来生成其模型摘要。缺失的 key 意味着没有缓存
的覆盖授权。其他 key 仍走现有的 main 所有的
`provider.resolveSubagentModel` 检查；只有成功的响应才能填充独立的覆盖
缓存。该缓存不参与启动复用匹配，并且绝不能用不同的 provider id 覆盖
一个定义 pin。按需 provider 匹配使用与 pin 解析相同的唯一 id / vendor /
name 规则；歧义的 vendor 别名失败即关闭（fail closed），除非调用方使用
精确的 provider id。启动列表变化会使空闲运行时下一条提示时退役，包括
选入被撤销之后。

选入属于决策，而不属于 Task 工具：它约束 AI 为其委派的工作选择模型的
每一个入口。`session/collaboration/spawn` 是第二个这样的入口（ADR 0237），
它的 `modelKey` 是插件代表 agent 写入的同一个选择，因此未选入的模型在
worker 存在之前就已被 `PERMISSION_DENIED` 拒绝。继承那一半不变：省略
`modelKey` 仍取第一个已选入模型，否则取默认模型；而写出默认模型自己的
key 就是把继承显式写出来，正如在 Task 路径上重复定义自己的 pin 一样。
`models.list` 继续报告每个就绪模型及其 `availableForSubagents` 标记——
该标记对调用方只是建议，只有在 main 中才是权威，而 main 是插件无法
改写的一侧（#386）。

D278 的优先级保持为 Task.model → 定义 pin → 会话模型。现有的精确会话
模型例外保持不变。重复目标定义自己的 pin key 被视为省略 `model`，因此
目录回显不会变成工具错误。Task 目录展示每个定义的默认模型，并说明省略
或重复该 key 会保留它；这并不禁止有意地为一个不同的模型选择已选入的
覆盖。

## 后果

- 没有 provider 凭据离开其现有的进程边界。不需要 Host RPC、持久化设置、
  数据库 schema 或 Plugin SDK 变更。
- 省略该增量字段的旧调用方保留定义默认值和会话继承。显式覆盖需要按需
  授权；缺少授权支持时失败即关闭，而不是提升 pin。
- 运行时、模型传输和启动接线的回归覆盖证明了该边界。确定性的 sidecar
  E2E 使用一个本地 OpenAI 兼容模型 fixture；provider UI 交互和外部
  provider 质量是分开的。
- 反转模型选择优先级是本次修复之外的产品决策。
