# ADR 0052: Plan 运行状态与审批边界

- 状态： 已被 ADR 0053 取代
- 日期： 2026-07-30
- 基线： `0.4.13`
- 协议： v7
- 存储 schema: v8

ADR 0053 用不可变的、唯一的、由宿主写入的 `.pi/plan/*.md` 产物、仅
approve/reject 的决议方式、现有的 `plan_approvals` 产物/执行字段，以及一个
不重放的启动中断栅栏取代了本检查点。下文中结构化提案/请求修改的细节保留为
已被取代设计的历史背景。

## 背景

PI-Desktop 此前的产品选择器把 Chat 和 Agent 当作两个工具配置。这套词汇让规
划工作流含义模糊：一个 plan 可以被描述为另一个 agent、一个规划器模型，或一
种只读权限模式。这些解释会复制 pi runtime，或把授权放进渲染进程。

所需的工作流是单个 pi Agent：它能检查任务、提交结构化计划、等待单独的用户
决定、根据反馈修订，并且只在批准后继续执行。该工作流横跨持久会话模型、pi
工具组合、Rust 授权、宿主 RPC、渲染进程 IPC、插件注册、存储恢复与计划执行。

## 决策

### 1. 一个 Agent，两个运行状态

产品选择器就是 `Agent | Plan`。每个会话只有一个 pi Agent。Plan 是该 Agent 进
入规划状态之后的样子；它不是第二个 Agent、规划器服务、规划器模型或权限模
式。Agent 仍是新会话与新计划任务的默认值。

持久会话模式是 `agent | plan`。实时的规划状态是持久模式、runtime 与宿主审批
记录的投影：

```text
Agent / inactive
  -> Plan / planning
  -> Plan / awaiting_approval
  -> Agent / inactive after approval, same Agent continues
```

用户可以在空闲时选择 Plan。同一个 Agent 也可以在执行中调用
`EnterPlanMode`。两条路径汇聚到同一个经宿主校验的 Plan 状态。
`ExitPlanMode` 提交结构化计划，并且是它的批次中唯一允许的 assistant 工具调
用。

内部渲染进程的 `page = "chat"` 值可以保留作为会话界面路由。它不是运行模
式，且不得出现在模式选择器、模式命令或授权决策中。

### 2. 宿主持有的持久权威

Rust host-core 对以下事项具有权威：

- 在每次工具调用上从持久的 `sessionId` 解析 `sessions.mode`；
- 在权限模式与授权之前执行 Plan/Agent 工具策略；
- 创建并决议持久的计划审批记录；
- 以选定的权限模式提交 Plan → Agent 转换；
- 发出规范化的审批/状态事件并应用超时/恢复；
- 计划/无人值守策略与稳定的错误码。

渲染进程状态与 sidecar 模式字段是投影或诊断上下文。由 Electron 或 sidecar
提供的冲突模式不能授权工具。过期的渲染进程不能清除 Plan 或授予执行。

### 3. Plan 工具与权限策略

Plan 暴露：

- `Read`、`Glob`、`Grep` 与 `BrowserPreview`；
- `Bash`，受持久权限模式约束；
- `ExitPlanMode`（此列表原本还携带 `CompactContext`，已被 ADR 0061 移除，
  并由 ADR 0064 以 `new_context` 恢复）。

Plan 拒绝 `Write`、`Edit`、所有插件工具与未知工具，无论权限模式、会话授
权、manifest 风险或过期 IPC 状态如何。Agent 保留现有的 `Read`、`Glob`、
`Grep`、`Write`、`Edit`、`Bash` 与已注册插件策略。

Plan 保留权限模式选择。Bash 在 `ask` 与 `accept-edits` 下会提示；在 `auto`
下的 Bash 不经确认即可运行，并可能修改 workspace 或 scratch 目录。
BrowserPreview 是显式的只读 UI 检查例外。因此 Plan 表达的是规划意图，而不
是严格的只读安全配置。UI 必须说明这一权衡。

### 4. 独立的计划审批事务

`ExitPlanMode` 创建一条宿主持有的 `plan_approvals` 行，包含请求、会话、轮
次、工具调用、结构化计划、截止时间与 pending 状态。宿主发出请求并在内存
中的一次性 channel 上等待；该行保留提案与最终结果，但不会让已死的 Agent
可恢复。

