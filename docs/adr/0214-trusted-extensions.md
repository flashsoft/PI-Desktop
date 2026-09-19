# ADR 0214: 可信扩展在 Agent sidecar 中运行

- Status: Accepted (v1 implemented 2026-09-10)
- Date: 2026-09-10
- Decision: D387
- Related: ADR 0002, ADR 0008, D007, `07-plugins/16-trusted-extensions.md`,
  `07-plugins/01-plugin-system.md` §14

## Context

PI-Desktop 的插件系统（ADR 0008）让插件在权限网关之后的独立进程中运
行。这对于分发的、不可信的代码是正确的形态，但它没有给必须附着在
agent 循环本身之上的代码留下任何界面：在会话工作目录中进程内执行
的工具、挂在每次轮次、工具调用和 provider 请求上的钩子，以及携带会
话上下文的斜杠命令。`packages/agent-runtime/src/runtime.ts` 中的桌面
运行时已经在内部暴露了这些钩子点；没有任何东西让用户把代码挂到它
们上面。

内核包 `pi-ai` 和 `pi-agent-core`（ADR 0002）有一个兄弟包
`pi-coding-agent`，它定义了 `ExtensionAPI` 契约和一个用于 TypeScript
扩展模块的加载器。采用该契约可以给 PI-Desktop 带来第二个扩展界面，
它拥有现成的、文档化的 API 和现成的、针对它编写的扩展生态。

评估了三条路线：在桌面运行时之上实现 `ExtensionAPI`；把同样的能力
表达为一种新的插件贡献类型；或用 `pi-coding-agent` 的 `AgentSession`
替换桌面运行时。

## Decision

1. **可信扩展是第二个扩展界面。** Sidecar 将 `pi-coding-agent` 钉在与
   另外两个内核包相同的版本上，作为仅类型依赖；镜像它的发现规则；
   用 `jiti/static` 和虚拟模块加载模块；并在桌面拥有的 Runner 中、基
   于桌面运行时的钩子点实现 `ExtensionAPI`。每个会话一个 Runner。
   （上游的 `ExtensionRunner` 绑定了终端主题，不予复用。）
2. **可信、可选加入、不自动导入。** 扩展标注为“Trusted extension”，
   以 sidecar 信任级别运行，并且在用户逐个启用之前保持禁用。D007
   不变：扫描 `~/.pi` 寻找候选，但从不导入。项目范围的扩展按项目
   启用。
3. **显式的支持类别。** 每个 `ExtensionAPI` 成员都是 Supported、
   Deferred 或 Unsupported。Unsupported 成员是惰性的并产生诊断；它
   们绝不抛出异常。终端 UI 界面保持 Unsupported。
4. **插件不受影响。** 不改变任何插件 manifest、权限或进程边界。扩
   展工具和命令进入插件使用的相同目录，排在插件之后，并在命名冲突
   时落败。
5. **v1 不改变 host-core。** 启用状态是应用设置；新增流量仅限
   sidecar 到主进程的代理方法和 Electron IPC。

## Consequences

- 用户可以把进程内工具、钩子和命令挂到 agent 循环上，而无需新的应
  用发布。
- 两个扩展界面共存，在用户文档中解释为“插件”（沙箱化）和“可信
  扩展”（在 sidecar 内）。
- 三个内核包同步演进；带示例扩展的契约测试守护每次升级。
- sidecar 产物必须保持 jiti 可加载；这一点首先验证。
- 模块级扩展状态在同一个 sidecar 内跨会话共享。

## Alternatives considered

- 为进程内钩子新增一种插件贡献类型。被拒绝：它要么打穿插件沙箱，
  要么以第二个名字复制 `ExtensionAPI`，而且没有任何现成的扩展可运
  行。
- 用 `AgentSession` 替换桌面运行时。暂时被拒绝：它会丢弃桌面的模
  式、计划、延迟工具和 subagent 逻辑，而且终端 UI 界面无论如何都保
  持不可用。保留为长期选项。
- 在插件宿主进程内运行扩展。被拒绝：权限网关会拒绝扩展所做的大部
  分事情，它们会在加载时失败。
