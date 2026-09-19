# ADR 0230: Skill 随 Agent 核心工具集交付

- Status: Accepted
- Date: 2026-09-11
- Deciders: PI-Desktop runtime maintainers
- Amends: D174, ADR 0048, ADR 0219

## Context

ADR 0048 让第一个 Agent 请求保持在一个小的核心集合上，并把其他所有
能力推迟到本地 `ToolSearch` 工具之后，使庞大的插件界面无法重现当初
的 prompt 膨胀。`Skill` 此前被注册进那个延迟集合：它只有在模型搜索
它之后才出现在 provider schema 中。

后来的两个决策都假设存在一个模型可以立即调用的 `Skill` 工具：

- D174 让 skill 目录成为模型调用加载文档的方式，并在 `# Skills` 系
  统 prompt 一节中宣传它，指示模型先加载匹配的 skill。
- ADR 0219 通过持久化一条“在该轮次用经过校验的 id 调用本地 `Skill`
  工具”的指令来应答用户输入的 `/skill-id`。

当工具不在第一个请求的工具列表中时，两者都无法满足。不搜索它的模
型要么重新搜索、调用一个它看不见的工具，要么仅凭目录行回答；而一
个明确请求了某个 skill 的用户，要在正文被加载之前多付一到两个额外
往返。

## Decision

1. `Skill` 加入 `AGENT_CORE_TOOL_NAMES`，因此 Agent 模式请求从第一
   轮起就携带它的 schema。它的注册门槛不变：只有当 skill 目录非空时
   工具才存在，且 Plan 和 Goal 继续完全省略它。
2. 该工具保持在延迟目录之外，因此绝不出现在 `# On-demand tools` 之
   下。其他按需能力（`BrowserPreview`、插件工具、插件开发辅助工具和
   MCP 工具）保持其惰性行为，且只要其中任何一个存在，`ToolSearch`
   仍会被注册。
3. 这不会带来协议、存储、权限或 skill 正文的变更。正文仍然通过同
   一个本地工具及其现有的宿主路径和权限检查按需加载。

## Consequences

- 匹配的任务在第一轮就加载其 skill，而不是先发现工具，且
  `/skill-id` 调用按 ADR 0219 所描述的方式工作。
- 每个 Agent 模式请求多携带一个工具 schema。目录已经按会话有界，而
  委托生命周期出于同样的原因被接纳进核心集合：一个模型必须去寻找
  的能力就是它不会使用的能力。
- 从延迟目录中移除 `Skill` 行也移除了唯一能把 skill 路由经过
  `ToolSearch` 的路径，因此它的目录描述被删除，而不是留成不可达。

## Alternatives considered

- **保持 `Skill` 延迟并依赖 prompt 引导：** 被拒绝，因为无论系统
  prompt 怎么说，不在 schema 中的工具都无法被调用——这正是产生本
  issue 的行为。
- **把 skill 正文注入系统 prompt：** 被拒绝，原因是 D174 和
  ADR 0039 已经定论的成本和重载语义。
- **把每个按需工具都放进核心集：** 被拒绝，因为这会重现 ADR 0048
  存在所要防止的 prompt 膨胀。这里只接纳 `Skill`。
