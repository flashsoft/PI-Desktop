# ADR 0054: 可选择的命令 shell 目录与执行身份

- 状态： 已接受实现（§4 的超时边界经 ADR 0167 / D329 修订；PowerShell 7 条目由 ADR 0209 / D381 新增）
- 日期： 2026-07-31
- 基线： `0.4.14`
- 协议： v9
- 存储 schema: v10

## 背景

Bash 工具目前每个进程解析一个 Bash 实现。这阻止用户选择与其项目匹配的命令
语言，并使可执行文件的变更难以检测。协议名称与 Agent 工具词汇必须保持稳定，
同时 shell 选择变得显式且由宿主权威决定。

## 决策

### 1. 宿主持有的 shell 目录

Host-core 暴露一个带稳定 ID 的平台感知目录：

| ID | Shell | 发现方式 |
|---|---|---|
| `windows-powershell` | 内置 Windows PowerShell 5.1 | `powershell.exe`/Windows 上的原生 PowerShell |
| `windows-pwsh` | PowerShell 7+（并列安装） | `%ProgramFiles%\PowerShell\7` 下或 PATH 上的 `pwsh.exe` |
| `cmd` | Windows 命令提示符 | Windows 上的 `cmd.exe` |
| `git-bash` | Git for Windows Bash | Git for Windows 安装与 PATH |
| `bash` | Unix Bash | macOS/Linux 上的 `/bin/bash`、`/usr/bin/bash` 或经批准的 PATH 条目 |

Windows 目录包含 `windows-powershell`、`windows-pwsh`、`cmd` 与 `git-bash`；
Unix 目录包含 `bash`。目录不接受任意的渲染进程或 sidecar 提供的可执行文件
路径。Windows PowerShell 5.1 保持平台默认；`windows-pwsh` 可选但绝不会被隐
式选中，因此选择它不会意外地改变现有用户的 shell。

设置写入只接受当前平台可用的 ID。未知、不可用与错误平台的 ID 被拒绝。如果
持久化的 ID 后来变得不可用，host-core 有意选择平台目录中第一个可用的 shell
并报告 `fallback: true`；如果都不可用，Bash 以 `SHELL_NOT_FOUND` 失败。

### 2. 持久默认值与稳定身份

宿主在应用设置中持久化一个 `defaultCommandShell` ID。只允许从可用目录中选
择，且只在受影响会话空闲时选择。轮次启动时，runtime 固定生效的 shell ID 与
方言。执行请求携带固定的 ID；host-core 在 spawn 之前再次解析目录，并以
`COMMAND_SHELL_CHANGED` 拒绝已改变的生效 ID 或方言。该身份校验针对的是目录
选择，而不是可执行文件路径哈希。runtime 回退在轮次固定之前选定；执行在该
点之后绝不静默更换 shell。

### 3. 稳定的 Bash 协议契约

Agent 工具与宿主方法保持为 `Bash` 与 `tools.execute`；shell 选择是请求上的
数据，而不是新的 `PowerShell`、`Cmd` 或 `GitBash` 工具名。命令以所选 shell
的文档化调用形式，在发起会话的 workspace 中非交互运行。

Host-core 把 stdout 与 stderr 作为分离的有序输出事件流式传输。最终工具结果
保持有界，并记录任一流是否被截断。任何流分块不得包含密钥，也不得归属于其
他会话/轮次。

### 4. 超时与取消

每次 Bash 执行有强制的 60 秒默认超时。调用方只能在 1 秒到 300 秒之间请求
经宿主校验的覆盖；缺失值恰好使用 60 秒，超出范围的值被拒绝。超时与用户中
止终止完整进程树，而不仅是 shell 领头进程：Unix 使用进程组，Windows 使用
作业/进程树边界。宿主等待关闭，关闭流，记录终结结果，并返回
`TOOL_TIMEOUT` 或 `TURN_ABORTED`，不留下孤儿进程。

## 后果

- 用户一次选择命令语言，即可跨会话与重启保留该默认值。
- 已改变的生效 shell 选择无法在过期假设下接收命令，而持久化的不可用偏好可
  通过有意的目录回退恢复。
- 流式传输让长命令可观测，而不削弱最终结果限制。
- 稳定的 Bash 协议避免了工具 schema 与兼容性路径的倍增。

## 已拒绝的备选方案

### 永远使用 Bash

已拒绝，因为它排除了原生 Windows 命令工作流，并让用户的 shell 偏好不可
见。

### 让调用方提供任意可执行文件路径

已拒绝，因为它绕过目录策略，并使身份校验与安全评审不可靠。

### 为每种 shell 创建一个协议工具

已拒绝，因为它破坏现有的 Bash skill，并在不增加权威的情况下扩大权限与审
计矩阵。

## 相关文档

- `docs/adr/0053-plan-checkpoint-artifact-and-execution-epoch.md`
- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/03-runtime/05-host-core-rust.md`
- `docs/spec/03-runtime/06-host-rpc-protocol.md`
- `docs/spec/03-runtime/07-process-model.md`
- `docs/spec/03-runtime/08-error-codes.md`
- `docs/spec/03-runtime/09-logging-and-observability.md`
- `docs/spec/03-runtime/16-tool-result-limits.md`
- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/04-ux/08-component-spec.md`
- `docs/spec/04-ux/09-interaction-patterns.md`
- `docs/spec/05-security/01-security.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D190)
