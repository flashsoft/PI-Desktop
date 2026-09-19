# ADR 0112: Agent 能力管理根目录与设置 IA

- Status: Accepted
- Date: 2026-08-20
- Deciders: PI-Desktop core
- Supersedes the capability-storage and capability-IA portions of ADR 0056,
  ADR 0058, and ADR 0063; updates D193, D194, and D202

## 背景

MCP 服务器、技能和子代理定义此前被描述为应用数据目录下的注册
表，且扩展页面逐渐包含了它们的管理界面。该模型使能力文件难以在
安装之间携带，把配置与应用本地激活状态混在一起，并让扩展页面负
责互不相关的编写流程。它还让若干文档引用着 `.pi/` 能力目录。

## 决策

### 1. `.agents` 是唯一的能力文件根

宿主只扫描和写入这些目录：

```text
~/.agents/skills                 global skills
<project>/.agents/skills         project skills
~/.agents/servers                global MCP configuration
<project>/.agents/servers        project MCP configuration
~/.agents/subagents              global subagent definitions
```

没有项目级子代理目录。`.pi/agents`、`.pi/skills` 和 `.pi/mcp` 不
是能力来源；无关的 `.pi/prompts` 存储不变。

技能是 Markdown 文档。其 `name` 和 `description` frontmatter 被扫
描进目录，而正文留在磁盘上，直到 `Skill` 工具需要它。MCP 服务器
是每个 id 一个 JSON 文件。子代理是 Markdown 文档，其 frontmatter
由运行时消费。

### 2. 文件所有权和激活状态是分开的

能力文档绝不包含 `enabled` 或项目覆盖。host-core 把应用本地状态
存储在：

```text
<data>/agent-capabilities/skills.json
<data>/agent-capabilities/mcp.json
<data>/agent-capabilities/subagents.json
```

全局能力默认启用，并可有按项目的覆盖。项目能力拥有其所属项目的
状态。扫描目录会清理不再存在的文件的状态；移除全局文件会移除它
的所有项目覆盖，而项目扫描只移除该项目的孤立条目。

### 3. 项目优先级在过滤之前解析

对活动运行时，项目记录按 id 或不区分大小写的显示名称遮蔽全局记
录。即使项目记录的本地状态是禁用，项目记录也获胜；只有在遮蔽之
后宿主才过滤被禁用的记录。这防止被禁用的项目定义使全局定义重新
可见。

### 4. 管理位于设置 > Agent 之下

Skills、MCP 和 Subagents 是三个独立的设置目的地，而不是标签页。
Skills 和 MCP 使用固定高度的全局/项目列；其项目列有一个最近项
目选择器。Subagents 使用一个全局列，没有项目选择器。扩展目的地
只保留"已安装"和"市场"标签页。

Skills 在每列暴露一个单文件原生导入动作，并把选中的文档物理复
制到该列的 `.agents/skills` 目录。MCP 的创建和编辑复用
`McpEditorSheet`；编辑时锁定 id，校验与宿主共享，同级的 id 或标
签重复会被拒绝。测试已保存的 MCP 连接会在编辑器和 toast 中报告
结果。

### 5. 协议查询是显式的

能力列表、读取、移除、导入和启用调用携带 `level`，并在需要时携
带 `projectPath`。没有 `projectPath` 的项目级请求是无效的。运行
时激活使用所选项目的合并 `mcp.active` 和 `skills.active` 结果；
子代理激活仅全局。

## 后果

- 能力文件可携带、可检查，并可安全分享，而不会复制应用本地的启
  用决策。
- 项目可以覆盖或禁用全局能力，而不改变全局文件。
- 设置 IA 变大了，但扩展是聚焦的插件/市场界面，且每个能力页面
  可以暴露自己的操作。
- 现有的插件激活作用域保持不变；它们不被文件级能力页面复用。
- 宿主在需要时把兼容形态的遗留作用域 RPC 字段保留为空操作输
  入，但新的 UI 状态由 level 和本地状态表示。
