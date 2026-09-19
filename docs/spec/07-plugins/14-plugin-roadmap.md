# 14. 插件路线图

## 1. 指导原则

```text
本地插件可用 → 对开发者友好 → 市场分发 → 签名与自动更新
```

## 2. 路线图

### R1 — 基础（随 M4）✅
- manifest v1
- 本地目录加载
- 启用/禁用/卸载
- 命令面板集成
- hello 示例插件
- 权限声明展示

### R2 — Agent 扩展（部分 ✅）
- 完整 agentTools 管线 ✅
- 官方 `pi.session-orchestrator` 工作会话插件 ✅ —— 真实的持久会话、
  宿主拥有的双向投递、按回合返回的结果、至多一次的完成回调、有界的状态
  投影，以及父级作用域的持久化；它组合的是经过评审的 `desktop.control`
  操作，而持久 ledger 仍留在 host-core（ADR 0237 / ADR 0239）
- Skills 贡献已激活：当被授予 `agent.prompt.inject` 时，声明的 skills 会以
  系统提示中的 `# Skills` 目录形式送达模型，模型通过 `Skill` 工具按需加载
  正文 ✅（ADR 0039，D174）
- 统一命名空间与审计 ✅
- 每插件设置 API 与生成的设置 UI 已实现。该 UI 支持
  string/number/boolean/select/json 字段以及插件局部命令快捷键；
  操作系统级全局插件快捷键仍不在范围内。
- 插件日志面板仍在计划中；运行时审计日志已存在，但没有专门的
  插件日志界面

### R3 — DX 与打包 ✅
- plugin-sdk ✅
- 模板生成 ✅（`panel-basic`、`agent-tool-basic`、`skill-pack`、
  `full-demo`，可从插件页面、Agent 或 `pi-plugin init` 发起）
- `pi-plugin check/pack` ✅（`@pi-desktop/plugin-devkit`，同时以
  `PluginCheck` / `PluginScaffold` / `PluginPack` Agent 工具暴露）
- `.piplug` 安装 ✅
- 开发热重载 ✅（watch + 防抖，且重载永远不会扩大权限）

### R4 — 市场只读 ✅
- 市场 provider 抽象（官方远程 GitHub 目录 provider）
- 来自 `vastsa/pi-desktop-plugins` 的官方来源浏览/搜索
- 下载 + 校验和安装
- 更新列表（手动更新）

### R5 — 信任与自动更新（部分 ✅）
- 发布者验证（目录中的 verified 标志）
- 签名验证（仍在计划中；当前强制校验和）
- 权限差异升级 ✅
- 自动更新策略 ✅
- 恶意版本下架响应（仍在计划中）

### R6 — 高级生态（部分 ✅）
- MCP 插件类型 ✅ —— 经 stdio 与远程 HTTP 的 `contributes.mcpServers`（D176）
- 后台服务插件 ✅ —— 带受监督重启的 `contributes.services`（D177）
- 插件间消息总线 ✅ —— 声明式主题，`pi.bus.*`（D178）
- 主题插件 ✅ —— 插件携带 CSS 文件（D175）
- 企业私有来源（仍在计划中）
- 市场评论 / 质量评分（可选，仍在计划中）

### R7 — Agent 扩展（v1.1 ✅，D387 / D388）
- v1：Agent sidecar 中的 ExtensionAPI 适配器；工具、命令、生命周期与
  provider 钩子、基础 UI 提示
- v1.1：模块是一种插件贡献（`contributes.agentExtensions`，权限
  `agent.extension`）；“Import pi extension” 可将一个 pi CLI 扩展变成
  开发插件；不设独立注册表或设置标签页
- v2：自定义会话条目、`sessionManager` 读取 shim、编辑器读写、
  快捷键、markdown 转换器；签名落地后进入市场分发
- v3：pi CLI `settings.json` 提示、统一的 skill/prompt 发现、远程控制
  prompt 路由
- 规范：[16-trusted-extensions.md](16-trusted-extensions.md)；ADR 0214、ADR 0215

## 3. 与产品里程碑的映射

| 产品里程碑 | 插件目标 |
|---|---|
| M1 骨架 | 预留 plugins 目录与接口桩 |
| M2 聊天运行时 | 不阻塞；可并行设计 |
| M3 工具 | ToolHost 预留贡献钩子 |
| M4 插件基础 | R1 完成 |
| M5 加固 | 插件隔离与稳定性 |
| MVP 之后 | 完成 R2，并分阶段推进 R3–R6 |

## 4. 成功指标（生态）

1. 用户无需等待官方新版本即可通过插件扩展自己的工作流
2. 第三方可以独立开发并在本地安装插件
3. 插件故障不会破坏主应用的可用性
4. 安装任何插件之前权限可见且可拒绝

## 5. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 过早建设市场会使核心失稳 | 推迟市场；R1 先做本地 |
| 插件安全事件 | 默认拒绝 + 审计 + 后续强制签名 |
| API 频繁破坏 | apiVersion / schemaVersion |
| 开发者门槛高 | 模板 + hello 示例 + SDK |
