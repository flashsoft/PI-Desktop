# ADR 0156: 简化添加 Provider 的通用路径

- Status: Accepted
- Date: 2026-09-05
- Deciders: PI-Desktop core
- Updates ADR 0116 and ADR 0155

## 背景

添加 provider 对话框在模型窗格之前堆叠了 Service、Name、Base URL、
API key 和 API format。命名的智谱 / Z.AI 端点已经知道自己的名称、
URL 和线上格式，因此这些额外字段让首次使用路径看起来像一个通用
网关表单。

## 决策

新对话框一开始只有 **Service**。选择命名端点后（智谱 / Z.AI API
或 Coding Plan、OpenCode Go），通用路径是 Service + API key，外加
一行主机摘要。Custom 端点则显示 Name、Base URL 和 API key。Name
（命名行）和 API format（自定义行）保留在 Advanced 之下。
OpenCode Go 是一个 Service 选项，而不是 API format 选项。

没有步骤条、厂商卡片网格或额外的 `apiStyle` 值。ADR 0155 的持久化、
目录匹配和 Completions 标志不变。

## 后果

- 添加已知服务是选择 + 粘贴 + 选模型。
- 自定义 OpenAI 兼容网关保留之前的 Name / URL / key 契约，API
  format 仍在 Advanced 中可用。
- OpenCode Go 可以与其他命名服务一起被发现。
