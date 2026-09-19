# ADR 0048: 惰性逐轮工具激活

- 状态： 已接受
- 日期： 2026-08-02

## 背景

PI-Desktop 目前在第一个 provider 请求之前就注册产品工具、插件工具、skill 和
插件开发辅助工具。随后完整的 JSON schema 会被序列化进该请求，即使 prompt 只
是一句问候或一个只读任务。这使首个输入不成比例地大，并在每个新的用户轮次
重复同样的可选 schema。

pi 的 coding-agent 界面把活跃工具集与完整注册表分离，并对未激活的能力使用
紧凑的 prompt 片段。pi-agent-core 也支持在轮次边界替换上下文，并用
`addedToolNames` 标记工具结果；当 provider 支持时，pi-ai 适配器可以利用该标
记进行原生的延迟工具搜索。

## 决策

PI-Desktop 保留一个完整的 sidecar 本地工具注册表，但只向 provider 发送活跃
子集：

- Agent 以 `Read`、`Bash`、`Edit`、`Write` 启动，与 pi 的 coding-agent 核心
  一致。
- Chat 以 `Read`、`Glob`、`Grep` 启动。
- 当存在延迟能力时，本地 `ToolSearch` 工具保持活跃。*（ADR 0061 移除了此列
  表原本也保持始终活跃的 `CompactContext` 工具；ADR 0064 以 `new_context`
  恢复了它，并在每种模式下再次保持始终活跃。）*
- Agent 模式的 `Glob` 与 `Grep`、`BrowserPreview`、插件工具、`Skill` 以及插
  件开发辅助工具延迟到被请求时才激活。

基础 prompt 包含一个有界的 `# On-demand tools` 目录，只有名称与紧凑的一行
描述，绝不包含延迟的 JSON 参数 schema。模型用精确名称或简短能力查询调用
`ToolSearch`。sidecar 对匹配排序，至多激活四个，在 `addedToolNames` 中返回
它们的名称，并在下一个 provider 请求之前重建上下文。支持原生延迟工具搜索
的 provider 可以在该加载点序列化新激活的 schema；不支持的 provider 通过普
通工具列表接收活跃 schema。

内存中的延迟集合在每个新用户 prompt 开始时清空，然后从有效会话上下文中的
成功激活证据重建。成功的 `ToolSearch` 结果贡献其 `addedToolNames`，成功的延
迟工具结果贡献该工具的名称。只有仍存在于当前模式延迟目录中的名称才会被恢
复；失败、中断和缺失结果的行会被忽略，assistant/user 散文同样被忽略。
ToolSearch 不调用 host-core，也不绕过权限、workspace 收容、超时或审计行为。
激活标记保留在持久化的工具结果内，因此 transcript 重建保留 provider 消息语
义。只要成功标记仍在有效上下文中，重启后的 runtime 可以复用合格的延迟能力；
当不存在这样的标记时，需要一次新的 ToolSearch 调用。

## 后果

- 简单的首轮不再为每个可选工具 schema 付费。
- 核心编码工作流保留 pi 的 Read/Bash/Edit/Write 集合，无需额外的发现调用；
  文件枚举与搜索距离只有一次 ToolSearch。
- 需要辅助能力的任务在该能力可用之前会产生一次显式的 ToolSearch 轮次。
- ToolSearch 是一条普通的模型工具活动行，因此发现步骤是可见且持久的，而不
  是不透明的副作用。
- provider 兼容性仍集中在 pi-ai：原生延迟搜索是一种优化，而活跃上下文回退
  对每个适配器都有效。
- 插件描述在 prompt 目录中是有界的，大型插件注册表无法重新引入最初的
  schema 洪水。

## 备选方案

### 每个请求发送所有 schema

已拒绝，因为它把首轮上下文浪费在模型不需要的能力上，并随插件注册表增长。

### 用 prompt 文本启发式激活工具

已拒绝，因为用户措辞和项目指令不是可靠的能力分类器，漏判的启发式会隐藏一
个有效工具。

### 只使用 provider 原生工具搜索

已拒绝，因为并非每个配置的 provider 都支持它。sidecar 需要一个与 provider
无关的活跃工具契约，原生搜索只是适配器优化。

## 参考

- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-008a)
- `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/src/core/system-prompt.ts`
- `https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md`
