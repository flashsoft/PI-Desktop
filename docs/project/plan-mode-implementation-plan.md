# Plan Checkpoint 与 Shell 实施计划

- 状态：2026-08-05 已实现并验收
- 范围：Plan checkpoint 审批 / 执行与可选择的命令 shell
- 核心运行时：每个会话一个 `@earendil-works/pi-agent-core` Agent
- 基线：`0.4.14`
- 宿主协议：v9
- 数据库 schema：v10
- 交付：M6 完成；Host/无重放、pending 恢复与终态卡片不水化的证据
  已验收

## 1. 执行决策

PI-Desktop 继续运行单个 pi Agent。选择器是 `Agent | Plan`，默认是
Agent。Plan 是处于规划状态的同一个 Agent，而不是第二个规划器、
模型、服务、权限模式或安全沙箱。

Plan 暴露 Read、Glob、Grep、BrowserPreview、Bash、CompactContext、
EnterPlanMode 和 SubmitPlan。Write、Edit、插件工具和未知工具由
Rust host-core 拒绝。Bash 遵循所选权限模式，因此 Plan 表达的是规划
意图，而不是严格的只读安全。

`SubmitPlan(title, markdown, question)` 是其 assistant 批次中唯一的
工具。Host-core 把提交的 Markdown 字节原样写入
`<workspaceRoot>/.pi/plan/*.md` 下一个新的不可变文件，并在同一条
审批行中记录唯一相对路径、SHA-256 和字节大小，以及结构化的 title
与 question。它不添加 title/question 包装，也不替换更早的产物。
审批界面只提供 Approve 和 Reject，显式权限选择默认 Ask，并打开产物
供审阅。

批准会以原子方式把持久会话切换为 Agent、存储所选的权限模式，并把
同一个 Agent 的下一个执行轮次入队。审批使用一个绝对的 30 分钟
截止期限，过期报告为 `PLAN_APPROVAL_TIMEOUT`。宿主重启时，pending、
queued 和 running 的工作会被中断且不重放。pending 中断让会话保持
Plan；已批准的 queued 或 running 中断让它保持 Agent。

Bash 工具保留其协议名，同时使用宿主 shell 目录。目录 ID 是
`windows-powershell`、`windows-pwsh`、`cmd`、`git-bash` 和 `bash`。
每个轮次固定生效的 shell ID 与方言，stdout/stderr 独立流式输出，
默认超时恰好 60 秒，显式超时有界在 1-300 秒，取消会关闭完整进程
树。

## 2. 不变量与词汇表

| 概念 | 取值 | 权威方 |
|---|---|---|
| 持久运行模式 | `agent`、`plan` | Rust host SQLite |
| 实时 Plan 状态 | `planning`、`awaiting_approval`、`inactive`、`stopped` | Host/运行时投影 |
| 审批动作 | `approve`、`reject` | Host RPC |
| 审批状态 | `pending`、`approved`、`rejected`、`expired`、`interrupted` | `plan_approvals.status` |
| 执行状态 | `queued`、`running`、`completed`、`interrupted` | `plan_approvals.execution_state` |
| 权限模式 | `inherit`、`ask`、`accept-edits`、`auto` | Host 设置/会话策略 |
| Shell ID | `windows-powershell`、`windows-pwsh`、`cmd`、`git-bash`、`bash` | Host 目录/设置 |
| Shell 方言 | `powershell`、`cmd`、`posix` | 生效的 shell 选项 |

渲染进程和 sidecar 持有的是投影。渲染进程仅从实时 Host 事件为当前
生命周期保留每个会话最新的 Plan 提案 / 执行快照。`plans.pending`
只水化仍处于 pending 的审批；终态行仍是 Host 拥有的持久记录，但不
水化终态卡片。渲染进程和 sidecar 都不能授权模式、写入或替换计划
产物、选择可执行路径，或复活已中断的审批或执行。

## 3. 状态生命周期

