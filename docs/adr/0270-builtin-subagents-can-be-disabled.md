# ADR 0270：内置子 Agent 可以被关闭

- Status: Accepted
- Date: 2026-09-17
- Related: D202, ADR 0062, ADR 0063, ADR 0112, ADR 0126

## 背景

Settings > Agent > Subagents 列出两组：五个随附的内置项（`explorer`、
`code-reviewer`、`test-runner`、`fixer`、`ui-designer`）和用户自己的
`~/.agents/subagents/*.md` 文档。只有用户组有启用开关，因为只有那些记录
是文件：内置项是 `packages/agent-runtime` 中的常量，而 ADR 0063 §2 把激
活绑定到会为已删除文件修剪状态的文档扫描。

这留下了一个用户无法关闭的委派者。唯一的途径是把内置项复制到
`~/.agents/subagents`，禁用副本——但随附的定义仍会到达目录，因为被禁
用的用户文档在加载器合并之前就被过滤掉，因此副本遮蔽不了任何东西。关
闭一个指令会引导向它的委派者（可能写文件的 `fixer`、可能运行命令的
`test-runner`）完全没有受支持的路径。

## 决策

1. **没有文档的句柄的激活状态住在自己的应用本地文件中。** host-core
   把被关闭的内置句柄存储在
   `<data>/agent-capabilities/subagent-builtins.json`，在全局级别以
   `Task` 句柄为键。它刻意不是 `subagents.json`：用户文档扫描会修剪它
   再也看不到的 id 的状态，内置项从不被扫描，因此共享文件会在下一次
   扫描时丢弃每个内置排除项。
2. **两个 RPC 拥有该状态。** `agents.disabledBuiltins` 读取被关闭的句
   柄（已排序），`agents.setBuiltinEnabled(id, enabled)` 写入一个并回
   显规范化的句柄。当前没有内置项使用的句柄被惰性地存储而不是被拒
   绝：host-core 不随附内置列表，陈旧条目没有代价。
3. **目录携带开关，而不是文档。** Electron main 把被禁用的句柄提供给
   `loadSubagentDefinitions`，后者把它们从 `definitions`——`Task` 可
   提供的内容——中丢弃，并在同级 `builtins` 字段中返回仍赢得其句柄
   的每个内置项（包括被关闭的），使 Settings 能渲染该行及其开关。
   `subagent/catalog` 以两个列表应答。
4. **关闭内置项不是删除它。** 同句柄的用户文档继续工作并继续遮蔽随
   附的定义，重新打开内置项不需要文档，因为没有任何东西被移除。

## 后果

- Built-in 组获得用户行已有的开关，在同一位置、以相同的乐观翻转。
  Reveal 和 delete 保持缺席：仍然没有文件。
- 被关闭的内置项保持列出并变暗，这是重新打开的唯一途径。
- Session 启动和 Settings 目录读取同一状态，因此页面显示 `Task` 所提
  供的内容——E2E-SUBAGENT-settings-lists-builtin-defaults 断言的性质。
- 不可用的宿主不贡献任何排除项：不可读的状态文件会提供用户已关闭的
  委派者，而不是移除他们保留的委派者。
- 不写入任何 Markdown 文件，不出现项目能力层，`~/.agents/subagents`
  保持为唯一的用户管理的子 Agent 来源（ADR 0063 §1、ADR 0112 §1）。

## 替代方案

- **`~/.agents/subagents` 中的墓碑文档。** 关闭内置项会写入用户从未要
  求的文件，出现在 Global 组中，并把一键开关变成可见的文件系统状态。
- **把状态保留在 `agent-capabilities/subagents.json`。** 写起来最便宜，
  但防止已删除文档留下孤儿行的扫描时修剪，会在内置排除项写入的同一
  时刻删除它。
