# ADR 0176: 按 provider 覆盖 User-Agent

- 状态：已接受
- 日期：2026-09-07
- 决策者：PI-Desktop 核心团队
- 修订 ADR 0095 / ADR 0156

## 背景

一些网关和厂商订阅会检查 `User-Agent`。pi-ai 会标记 `pi (<platform> …)`，
Anthropic OAuth 推理发送 `claude-cli/<version>`，OpenCode Go 发送
`pi-desktop/<APP_VERSION>`，而 Codex 会在额外头之后覆盖 User-Agent。
设置中没有办法按行设置该值。provider schema 列出了一个从未实现的
`headers` map。

## 决策

每个 provider 行——API 密钥 AI 服务和 OAuth 厂商账户——可以在
`config_json.userAgent` 中存储可选的 `userAgent`。

- 为空或省略时保持现今的适配器默认值。
- 非空的修剪后值会作为 `User-Agent` 发送到该行的出站 HTTP：会话轮次、
  内置子 agent、prompt 增强、插件一次性调用、`/models` 发现（包括未
  保存的表单值）、连接测试和 OAuth 令牌刷新。
- fetch 包装器是最后写入者，使 Codex 和 Anthropic SDK 无法覆盖它。同样
  的值也会放在 pi-ai 的 stream-option 头上，使 OpenCode 的"调用方优先"
  规则保持成立。
- 用 `""` 更新会清除覆盖。最大 256 字节；拒绝 CR/LF。
- 不是密钥。不提升 SQLite 或宿主协议版本。
- UI 位于 AI 服务对话框（命名和自定义）以及厂商账户编辑器的高级区域。
  首次 OAuth 登录不收集 User-Agent；它在账户创建之后编辑。
- `AgentRuntime.matches()` 包含 `userAgent`，因此编辑它会重建预热运行时。
- 未使用的 `headers` map 保持未实现。如果以后添加，`userAgent` 仍是 UI
  别名，并优先于 `headers["User-Agent"]`。
  **已被 ADR 0178 取代：** `config_json.headers` 是受支持的覆盖方式；
  遗留的 `userAgent` 迁移到 `headers["User-Agent"]`。

覆盖 Anthropic OAuth 的 `claude-cli/…` User-Agent 可能导致 Claude
Pro/Max 拒绝请求。这是用户自己的选择。

## 后果

- 用户可以按服务或账户伪装成另一个客户端，而无需全局 User-Agent 或
  完整的自定义头编辑器。
- OAuth 登录 HTTP 只在该行保存之后才使用行值；首次登录流量保持 pi-ai
  默认值。
