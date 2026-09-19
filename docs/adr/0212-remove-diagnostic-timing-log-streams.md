# ADR 0212: 移除诊断性计时日志流

- Status: Accepted
- Date: 2026-09-10
- Amends: [ADR 0046](0046-categorized-process-logs.md) · D183
- Related: [Logging and observability](../spec/03-runtime/09-logging-and-observability.md)

## Context

D137/D183 添加了按工具、按模型、启动阶段和更新器的计时输出，以帮助
诊断一次缓慢的运行。该调查已完成，而这些记录现在在正常使用期间给本
地日志目录制造了噪音。

## Decision

1. 停止发出 sidecar 的 `[timing]` 行、宿主的 `tool timing` 行、启动
   阶段计时记录、更新器计时记录，以及渲染进程引导计时输出。
2. 移除专用的 `timing` 日志类别和 `PI_DESKTOP_TIMING` 抑制环境变量。
   更新器的功能性超时保留。
3. 保留关键的生命周期、状态变化、权限、工具、插件、provider、持久
   化、更新器和错误记录。保留被产品功能或安全取证消费的结构化审计
   字段和 UI/协议时长元数据。
4. 不删除或迁移用户本地数据目录中已存在的计时文件。它们是历史记
   录。

## Consequences

- 正常的启动、轮次、重试和工具调用产生更少的日志记录，且不再创建
  专用的计时文件。
- 故障仍然可以通过稳定的生命周期记录、错误代码、工具/权限审计行和
  可见的 transcript 进行诊断。
- 计时专属的故障排查场景和文档被退役。
- 现有的本地计时文件可能保留，直到用户自行移除。
