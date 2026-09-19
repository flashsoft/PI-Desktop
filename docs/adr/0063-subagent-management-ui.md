# ADR 0063: 全局 Subagent 定义的管理界面

- 状态： 已接受（经 ADR 0112 修订）
- 日期： 2026-08-06
- 决策者： PI-Desktop 核心
- 相关： D202、ADR 0062（有界 subagent）、ADR 0112

## 背景

ADR 0062 发布 subagent 时没有渲染进程界面。用户只能把 Markdown 文档放到一
个实现相关的位置来创建个人委派，且发布的目录在设置中不可见。管理界面不得
写入被跟踪的项目文件，也不得静默引入与 runtime 契约不一致的项目级来源。

## 决策

### 1. 全局文档是唯一的用户管理 subagent 来源

用户持有的定义是以下位置的 Markdown 文件：

```text
~/.agents/subagents/<id>.md
```

没有项目级 subagent 目录。应用不为能力管理扫描或写入 `.pi/agents`。
`id == name` 仍是模型的 `Task` 句柄，重复名称被拒绝，runtime 的全局用户目
录与内置合并，没有项目能力层。

### 2. 激活是应用本地的

文档持有 prompt 元数据（`name`、`description`、`tools`、`model`、
`thinkingLevel` 与 `maxTurns`），但绝不持有 `enabled`。启用状态存储在
`<data>/agent-capabilities/subagents.json`。扫描全局文件夹会移除已删除文档
的状态，因此缺失的文件绝不会留下可见的待决行或孤儿覆盖。

### 3. 设置页仅全局

设置 > Agent > Subagents 是一个固定高度的全局列表。此界面没有项目选择器、
项目列或添加/导入操作。每行显示 frontmatter 摘要与本地启用开关；切换只写
入应用本地状态文件，并在下一次 runtime 目录加载时生效。

Skills 与 MCP 有独立的设置目的地，不是 Extensions 内的标签。Extensions 本
身只包含已安装与市场。

### 4. runtime 仍是事实来源

Electron 在下一个 prompt 向 `loadSubagentDefinitions` 提供全局用户文档。渲
染进程不重新实现目录优先级，也不虚构项目来源。内置与格式错误的文档由
runtime 加载器处理；管理列表就是扫描到的全局用户文档列表。

## 后果

- 个人委派跨项目跟随用户，不修改仓库。
- 需要仓库特定 prompt 的团队必须使用项目的正常指令机制；`.pi/agents` 不
  是能力来源。
- UI 可以显示并持久化本地启用状态，而不修改 Markdown 文件。
- 没有项目作用域的 subagent 开关，因此项目优先级只适用于 Skills 与 MCP。
