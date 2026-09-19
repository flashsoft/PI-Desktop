# ADR 0178: 按 provider 自定义 HTTP 头

- 状态：已接受
- 日期：2026-09-08
- 决策者：PI-Desktop 核心团队
- 修订 ADR 0176 / ADR 0095 / ADR 0156
- 取代 ADR 0176 中仅限 User-Agent 的界面

## 背景

ADR 0176 增加了按行覆盖 User-Agent 的能力，因为网关会检查该头，且
Codex 会在额外头之后覆盖它。随后用户需要为其他非密钥请求头（路由、
租户或客户端标识）获得同样的最后写入者路径，而不是一个专用的
User-Agent 字段。provider schema 已经列出了 `headers`；0176 让那个 map
保持未实现，并声明两者并存时 User-Agent 优先。

单个 User-Agent 字段的高级编辑器位于两列网格中，显得稀疏。

## 决策

每个 provider 行——API 密钥 AI 服务和 OAuth 厂商账户——可以在
`config_json.headers` 中存储可选的 `headers` map。

- 为空、省略或用 `{}` 更新时保持现今的适配器默认值。
- 非空 map 是该行出站 HTTP 的最后写入者：会话轮次、内置子 agent、
  prompt 增强、插件一次性调用、`/models` 发现（包括未保存的表单值）、
  连接测试和 OAuth 令牌刷新。
- fetch 包装器是最后写入者，使 Codex 和 Anthropic SDK 无法覆盖该 map。
  同样的值也会放在 pi-ai 的 stream-option 头上，使 OpenCode 的"调用方
  优先"规则保持成立。
- 已存储的 `config_json.userAgent` 在读取时迁移到 `headers["User-Agent"]`。
  写入 `headers` 会丢弃遗留的 `userAgent`。如果两者都存在，对于 map 中
  已有的 User-Agent 键，`headers` 优先。
- 宿主校验：修剪键和值；键大小写不敏感且唯一；最多 32 个头；键 ≤ 256
  字节；值 ≤ 4096 字节；不允许 CR/LF；头名为字母数字加连字符。保留键
  被拒绝，使其无法破坏签名或逐跳帧：`authorization`、
  `proxy-authorization`、`host`、`content-type`、`content-length`、
  `cookie`、`set-cookie`、`connection`、`transfer-encoding`、`te`、
  `trailer`、`upgrade`、`keep-alive`、`x-api-key`、`api-key`、
  `chatgpt-account-id`、`x-opencode-session`。
- 不是密钥。不提升 SQLite 或宿主协议版本。
- UI 是对话框右上角动作区的显式"高级设置"按钮（命名、自定义和厂商
  账户），打开一个独立的紧凑模态框。模态框提供包括 `User-Agent` 在内的
  常用头预设、与持久化所用相同的规范化记录的 JSON 复制、针对直接头
  对象或 `{ "headers": { ... } }` 的 JSON 导入，以及大小写不敏感的
  合并且不产生重复行。最多可见两个头行；更多行在编辑器内滚动。命名
  显示名保持在头控件之上。首次 OAuth 登录不收集头；它们在账户创建
  之后编辑。
- `AgentRuntime.matches()` 包含头 map，因此编辑它会重建预热运行时。

覆盖 Anthropic OAuth 的 `claude-cli/…` User-Agent 可能导致 Claude
Pro/Max 拒绝请求。这是用户自己的选择。

## 后果

- 用户可以伪装成另一个客户端，并按服务或账户附加网关特定的头，而无需
  全局头转储或携带认证的编辑器。
- OAuth 登录 HTTP 只在该行 map 保存之后才使用它；首次登录流量保持
  pi-ai 默认值。
- 先前保存的 User-Agent 继续生效，直到该行下次保存——此后它只存储在
  `headers` 中。
