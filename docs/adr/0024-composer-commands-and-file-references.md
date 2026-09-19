# ADR 0024: Composer 斜杠命令和 @ 文件引用

- 状态: 已接受
- 日期: 2026-07-27
- 决策者: PI-Desktop 核心团队
- 相关: D123, D124, D125, D197, D209, D250, ADR 0019（工作面板子系统）、ADR 0059（剪贴板文件粘贴）、ADR 0070（紧凑引用显示）、ADR 0106（核心五个内置命令）、D114（scratch 目录）、D119（transcript 文件存储）

## 背景

Composer 目前是一个纯 textarea。命令面板（Cmd/Ctrl+Shift+P）承载
应用命令，但聊天输入本身没有就地命令系统，也没有引用 workspace
文件的方式，spec 08 §11.7 明确把两者都裁出了范围。内嵌的 pi 运行时
（`@earendil-works/pi-agent-core` 0.82）为其 CLI 原生定义了这两个
概念：

- **Prompt templates**：位于 `<workspace>/.pi/prompts/` 和
  `~/.pi/agent/prompts/` 的 markdown 文件，带 `description` /
  `argument-hint` frontmatter。`/name args` 在客户端展开
  （`parseCommandArgs` + `substituteArgs`：`$1..$n`、`$@`、
  `$ARGUMENTS`、`${@:N:L}`）并作为普通用户消息发送——模型永远
  看不到斜杠形式。
- **`@path` 引用**：提示中的字面文本；模型随后用它的 Read 工具
  跟进。没有内联，也没有附件转换。
- pi 的内置斜杠命令（`/new`、`/model` 等）是其 TUI 的客户端行为，
  不是运行时特性。

PI-Desktop 使用底层的 `Agent` 类（而非 `AgentHarness`），所以这些
在桌面端目前都不活跃，但加载/展开辅助函数已由安装的包导出，可以
直接复用。

## 决策

1. **斜杠命令来自三个来源**，合并到一个 composer 菜单中：pi prompt
   templates（名称冲突时项目目录覆盖用户全局）、内置命令面板注册表
   （在 `electron/main/builtin-commands.ts` 中定义的斜杠别名，由现有
   的渲染进程侧 switch 执行），以及插件面板命令（通过
   `commandPalette/execute` 执行）。内置注册表有意限制为 ADR 0106
   定义的五个核心条目。未知的 `/foo` 作为字面文本发送（与 pi CLI
   一致）。
2. **模板展开发生在 Electron 主进程的 `agent/prompt` 处理器中，
   在持久化之前。** 持久化的用户消息存储 `content = 展开后的文本`
   加上一个新的可选 `command` 字段，保存键入的调用形式
   （`/name args`）。Agent 重新播种回放 `content`，因此模型上下文
   跨重启保持一致；transcript 把 `command` 字段渲染为紧凑的 chip。
   宿主存储已经容忍额外的消息字段（revision* 先例）。
3. **`@path` 在提示派发时保持纯文本的轻引用**，与 pi CLI 完全一致。
   Composer 提供模糊自动补全；接受目录时插入 `@dir/` 以便补全继续，
   完成的文件在 ADR 0070 下变为渲染进程拥有的紧凑引用。派发前这些
   引用序列化为 `@relative/path `（路径含空格时为带引号的
   `@\"a b.txt\"`）。Plan 和 Agent 都携带 Read/Glob/Grep，所以引用在
   两种模式下都有效。没有内容内联，也没有二进制内容进入提示。OS
   剪贴板文件/图像粘贴由 ADR 0059 物化为 session-scratch 文件引用；
   它不使用 pi-ai 的 `ImageContent`，也不改变纯文本提示契约。
4. **Workspace 文件索引由 Electron 主进程提供**，而不是 agent 工具——
   理由与 ADR 0019 相同：用户发起的浏览不得刷权限提示或审计轨迹。
   新的只读通道 `pi-desktop/fs/index` 返回至多 8000 条以 workspace
   为根的条目（`git ls-files -co --exclude-standard` 快速路径，
   ignore 集合遍历回退，短 TTL 缓存）；`pi-desktop/composer/commands`
   返回合并后的命令列表。两者在没有 workspace 时都软失败。这些
   仅 Electron 的通道不改变宿主 RPC 协议版本。

## 考虑过的备选方案

- **在 agent sidecar 中展开模板**：让 pi 导入集中在一处，但主进程
  先持久化用户消息，sidecar 没有第二条写入路径就无法影响重新播种
  回放的内容。否决。
- **为 `promptFromTemplate` 把运行时迁移到 `AgentHarness`**：为一个
  特性替换整个 prompt/loop 集成。暂时否决；独立的辅助函数提供相同
  语义。
- **把被引用文件的内容内联进提示**（pi CLI 参数模式行为）：会使
  上下文膨胀，需要截断规则和二进制附件通道。否决——Read 工具的
  轻引用是 pi 的交互语义，且零成本。
- **从渲染进程递归复用 `fs/list`**：每层目录一次 IPC 往返会让模糊
  搜索迟钝且啰嗦。否决。

## 后果

- Composer 获得键盘优先的自动补全界面（D125 定义交互/IME 契约——
  项目中第一个显式的 IME spec）。
- `.pi/prompts` 模板成为 pi CLI 和 PI-Desktop 之间的共享资产。
- Transcript 用户消息 schema 获得可选的 `command` 字段；忽略它的
  渲染方继续工作。
- 内联二进制附件和预览磁贴仍然推迟。紧凑的文本引用 chip 在
  ADR 0070 下是仅限渲染进程的草稿状态；剪贴板文件/图像仍按
  ADR 0059 的定义使用 session-scratch `@` 引用。
