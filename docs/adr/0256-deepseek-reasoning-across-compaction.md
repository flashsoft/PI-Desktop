# ADR 0256：跨上下文压缩保留 DeepSeek reasoning

- Status: Accepted
- Date: 2026-09-15
- Deciders: PI-Desktop core
- Amends: D389 / ADR 0136 / ADR 0064
- Fixes: #296

## 背景

DeepSeek thinking 模式要求每条重放的 Completions assistant 消息携带
reasoning 字段（`reasoning_content`，某些中继上是 `reasoning_text` /
`reasoning`）。官方 `deepseek.com` 端点对没有产生 thinking 的 turn 接受
`""`（D389 / #223）。DeepSeek V4.1 Flash 的 OpenCode 和第三方中继拒绝
空回显，返回 HTTP 400（"reasoning_text must be passed back"）。

Codex 形态的压缩（ADR 0064 / ADR 0136）从保留尾部丢弃 assistant turn，
使工具调用对不会搁浅、已完成的用户 prompt 看起来不像新任务。这也会丢
弃 thinking。重载 session 会从 `UiMessage.thinking` 重建 assistant 内容，
但没有 Completions `thinkingSignature`，因此 convertMessages 静默省略
reasoning 字段，而 #223 的空回填填入 `""`——严格中继会拒绝它。

## 决策

1. 历史重建只为 DeepSeek 兼容的 OpenAI Completions 行盖上
   `thinkingSignature: "reasoning_content"`。其他 API 保持未签名的
   thinking，使 pi-ai 保留其现有的纯文本回退；它们的 provider 原生签名
   与 Completions 字段不可互换。
2. 具有 `requiresReasoningContentOnAssistantMessages` 的模型的检查点，
   把最后几个 thinking turn 存储在不透明的 `details.retainedReasoning`
   中（仅文本 + thinking，无工具调用）。Session 上下文只对活跃的
   DeepSeek 兼容 Completions 绑定，在压缩摘要和用户尾部之间注入这些
   turn；其他 provider 不会收到合成的 DeepSeek reasoning。
3. pi-ai 补丁回填历史上已存在的 reasoning 字段（`reasoning_content` |
   `reasoning_text` | `reasoning`）。官方 DeepSeek URL 保持空字符串填
   充。非官方 DeepSeek 家族的 Completions 行设置
   `requiresNonEmptyReasoningReplay`，并接收文档化的占位符
   `[reasoning not retained for this turn]` 而不是 `""`。
4. ADR 0136 的保留尾部规则不变：仅用户的尾部，不重放工具调用。

## 后果

- 压缩后在 OpenCode / 聚合器上的 DeepSeek 请求保留真实或占位 reasoning，
  不再因空回显而 400。
- 官方 DeepSeek 和 #223 的空回填行为保持可用。
- 检查点 `details` 增加一个有界的 reasoning 摘录；可见 transcript 和
  宿主 schema 不变。
- 单元测试覆盖 convertMessages + 压缩 retained-reasoning 的线上形态。
  真实的 OpenCode / 聚合器验证仍推迟（见 E2E-005E）。

## 替代方案

- 在 400 之后降级为非 thinking 模式：避免了回显要求，但丢失该 turn 的
  reasoning，并掩盖压缩缺口。
- 把完整的 assistant/tool 消息放回 `retainedTail`：保留 reasoning，但
  重新引入搁浅的工具调用并削弱任务边界（被 ADR 0136 拒绝）。
