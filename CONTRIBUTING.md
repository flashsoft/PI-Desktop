# 参与 PI-Desktop 贡献

感谢你帮助改进 PI-Desktop。本指南适用于在仓库上工作的人类与 AI
贡献者。

PI-Desktop 是拥有真实用户的已发布软件。请优先提交小型、可评审的
改动，保持既有行为、用户数据、安全边界和公共接口不变。

## 开始之前

阅读与你的改动相关的文档：

- [`AGENTS.md`](AGENTS.md) — 面向贡献者与 Agent 的仓库规则。
- [`CLAUDE.md`](CLAUDE.md) — Claude Code / Cowork 的不可协商条款镜像。
  当你修改其中任何一个策略文件时，同步更新另一个，设置相同的
  `Policy-Sync:` 标记，并运行 `pnpm check:agent-policy`。
- [`README.md`](README.md) — 产品概览与开发背景。
- [`docs/spec/00-baseline.md`](docs/spec/00-baseline.md) — 冻结的架构
  与产品决策。
- [`docs/spec/`](docs/spec/) 和 [`docs/adr/`](docs/adr/) 下的相关文档。
- [`docs/spec/06-delivery/03-ai-development-workflow.md`](docs/spec/06-delivery/03-ai-development-workflow.md)
  — 开发与交付工作流。

对于疑似安全漏洞，不要开公开 issue。请改为遵循
[`SECURITY.md`](SECURITY.md)。

## 协作规则

- `main` 是受保护的集成分支。不要在其上直接开发或直接推送。
- 每个请求使用一个短生命周期分支和一个专用 worktree，包括文档、
  杂务和小修复。
- 从最新的 `origin/main` 创建分支，使用类似
  `feat/provider-import`、`fix/session-refresh` 或
  `docs/contributing-guide` 的命名。
- 保留主检出中未提交的工作。不要重置、stash、移动或覆盖其他
  贡献者的工作。
- 不要复用其他请求的分支或 worktree。改动完成集成后，只清理你自己
  的 worktree 和分支。
- 代码、标识符、注释、日志字符串和协议字段名使用英文；提交信息
  （commit messages）与仓库文档（spec、ADR、README）使用简体中文
  （zh-CN）。GitHub 讨论可使用原作者的语言。

## 启动一个隔离的请求

在主检出中，先检查本地工作并拉取当前集成分支：

```bash
git status --short
git fetch origin main
```

如果主 `main` worktree 是干净的，先同步它，再创建请求 worktree：

```bash
git switch main
git fetch origin main
git merge --ff-only origin/main
git worktree add -b <type>/<short-description> \
  ../PI-Desktop-worktrees/<short-description> origin/main
cd ../PI-Desktop-worktrees/<short-description>
```

一旦本地 `main` 携带了某个已交付请求自己的集成合并，这个
fast-forward 就会失败；改用 `git merge origin/main` 同步，并在开始
新工作之前解决分叉，不要丢弃任何提交。

如果主检出中存在未提交的工作，或正在被另一个分支使用，保持它原样，
直接从拉取到的 `origin/main` 创建请求 worktree。绝不要为了满足这个
流程而丢弃无关的工作。

## 规划与实现

改动之前：

1. 对于被链接的 GitHub issue，核实所报告的问题确实存在且在范围内。
   不要实现未经核实的说法。
2. 对于被链接的 pull request，先评估方向；对合理的贡献者改动予以
   保留，而不是重写一遍。
3. 识别可观察行为、持久化、协议、安全和架构层面的影响。
4. 阅读相关 specification，并列出需要的验证。

改动期间：

- 每个改动只处理一个逻辑关注点，避免无关清理。
- 保持进程边界：Renderer → Preload IPC → Electron Main → Rust
  host core / agent runtime。
- SQLite 所有权保留在 Rust host core，Electron Main 保持为薄编排层。
- 行为发生变化时更新相关 specification。
- 对用户可见或协议可见的行为，新增或更新 E2E 场景。新场景 ID 使用
  语义化形式，例如
  `E2E-SESSION-switch-does-not-show-stale-transcript`；不要分配新的
  全局数字计数器。
- 改动架构边界、公共契约、安全边界或已冻结决策时，新增一份 ADR。

## 验证改动

根据受影响的界面和风险选择检查项。不要隐藏或削弱失败的测试。

典型的检查包括：

```bash
pnpm build:js
pnpm typecheck
pnpm lint
pnpm -r --if-present test
cargo fmt --check
cargo test -p host-core --locked
cargo clippy -p host-core --all-targets
```

低风险改动只运行相关的子集。纯文档改动通常不需要运行时测试；至少
要检查渲染后的 Markdown，并运行 `git diff --check`。

包含代码的改动，需要在推送请求分支、打开 pull request 之前，在集成
后的本地 `main` 上运行相关的 E2E 套件。在请求分支上运行有助于调试，
但不能替代这道关卡。无法运行的必需套件要记录为 `NOT RUN`，并说明
原因、替代验证和残余风险。

## 提交与 Pull Request

在可行时使用一个逻辑提交，并遵循 Conventional Commits：

```text
docs(security): clarify vulnerability reporting
fix(host-core): preserve session ownership during restart
feat(composer): add model selection shortcut
```

提交之前，检查完整 diff。绝不要提交：

- API key、token、密码、凭据或用户私有数据。
- 本地数据库、日志、配置或机器特定路径。
- `node_modules/`、构建产物、发布包或无关改动。

先将请求分支合并进本地 `main`，并在该集成检出上运行必需的 E2E 套件；
然后针对 `main` 打开 pull request，其中包含：

- 简明的摘要与理由；
- 受影响的 spec、ADR 和 E2E 场景；
- 验证命令及实际结果；
- 相关时的兼容性、迁移、安全与残余风险说明。

不要对贡献者分支强制推送，不要绕过必需的检查，不要合并失败的改动。
评审反馈和后续提交保持聚焦于本请求。

## 合并之后

在干净的主检出中：

```bash
git fetch origin main
git switch main
git merge origin/main
git worktree remove ../PI-Desktop-worktrees/<short-description>
git branch -d <type>/<short-description>
git worktree prune
```

本地 `main` 已经携带了请求分支自己的集成合并，因此远端合并用
`git merge origin/main` 同步，而不是 fast-forward pull。当请求提交
被确认已进入远端 `main`、且本地合并不再需要时，将本地 `main` 重置
到 `origin/main`。

对于包含代码的改动，在打开 pull request 之前记录来自集成本地
`main` 的必需 E2E 结果；当远端合并落入与该 commit 不同的可执行内容
时，重新运行受影响的套件。

## Issue 与安全报告

可复现的 bug 和功能请求使用仓库的 issue 表单。漏洞、凭据泄露、沙箱
或权限绕过，以及其他安全敏感的报告不要使用公开 issue。请按照
[`SECURITY.md`](SECURITY.md) 中的说明私下提交这些报告。
