# ADR 0057: 权限门控的外部路径与可移植原生搜索

- 状态： 已接受实现（经 D315 修订）
- 日期： 2026-08-05
- 基线： `0.4.14`
- 协议： v9
- 存储 schema: v10

## 背景

读取/搜索工具在其路径解析器运行之前就被归类为低风险。因此，会话 workspace
之外的绝对路径绕过了正常的权限卡片，随后以 `PATH_OUTSIDE_WORKSPACE` 失败。
这让正当的检查请求看起来像坏掉的 Plan 轮次，并给了 agent 重试或用 shell 命
令替换原生工具的动机。

宿主已经为 `Read`/`Glob`/`Grep` 准备了有界的跨平台 Rust 实现，但 sidecar
schema 只暴露了其作用域控制的一个子集。模型无法可靠地提供 `path`、
`include`、`outputMode`、`headLimit`、`offset`、`limit` 或 `Glob.limit`；有
些 provider 还会发出宿主拒绝的 shell 风格 `files_with_matches` 值。

## 决策

### 1. 显式的外部路径由权限门控

对于 `Read`、`Glob`、`Grep`、`Write` 与 `Edit`，宿主在应用正常风险矩阵之
前，先针对会话 workspace 与 scratch 根对显式路径分类：

- Auto 不经卡片直接执行显式外部路径。
- Ask 与 Accept edits 发出现有的内联权限请求。
- Allow once 只覆盖当前调用；Allow for session 使用现有的工具名授权作用域。
- Deny、超时与取消以 `TOOL_DENIED` 返回，不执行。
- 相对父级遍历与符号链接逃逸使用与绝对路径相同的规则。

批准后，host-core 用与受控路径相同的规范化祖先逻辑解析路径。它绝不把外部
位置变成新的 workspace 根，隐式的 Bash cwd 或递归遍历也不获得此例外。成功
的外部结果在存在 root 字段处报告 `root: "external"`，并保持对模型可见的绝
对规范化路径。

Plan 对 Write/Edit/插件/未知工具的现有硬拒绝仍高于此路径规则。

### 2. 原生搜索是可移植的默认

runtime 暴露宿主完整的有界搜索契约：

- `Read`：`offset` 与 `limit`；
- `Glob`：`path` 与 `limit`；
- `Grep`：`path`、`include`、`outputMode`、`headLimit` 与
  `caseInsensitive`。

`outputMode` 在 schema 中恰好暴露 `content`、`filesWithMatches` 与 `count`。
宿主也在执行前把 `files_with_matches` 与 `files-with-matches` 归一化为兼容
别名。搜索指引在每个平台上都偏好 workspace 相对路径与原生工具。当进程
PATH 或 Unix 登录 PATH 上存在用户安装的 `rg` 时，Grep 可以执行它
（D181 / D315）。那是一个实现后端，不是 shell 搜索：stdin 为 null，参数不
经 shell 引用，且宿主仍应用预算、最新优先顺序、作用域化 ignore（`path` 显
式时使用 `--no-ignore-parent`）以及相同的 JSON 形态。缺失、被覆盖为无效或
执行失败的 `rg`（spawn 错误或退出码 2）回退到进程内 `ignore` + `regex` 搜
索器。`PI_DESKTOP_RG` 选择二进制；`PI_DESKTOP_DISABLE_RG` 强制回退。Bash 搜
索仍是有界的最后手段，且仍不假设 POSIX 工具、PowerShell 或 `rg` 可用。

## 后果

- 项目之外的 Plan 检查可以等待明确的用户决定，而不是在解析器边界失败。
- Auto 仍适合全自动会话，而 Ask 与 Accept edits 为外部数据与变更保留显式
  同意边界。
- 搜索请求可以在执行前收窄作用域与输出，减少 shell 回退、无效 output-mode
  重试与上下文增长。
- 外部读取与搜索通过绝对路径可见；外部变更不会创建 workspace Review 或产
  物记录。
- 安全拒绝列表仍是默认。本 ADR 改变的是显式路径的决策点，而不是 host-core
  或 Bash cwd 的权威。

## 已拒绝的备选方案

### 继续返回 `PATH_OUTSIDE_WORKSPACE`

已拒绝，因为 agent 无法区分用户拒绝的请求与缺失的权限机会，且 Plan 失去了
一条正当的检查路径。

### 把所有低风险读取视为 Auto

已拒绝，因为低风险操作仍可能泄露无关目录的数据。作用域与用户同意必须分开
评估。

### 使用特定 shell 的搜索命令

已拒绝，因为命令可用性与引用方式在 macOS、Linux 与 Windows 之间不同，且无
界的 shell 输出是已实测的上下文耗尽来源。从 Grep 执行 `rg` 不是这个备选方
案：模型仍调用 Grep，且 host-core 持有结果预算。

## 相关文档

- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/03-runtime/05-host-core-rust.md`
- `docs/spec/03-runtime/06-host-rpc-protocol.md`
- `docs/spec/03-runtime/08-error-codes.md`
- `docs/spec/03-runtime/15-workspace-ignore-rules.md`
- `docs/spec/03-runtime/16-tool-result-limits.md`
- `docs/spec/04-ux/03-permission-ux.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-019/E2E-019e)
