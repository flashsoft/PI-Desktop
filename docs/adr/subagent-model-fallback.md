# ADR: 有序的 subagent 模型回退

- 状态：已接受，待实现
- 日期：2026-09-14
- 相关：ADR 0062、ADR 0063、ADR 0202、ADR subagent-model-opt-in

## 背景

一个 subagent 只能选择一个模型。当该模型持续不可用时，现有的有界
provider 重试无法恢复。在另一个 agent 上重启被委派的任务可能重复执行
已经改动过文件的工具。

## 决策

在定义、用户 subagent 记录/输入，以及现有的内部启动定义中新增可选的
`fallbackModels`。它是一个有序的 `provider/model` 字符串列表，存在于
受管 Markdown 和 host RPC 中，并在 Shared 中解析为模型 pin。现有的主
`model` 和 Task 覆盖优先级保持不变。缺失的列表保持单模型行为。更新中
省略该字段会保留列表；`[]` 清空它。这些增量字段不需要数据库或协议
版本变更；旧文档保持有效。

Electron 通过与主 pin 相同的凭据、provider 数量和模型能力边界解析
备选。这些绑定的作用域限于其所属定义，即使 Task 显式覆盖了它的主模型。
它们不授予 `Task.model` 访问另一个定义的权限，也不进入已选入模型的
摘要。无法解析的主 pin 仍在启动前失败；无法解析的备选在轮到它时被
报告并跳过。

在当前模型的现有重试耗尽之后（或遇到不可重试的 provider 错误时），
运行时尝试下一个配置的备选。每个已解析的 provider-id/model-id 对在
每次委派中最多尝试一次，不包括每个模型内已有的重试预算。同一个
Agent 保留其系统提示、原始任务、成功的 assistant/工具历史、工具范围、
计数器和用量。只有失败的 assistant 请求在 `continue()` 之前从模型上下
文中移除。它在可见转录中保留。回退控制器不重放任何任务或已完成的
工具。

模型、适配器、凭据、头部、输出上限和思考级别一起切换。思考级别针对
每个模型从定义或原始父级选择重新钳制；`omit` 保持为省略。原始中止
信号拥有整条链。host/工具失败、缺失报告、意外抛出的错误和取消不会
触发回退。

失败的尝试在子转录诊断和有界的父级报告中保持可见。生命周期快照保留
最终生效的模型、思考级别和增量添加的 `modelFailures` 诊断。耗尽整条
链返回 `failed` 和最终的 provider 错误；它绝不选择未列出的模型，也
绝不静默地以继承父级作为恢复手段。

## 设置示例

高级区块保留一个主模型，并按优先级顺序列出回退模型。每个回退可以
上移/下移或移除。

![Subagent 编辑器，显示主模型和两个有序回退模型](../public/screenshots/app/zh/subagent-model-fallback.png)

## 验证

Shared 解析器和 provider 解析测试、host 注册表往返、针对继续/凭据/
取消的真实本地 HTTP 测试，以及 sidecar 模型套件覆盖该契约。必需的
集成套件是 `test:e2e`、`test:e2e:subagents` 和 `test:e2e:subagent-models`。
编辑器旅程单独覆盖添加、重排序、移除，以及在保存/重开后保留不可用
pin。


### 本地验证与剩余集成关卡

- 运行时：200 个聚焦测试通过，包括现有的父运行时套件；Shared：35 个
  定义测试；Desktop：100 个 subagent 测试；i18n：24 个测试；host-core：
  13 个 subagent 测试。Typecheck、lint、Rust 格式化和 clippy 通过。
- `test:e2e:subagent-models`：在请求分支上以真实 sidecar 和本地 HTTP
  传输通过，包括有序回退和实时/落定的模型元数据。这是集成前证据。
- `test:e2e`：19 个通过，两个项目删除断言失败，两个实时 provider 场景
  因缺少凭据被跳过。一个独立构建的、未改动的 `a9053531` host 复现了
  同样两个失败。
- E2E：`test:e2e:subagents` 在 Windows 上**未完成运行**。Rust 的
  known-folder 查找忽略了 fixture HOME，因此套件在注册表写入之前就
  失败。替代验证是 host 记录/文档测试和 Shared/launch-loader 测试。
  剩余风险是完整的受管注册表 RPC/保存/重开旅程；请在 Linux/macOS 隔离
  环境下运行该套件。
- 完整的编辑器交互/重载和集成后 `main` E2E 仍未完成。本请求保留其
  分支和 worktree 用于集成。

### WSL 分支验证（2026-09-14）

