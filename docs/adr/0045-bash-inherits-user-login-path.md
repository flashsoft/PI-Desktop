# ADR 0045: Bash 工具继承用户登录 shell 的 PATH

- 状态： 已接受
- 日期： 2026-08-02
- 相关： [D084](../spec/08-meta/decisions-log.md) ·
  [工具与权限](../spec/03-runtime/03-tools-and-permissions.md)

## 背景

Bash 工具通过 `bash -lc` 运行 agent 命令（D084）。登录 bash 只 source bash
profile，因此在 macOS 上——默认 shell 是 zsh，而 nvm、pnpm、Homebrew 等工具
链在 `~/.zshrc` / `~/.zprofile` 中初始化——命令无法解析 `node`、`npm`、
`pnpm` 或任何仅由用户自己的 shell 导出的东西。从 Finder/Dock 启动应用会进一
步把环境缩小为最小化的 GUI PATH。

## 决策

1. 在 Unix 上，第一次 Bash 调用探测用户登录 shell 的 PATH：`$SHELL`（回退
   `/bin/zsh` → `/bin/bash` → `/bin/sh`）运行
   `-lic 'printf %s \"$PATH\"'` —— `-l` source 登录文件，`-i` source 交互式
   rc ——并设 5s 上限，使卡死的 rc 无法拖住工具。只保留 stdout 的最后一行，
   因此 rc 横幅不会污染它；stderr 被丢弃（缺少 tty/作业控制的噪音）。
2. 探测到的 PATH 按进程缓存（`OnceLock`），并通过 `cmd.env(\"PATH\", ...)`
   注入到每个 Bash 子进程中。
3. 探测严格是尽力而为的：失败时（没有 `$SHELL`、不可执行、非零退出、超时）
   原样使用宿主 PATH。Windows 保持 `bash -c` 与宿主环境（不变）。
4. agent 命令仍是 POSIX bash；只有子进程环境的 `PATH` 被丰富。解析出的 bash
   二进制本身不变。

## 后果

- `node`/`npm`/`pnpm`、Homebrew 工具链以及其他登录 shell 导出物可以在 Bash
  工具调用中解析，与全新终端提供的一致。
- `bash -lc` 仍会在启动时重跑 bash profile；conda/brew 钩子可能前插、去重或
  重排条目——注入的登录 PATH 仍是用户 bash profile 构建的基础。
- 每个进程生命周期内一次有界子进程（探测）是全部开销；之后每次 Bash 调用只
  读缓存。
- 缓慢或仅交互可用的用户 rc 会优雅降级到之前的行为，而不是让工具失败。

## 已拒绝的备选方案

- **在 `$SHELL` 而非 bash 中运行命令：** 破坏 D084 中"agent 命令是 POSIX
  bash"的契约；zsh 的差异（`$path` 数组、echo/glob 语义）会静默地分叉行为。
- **从包装命令 source rc 文件：** 脆弱——命令行必须为每种 shell 的 rc 语法
  做特例处理，且注入的前缀会出现在每个结果中。
- **在宿主中内置默认 PATH：** 无法知道用户的工具链；等于变相复制了 Finder
  启动问题。
