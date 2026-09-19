# ADR 0237：将 Session 编排保留在官方插件中

- Status: Accepted
- Date: 2026-09-13
- Updated: 2026-09-13
- Decision: D391
- Related: ADR 0200, ADR 0203, ADR 0208, ADR 0062, ADR 0089

## 背景

某些任务受益于多个独立 Agent 同时工作，但现有的 `Task` 家族是有意设计的
有边界的进程内子 Agent 系统。新的编排功能不得创建第二个 session 存储、
绕过插件权限，或让渲染进程成为 Agent 运行时。

公共插件 SDK 已经暴露了 Agent 工具和经过审查的 `desktop.control` 网关。
它并未暴露实时 session 创建或 Agent 生命周期事件，因此首个实现需要一个
小型组合层，而不将编排移入 host-core。

## 决策

将 `pi.session-orchestrator` 作为普通的 marketplace 插件发布。它注册
`SessionTask` Agent Tool，包含 `spawn`、`send`、`supervise`、`status`、
`wait`、`result`、`accept`、`cancel` 和 `list` 动作。

- `spawn` 使用 `session/create` 随后调用 `agent/prompt`，创建一个不复制
  transcript 的全新持久 session。它继承父级的 project、provider/model、
  thinking level 和 permission mode。
- `send` 复用已记录的 worker session。`cancel` 使用 `agent/abort`，并且
  绝不删除 session。
- 插件只在其私有数据目录中持久化 parent/worker 关系、任务、状态、时间戳
  和有边界的报告。宿主持有的 worker transcript 仍是事实来源。工具响应
  和关系存储中的规范 worker 身份是 `session/create` 返回的原始持久
  `sessionId`；0.2.x 的 `workerSessionId` 设置在加载时迁移，不会创建
  第二个 Work ID。
- 父级只能控制记录在其自身 session id 之下的 Worker Session ID。`send`
  或 `supervise` 的后续操作寻址同一批 Session ID，因此子级保留自己的
  上下文，而不会创建替代 session。Worker session 不能使用该工具创建或
  控制更多 worker。活跃工作上限为每个父级四个 worker、整个插件共十六个。
- 在生命周期订阅存在之前，`wait` 执行一秒间隔的轻量状态轮询，默认超时
  25 秒、最大超时 45 秒。每次桌面读取限定在五秒以内，报告 transcript
  读取延迟到 worker 不再运行时进行，超时返回 `timedOut`，使插件工具
  不会无限期占用宿主截止时间。Agents 面板使用相同的仅状态刷新路径。
- 一个简单的 `Agents` 工作面板视图列出 worker，并提供状态刷新、
  Open Session 和 Stop。

两个增量宿主原语支撑这些边界：

1. `session/create` 接受可选的 `inheritPermissionFromSessionId`。对于
   插件发起的调用，桌面网关将该 id 绑定到当前 Agent 工具 session。宿主
   随后在持有状态锁的情况下复制现有父级的持久化 permission mode；调用方
   绝不能提交任意的 worker permission mode，省略时保留现有的 `inherit`
   默认值。
2. 经过审查的桌面目录新增 `session/open`，它校验并选择一个已存在的持久
   session。插件发起的 create/prompt 调用会刷新渲染进程，但不会窃取父级
   的活跃 session；显式的 `session/open` 是唯一的导航动作。

不添加 Rust schema 迁移、MCP 自调用、MCP token 访问、A2A 通道、消息
总线、DAG，也不改动 `Task`、`TaskWait`、`TaskList` 或 `TaskStop`。

## 后果

父级可以扇出真实的持久 worker，同时每个 worker 在常规 session UI 中保持
可见、可检查。现有的 session 和 subagent 行为保持不变，插件数据可以在
插件或应用重启后恢复关系列表。

首个版本不接收生命周期事件，因此存在有边界的轮询延迟。插件还有四 worker
上限，且不提供无作用域的任意 session 控制或 worker 到 worker 的消息传递。
危险宿主操作绝不用于编排；任何未来扩展都必须保留现有的 desktop-control
权限和原生同意边界。

## 验证

插件运行时集成测试覆盖三个并行真实 session 请求、父级作用域、跨重载
持久化、规范 Session ID 路由、同 session 上下文复用、有界报告提取、
超时安全的状态轮询、旧设置迁移，以及不删除的取消。Host-core 测试覆盖
可选的权限继承输入。E2E 计划将真实 provider 旅程记录为
`E2E-PLUGIN-session-orchestrator-real-workers`。
