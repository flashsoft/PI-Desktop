# ADR 0053: Plan 检查点产物、审批与执行世代

- 状态： 已接受实现
- 日期： 2026-07-31
- 取代： ADR 0052 与 D188
- 基线： `0.4.14`
- 协议： v9
- 存储 schema: v10

## 背景

之前的 Plan 契约使用围绕结构化提案的内存审批等待器，并允许请求修改的反
馈。它没有给用户一份确切的、可检查的计划产物，也没有定义已批准的执行如何
在不重放的情况下被中断。计划审批必须足够持久以承受渲染进程重载，但宿重重
启绝不能重放由较旧宿主进程创建的工作。

## 决策

### 1. 一个 Agent 与一个 Plan 提交工具

产品选择器保持 `Agent | Plan`，Agent 为默认，每个会话一个 pi Agent。Plan 是
处于规划状态的同一个 Agent。Plan 暴露 `Read`、`Glob`、`Grep`、
`BrowserPreview`、`Bash`、`EnterPlanMode` 与 `SubmitPlan`（在 ADR 0061 移除
`CompactContext` 之前它也暴露该工具，ADR 0064 将其以 `new_context` 恢
复）；Write、Edit、插件工具与未知工具仍被宿主拒绝。`SubmitPlan` 是其批次中
唯一的 assistant 工具调用，且仅对活跃的 Plan 轮次有效。

输入恰好是：

```ts
type SubmitPlanInput = {
  title: string;
  markdown: string;
  question: string;
};
```

没有 `ExitPlanMode`、结构化步骤 schema、`proposedCommands` 字段或
`request_changes` 动作。修订是当前提案被拒绝或过期之后的一次新
`SubmitPlan`。

### 2. 不可变的宿主写入计划产物

对于项目绑定的会话，host-core 把提交的 Markdown 字节原样写入以下位置的新
产物：

```text
<workspaceRoot>/.pi/plan/<unique-name>.md
```

目录与文件名由宿主持有。每次提交得到一个唯一文件；被接受的提交绝不替换较
早的产物。输入的 `title` 与 `question` 保留为 `plan_approvals` 中的结构化字
段；host-core 不会前置标题、追加问题章节、规范化行尾，或给 `markdown` 添加
任何其他包装。

host-core 校验会话根，以不替换方式创建文件，冲刷确切字节，并在同一条审批
记录中记录 workspace 相对产物路径、SHA-256 与字节大小。路径逃逸、符号链接
歧义或写入失败不会创建审批或执行描述符。

### 3. 审批与权限选择

审批卡片显示结构化标题与问题、宿主创建产物的打开入口、绝对过期时间与当前
状态。打开产物读取不可变的 Markdown 文件；卡片不需要内联 Markdown，也不需
要显示其哈希或字节大小。它只有 **Approve** 与 **Reject** 两个动作。Approve
要求显式的执行权限模式：`ask`、`accept-edits` 或 `auto`；UI 默认选择
`ask`。Reject 从不选择或授予执行模式。没有反馈字段，也没有来自超时、重
载、计划任务或过期渲染进程的隐式批准。

审批截止时间是自宿主创建起 30 分钟的绝对截止时间。渲染进程重载在宿主存活
期间保留原始截止时间。过期以规范错误 `PLAN_APPROVAL_TIMEOUT` 记录；重新打
开卡片时截止时间绝不延长。

### 4. 进程世代栅栏与恢复

宿主进程有一个内部启动世代，但它不序列化到数据库，也不是协议字段。单条
`plan_approvals` 行同时携带审批状态与执行字段：

```text
status: pending -> approved | rejected | expired | interrupted
execution_state: queued -> running -> completed | interrupted
```

批准原子地把会话切换为带所选权限模式的 Agent，记录 `execution_id`，并设置
`execution_state = queued`；同一个 Agent 随后开始执行轮次。一个会话只能有
一个 pending 的 Plan 审批，也只能有一个排队或运行中的执行。

启动后服务任何 RPC 之前，host-core 运行一个事务，把所有先前的 `pending`
审批标记为 `interrupted`，把所有先前的 `queued` 或 `running` 执行状态标记
为 `interrupted`；关联的运行中轮次被中止。任何审批、队列条目、provider 调
用或工具执行都不重放。pending 中断让会话留在 Plan。如果批准已把会话提交
为 Agent，中断其排队或运行中的执行会让会话留在 Agent；用户可以开始新一轮
而不会自动重新进入 Plan。

### 5. 轮次与配置边界

每个会话有一个活跃轮次。当该轮次或 Plan 运行活跃时，第二个 prompt、第二次
Plan 提交、模式/provider/模型/权限/shell 配置变更或第二次 Plan 运行都会被
拒绝。会话配置只在空闲时被接受。审批动作是 pending Plan 请求唯一启用的控
制。跨会话工作保持现有的会话作用域 workspace 与事件隔离。

### 6. 计划任务 Plan 策略

计划任务或无人值守的 Plan 执行在 provider 工作、产物创建、审批或入队之前
以 `PLAN_REQUIRES_INTERACTIVE_SESSION` 被拒绝。计划任务必须显式改为 Agent
才能无人值守运行。

### 7. 版本化契约

协议 v9 携带 `SubmitPlan`、唯一产物路径与元数据、approve/reject 响应、绝对
过期时间、执行状态、shell 选择与流式命令输出。存储 schema v10 延续单一的
`plan_approvals` 检查点表，包含结构化 title/question、产物字段、执行
ID/状态与持久化的默认 shell 设置，同时保留现有 transcript 与会话数据。
v8 到 v10 的迁移是事务性的；`PRAGMA user_version = 10` 最后写入。

## 后果

### 正面

- 每个提交的提案都有自己由宿主持有的、字节可校验的文件。
- 渲染进程重载可恢复，同时不让宿主重启重放工作。
- Agent/Plan 边界与批准后的 Agent 状态是显式的。
- Shell 选择、输出、超时与取消可以共享相同的宿主审计与轮次边界。

### 权衡

- 拒绝计划是终结性的；修订需要另一次模型轮次与新产物。
- 宿主重启会中断即使是已批准的排队或运行中的执行。
- 计划产物在 `.pi/plan/` 下累积；它们是不可变的，不是渲染进程持有的草稿
  库。

## 已拒绝的备选方案

### 请求修改式审批

本检查点拒绝，因为它把计划编辑与审批边界混在一起。修订是带新产物哈希的
新提交。

### 宿主重启后重放持久队列

已拒绝，因为持久化的执行请求可能比创建它的进程状态、工具身份、shell 身
份与用户意图活得更久。重启恢复仅限于中断。

### 渲染进程持有或 sidecar 写入的计划文件

已拒绝，因为宿主必须持有 workspace 写入、路径校验、哈希、大小与审批身
份。

## 相关文档

- `docs/adr/0054-selectable-command-shell-catalog.md`
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
- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/05-security/01-security.md`
- `docs/spec/06-delivery/02-acceptance-criteria.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D189)
