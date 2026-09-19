# ADR 0055: 仅 Agent 模式；Chat 成为内部只读配置

- 状态： 已被 ADR 0052 / ADR 0053 取代
- 日期： 2026-08-05

> 已被取代。本 ADR 移除的模式概念以 Plan 运行状态的形式回归（ADR 0052，随
> 后又被 ADR 0053 取代），因此产品再次暴露 `Agent | Plan` 选择器，且 `chat`
> 迁移为 `plan` 而非 `agent`。保留本文是因为其中关于负向权限闸门、以及对未
> 知 `mode` 值失败关闭的推理仍然成立，也因为它记录了开关先被移除、随后又以
> 不同契约重新引入的原因。

## 背景

自 D003/D004 起，会话携带两种工具配置之一。`agent` 获得完整的编码界面
（`Read`/`Bash`/`Edit`/`Write`/`Glob`/`Grep`/`BrowserPreview` 加插件工
具）；`chat` 获得只读子集（`Read`/`Glob`/`Grep`），host-core 对超出该子集
的调用在每种权限模式下都硬拒绝（D115）。

本产品是一个 agent 桌面应用。`chat` 从来不是一个目的地：它作为安全阀存
在，但 UI 通过顶栏分段开关、设置页默认模式行、`/chat-mode` 与 `/agent-mode`
面板命令以及四个本地化标签把它宣传为对等选项。这有三个代价：

1. 切到 Chat 之后又把该开关从肌肉记忆中遗忘的用户，可能让一个会话永久无
   法写文件。开关消失后，该会话将无路可回。
2. 每个工具、prompt 组合与权限变更都必须推理两次，且惰性工具激活的核心集
   合（D185）按模式分叉。
3. 模式 chip 与用户真正会改的控件——模型、思考级别、权限模式——争夺空
   间。

直接删除该配置也不可接受：导入的会话与旧版本写入的行携带当前 UI 不产生
的 `mode` 字符串，而狭窄的工具界面是一个值得为任何非显式 `agent` 保留的
安全边界。

## 决策

1. **`agent` 是产品暴露的唯一模式。** 顶栏分段开关、设置页默认模式行、两
   个面板命令及其斜杠别名、`.ct-mode*` 样式以及 `settings.mode*` i18n 键
   都被移除。`newSession` 始终请求 `agent`，启动时把非 `agent` 的存储
   `defaultMode` 归一化。
2. **`chat` 重命名为 `read-only`。** 共享类型变为
   `Mode = "read-only" | "agent"`。host-core 的 `SESSION_MODES` 是
   `["agent", "read-only"]`，且 `normalize_session_mode` 在每条写入路径
   （`session.create`、`session.configure`、`session.import`）上把 D188 之前
   的 `chat` 拼写折叠为 `read-only`，拒绝其他一切。调用方存归一化值，绝不
   存原始输入。
3. **权限闸门是负向的。** 当 `mode != "agent"` 且工具不在
   `read_only_mode_allows`（`Read`/`Glob`/`Grep` 加 `plugin_*`）之内时，
   `PermissionManager` 拒绝。因此未知或遗留的 `mode` 字符串会失败关闭到只
   读界面，而不是静默获得 Write/Edit/Bash。该硬拒绝继续高于每一种 D115 权
   限模式，包括 `auto`。
4. **错误码重命名** 为 `BASH_DISABLED_IN_READ_ONLY` 与
   `WRITE_DISABLED_IN_READ_ONLY`。两者都没有本地化消息，因此重命名仅限于
   `packages/shared/src/errors.ts`、宿主的代码选择与各 spec。
5. **现有 `chat` 行在打开时迁移为 `agent`。** `boot_maintenance` 运行
   `UPDATE sessions SET mode = 'agent' WHERE mode = 'chat'`，并通过
   `json_set` 把存储的 `app.defaultMode` 为 `chat` 的值折叠为 `agent`。两条
   语句都是幂等的；首次打开后不再有任何匹配。

## 后果

- 没有会话会被困在只读状态：唯一能持有 `read-only` 的行来自未来的导入或
  外部写入者，而它们按设计保留狭窄的、由宿主强制的界面。
- `SCHEMA_VERSION` 保持为 7。`Database::open` 对低于当前版本的任何数据库
  执行归档并重置（D119），因此版本升级反而会摧毁本次变更试图拯救的那些
  会话。修复是在现有 schema 内做数据修复。
- mode 字符串保留在 RPC 契约（`tools.execute`、`session.configure`、
  `SessionSummary`）与 `sessions.mode` 列中。移除它是毫无收益的协议破坏，
  且宿主仍需要它来选择工具配置。
- 会话顶栏只保留模型选择器加任务操作；composer chip 行现在以 Thinking 开
  头。`ModelSelect` 仍是模型切换时会话思考级别的写入者。
- 工具激活（D185）仍有两个核心集合。只读的那个只是从 UI 无法到达。

## 备选方案

### 完全删除 `read-only` 配置

已拒绝。它会让导入与遗留的行携带宿主不认识的 `mode`，而对未识别值的自
然回退将是完整 agent 界面——在错误的时刻发生静默的权限扩大。

### 保留 `chat` 拼写

已拒绝。该名称描述了一个已不存在的产品模式，并在代码、日志与错误码中读
起来像 Agent 的对等物。`read-only` 说明了这个配置实际是什么，这正是剩余
宿主侧强制所服务的对象。

### 保留开关但藏在开发者模式后面

已拒绝。它同时保留双工具集推理成本与会话被困的失败模式，而通往安全相关
配置的仅调试路径比没有路径更糟。

### 提升 schema 版本来承载迁移

已拒绝。v7 是破坏性重置而非迁移链（D119）：打开低于当前版本的数据库会归
档它并引导一个全新的文件。升级版本会为了修正一列的值而丢弃用户的会话。

## 参考

- `packages/shared/src/types.ts`, `packages/shared/src/errors.ts`
- `packages/agent-runtime/src/runtime.ts`
- `crates/host-core/src/sessions.rs`, `crates/host-core/src/permissions.rs`
- `crates/host-core/src/db.rs`, `crates/host-core/src/rpc/mod.rs`
- `apps/desktop/src/components/ConversationTopbar.tsx`
- `apps/desktop/src/pages/SettingsPage.tsx`
- `apps/desktop/electron/main/builtin-commands.ts`
- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/03-runtime/04-data-storage.md`
- `docs/spec/03-runtime/08-error-codes.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-018, E2E-088)
- 决定 D191；修订 D003、D004、D115；已被 D188 / D189 取代
- [ADR 0052](0052-plan-operating-state-and-approval-boundary.md)、
  [ADR 0053](0053-plan-checkpoint-artifact-and-execution-epoch.md)