```text
Agent / inactive
  -> user selects Plan or Agent calls EnterPlanMode
Plan / planning
  -> SubmitPlan(title, markdown, question)
Plan / awaiting_approval
  -> approve(permission mode) -> Agent / queued -> Agent / running
  -> reject | expiry | abort | persistence failure -> Plan / stopped
host restart
  -> plan_approvals.pending -> interrupted
  -> plan_approvals.execution_state queued/running -> interrupted
```

规则：

1. 规划前、规划中和规划后，会话中始终只有一个 pi Agent。
2. `EnterPlanMode` 和 `SubmitPlan` 各自是其 assistant 批次中唯一的
   工具调用。
3. 审批解析匹配提案、会话、轮次、工具调用和版本身份。没有序列化的
   进程纪元（epoch）字段。
4. pending 审批有一个绝对的 30 分钟截止期限；渲染进程重载绝不重置
   它，且只通过 `plans.pending` 恢复那条仍 pending 的行。终态的
   提案 / 执行快照不水化。
5. 拒绝和过期让 pending 会话保持 Plan，且不授予任何执行。
6. 批准在 queued/running 执行开始之前先提交 Agent 模式。
7. 启动时在提供 RPC 服务之前，以事务方式隔离先前的实时工作。不重放
   任何 provider、工具或队列工作。

## 4. 轮次与配置边界

每个会话同时只有一个活动轮次、至多一条 pending 审批、至多一个
queued 或 running 执行。在该边界活动期间，第二个 prompt、Plan 提交、
执行，或 mode/provider/model/permission/shell 配置变更都会被拒绝。
只有空闲时才接受配置。对 pending 请求，审批动作是唯一启用的控件。
不同会话保持既有的独立轮次与工作区根行为。

定时或无人的 Plan 在 provider 工作、产物写入、审批或入队之前，以
`PLAN_REQUIRES_INTERACTIVE_SESSION` 拒绝。

## 5. SubmitPlan 与产物契约

```ts
type SubmitPlanInput = {
  title: string;
  markdown: string;
  question: string;
};
```

Host-core 校验绑定项目的会话，并把 `markdown` 的精确字节写入一个
符合以下形式的新的唯一文件：

```text
<workspaceRoot>/.pi/plan/<unique-name>.md
```

写入由宿主拥有且为 create-new。产物目录防御性创建，字节被落盘，
相对路径存入 `plan_approvals.artifact_relative_path`。`title` 和
`question` 存入各自的结构化列。不做规范化 UTF-8/LF 转换，不追加
结尾换行、标题、问题标题或其他包装。路径校验、符号链接、写入或
冲突失败不会创建审批行，并返回对应的 `PLAN_ARTIFACT_*` 错误。

审批会收到产物打开路径和持久的哈希 / 大小元数据。UI 必须展示
title、question、产物打开入口、过期时间和状态；不要求内联展示
Markdown、SHA-256 或字节大小。

## 6. 审批与执行契约

```ts
type PlanResolveRequest = {
  proposalId: string;
  sessionId: string;
  turnId: string;
  toolCallId: string;
  version?: number;
  action: "approve" | "reject";
  targetPermissionMode?: "ask" | "accept-edits" | "auto";
};
```

批准是一个原子的 `plan_approvals` 事务：

```text
BEGIN
  plan_approvals.status: pending -> approved
  plan_approvals.execution_id: new ID
  plan_approvals.execution_state: NULL -> queued
  sessions.mode: plan -> agent
  sessions.permission_mode: explicit selected mode
COMMIT
dispatch the same Agent's fresh execution turn
```

拒绝记录 `rejected`，不带权限模式，会话保持 Plan。过期以
`PLAN_APPROVAL_TIMEOUT` 记录 `expired`。中止和启动恢复记录
`interrupted`。执行 worker 认领 `queued`、运行它，并以 `completed`
或 `interrupted` 结束。行和请求中都不序列化进程纪元；启动时的状态
标记就是重放隔离带。

