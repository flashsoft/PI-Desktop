# 按轮次分组的 Review、回滚与 Agent 通知计划

- 状态：提议（尚未实现）
- 范围：工作面板 Review 标签页升级——按对话轮次分组工作区改动、
  支持按轮次回滚，并在回滚后通知 Agent
- 核对的代码：`crates/host-core/src/review.rs`、
  `crates/host-core/src/rpc/mod.rs`（`review.rollback`、轮次队列）、
  `crates/host-core/src/turn_queue.rs`、
  `apps/desktop/src/lib/workspace-review.ts`、
  `apps/desktop/src/components/workpanel/ReviewTab.tsx`、
  `apps/desktop/src/lib/assistant-turns.ts`

## 1. 已核实的现状

- 快照机制（`crates/host-core/src/review.rs`）：每次 `Write`/`Edit`
  工具调用捕获一份链式快照。工具执行前的文件字节存储在工作区之外
  的 `review-changes/<session>/<snapshot>/` 下，回滚由工具执行后的
  内容哈希（`after_hash`）保护；被之后任何改动触碰过的文件会报告
  `conflict`，而不会被覆盖。
- 当前 UI（`ReviewTab.tsx`）：`reviewChangesFromMessages` 把所有记录
  压平成按文件的列表。回滚只存在于单文件粒度（`review.rollback`
  RPC 加上 `rollbackWorkspaceChange` store action）。
- 轮次数据已经存在：持久化消息携带 `turn_id`；渲染进程可以在用户
  消息边界处切分轮次；subagent 行通过 `parentToolCallId` 归属于父
  轮次（ADR 0062）。
- 通知通道已经存在：宿主拥有的持久轮次队列（`turn_queue`，
  D375 / ADR 0213）按顺序把条目作为后续轮次投递，并能跨重启存活。

## 2. 核心语义决策

在链式快照下，回滚很久以前的某个轮次永远不可能是干净的「只撤销
那一轮」：被后续轮次触碰过的文件必然冲突，而跨文件的语义依赖
（后来的代码引用了被回滚轮次新增的符号）任何文件级机制都无法
保证。

1. **外科手术式回滚（「回滚此轮」）只在干净时提供**：渲染进程用
   新的 `review.checkTurn` RPC 预先校验每份快照的 `after_hash`
   与当前文件的哈希。只有当没有文件被后续触碰过时按钮才启用。
   语义：撤销这一步。
2. **更早轮次的主要操作是倒带（「回滚到此轮之前」）**：该轮及
   之后所有轮次的快照按严格逆序一起回滚，干净地把文件恢复到该轮
   之前的状态。按钮文案说明后果（「这将还原 N 个轮次 / X 处文件
   改动」）并要求确认。
3. **两个盲区被如实呈现，而不是被解决**：Bash 驱动的外部副作用
   （安装的依赖、迁移、进程、提交）不会被回滚；回滚后项目可能处于
   需要重新构建 / 测试的中间状态。UI 会说明这一点；本次改动不尝试
   语义影响分析。
4. **忙碌守卫**：当会话存在 running 或 queued 执行时拒绝回滚
   （RPC 侧拒绝加 UI 侧禁用），避免与 Agent 的写入竞争。

## 3. 改动清单

### host-core（Rust）

1. `crates/host-core/src/review.rs`
   - `check_turn_clean(...)`：给定快照 id，读取每份 meta 并把当前
     文件哈希与 `after_hash` 比较；按快照报告「自改动后未被触碰」。
     只读。
   - `rollback_changes(...)`：在既有 `rollback_change` 之上的批量
     驱动，按调用方给定（最新在前）顺序执行；一个冲突不中止整批；
     按快照收集结果。
2. `crates/host-core/src/rpc/mod.rs`
   - 新增 `review.checkTurn`：`{ sessionId, snapshotIds[] }` →
     `{ clean, files: [{ snapshotId, path, unchanged }] }`，用于 UI
     门控和后果预览。
   - 新增 `review.rollbackTurn`：
     `{ sessionId, snapshotIds[], mode: "turn" | "rewind" }`。
     - 当会话有 running/queued 执行时拒绝（复用既有的
       `execution_state` 查询）。
     - `mode: "rewind"` 要求调用方传入目标轮次及其后每一轮的快照；
       按最新在前执行。
     - 成功的快照通过与单文件 `review.rollback` 共享的辅助函数复用
       `hashline.invalidate_path` 和 `sessions::update_tool_review_state`
       （无重复逻辑）。
     - 任何实际回滚之后，构建一条英文通知（模式、已恢复文件、冲突
       文件、rewind 的已还原轮次范围、「除非用户要求否则不要重新
       应用」、外部副作用未被还原），并通过 `turn_queue::push`
       推送；`idempotency_key` 由该批快照 id 派生，防止重复通知。
   - 返回 `{ outcomes: RollbackOutcome[] }`。

