# ADR 0250 — 结构化、有界且经脱敏的进程日志

- **Status**: Accepted for implementation
- **Date**: 2026-09-14
- **Amends**: [ADR 0046](0046-categorized-process-logs.md) · [ADR 0212](0212-remove-diagnostic-timing-log-streams.md)
- **Related**: [Logging and observability](../spec/03-runtime/09-logging-and-observability.md)

## 背景

分类日志器移除了旧的聚合和计时流，但其剩余记录仍过于依赖自由文本消息。
特别是，一次普通的工具调用会产生分开的 `tool start` 和 `tool end` 行，
而控制台镜像丢弃了大多数关联字段。子进程 stderr 和错误详情还可能包含
凭据、绝对本地路径或无界的诊断文本。

## 决策

1. 每条进程日志记录除了简短的人类可读 `message` 外，还有一个稳定的、
   点分隔的 `event`。关联字段（`traceId`、`requestId`、`sessionId`、
   `turnId`、`toolCallId`、父级工具调用、agent、插件和执行 ID）保持为
   顶层字段。
2. 一次正常的工具执行在 `tool_end` 之后发出一条
   `tool.execution.completed` 或 `tool.execution.failed` 记录。如果
   sidecar 在工具活跃时退出，则为该工具发出一条
   `tool.execution.interrupted` 记录。sidecar 的 `tool_start`/`tool_end`
   协议事件和 transcript 持久化不变。功能性的时长元数据仍然允许；不
   引入计时流。
3. Electron 日志器脱敏敏感对象键、授权方案、URL 凭据和常见 provider
   token 格式。Home、应用数据和日志目录前缀被替换为占位符。字符串、
   对象深度、字段计数、数组项和序列化的 `data` 是有界的；`data` 每条
   记录上限 8 KiB。Host-core 审计载荷应用相应的字符串/路径脱敏，并在
   整形后上限 8 KiB。
4. 工具结果以安全摘要表示：结果、稳定的错误/代码字段、时长、字段名、
   内容块计数和 stdout/stderr 大小。原始工具参数、文件内容、命令输出
   和插件响应不会复制到普通进程日志中。
5. 子进程 stderr 以有界、无 ANSI 的 `data.output` 值发出，使用稳定的
   `child.process.stderr` 事件。主进程错误回退使用相同的结构化和脱敏
   形态。控制台镜像包含与文件相同的净化记录；在生产环境中只镜像错误。

## 后果

- 普通工具循环的存储和控制台噪音减少，而不丢失诊断所需的最终结果、
  标识符、错误码或时长。
- 日志可按事件和关联 ID 搜索，无需解析消息文本即可跨 app、host 和
  agent 通道连接。
- 敏感或异常大的诊断值在写入前被移除、摘要或截断。日志保持尽力而为，
  不能让调用方失败。
- 现有协议、transcript、审计计时字段、保留策略、类别文件和历史日志
  文件保持兼容。

## 替代方案

- **保留 start/end 记录并改进其措辞。** 被拒绝，因为它保留了重复存储，
  且结果仍被拆在多行中。
- **在调试开关后记录完整工具参数和结果。** 被拒绝，因为本地调试日志
  仍是用户数据，可能包含凭据或私有 workspace 内容。
- **为时长新增独立计时流。** 被 ADR 0212 拒绝；时长只作为相关结果或
  审计记录上的功能性元数据保留。