## 7. 存储契约

Schema v10 延续宿主拥有的 `plan_approvals` 表。其 checkpoint 和执行
字段包括：

```text
request_id, session_id, turn_id, tool_call_id
plan_json                 exact submitted Markdown snapshot
title, question           structured DB fields
status, action, target_permission_mode, feedback
created_at, updated_at, expires_at, resolved_at, error_code, version
artifact_relative_path, artifact_sha256, artifact_size_bytes
execution_id, execution_state
```

没有单独的 `plan_artifacts` 或 `plan_runs` 表，也没有序列化的
`hostEpoch` 字段。产物本身是 `.pi/plan/` 下的不可变 Markdown 文件；
审批行索引它并携带执行描述符。

打开数据库时，一个启动事务把先前所有 `pending` 审批和所有 `queued`
或 `running` 执行状态标记为 `interrupted`，中止关联的运行中轮次，
并在宿主提供 RPC 服务之前提交审计记录。同一宿主内的渲染进程重载
可以恢复 pending 行及其原始截止期限。重载后不水化 rejected、
expired、approved/completed 和 interrupted 的终态卡片。宿主重启无法
恢复可执行的工作，不恢复任何过期动作，也绝不重放；UI 不要求展示
interrupted 的终态快照。

v8 到 v10 的路径 checkpoint WAL，在破坏性工作之前创建一份精确可读
的 `pi.sqlite.v8.bak`，并应用一个原子事务；v9 路径创建
`pi.sqlite.v9.bak`，而 v7 先到达 v8，再走同一条受保护路径。迁移
保留会话、transcript、轮次、权限和遗留审批数据，同时在
`plan_approvals` 上添加 / 回填产物与执行字段及索引。它把持久化的
`chat` 值映射为 `plan`，校验 shell 设置，并最后写入
`PRAGMA user_version = 10`。格式错误的应用设置或定时配置、无效模式
和无效默认 shell 以 schema v8 为权威失败关闭。它不从 transcript
文本重建产物或队列工作。

## 8. 可选 Shell 契约

Host-core 返回平台感知的目录：

| 平台 | 目录中的 ID |
|---|---|
| Windows | `windows-powershell`、`windows-pwsh`、`cmd`、`git-bash` |
| macOS/Linux | `bash` |

每个选项包含稳定 ID、显示标签、方言、可用性和默认标记。设置写入
对未知、不可用和错误平台的 ID 以 `COMMAND_SHELL_INVALID` 拒绝。
如果持久化的配置 ID 后来变得不可用，生效选择会刻意回退到该平台
第一个可用的 shell 并标记 `fallback: true`。如果没有任何可用 shell，
Bash 返回 `SHELL_NOT_FOUND`。

运行时在轮次启动时固定生效的 ID 和方言。Bash 请求携带期望的 ID；
host-core 在 spawn 之前立即解析当前目录，并对过期的 ID/方言以
`COMMAND_SHELL_CHANGED` 拒绝。这是目录身份检查，而不是可执行路径
哈希。回退可以在轮次固定之前选择生效 shell，但固定之后执行绝不
更换 shell。

`Bash` 和 `tools.execute` 保持协议 / 工具名不变。宿主独立流式输出
stdout/stderr，并返回有界的最终结果。缺失 `timeoutMs` 表示恰好
60,000 ms；显式值只在 1,000..300,000 ms 内被接受。超时和用户中止
会在流关闭之前终止完整的 Unix 进程组或 Windows 进程 / 作业树。

## 9. 交付切片

1. **契约冻结**：ADR 0053/0054、D189/D190、基线 0.4.14、协议 v9、
   schema v10，以及 E2E-104-E2E-117。
2. **存储 / 宿主边界**：不可变产物写入器、`plan_approvals` 字段 /
   索引、启动中断事务、队列流转、定时拒绝和错误映射。
