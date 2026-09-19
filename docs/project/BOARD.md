# PI-Desktop 项目看板

> 历史记录。下面的状态表最后于 2026-08-11 为 0.5.x 版本线刷新，
> 保留用于里程碑追溯。当前交付状态以
> `packages/shared/src/changelog.ts` 和仓库的 GitHub Issues 为准。

GitHub Projects 需要额外的 token scope（`project`）。
在启用之前，用以下方式跟踪交付：

- GitHub Issues
- Milestones
- 本看板文档

## 列

| 列 | 含义 |
|---|---|
| Backlog | 已记录，未开始 |
| Ready | 可以开始实现 |
| In Progress | 正在推进 |
| Review | 等待验证 |
| Done | 已完成 |

## 状态快照（2026-08-11）

| 里程碑 | GitHub | 本地状态 |
|---|---|---|
| M0 Spec Freeze | [closed](https://github.com/vastsa/PI-Desktop/milestone/1) | 完成 |
| M1 App Skeleton | [closed](https://github.com/vastsa/PI-Desktop/milestone/2) | 完成 |
| M2 Pi Chat Runtime | [closed](https://github.com/vastsa/PI-Desktop/milestone/3) | 完成 |
| M3 Workspace Tools | [closed](https://github.com/vastsa/PI-Desktop/milestone/4) | 完成 |
| M4 Plugin Foundation | [closed](https://github.com/vastsa/PI-Desktop/milestone/5) | 完成 |
| M5 Desktop Hardening | [open](https://github.com/vastsa/PI-Desktop/milestone/6) | 除公证外完成（受凭据限制） |
| M6 Plan Operating State | 已规划 | 完成（2026-08-05）；Goal 与当前扩展增量已交付 |

未关闭的 issue：
- [#6 M5: Packaging and desktop hardening](https://github.com/vastsa/PI-Desktop/issues/6)

## 泳道

### 已完成
- M0 Spec Freeze
- English-first 政策
- Rust host-core 架构决策
- 私有仓库初始化
- UX 设计系统 spec（07/08/09）
- AI 开发工作流 spec（03）
- E2E 测试计划 spec（04）
- 变更检查清单 spec（05）
- AGENTS.md Agent 指令文件
- M1 App Skeleton（pnpm monorepo、Electron、host-core 健康检查、i18n）
- M2 Pi Chat Runtime（provider/secrets、流式对话、会话持久化）
- M3 Workspace Tools（Read/Glob/Grep/Write/Edit/Bash、权限、路径沙箱）
- M4 Plugin Foundation（开发加载、命令面板、插件工具注册）
- M5 打包：未签名 DMG 本地构建（`PI-Desktop-0.1.0-arm64.dmg`），
  带自定义图标、宿主二进制 + sidecar 资源；签名 / 公证通道已脚本化
  （`scripts/release-macos.sh`，D078）
- M5 加固：渲染进程沙箱 + 生产 CSP（D081）、带脱敏 / 轮转的 NDJSON
  日志通道（D082）、崩溃监督 + 降级 UI（D080）、窗口状态持久化
  （D083）、应用图标（D079）
- 跨平台外壳就绪：macOS 原生应用菜单，加上 Windows/Linux 无菜单的
  无边框标题栏、窗口控件，以及原生 runner 打包配置（D118/D129）
- Transcript 存储 v7：`sessions/` 下按会话的 JSONL 文件，SQLite 退
  化为索引（FTS/列表/角标），append-only 修订文件，v7 之前的数据库
  通过破坏性重置归档（D119）
- 会话分支：protocol-v5 宿主快照从空闲会话创建独立会话，同时保留
  工作区 / 运行时配置并重映射 transcript 标识符（D122 / ADR 0023）
- 应用更新投递：Main 持有的固定 feed、打包版 macOS 发现与手动发布
  链接、带类型的渲染进程状态，以及 Windows NSIS / Linux AppImage
  的应用内投递通道（D120 / ADR 0022，由 D126 发布）
- Spec 语料 0.4.7：全面 English-first（翻译了 runtime/plugins/ADR
  文档）、错误码注册表统一到 shared/errors.ts、e2e 状态同步到真实
  自动化、decisions-log 重构（A–I）并带取代链、验收标准带证据标记
- Codex 视觉一致性走查（D034–D072 系列；截图套件）
- M6 Plan/Goal 运行态实现：单 Agent 的 Agent/Plan/Goal 流转、不可变
  的 `.pi/plan/*.md` 与 `.pi/goal/*.md` checkpoint、带显式 Ask 默认
  权限选择的 approve/reject、无重放的重启中断、计划性契约拒绝、可
  选择的 shell 身份 / 流 / 超时 / 中止处理，以及英文 / 简体中文渲染
  进程覆盖（E2E-104–E2E-120）

### 进行中
- Codex 视觉打磨（持续的截图驱动迭代）
- macOS 签名 / 公证分发与 Windows/Linux 原生版本验证
- 更强的插件运行时沙箱与发布者签名 / 来源路径
- 完整的 Playwright / UI 驱动 E2E 覆盖

### 阻塞（外部）
- 完整 DMG 公证——需要 Apple Developer 凭据；操作手册已就绪
  （[06-release-runbook](../spec/06-delivery/06-release-runbook.md)）

### 待办
- 已发布的英文 / zh-CN 文案之外的更多语言

## 当前产品增量（0.5.6）

M6 checkpoint 已完成。当前应用还包括：

- 单个 pi Agent 上的 Agent / Plan / Goal 契约模式，包括 Goal 审批和
  自主验收标准执行
- 插件、MCP 服务器、Skills 和 Subagents 的扩展管理，带全局 / 项目
  启用范围和插件市场
- 全局插件启动器、会话导入、定时 prompt、通知、输入框斜杠命令、
  `@` 文件引用和剪贴板文件粘贴
- 并行有界的 Subagents，带归属标记的 transcript 行和受管理的用户级
  注册表
- 上下文 checkpoint 检视、消息级 Review / 回滚，以及响应运行期间
  暂存下一轮配置

## 验证快照（2026-08-05 — M6 Plan 验收）

- `cargo test -p host-core --locked` — 139/139 通过；15 个聚焦的数据库
  测试通过
- `pnpm --filter @pi-desktop/desktop test` — 353 通过，1 个按平台条件
  跳过
- `pnpm --filter @pi-desktop/agent-runtime test` — 97 通过
- `pnpm --filter @pi-desktop/shared test` — 构建 `dist` 后 114 通过
  （57 个源用例以源码和构建产物两种形式执行）
- `pnpm --filter @pi-desktop/i18n test` — 7 通过
- `pnpm build:js`、`pnpm typecheck`、`pnpm lint` 和
  `cargo fmt --all -- --check` — 通过
- `PI_DESKTOP_E2E_LONG_TIMEOUT=1 pnpm test:e2e:plan` — 13 通过；两个
  公共 RPC 夹具跳过项有直接的确定性 Rust 覆盖
- `pnpm test:e2e:plan-ui` — 默认无密钥运行在 1280×800 和 900×700 下
  5/5 通过，实时用例显式跳过；可选的 env 门控实时用例需要一个
  OpenAI 兼容 Provider。使用模型 `gpt-5.6-luna` 的授权运行 6/6 通过
  且零控制台诊断：真实 Composer/Send、实时 `EnterPlanMode` →
  `SubmitPlan`、经 preload/Main 渲染的 Ask 审批、审批后的精确持久
  标记、私有 WeakMap 证明审批前后是同一个 `DesktopAgentRuntime`
  对象，以及稳定的 Main/Host/sidecar PID；凭据从未进入 CDP 或输出
- `pnpm test:e2e` — 带凭据 20/20 通过；无跳过
- `pnpm test:e2e:boot` 和 `pnpm test:e2e:supervision` — 在 Windows 上
  通过

## 以后升级到 GitHub Projects

```bash
gh auth refresh -s read:project,project
gh project create --owner vastsa --title "PI-Desktop Roadmap"
```
