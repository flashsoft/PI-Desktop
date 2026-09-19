# ADR 0046: 分类进程日志文件

- 状态： 已接受；计时相关条款已被 ADR 0212 取代
- 日期： 2026-08-02
- 相关： [D082](../spec/08-meta/decisions-log.md) ·
  [D182](../spec/08-meta/decisions-log.md) ·
  [D183](../spec/08-meta/decisions-log.md) ·
  [ADR 0212](0212-remove-diagnostic-timing-log-streams.md) ·
  [日志与可观测性](../spec/03-runtime/09-logging-and-observability.md)

## 背景

M5 日志器通过把 app、host 和 agent 输出保存在三个轮转文件中来限制无界增长。
实践中，正常的会话活动、工具计时、provider 诊断和生命周期噪音仍会积累在同一
个文件里，使单次故障的追踪代价很高。子进程 stderr 也以任意分块到达，且 Rust
tracing 的颜色被以转义序列形式持久化。

## 决策

1. 保留 `app`、`host`、`agent` 作为顶层本地日志通道，但每个通道写入一个由聚
   焦类别文件组成的目录：`logs/<channel>/<category>.log`。
2. 主进程调用点声明显式类别。host 和 agent 的 stderr 使用基于标记的分类；
   计时记录始终使用 `timing`，未知输出使用 `runtime`。
3. 在每条 NDJSON 记录中加入类别。日志器按行缓冲子进程 stderr，在流边界解码
   UTF-8，并在写入前剥离 ANSI 控制序列。
4. 现有的 5 MB / 两个轮转文件策略独立应用于每个类别文件。轮转与磁盘故障仍
   为非致命。现有的扁平文件不会被自动删除。

## 后果

- 诊断调查可以只打开相关的会话、工具、计时、provider 或生命周期流，而不是
  扫描混合文件。
- 计时记录仍可在稳定路径上轻松 grep：`host/timing.log` 与
  `agent/timing.log`。
- logs 文件夹包含更多文件，但每个文件大小有界且用途稳定。应用仍暴露同一个
  打开文件夹操作。
- 旧的 `app.log`、`host.log`、`agent.log` 文件仍可作为历史遗留读取，但新记
  录只写入分类布局。

## 已拒绝的备选方案

- **每通道保留一个文件并依赖 `category` 字段：** 保留了促使本次变更的扫描
  问题。
- **每个会话建一个文件：** 产生无界的文件数量，且让启动、provider 与进程故
  障没有天然的会话归属。
- **启动时删除或迁移遗留文件：** 有丢失诊断历史的风险，并让一项日志改进有
  可能导致应用启动失败。
