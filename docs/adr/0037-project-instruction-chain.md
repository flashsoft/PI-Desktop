# ADR 0037: 在 Electron 主进程中解析项目指令

- 状态: 已接受
- 日期: 2026-07-30
- 相关: [Agent runtime](../spec/03-runtime/02-agent-runtime.md)

## 背景

PI-Desktop 最初只在运行时创建时加载 `<project root>/AGENTS.md`。这
遗漏了 monorepo 中目录特定的规则，也没有为使用 `CLAUDE.md` 的项目
提供兼容路径。让模型驱动的 agent sidecar 扫描 workspace 会削弱现有
边界——该边界把 workspace 文件访问保留在 Electron 主进程和
host-core 中。

## 决策

1. Electron 主进程只在会话绑定的项目根目录内解析指令；它绝不跟随
   规范路径逃逸出该根目录的指令文件。
2. 全局文件 `~/.pi/agent/AGENTS.md` 在所有项目条目之前加载。Settings
   管理这个固定路径。项目的 `AGENTS.md` 从 Projects 视图中该项目的
   列表菜单操作管理；专用 IPC 只接受 host-core 注册的项目根目录，
   绝不接受任意文件路径。
3. 对于每个项目目录，第一个非空候选按此顺序胜出：
   `AGENTS.override.md`、`AGENTS.md`、`CLAUDE.md`、
   `.claude/CLAUDE.md`。
4. 各来源从根目录到目标目录拼接，上限为 32 KiB 的 UTF-8 内容。更靠
   后、更接近的条目优先，每个来源在提示中都有标注。
5. 根目录链条在运行时创建时加载。在文件路径工具执行之前，sidecar
   可以通过 Electron 拥有的 `project.instructions.resolve` 本地代理
   请求路径特定的链条。sidecar 不直接读取指令文件。
6. Electron 主进程把会话绑定的项目根目录随运行时启动元数据传递，
   并在每次提示或压缩请求之前注册它。本地代理针对这个主进程拥有的
   绑定解析目标路径，而不是发出逐文件的 `session.get` RPC。sidecar
   仅为当前提示缓存每个项目根目录/目标目录对的一次解析声明。

## 后果

- 仓库级规则无需递归 workspace 扫描即可加载。
- 全局默认值无需项目即可编辑；项目指令保持可在仓库根目录审查和
  版本化。
- 嵌套规则只有当 agent 访问匹配路径时才可用。每个文件工具把活跃
  链条替换为该目标的完整链条，防止兄弟目录规则泄漏到后续工具调用。
- 路径特定解析是尽力而为的，上限两秒。如果解析器或其宿主 RPC 不
  可用，工具回退到基础链条，而不是等待通用宿主 RPC 截止时间。
- 路径预检记录自己的时长和缓存/回退标记，使 `hostRttMs` 继续描述
  实际的宿主工具调用。
- 根目录指令变更会在下一次提示时重建空闲的运行时。嵌套规则为将来
  的文件路径工具调用重新解析。
- 这个私有的 sidecar 代理保持受约束：只能是 Electron 主进程针对该
  会话项目根目录校验过的会话 id 和路径。

## 备选方案

### 启动时加载每个嵌套指令文件

否决。大型 monorepo 可能注入无关规则，并在任务识别出相关目录之前
就消耗模型上下文。

### 让 sidecar 扫描 workspace

否决。sidecar 执行模型指示的路径。Workspace 发现保留在 Electron
主进程中，使现有收容边界保持显式。