### 渲染进程（TypeScript）

3. `apps/desktop/src/lib/workspace-review.ts`
   - `groupReviewChangesByTurn(messages, entries): ReviewTurnGroup[]`：
     纯函数，在用户消息边界处切分轮次（steering 消息留在当前轮次）；
     每组携带 `{ anchorId, label, entries, additions, deletions,
     activeCount, snapshotIds }`；第一条用户消息之前的改动并入第一组。
     单元测试覆盖多轮次、多工具轮次、subagent 行和 steering 消息。
4. `apps/desktop/src/components/workpanel/ReviewTab.tsx`
   - 分组渲染：每轮头部（轮次序号、用户消息摘录、文件数、聚合的
     +/-、组状态），可折叠；组内复用现有的 `ReviewChangeCard`。
   - 动作：先调用 `review.checkTurn`——全部干净 →「回滚此轮」；
     更早或有脏文件的轮次 → 主操作「回滚到此轮之前」，确认框列出
     受影响的轮次与文件；会话运行期间一切禁用。
   - 冲突结果按文件标注；文案建议回滚后重新运行构建 / 测试。
5. `apps/desktop/src/stores/slices/transcript-slice.ts`、`app-state.ts`、
   `lib/api.ts`
   - 新增 `checkWorkspaceTurn(snapshotIds)` 和
     `rollbackWorkspaceTurn(snapshotIds, mode)` action；后者按结果
     用现有的 `withReviewChangeState` 更新每条消息的本地 review
     状态；toast 走 i18n。
6. i18n：组头部、`rollbackTurn`、`rollbackToBeforeTurn`、确认后果
   文案、`rollbackTurnBusy`、冲突与重新验证提示（en + zh-CN）。
7. `packages/shared`：两个新 RPC 的请求 / 结果类型。

## 4. 测试

- Rust：`check_turn_clean` 各分支（未被触碰 / 被后续轮次触碰 /
  文件已删除 / 已回滚过）；批量回滚顺序；冲突不中止；重复回滚；
  忙碌拒绝；rewind 逆序正确性；通知入队内容与幂等性。
- TypeScript：分组纯函数测试；`ReviewTab` 组件测试（分组、预校验
  驱动的按钮状态、rewind 确认、运行中禁用）；store action 测试。
- 用户路径：两轮编辑 → 分组可见 → 最新一轮的外科手术式回滚成功
  且 transcript 中出现一条通知轮次 → 更早的轮次无法外科手术式
  回滚 → rewind 在确认后成功 → 冲突文件被正确标注。

## 5. 文档同步（实现期间）

- `docs/spec/03-runtime/06-host-rpc-protocol.md`：登记两个新 RPC。
- `docs/spec/04-ux/09-interaction-patterns.md`：分组、外科手术式
  回滚、rewind、通知交互与后果文案。
- `docs/spec/08-meta/decisions-log.md`：记录「旧回滚 = rewind」的
  语义决策和两个盲区（外部副作用、项目中间状态）。
- `docs/spec/03-runtime/04-data-storage.md`：注明无 schema 变更。

## 6. 验证

```bash
pnpm build:js
pnpm --filter @pi-desktop/desktop typecheck
pnpm lint
pnpm -r --if-present test   # affected packages
cargo fmt --check
cargo test -p host-core --locked
cargo clippy -p host-core --all-targets
```

未经明确授权不运行 `verify:ui:*`。实现在从最新 `origin/main` 切出的
`feat/turn-scoped-review` 分支上进行，遵循标准交付顺序。

## 7. 风险与声明的边界

- Rewind 会丢弃之后所有文件改动：由确认框的后果清单加上记录已还原
  范围的通知来控制；不提供跨文件语义影响分析。
- 通知会消耗一个简短的 Agent 确认轮次：为换取 Agent 上下文与工作区
  保持一致而接受。
- 当已有排队条目时，通知会落在它们之后，因此更早排队的指令可能
  引用已被回滚的代码——如实记录为边界；本次改动不做干预逻辑。
- 预校验 / 执行竞态：如果文件在 `checkTurn` 与回滚之间发生变化，
  逐快照的哈希守卫仍然会阻止它并报告 `conflict`；不会盲目覆盖任何
  内容。
