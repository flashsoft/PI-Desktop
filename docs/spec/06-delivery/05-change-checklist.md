# 05. 变更检查清单

> agent 在完成工作前必须执行的实用检查清单。  
> 交叉引用：[ai-development-workflow](03-ai-development-workflow.md) · [e2e-test-plan](04-e2e-test-plan.md) · [decisions-log](../08-meta/decisions-log.md) · [ADR index](../../adr/README.md) · [BOARD](../../project/BOARD.md)

---

## 0. GitHub Issue 受理

当 prompt 包含本仓库的 GitHub issue URL 或明确的 issue 编号时，在
请求开始检查清单之前完成这道门：

- [ ] 已获取 issue 标题、正文、标签、评论和状态。
- [ ] 报告的问题已被独立验证（bug 已复现或取得证据；特性已确认
  缺失或不完整且在范围内）。
- [ ] 只有在确认问题存在之后才开始实现。
- [ ] 如果问题不存在：issue 收到了一条验证评论，并在结论明确时关闭，
  或在无法确定时保持打开。
- [ ] 确认的修复合并之后：issue 收到了一条解决评论并被关闭。
- [ ] 评论使用 issue 的语言。
- [ ] 没有对无关 issue 发表评论或关闭。
- [ ] 没有从 issue 链接推断出 git push。

