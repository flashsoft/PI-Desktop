# ADR 0209: PowerShell 7 作为可选的 Windows 命令 shell

- Status: Accepted (issue #151, merged in #191)
- Date: 2026-09-10
- Baseline: `0.14.6`
- Protocol: v11 (unchanged; additive catalog ID)
- Storage schema: v14 (unchanged; no migration)
- Decision: D381
- Amends: ADR 0054 §1 (Windows catalog table and Windows catalog list)
- Related: [03-runtime/03-tools-and-permissions.md](../spec/03-runtime/03-tools-and-permissions.md),
  [03-runtime/01-ipc-protocol.md](../spec/03-runtime/01-ipc-protocol.md),
  [03-runtime/06-host-rpc-protocol.md](../spec/03-runtime/06-host-rpc-protocol.md),
  [04-ux/06-settings-ia.md](../spec/04-ux/06-settings-ia.md),
  [05-security/01-security.md](../spec/05-security/01-security.md),
  [06-delivery/04-e2e-test-plan.md](../spec/06-delivery/04-e2e-test-plan.md) (E2E-112)

## Context

ADR 0054 冻结了由 `windows-powershell`、`cmd` 和 `git-bash` 组成的
Windows 目录。`windows-powershell` 条目解析的是系统自带的 Windows
PowerShell 5.1
（`%SystemRoot%\\System32\\WindowsPowerShell\\v1.0\\powershell.exe`）。

PowerShell 7（`pwsh.exe`）是一个独立产品，与 5.1 并排安装且从不取
代它。因此想要 PowerShell 7 的用户此前无从选择：目录没有暴露对应
条目，即使用户安装了 7，`Bash` 仍然启动 5.1。Issue #151 报告的正是
这个问题，代码库也证实了这一缺口——
`crates/host-core/src/tools/shell.rs` 中没有任何 `pwsh.exe` 解析路径，
`packages/shared/src/command-shells.ts` 只列出了四个稳定 ID。

## Decision

### 1. 第五个稳定 ID：`windows-pwsh`

Windows 目录新增 `windows-pwsh`（`PowerShell 7`），可以在设置中选
择，并像其他条目一样持久化在 `defaultCommandShell` 中。该 ID 是稳定
且按平台限定作用域的，并加入 `CommandShellId` 协议联合类型。

### 2. 解析顺序与失败指引

`windows-pwsh` 按以下顺序解析：

1. `%ProgramFiles%\\PowerShell\\7\\pwsh.exe`，即机器范围 MSI 或
   `winget --scope machine` 安装的落点。同时探测 `%ProgramW6432%`，
   使 64 位 Windows 上的 32 位宿主进程——此时 `ProgramFiles` 指向
   x86 目录树——仍然能找到真实的 64 位安装。
2. PATH 上的 `pwsh.exe`，覆盖 Store、用户范围和免安装便携安装。

这两个位置都无法靠猜测发现，因此未命中时返回 `SHELL_NOT_FOUND`，并
附带上指明两个搜索位置、指向安装 PowerShell 7 的指引。措辞存放在解
析器旁边的 `PWSH_MISSING_GUIDANCE` 中。

### 3. 一个共享的调用契约

PowerShell 7 接受与 5.1 相同的非交互标志（`-NoLogo
-NoProfile -NonInteractive -InputFormat Text -OutputFormat Text -Command`），
因此两个 ID 都保持 `powershell` 方言，并共享现有的固定脚本，包括
UTF-8 输出设置和 `$LASTEXITCODE` 传播。目录 ID 保持不同，使固定的
轮次身份、折叠的设置写入路径和 `COMMAND_SHELL_CHANGED` 仍能精确比
较。

### 4. 平台默认值不变

`windows-powershell` 仍然是全新 Windows 安装的默认值，保留
`is_default`，并继续作为 `defaultCommandShell` 未设置时的回退值。
绝不会为没有要求 PowerShell 7 的用户选择它：选择它是一个显式的设置
操作。

目录顺序仍然决定第一个可用的回退（ADR 0054 §1），而 `windows-pwsh`
直接位于系统自带条目之后，因此一个后来变得不可用的持久化
`windows-powershell` 现在会先解析到 `windows-pwsh`，然后才是
`cmd`。这遵循现有的回退规则而不是新增规则，而且它不可能改变命令语
言——两个条目共享 `powershell` 方言。在 Windows 上，系统自带的 5.1
条目实际上总是存在，因此正常安装下无法触达这次重排序；目录测试覆盖
顺序的两个步骤，使行为无论如何都被固定下来。

## Consequences

- Windows 用户可以在 PowerShell 7 下运行 agent 命令，同时 5.1 仍然
  作为独立的、仍是默认的选项可用。
- 协议增加了一个 ID，因此折叠的设置校验、目录 E2E 通道（E2E-112）、
  `scripts/e2e-plan.mjs` 和协议类型联合都要随之更新。不需要新的 RPC
  方法、新的工具名或存储迁移：未知 ID 与之前一样被拒绝，持久化的不
  可用 `windows-pwsh` 通过第一个可用回退恢复。
- 一项现有行为发生变化：持久化的 `windows-powershell` 变得不可用
  时，现在回退到 `windows-pwsh` 而不是 `cmd`，因为新条目在目录顺序
  中更靠前。方言不变，且该情形在正常 Windows 安装下不可达，但现有
  的目录测试被更新为固定顺序的两个步骤，而不仅仅是它的第一个结果。
- 没有安装 PowerShell 7 的机器上，该条目保持可见但不可用，与
  `git-bash` 已经在使用的呈现方式相同。

## Alternatives rejected

### 让 `windows-powershell` 在存在时优先使用 `pwsh.exe`

被拒绝：它会静默改变现有用户已经在运行的 shell，并使固定的轮次身份
在两个共享一种方言的不同可执行文件之间产生歧义。一旦安装了 7，它
也无法表达“使用 5.1”，而 ADR 0054 §1 通过冻结目录有意授予了这一
选择。

### 让用户配置任意的 `pwsh.exe` 路径

被拒绝：ADR 0054 已经拒绝了由渲染进程或 sidecar 提供的可执行文件路
径，因为目录策略和身份校验依赖封闭的 ID 集合。今后可以为非常规安
装添加 `PI_DESKTOP_*` 环境变量覆盖，但上述安装布局并不需要它，本
次变更有意不纳入。

### 添加 `PowerShell7` 工具名

被拒绝：ADR 0054 §3 保持 `Bash` 作为工具和协议名称，并把 shell 选
择视为请求数据。第二个工具名会放大权限和审计界面，而不增加任何权
限能力。
