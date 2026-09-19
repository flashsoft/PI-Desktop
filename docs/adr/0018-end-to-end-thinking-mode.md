# ADR 0018: 让 thinking 模式贯穿完整的会话管线

- 状态: 已接受
- 日期: 2026-07-26

## 背景

桌面端此前暴露了一个只存在于渲染进程状态中的 effort 标签。pi 运行时
是以禁用推理的方式构造的，所选级别从不跨越 IPC，assistant 的
thinking 事件没有持久或可见的表示。移除那个装饰性控件修正了误导性
UI，但也让具备推理能力的模型没有了可用的选择器。

Pi 已经提供模型推理元数据、支持的 thinking 级别、provider 特定的
请求序列化和独立的 thinking 流块。PI-Desktop 需要一个权威的会话值
和一条穿越每个进程边界的无损路径，而不是又一个仅限渲染进程的偏好。

## 决策

Thinking 模式是会话作用域的运行时配置，规范级别为 `off`、`minimal`、
`low`、`medium`、`high`、`xhigh` 和 `max`。

完整路径为：

```text
model capability -> session.thinkingLevel -> renderer/main IPC
-> sidecar prompt -> pi Agent thinkingLevel -> thinking stream events
-> UiMessage.thinking -> host canonical blocks -> transcript disclosure
```

- 当 provider 没有显式覆盖时，模型能力从 pi 的内置目录推断。自定义
  provider 可以显式启用或禁用推理。
- 具备能力感知的 UI/main/sidecar 边界使用相同的就近支持级别钳制。
  宿主在不了解 provider 的情况下校验规范枚举。不支持推理的 provider
  始终解析为 `off`。
- Composer 仅当所选 provider/model 具备推理能力时渲染选择器，并通过
  `session.configure` 持久化变更。
- Thinking 文本在流式事件、持久化、渲染和复制操作中始终与回答文本
  分离。
- 宿主 schema v3 增加 `sessions.thinking_level`；assistant 推理存储为
  规范的 `thinking` 内容块。现有 v2 会话迁移为 `off`。
- 共享/宿主协议版本前进到 2，因为会话和消息的线上形态发生了变化。

这扩展了 D091：推理控件现在可以可见，只是因为它有了端到端的运行时
实现。

## 后果

- 推理选择跨重启保留，并应用于该会话的下一个 turn。
- 稀疏的模型能力集合——包括无法完全禁用推理的模型，以及类似
  `[\"off\",\"high\"]` 的布尔式自定义集合——在 Settings、Composer、
  main 和 sidecar 之间一致地解析。
- 仅含 thinking 的流更新可以打开 transcript，而不会产生空的回答
  气泡。
- 搜索和复制回答行为排除 thinking 文本。
- 旧数据库以增量方式迁移；旧协议对端会在正常的版本握手中失败，
  而不是悄悄丢弃新字段。

## 备选方案

### 把 effort 保留在渲染进程本地存储

否决，因为它无法影响请求，也无法作为会话真相存活。

### 把 thinking 文本放进 assistant 回答中

否决，因为它会破坏回答 markdown、复制语义、搜索文本，以及 pi 已
提供的推理与最终输出之间的区分。

### 启用一个通用的推理布尔开关

否决，因为 pi 模型暴露的支持级别各不相同且有时稀疏；把它们压缩
会丢失模型能力信息。

## 参考

- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/03-runtime/04-data-storage.md`
- `docs/spec/03-runtime/06-host-rpc-protocol.md`
- `docs/spec/03-runtime/11-provider-model-system.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D096)