实现提交 `82dfb3353ab071b4b0479ac401797cc6ab3c178f` 被导出到一个隔离
的 Linux 文件系统目录，并在 WSL2 Ubuntu 24.04 下构建，使用 Linux
Node 24.14.1、pnpm 11.18.0、Rust 1.96.0 和 Electron 43.6.0。没有复用
任何 Windows 的 `node_modules` 或可执行二进制。锁定的依赖安装、
JavaScript 构建和 Linux host 构建通过。

- `pnpm test:e2e:subagents`：**31/31 通过**，包括有序回退持久化、
  省略更新的保留、非法 pin 拒绝、加载器传播，以及清空列表。
- `pnpm test:e2e:subagent-models`：**13/13 通过**，包括回退和现有的
  模型选入/覆盖隔离场景。
- `pnpm test:e2e`：**21/21 个非实时检查通过**。两个真实 provider 用例
  （`E2E-008-live-model`、`E2E-009-stream`）因未配置测试 API key 而被
  **跳过**。在 Windows 上失败的两个项目删除用例在 Linux 上通过；这并
  不修复或否定 Windows 的结果。
- 一个使用 CDP 的隔离 Electron/Xvfb 配置编辑器检查通过了四个旅程：
  添加/重排序/保存、跨另一字段编辑和渲染进程重载保留、保留不可用
  provider 的 pin，以及全部移除/保存/重开。该 UI 驱动了真实的渲染
  进程、preload、Main 和 Linux host 注册表；持久化记录通过 IPC 校验。
  它使用无凭据的合成 provider，并在之后移除了其临时 HOME/数据/配置
  目录。

测试环境设置了
`PI_DESKTOP_PLUGIN_MARKET_URL=http://127.0.0.1:9/e2e-offline-catalog`，
使启动使用现有的内置市场目录。使用默认的外部市场 URL 时，WSL 的网络
连通性在被测行为之前就导致了 host 握手超时。这些运行不构成在线市场
连通性的资格证明。UI 运行还记录了一个无关的内置 `pi.file-manager`
模块加载错误；其成功的 subagent 断言不是完整的插件健康声明。

这关闭了此前 Linux 注册表和配置编辑器的验证缺口。回退后的完整任务
转录重载验收、真实 provider 用例，以及必需的集成后 `main` E2E 仍未
完成。本次验证期间未进行任何 main 集成或远程发布。

### 扩展的失败链验证（2026-09-14）

`82dfb335` 处的现有实现未改动。额外的测试源码被复制进隔离的 WSL 源码
快照；这些结果适用于该实现加上本次改动中扩展的测试。

| 按配置顺序的本地 provider 响应 | 预期且观察到的结果 |
| --- | --- |
| 成功，备选未使用 | 主模型完成；无备选请求 |
| HTTP 404，成功，备选未使用 | 第二个模型完成 |
| HTTP 404，HTTP 404，成功，备选未使用 | 第三个模型完成 |
| HTTP 404，HTTP 404，HTTP 404，成功，备选未使用 | 第四个模型完成 |
| 四个 HTTP 404 响应 | 子会话在四次请求后失败；无回绕 |

真实传输的运行时测试和独立的 sidecar 进程都通过了该矩阵。sidecar
断言检查实际的请求顺序、原始任务、每一次实时的模型切换、落定的
模型/状态、有序的失败码，以及最终的子会话报告。仅有成功的父级响应
无法通过子会话失败断言。

额外的真实传输测试通过了：混合的 HTTP 401/403/404 失败、HTTP 429 和
HTTP 503 在两个连续模型上各自耗尽独立的重试预算，以及在一个、两个或
三个失败模型上保留一个已完成的工具调用。重试 fixture 发送
`Retry-After: 0`；生产重试逻辑和重试次数保持生效，没有假定时器或
重试旁路。取消、无法解析/重复的绑定、凭据、思考级别选择和 host 工具
错误边界保持被覆盖。

- Windows：`pnpm --filter @pi-desktop/agent-runtime exec vitest run
  src/subagent.test.ts src/subagent-fallback.test.ts
  src/subagent-definitions.test.ts src/runtime.test.ts` —— **210/210 通过**。
- Windows：`pnpm --filter @pi-desktop/agent-runtime typecheck` —— **通过**。
- Windows：`pnpm lint` 和 `git diff --check` —— **通过**。
- WSL：`pnpm --filter @pi-desktop/agent-runtime exec vitest run
  src/subagent-fallback.test.ts --reporter=verbose` —— **17/17 通过**。
- WSL：`pnpm test:e2e:subagent-models` —— **17/17 检查通过**，包括
  五个失败链/对照场景和现有的模型隔离检查。

这些是驱动真实运行时和 sidecar 的确定性本地 HTTP provider，而不是
实时商业模型可用性测试。没有应用代码改动，因此此前构建的便携可执行
文件包含相同的已测回退实现。main 集成、集成后 E2E、实时 provider 覆盖
和任务转录重载验收不在本结果范围内。
