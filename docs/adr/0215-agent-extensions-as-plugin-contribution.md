# ADR 0215: Agent 扩展是一种插件贡献

- Status: Accepted (implemented 2026-09-11)
- Date: 2026-09-11
- Decision: D388 (amends D387 / ADR 0214)
- Related: ADR 0008, ADR 0214, `07-plugins/16-trusted-extensions.md`,
  `07-plugins/02-plugin-manifest-schema.md` §4, `07-plugins/13-plugin-permissions-matrix.md`

## Context

ADR 0214 把 ExtensionAPI 模块作为插件旁边的独立界面交付：有自己的
`~/.pi/agent/extensions` 发现机制、自己的启用存储、自己的设置入口。
这给用户留下了两个都意味着“扩展 agent”的列表，并把 pi CLI 扩展留
在了插件生命周期（安装、作用域、更新、移除、市场）之外。维护者的
要求是一个界面：pi CLI 扩展被转换成 PI-Desktop 插件，并作为插件使
用。

## Decision

1. **`contributes.agentExtensions` + `agent.extension`。** 插件在其
   manifest 中列出 ExtensionAPI 模块，且必须持有 `agent.extension`
   权限（高风险，显式确认）。校验会拒绝没有该权限的贡献；省略它的
   已记录授权列表会跳过这些模块并留下审计条目。这些模块与之前完全
   一样在 Agent sidecar 中运行；插件沙箱不覆盖它们，权限文本中会声
   明这一点。
2. **插件生命周期拥有启用和作用域。** 启用、禁用、按项目激活、重
   载和移除都归插件所有。Sidecar 接收在会话项目中活动的已启用插件
   的模块。
3. **导入生成一个插件。** “Import pi extension” 把选定的文件或目
   录复制到 `<dataDir>/plugins/imported/<slug>/src`，写入带有该贡献
   和权限的 manifest，并将其注册为开发插件。选择器之前的确认就是信
   任决策。
4. **独立界面被移除。** 没有注册表文件、没有设置入口、没有
   list / enable / rescan / add-path / remove IPC。插件行显示能力徽
   章、权限徽章、加载状态、已注册的工具和命令名称，以及诊断。
5. **市场分发等待签名。** v1.1 中 `agent.extension` 接受来自本地导
   入和开发插件。

## Consequences

- 用户只有一个心智模型：扩展就是插件。Issue 183 的生态缺口以“作
  为插件导入”闭合。
- sidecar 引擎（加载器、Runner、钩子、命令和 prompt 桥接）未被触
  动；只有所有权层移动了。
- 沙箱级别不变，而且现在以权限形式显式表达。在插件宿主进程中运行
  模块的沙箱化变体仍然是 v2 选项。
- v1 测试设施覆盖插件形态的 fixture 和导入器/运行时契约；原生选择
  器、npm 安装和 provider 轮次旅程仍然是依赖环境的单独验证。

## Alternatives considered

- 保留两个界面并交叉链接。被维护者拒绝。
- 把 pi 扩展源码转换为插件主模块。被拒绝：ExtensionAPI 语义（进程
  内钩子、在 agent 旁边执行工具）无法映射到沙箱化的插件 API。
