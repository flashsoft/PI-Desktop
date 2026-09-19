# ADR 0219: Composer 斜杠菜单中由用户调用的 Skill

- Status: Accepted
- Date: 2026-09-11
- Deciders: PI-Desktop runtime and desktop UI maintainers
- Amends: D123, D174, ADR 0024, ADR 0039

## Context

D174 确立了 Skill 目录和本地 `Skill` 工具，作为由模型调用的能力，并
明确拒绝了面向用户的斜杠命令。这使 skill 正文保持在系统 prompt 之
外，并保留了现有的权限、激活和运行时重载边界，但它也让活动的 skill
在用户知道应当应用某个特定工作流时无法被发现。

Composer 已经通过一个仅限 Electron 的通道合并了多个命令来源。它可以
暴露一个由用户调用的入口，而无需把 skill 正文移入渲染进程、prompt
或宿主协议。

## Decision

1. 活动的内置、插件和用户 Skill 向 Composer 斜杠菜单贡献条目。它们
   出现在扩展命令之后独立的 `Skills` 组中；该组总是排在最后。确切的
   skill id 就是斜杠名称。现有命令名称在冲突时优先，因此 Skill 无法
   遮蔽模板、内置、插件或扩展命令。
2. 选择一个 Skill 会插入 `/<skill-id> `。发送走普通的 prompt 路径。
   Electron 主进程针对当前会话项目解析该命令，在发送时重新校验其活
   动作用域和权限，并为 transcript 徽章保留用户输入的斜杠形式。
3. 主进程持久化一条面向模型的指令，要求模型用经过校验的 id 调用本
   地 `Skill` 工具，随后跟上任何用户正文文本。Skill 正文仍然由该工
   具按需加载；它不会被发送给渲染进程，也不会被直接注入 prompt。
   `agent.prompt.inject` 和现有的用户 Skill 激活规则仍然是权威的。
4. 不需要宿主协议或存储 schema 变更。增量式的命令契约允许
   `kind: "skill"` 和 `skillId`，现有的 composer-command IPC 响应携
   带额外条目。Skill 目录、正文大小、路径和运行时复用边界保持 D174
   和 ADR 0039 所定义的样子。

## Consequences

- 用户可以显式发现并调用一个活动的 Skill，而模型仍然可以从同一个
  目录隐式选择 Skill。
- 在自动补全和发送之间被禁用或移除的 Skill，回退到现有的字面斜杠
  prompt 行为，而不是绕过激活。
- 最后一个自动补全组可能随活动 Skill 目录增长，但它的稳定位置使现
  有命令排序保持可预测。

## Alternatives considered

- **把 Skill 正文直接注入 prompt：** 被拒绝，因为它绕过本地 `Skill`
  工具的作用域检查、按需加载和运行时重载语义。
- **从渲染进程自动触发 Skill：** 被拒绝，因为调用和活动作用域校验
  属于 Electron 主进程，而不是渲染进程提示。
- **新增宿主协议或持久消息 schema：** 被拒绝，因为现有的 Electron
  命令通道和可选的 transcript 命令元数据已经足够。
