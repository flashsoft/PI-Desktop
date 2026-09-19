# ADR 0258：受信任的扩展可以提供自定义 Agent

- Status: Accepted for implementation
- Date: 2026-09-15
- Decision: D426
- Related: ADR 0214, ADR 0215, `07-plugins/16-trusted-extensions.md`, Issue #401

## 背景

受信任的扩展在 Agent 运行时旁运行，是无法用内置 pi-ai 适配器表示的
provider 的合适界面。Issue #401 要求模型选择和自定义 agent/provider
注册，使插件可以集成 Command Code 这类拥有自己端点和认证流程的服务。

钉住的 pi-coding-agent API 有 `registerProvider`，但没有 `registerAgent`，
且其 provider 注册表假定凭据和模型持久化由 coding-agent 拥有。直接传递
该注册表会绕过 PI-Desktop 的 session 绑定和密钥所有权边界。

## 决策

1. 新增 PI-Desktop `registerAgent` ExtensionAPI 成员。受信任的扩展注册
   一个 id、有界的模型元数据，以及 `stream` 或 `complete` 实现之一。
   插件拥有端点、认证、请求序列化和响应转换。
2. 注册保留在 Agent sidecar 中。宿主只接收所选的不透明 provider id/
   model id，并通过现有的 `session.configure` 流程持久化 session 绑定。
3. 使用命名空间的 `extension-agent:<encoded-agent-key>` provider id。在
   后续 turn 中，Electron 启动器把绑定作为占位 provider 传递；sidecar
   重载受信任的扩展并重新激活匹配的实现。
4. 向扩展上下文暴露只读的模型注册表投影。它可以列出模型和认证可用性，
   但绝不返回宿主 API key、secret 引用、OAuth token、任意 provider
   header 或宿主 provider 内部。
5. `registerProvider` 作为兼容性别名接受相同的插件持有流式形态。字面
   量 provider 凭据不被宿主消费，也不向 Host 数据库或全局默认值写入
   任何 provider 注册。
6. 注册是 session 作用域的，随运行时移除。自定义 agent 只对持有现有
   高风险 `agent.extension` 授权的受信任扩展可用。

## 后果

- Command Code 和类似集成可以实现自己的认证和线上协议，无需应用发布
  或新的 Rust 传输。
- Session 模型选择保持宿主持有，并可通过现有的 `session:modelChanged`
  事件观察。
- 自定义 agent 定义在普通 provider Settings 选择器中不可见；插件可以
  暴露自己的命令或 UI 来选择它们。
- 受信任的扩展代码在设计上拥有 sidecar 级权限。Marketplace 分发仍受
  现有签名/信任策略约束。
- 公共 ExtensionAPI 契约对 `registerAgent` 是 PI-Desktop 特有的；上游
  pi API 升级必须保留适配器契约或添加兼容翻译。

## 已考虑的替代方案

### 直接暴露 pi-coding-agent ModelRegistry

被拒绝：它暴露凭据解析，并假定 pi 的持久化模型。

### 把每个自定义 provider 加入 Rust/SQLite

被拒绝：插件拥有实现和凭据，而 Host 存储绝不能持久化不透明的插件传输
代码或密钥。

### 改为注册可执行的子 Agent

推迟到单独的 API。本决策覆盖自定义 LLM/Agent 传输，而不是新的自主
worker 或工具权限配置。