见 [R5 — Verify linked GitHub issues](03-ai-development-workflow.md#r5--verify-linked-github-issues-before-work-then-reply-and-close)。

---

## 0.1 GitHub Pull Request 受理

当 prompt 包含本仓库的 GitHub pull request URL 或明确的 pull
request 编号时，在重写该变更或开始后续工作之前完成这道门：

- [ ] 已获取 pull request 标题、正文、文件、提交、评论、检查、草稿
  状态、base/head 和关联 issue。
- [ ] 已独立判断其**原则**（真实且在范围内的问题；方案与基线、安全
  和架构兼容）。
- [ ] 完整性缺口（规范、测试、i18n、e2e 文档、风格、命名）没有被
  当作合并阻塞项。
- [ ] 如果原则成立：先合并该 pull request，保留贡献者的提交；落地
  阻塞项只用最小的叠加提交处理。
- [ ] 后续工作只在该 pull request 进入 `main` 之后开始，需要隔离时
  使用新分支（R4）。
- [ ] 如果原则不成立或存在伤害性阻塞项：不合并该 pull request，并以
  评论记录证据。该想法不被静默重新实现。
- [ ] 除非用户明确要求，否则不合并草稿 pull request。
- [ ] 评论使用 pull request 的语言。
- [ ] 没有对无关 pull request 发表评论或合并。
- [ ] 没有对贡献者的分支 force-push。没有从 pull request 链接推断出
  无关的远程发布。

见 [R6 — Merge a linked pull request whose principle is sound, then follow up](03-ai-development-workflow.md#r6--merge-a-linked-pull-request-whose-principle-is-sound-then-follow-up)。

---

## 1. 请求开始检查清单

在为新请求编辑任何文件之前：

- [ ] 已识别并保留现有的未提交工作。
- [ ] 已 fetch `origin/main`，检出从最新的 `main` 提交开始。
- [ ] 默认在主检出中工作；只有当用户要求或并行工作需要隔离时，才
  创建专用的 `<type>/<short-description>` 任务分支或 worktree。
- [ ] 未验证的代码从不提交或推送到 `main`。
- [ ] 已记录交付范围：commit 请求包含本地 `main` 集成；push 请求
  包含基于 PR 的远程 `main` 集成与本地同步。尊重明确的仅分支或
  仅草稿限制。

---

## 2. 影响分析

开始实现之前，回答以下问题：

- [ ] 这个变更引入了哪些行为变化？
- [ ] 哪些规范受影响？（列出文件路径）
- [ ] 这个变更是否触及架构边界？（进程模型、IPC、存储、安全、插件 API）
- [ ] 这个变更是否影响用户可见或协议可见的行为？
- [ ] 针对该变更的风险与回归范围，本地验证是否必要？如果是，最小
  的目标检查集是什么？
- [ ] 它与哪个里程碑交付物相关？（M1–M6，或无）

参考 [spec update matrix](03-ai-development-workflow.md#3-spec-update-matrix) 确定需要的文档更新。

---

## 3. 规范同步检查清单

实现之后（或与之并行）：

- [ ] 每个受影响的规范文件都已更新为新行为。
- [ ] 如果 `AGENTS.md` 变更：`CLAUDE.md` 仍然镜像其中的不可协商项，
  两个文件共享同一个 `Policy-Sync:` token，且 `pnpm check:agent-policy`
  通过。只变更 `CLAUDE.md` 时反向适用。
- [ ] 如果架构边界变更：在 `docs/adr/` 中编写或更新 ADR。
- [ ] 如果实现默认值变更：更新 `decisions-log.md` 条目。
- [ ] 如果基线冻结决策受影响：基线升版 + 显式 ADR（非 MVP 常规流程）。
- [ ] 规范之间的交叉引用仍然正确（无过期链接）。

---

## 4. E2E / 测试文档检查清单

- [ ] 如果用户可见或协议可见行为变更：在 [04-e2e-test-plan.md](04-e2e-test-plan.md) 中新增或更新场景。
- [ ] 如果新增或更新了场景，它遵循模板（ID、标题、前置条件、步骤、
  预期、关联规范、验收、里程碑、状态）。
- [ ] 如果新增或更新了场景，§8 的可追溯矩阵是最新的。
- [ ] 当变更风险使单元测试成为必要时，已新增或更新单元测试。
- [ ] 当 IPC/RPC 契约变更或跨组件回归风险使集成测试成为必要时，已
  新增或更新集成测试。
- [ ] 最小的必要目标本地检查已通过，或已评估本地验证不必要，无需
  单独批准或豁免。
- [ ] 在请求分支被推送并打开 PR/MR 之前，或在宣布仅提交交付完成
  之前，相关 E2E 套件已在集成的本地 `main` 上选定并通过；必需的
  验证不需要单独的用户请求。仅文档变更保留其既有豁免。
- [ ] 结果适用于该门运行时的提交；当落地的可执行内容发生变化时，
  受影响套件已重跑。任何未运行的必需套件都记录了原因、替代验证
  和剩余风险；在该门通过之前交付保持不完整。
- [ ] 远程合并前启动的托管平台 E2E 任务已被观察并报告，但不取代
  本地 `main` 门；当落地的可执行内容与该门运行时的提交不同时，
  合并后已重跑。dispatch 或 rerun 遵循托管平台或仓库工作流的要求。

---

## 5. Git 提交检查清单

- [ ] 变更是一个逻辑单元（或拆分为聚焦的多个提交）。
- [ ] diff 中没有秘密、token 或本地数据。
- [ ] diff 中没有 `node_modules/`、构建产物或发布包。
- [ ] 提交信息遵循约定格式：`type(scope): description`（仅英文）。
- [ ] 规范更新与代码紧耦合时随代码提交；纯文档使用相邻的 `docs:` 提交。
- [ ] 已审阅 `git diff --stat` —— 没有意外内容。

---

## 6. Pull/Merge Request 检查清单

在标记请求的集成完成之前，应用 R4 交付范围；明确的仅分支或仅草稿
请求保留其更窄的范围：

- [ ] 请求的 commit/push 交付已集成进本地 `main`；没有仅把任务分支
  的 commit 或 push 报告为完成，也没有要求第二次合并确认。
- [ ] 对于携带代码的变更：相关 E2E 门已在分支推送和 PR/MR 创建之前
  针对集成的本地 `main` 运行，或在宣布仅提交交付完成之前运行，
  或其 `NOT RUN` 限制已记录原因、替代验证和剩余风险。
- [ ] 仅提交或本地合并交付未经单独授权不进行远程发布。
- [ ] 对于已授权的远程交付：请求分支已推送，其 PR/MR 以 `main` 为
  目标且只包含本任务的变更，描述中记录了受影响的规范、E2E 场景
  和验证。
- [ ] 对于已授权的远程交付：PR 自审、必需检查和评审已通过；PR/MR
  以允许的策略合并进远程 `main`；本地 `main` 已与落地的变更同步；
  当落地的可执行内容与该门运行时的提交不同时，受影响套件已重跑
  并记录。
- [ ] 没有从交付请求推断出直接推送 `main`、force-push、丢弃无关
  工作或绕过门禁。真实的阻塞项已报告。
- [ ] 如果使用了请求 worktree，合并后已移除。
- [ ] 已合并的请求分支已在本地删除（`git branch -d`）。
- [ ] 任何已远程发布的请求分支在合并后已删除。
- [ ] 适用时包含 issue 引用（例如 `Refs #12` 或 `Closes #12`）。

---

## 6.1 合并清理检查清单

在请求集成进 `main` 之后立即执行，无论合并是远程经 PR/MR 还是
本地在主检出中完成：

- [ ] 已验证预期提交存在于本地 `main`；请求了远程交付时也验证
  远程 `main`。
- [ ] 如果使用了 worktree：它是干净的 —— 没有残留的未提交或未跟踪
  请求文件 —— 且 `git worktree remove <worktree-path>` 在未强制的
  情况下成功。
- [ ] `git branch -d <type>/<short-description>` 成功（对未合并分支
  不使用 `-D` 兜底）。
- [ ] `git worktree list` 没有本请求的过期条目（使用 worktree 时）。
- [ ] 没有移除其他 agent 的 worktree 或分支。
- [ ] 如果交付后请求了启动，应用已从集成的 `main` 检出及其开发环境
  构建并启动。

---

## 7. 应用版本发布检查清单（稳定标签）

每次稳定应用版本升版/打标签都必须执行（D164）。仅文档工作或
非发布杂务可跳过。

- [ ] `packages/shared/src/changelog.ts` 在 `en` 和每个已交付产品
      locale 下都有该发布版本的最新在前条目（不带前导 `v`）。
- [ ] 各 locale 的亮点数量一致；英语是权威来源。
- [ ] 条目是简短的面向用户的产品说明（不是原始 PR/提交列表）。
- [ ] 仅预发布版本从产品目录中省略，除非产品明确为该渠道交付
      应用内说明。
- [ ] `packages/shared/src/changelog.test.ts` 把新版本列在最前。
- [ ] `pnpm --filter @pi-desktop/shared test` 通过目录对齐。
- [ ] `README.md` 和 `README.zh-CN.md` 声明当前的
      `<major>.<minor>.x` 发布线，且不包含该发布会使其失效的
      工具链、命令、亮点或路线图声明。
- [ ] `node scripts/check-release-docs.mjs` 通过（版本表面、
      已交付 locale 目录、README 发布线）。
- [ ] 文档提交在 `node scripts/release.mjs <version> --tag` /
      `git tag v<version>` **之前**落在发布分支上。
- [ ] GitHub 自动生成的 release 正文被视为仅 Web 用途，不是应用内
      来源（[06-release-runbook.md §4.1](06-release-runbook.md#41-mandatory-release-version-surface-gate-d164--d260)）。

---

## 8. 最终完成定义门

在标记工作完成之前，在用户的交付范围下验证**所有适用**条件：

| # | 门 | 来源 |
|---|---|---|
| 1 | 请求分支与 worktree 从最新的 `main` 创建；安全时复用主环境 | [R4 — Request branch + worktree + merge gate](03-ai-development-workflow.md#r4--request-branch--worktree--merge-gate) |
| 2 | 代码/文档实现了计划的变更 | [development loop](03-ai-development-workflow.md#2-development-loop) 第 4 步 |
| 3 | 所有受影响的规范已更新 | [R1 — Spec-sync](03-ai-development-workflow.md#r1--spec-first--spec-sync) |
| 4 | E2E 场景已记录（或确认不需要） | [R3 — E2E coverage doc](03-ai-development-workflow.md#r3--e2e-coverage-doc) |
| 5 | 目标本地检查遵循既有风险标准；对于携带代码的变更，相关 E2E 门已在分支推送、PR/MR 或仅提交完成之前于集成的本地 `main` 上通过（或其 `NOT RUN` 限制已记录）；远程合并后，当落地的可执行内容变化时受影响套件已重跑；必需的测试不需要单独的用户请求 | development loop 第 7、10、11 步 |
| 6 | 变更以约定格式信息提交 | [R2 — Commit-per-change](03-ai-development-workflow.md#r2--commit-per-change) |
| 7 | 里程碑交付物完成时 BOARD 已更新 | development loop 第 9 步 |
| 8 | 提交中没有秘密或本地数据 | [§4.4 Never commit](03-ai-development-workflow.md#44-never-commit) |
| 9 | 请求的本地/远程 `main` 集成已按 R4 完成；预期提交已验证，已合并的 worktree/分支已移除；任何请求的启动都使用集成的 `main` | [R4 — Request branch + worktree + merge gate](03-ai-development-workflow.md#r4--request-branch--worktree--merge-gate) |
| 10 | 磁盘上没有遗留已合并的 worktree；`git worktree list` 没有本请求的过期条目 | [§6.1 合并清理检查清单](#61-合并清理检查清单) |
| 11 | 如果关联了 GitHub issue：工作前已验证；用 issue 语言评论；结论明确时关闭 | [R5 — Verify linked GitHub issues](03-ai-development-workflow.md#r5--verify-linked-github-issues-before-work-then-reply-and-close) |
| 12 | 如果关联了 GitHub pull request：已评审原则；成立时先合并；合并后再跟进；不丢弃贡献者工作 | [R6 — Merge a linked pull request whose principle is sound, then follow up](03-ai-development-workflow.md#r6--merge-a-linked-pull-request-whose-principle-is-sound-then-follow-up) |

如果任何适用的门未通过，请求的集成**不算完成**；报告阻塞项，
不要削弱门禁。
