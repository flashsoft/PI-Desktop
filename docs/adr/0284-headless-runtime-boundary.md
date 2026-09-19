# ADR 0284: `packages/host-runtime` 中的无头运行时边界

- 状态：已接受，待实现
- 日期：2026-09-18
- 决策：D447
- 相关：ADR 0205（D373 / D374 / D375）、ADR 0213（D386）、
  `02-architecture/05-remote-agent-control.md` §4 和 §11、
  `03-runtime/07-process-model.md` §4、
  `06-delivery/07-remote-control-rollout.md` R2

## 背景

Rollout R1 交付了无头的 Agent Host 模块（`packages/agent-host`）：准入、
轮次队列、批准代理、事件日志和快照构建器在没有 Electron 的情况下运行。
但它之下的所有东西都不行。到 host-core 和 agent sidecar 的 stdio 传输、
重启监督器、持久轮次生命周期（`session.beginTurn` → prompt →
`session.endTurn`）、转录持久化、进行中回复的检查点，以及已批准的
Plan/Goal 执行，全都住在 `apps/desktop/electron/main` 里，而 Electron 的
`AgentHost` 桥通过调用桌面自己的 IPC 处理器到达它们。`HostProcess` 从
`process.resourcesPath` 解析二进制，`AgentSidecar` 只能以
`process.execPath` + `ELECTRON_RUN_AS_NODE` 启动 sidecar。

R2 需要同一套运行时运行在一台没有 Electron 的机器上：`pi-host` 包
（`02-architecture/05-remote-agent-control.md` §5.2）必须在 RACP 服务器
后面运行 Agent Host 模块、sidecar 和 host-core。在第二个地方重新实现轮次
生命周期，会恰好为桌面花了一年才修好的那些不变量（中止锁、陈旧的终止
事件、单飞终结、持久结算后释放队列）制造出第二个事实来源。

## 决策

1. **新的工作区包 `packages/host-runtime` 拥有独立于 Electron 的运行时
   层。** 它只依赖 `shared`、`agent-host` 和 `agent-runtime`，绝不依赖
   `electron` 或 `apps/desktop`。其模块包括：
   - `HostProcess` 和 `AgentSidecar`：stdio NDJSON JSON-RPC 传输，从
     Electron 主进程原样搬来，行为不变。两者都以选项接收启动方式——
     host-core 的 `binaryPath` / `dataDir` / 额外 `env`，sidecar 的
     `{ command, args, env }`——以及一个 `onStderr` 汇。sidecar 的
     `host.proxy` 允许名单、本地工具短路、Plan 模式闸门、厂商鉴权绑定
     检查和受信扩展桥不变。`HostProcess` 接受可选的 `diagnoseFailure`
     钩子，让嵌入宿主能为它能表述的启动拒绝命名。
   - `RuntimeSupervisor`：进程模型 §4 的重启策略（0.5s → 1s → 2s，封顶
     4s；两分钟窗口内三次重启；每个子进程单飞；关机期间绝不重启；第一
     个不可恢复失败即停止）。嵌入宿主提供 `start`、`afterRestart`、
     `isUnrecoverable` 和一个事件汇。
   - `RuntimeService`：架在两个传输之上、面向 Agent Host 模块的
     `RuntimePort`——带持久轮次行和在 sidecar 启动前追加的用户消息的
     prompt 准入、steer、stop、带中止锁的 abort、asktool 应答、手动压缩，
     以及与 Electron 主进程相同的先认领再 await、陈旧终止护栏和结算
     宣告规则的 `finishTurn`。
   - `TurnEventPipeline` 和 `TurnPersistence`：逐事件处理（工具调用跟踪、
     D299 检查点、终止事件、已完成行），以及一个在 host-core 重启期间
     有界重试的内存有序追加队列。`pi-host` 进程只随其监督器结束，因此
     不复製桌面的文件后备 outbox。
     不复制桌面的文件后备 outbox。
     和密钥、生效的命令 shell、项目指令和记忆、用户技能、子代理定义）
     做启动解析。它拒绝需要桌面的厂商 OAuth 账户和插件代理。
   - `PlanExecutionDispatcher`：已批准的 Plan/Goal 执行（D189），带相同
     的认领、不重放和终结规则。
   - 模块的 `SessionPort`、`QueueStore`（schema v15）和
     `permissions.pending` 的 host-core 适配器，加上会话消息台账查询、
     进行中检查点写入器和计划执行解码器，从 Electron 主进程搬出。
2. **Electron 主进程保留薄适配器。** `electron/main/host-process.ts` 和
   `agent-sidecar.ts` 继承包中的类，只添加 Electron 才知道的东西：打包
   二进制位置与内置插件位置、`ELECTRON_RUN_AS_NODE` 启动、脱敏的 stderr
   日志，以及 schema 过新 / glibc 诊断。`runtime/lifecycle.ts` 驱动共享
   监督器，并保留渲染进程状态推送、插件语言重同步和已批准计划的排空。
   Agent Host 桥使用共享的 host-core 端口，而不是它自己的副本。本地
   prompt 路径（`agent-ipc.ts`）及其附件、斜杠展开、插件工具、MCP 中继、
   厂商账户和通知保持不变，仍归桌面所有。
3. **`TurnStartRequest` 增加可选的 `userMessageId`**，使客户端可以像渲染
   进程通过 IPC 那样，把乐观的用户行 id 贯穿无头运行时（D288）。增量
   添加；不要求任何调用方发送它。
4. **线上契约不变。** Electron IPC、sidecar JSON-RPC、host-core RPC 和
   Plugin SDK 均未触碰；桌面的可观察行为、默认值和持久化数据不变。

## 后果

- `pi-host`（R2）可以在纯 Node 中组合 `HostProcess + AgentSidecar +
  RuntimeService + AgentHost + RuntimeSupervisor`；RACP 服务器绑定到模块，
  绝不绑定到 Electron IPC。
- 重启策略、轮次生命周期和传输现在有不依赖 Electron 的单元测试
  （`packages/host-runtime/src/*.test.ts`）。
- 桌面那些钉住 `host-process.ts` 和 `agent-sidecar.ts` 的源码契约测试
  现在读取包源码；面向渲染进程的状态和诊断断言仍读取 Electron 适配器。
- 本地 Electron 主进程仍通过 IPC 走自己的 prompt 路径。把桌面的本地会话
  迁到 `RuntimeService` 上是后续的、保持行为不变的一步；R2 不需要它，
  本次也不做。
- 无头解析器有意支持得比桌面少：无 prompt 附件、无插件工具、无桌面
  MCP 中继、无厂商 OAuth。这些返回带类型的错误，而不是静默降级。

## 考虑过的替代方案

- **只抽取传输层，在 `pi-host` 中重新实现轮次生命周期。** 被拒绝：生命
  周期不变量才是难点，第二份副本会与桌面的漂移。
- **把模块留在 `apps/desktop/electron/main`，从 `pi-host` 导入。** 被拒绝：
  `packages/*` 不得依赖桌面实现代码，而且这些模块会持续引入更多
  Electron 依赖。
- **把运行时放进 `packages/agent-host`。** 被拒绝：该模块是无传输的语义
  核心，不具备进程或文件系统知识，而 RACP 服务器和各集成依赖它保持
  这一形态。
