# ADR 0116: 添加 OpenCode Go 作为固定 Provider 预设

- Status: Accepted
- Date: 2026-08-24
- Deciders: PI-Desktop core
- Updates ADR 0012 and ADR 0020

## 背景

OpenCode Go 服务暴露一个 OpenAI 兼容的 Chat Completions API，但其
端点由服务拥有，不应像通用网关那样被编辑。用户应当能够不从另外
的文档复制端点即可完成配置，同时现有的 provider studio 必须继续
支持任意的 OpenAI 兼容服务。

## 决策

添加 `opencode_go` 作为持久化的 API 样式值，并在自定义 provider
对话框中暴露它。选择它会应用这些不可变的连接默认值：

```text
name:    OpenCode Go
baseUrl: https://opencode.ai/zen/go/v1
```

渲染进程保持名称和端点可见但只读，只接受 API key 作为唯一可编辑
的连接字段，并继续使用正常的发现模型选择器。保存时的归一化也强
制这些固定值，使陈旧的或手工构造的表单状态无法覆盖它们。

运行时将 `opencode_go` 映射到 pi-ai 的 OpenAI Chat Completions 适
配器，除非模型级目录条目固定了另一种线路 API（见 #105）。模型
发现用 Bearer key 调用 `/models`。密钥仍由现有的 Rust 宿主密钥存
储拥有；不引入 OpenCode 专用的密钥或数据库表。

OpenCode Go 要求 LLM 请求携带稳定的 `x-opencode-session` 头，使网
关能把一个会话固定到一个后端。pi-ai 不发出该头。Agent-runtime
在会话、子代理、prompt 增强和插件一次性流上注入它（外加
`x-opencode-client: pi-desktop` 和 PI-Desktop 的 `User-Agent`），
使用持久的会话 id。检测匹配 `apiStyle: opencode_go`、vendor/provider
id `opencode` / `opencode-go`，或 `opencode.ai` base URL，因此
UUID provider 行和指向 Go 的自定义 Completions 行都能工作。这保
留在 agent 层，与官方 Pi 编码代理的归属助手一致。

## 后果

- OpenCode Go 在 provider 行和持久配置中可识别。
- 选中该预设时，服务不会被意外指向不同的端点。
- 通用 OpenAI 兼容配置仍作为独立的 API 样式，供用户控制的网关
  使用。
- 该预设不创建第二个线路适配器，也不把服务的模型列表约束到硬编
  码目录。
- OpenCode Go 的聊天、子代理和一次性请求携带稳定的会话路由头，
  无需等待 pi-ai 的变更。