3. **Agent/RPC 垂直切片**：SubmitPlan、同 Agent 审批、拒绝 / 过期、
   空闲 / 配置守卫，以及无重放的重启恢复。
4. **Shell 执行切片**：目录 / 默认值持久化、平台校验、生效回退、
   轮次固定、过期 ID 拒绝、流式输出、超时边界和进程树取消。
5. **桌面交互**：产物打开审批卡片、状态 / 过期呈现、shell 设置、
   渲染进程重载行为、本地化和诊断。
6. **聚焦验证**：迁移、RPC、宿主授权、不可变产物字节、过期、重启
   隔离带、shell 回退、过期身份、流、超时和中止检查。E2E 运行保持
   显式开启。

## 10. 聚焦验证清单

### Plan 与存储

- 跨 Agent、Plan、审批、队列和执行保持同一个 Agent 身份；
- 每次提交有唯一产物路径，Markdown 逐字节保留；
- title/question 结构化存储，产物打开入口能解析到文件；
- 仅 approve/reject 的 schema 与 Ask 默认值；
- 绝对过期返回 `PLAN_APPROVAL_TIMEOUT`；
- 一个活动轮次、一条 pending 审批、一个 queued/running 执行；
- v8 到 v10 的迁移与回滚；
- 启动事务在 RPC 之前中断先前的 pending/queued/running 工作；
- 重启后不重放 provider/工具/队列；
- pending 中断保持 Plan；已批准中断保持 Agent；
- 定时 Plan 在 provider/产物/队列工作之前被拒绝。

### Shell 与进程

- 精确的平台目录 ID 与设置校验；
- 持久化的不可用 ID 回退到平台第一个可用 shell；
- 轮次固定生效 ID/方言，过期身份失败关闭；
- Bash 协议名保持稳定；
- stdout/stderr 事件分别有序，最终结果有界；
- 恰好 60 秒的默认值与 1-300 秒的覆盖边界；
- 超时和用户中止终止完整进程树。

## 11. 验收证据

E2E 计划自动化了这些 M6 场景：E2E-104 迁移、E2E-105 宿主 Plan
策略、E2E-106 不可变产物审批、E2E-107 过期、E2E-108 启动中断、
E2E-109 无重放 / Agent 保留、E2E-110 定时拒绝、E2E-111 活动 /
配置边界、E2E-112 shell 选择与回退、E2E-113 过期 shell 身份、
E2E-114 流式输出、E2E-115 超时、E2E-116 进程中止、E2E-117
UX/语言环境。

2026-08-05 的验收组合了 host-core 套件（139/139 通过，含 15 个聚焦
数据库测试）、97 个 agent-runtime 测试、desktop/shared/i18n 套件、
完整 JavaScript 构建 / typecheck / lint、长超时的 `test:e2e:plan`
宿主工作流，以及原始 CDP 的 `test:e2e:plan-ui` Electron 工作流。
公共 RPC 无法安全制造的两种宿主状态——迟到的审批过期和先前持久化
的 shell 变为不可用——由确定性的 Rust 测试直接覆盖。同 Host 渲染
进程证据覆盖 pending 恢复、同生命周期终态控件、稳定的 Electron/Host
身份，以及渲染进程重载后 rejected 与 approved/completed 终态卡片
不出现。E2E-108/E2E-109 覆盖 Host 重启中断、过期响应拒绝和无重放。

## 12. 明确的非目标

- 第二个规划器 Agent/模型/服务；
- 审批卡片中的 request-changes 反馈；
- 渲染进程 / sidecar 写入或替换计划产物；
- 宿主重启后重放任何 Plan 工作；
- 定时 / 后台 Plan 的自动批准；
- 宿主 shell 目录之外的任意可执行路径；
- 单独的 PowerShell/cmd/Git Bash 协议工具；
- 以可执行路径哈希作为 shell 身份；
- Agent Bash 工具的交互式 PTY 行为。