审批不是通用的工具权限。`plans.resolve` 只接受匹配的实时请求/会话/轮次。
批准要求显式的目标权限模式，UI 默认 `ask`，并原子提交：

```text
BEGIN
  plan_approvals: pending -> approved
  sessions.mode: plan -> agent
  sessions.permission_mode: selected explicit mode
  append audit record
COMMIT
wake ExitPlanMode
start a new model turn with Agent tools
```

请求修改需要非空反馈，记录结果，把反馈作为 Plan 工具结果返回给同一个
Agent，并让会话留在 Plan。拒绝记录结果，停止运行，并让 Plan 保持激活。

超时、中止、持久化失败、宿主崩溃、sidecar 崩溃与过期响应都按失败关闭处
理。完整进程重启把 pending 审批标记为 `interrupted`，中止关联轮次，让会话
留在 Plan，并拒绝旧响应。渲染进程重载只能恢复有存活宿主等待者支撑的请求。

### 5. 迁移与协议

Schema v8 是 v7 的事务性迁移。它把持久化的会话模式、应用默认模式与计划任
务模式值从 `chat` 映射为 `plan`，保留 transcripts/turns/permissions，新增
`plan_approvals`，并在失败时保持 schema v7 权威。新默认值仍为 Agent。协议
v7 携带 `plan | agent` 联合、计划状态事件、结构化审批事件以及
`plans.pending` / `plans.resolve` RPC。

### 6. 计划任务与插件策略

本版本中 Plan 仅交互可用。计划任务或无人值守的 Plan 运行在 provider 请求
之前以 `PLAN_REQUIRES_INTERACTIVE_SESSION` 失败；没有后台进程展示或自动批
准计划。现有的计划任务 Chat 值迁移为 Plan，并在无人值守运行前要求显式切换
到 Agent。

插件 agent 工具是仅 Agent 的贡献。即使其 manifest 风险低或权限已授予，Plan
也在宿主边界隐藏并拒绝它们。插件命令与面板仍是显式的用户 UI 贡献，但不能
成为模型可调用的 Plan 工具。

## 后果

### 正面

- 规划保留同一个 Agent 上下文，避免第二个规划器生命周期。
- 持久的宿主授权无法被渲染进程或 sidecar 状态绕过。
- 用户可以显式选择批准后的权限姿态。
- 反馈、恢复、迁移、插件拒绝与计划任务行为可通过稳定的协议/存储契约观测
  与测试。

### 权衡

- Plan 不是严格无变更的模式，因为 Auto Bash 可以修改。这是有意为之，且必
  须在产品文案与审批 UX 中可见。
- 完整进程崩溃会丢弃进行中的 Agent 等待；提案保留为中断记录，但用户必须
  提交新计划。
- 协议与 schema 版本升级需要宿主、sidecar、主进程、渲染进程、迁移与兼容
  性工作同步。

## 已拒绝的备选方案

### 第二个规划器 Agent 或模型

已拒绝，因为它复制上下文，引入第二个审批/runtime 边界，并与"反馈与批准返
回同一个 Agent"的要求冲突。

### 把 Plan 作为权限模式或严格只读配置

已拒绝，因为规划意图与授权姿态是两回事。Plan 必须保留权限选择与 Bash 行
为，包括 Auto 的显式变更权衡。

### 渲染进程持有的模式或审批状态

已拒绝，因为过期或伪造的 IPC 可能授予执行，且渲染进程重载会丢失权威转换。
Rust 持有持久模式、策略与审批身份。

### 用命令文本分类来允许 Plan 中的 Bash

已拒绝，因为无法可靠地证明一般 shell 命令是只读的。现有权限模式是显式控
制；Plan 的 Write/Edit/插件拒绝仍是精确的工具策略。

## 相关文档

- `docs/spec/00-baseline.md`
- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/03-runtime/04-data-storage.md`
- `docs/spec/03-runtime/05-host-core-rust.md`
- `docs/spec/03-runtime/06-host-rpc-protocol.md`
- `docs/spec/03-runtime/07-process-model.md`
- `docs/spec/03-runtime/08-error-codes.md`
- `docs/spec/03-runtime/10-session-state-machine.md`
- `docs/spec/04-ux/03-permission-ux.md`
- `docs/spec/04-ux/04-builtin-commands.md`
- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/05-security/01-security.md`
- `docs/spec/07-plugins/04-plugin-security.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D188)
