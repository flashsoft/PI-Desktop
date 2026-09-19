# ADR 0240：独立的 session 发现与可导航的协作投影

- Status: Accepted
- Date: 2026-09-13
- Decision: D410
- Amends: ADR 0239

## 背景

宿主持有的协作账本已经允许在任意两个已存在的 Agent Session ID 之间进行
投递，但 Session Orchestrator 私有的最近引用存储并不是发现这些 ID 的
权威。因此，通过常规 New Task 流程创建的 session 可以是合法的通信目标，
同时对 `SessionTask.list` 保持不可见。

侧栏协作投影还需要解释持久的创建出处而不暴露完整 transcript，现有的
悬停卡片必须让用户在相关 session 之间移动。

## 决策

经过审查的 `desktop.control` 目录新增增量读取操作
`session/collaboration/list`。它最多返回 100 个未删除的 Agent session，
附带其真实 Session ID、标题、状态、更新时间、可读的 provider 和 model
标签，以及有界的创建链接。它不返回 project 路径、凭据、transcript 或
消息预览。`send` 仍是现有的认证变更路径，接受任何已存在的 Agent
Session ID；它不创建 worker 关系，也不替换目标 session。

宿主侧栏投影增加可读的 `providerName` 和 `modelName` 字段，外加至多八个
`createdSessions` 引用。`createdBySession` 和 `createdSessions` 只描述
持久的 Session Orchestrator 创建链接；普通独立创建的 session 不会获得
捏造的创建者。渲染进程将这些引用渲染为原生可键盘聚焦的按钮。激活时通过
现有的 store 选择路径打开被引用的持久 session 并聚焦 Composer。

悬停卡片保持按需且有界。其交互式 portal 拥有指针/焦点宽限期，因此从行
移动到相关 session 按钮时，卡片不会在点击之前消失。渲染进程代码保持
只读；Rust 仍是持久化和出处的权威，Electron 仍是薄投影/编排层。

## 兼容性与验证

新操作和投影字段是增量的。现有的 `status`、`send`、`spawn`、result、
取消、私有引用和 session 数据均不变。Session Orchestrator 在 `list` 中
保留旧的 `workers` 字段，同时新增宿主支撑的 `sessions` 目录，因此使用
旧的最近引用兼容行为的调用方继续可用。

该列表限定为 Agent session，因为宿主已经拒绝向 Plan 和 Goal session
投递。Host-core 投影测试覆盖可读的 provider/model 名称、创建者/被创建
session 链接以及独立 session 发现。插件测试覆盖列表发现和双向投递。
相关的真实旅程由 `E2E-SESSION-independent-top-level-communication` 和
`E2E-SESSION-hover-card-model-and-links` 跟踪。

## 修订（2026-09-13）：引用可用性

`SessionReference` 新增可选的 `available` 字段。对于 session 行已删除或
缺失的 `createdBySession`、`createdSessions`、`currentTask.senderSession`
或 `recentExchanges[].peer` 引用，宿主报告 `available: false`，并回退为
以 Session ID 作为标题。渲染进程将不可用引用渲染为文本且不提供导航；
激活一个 session 已不存在的引用会报告可见错误，而不是提交一个空选择。
该字段是增量且可选的，因此现有调用方和持久化数据不受影响。
