# ADR 0002: 使用 pi Agent Harness 作为内核

- 状态: 已接受
- 日期: 2026-07-25

## 背景

我们需要一个可扩展的多模型 agent 循环，而不是从零实现工具调用、流式事件和 provider 适配器。

## 决策

使用以下包作为内核：

- `@earendil-works/pi-ai`
- `@earendil-works/pi-agent-core`

后续可选采用：

- `@earendil-works/pi-coding-agent`
- `@earendil-works/pi-storage-sqlite-node`

## 理由

1. 统一的 LLM provider 接口
2. 清晰的 agent 事件模型，非常适合桌面 UI
3. 在工具调用 / 会话 / skills 生态上提供可扩展性
4. LiveAgent 等项目已经验证其可作为桌面产品的可行内核

## 后果

### 正面
- 避免自研 agent 框架
- 可以跟随上游能力演进

### 负面
- 需要适配 pi 的事件和版本约束（Node >= 22.19）
- 部分桌面产品需求需要我们在上层自行补齐（权限 UX、会话产品模型）

## 备选方案

- 自研 agent 循环：成本高，否决
- 直接使用其他 coding agent 作为内核：与"基于 pi"的目标不一致
