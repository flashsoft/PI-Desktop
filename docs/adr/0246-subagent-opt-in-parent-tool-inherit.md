# ADR 0246：子 Agent 可选继承父级工具目录

- Status: Accepted
- Date: 2026-09-14
- Deciders: PI-Desktop core
- Related: ADR 0062, ADR 0089, ADR 0100, D201, D415, issue #215, PR #319

## 背景

ADR 0062 使子 Agent 成为有边界的 worker：它只能从
`SUBAGENT_ASSIGNABLE_TOOLS`（Read、Glob、Grep、BrowserPreview、Bash、
Edit、Write）接收工具。插件工具、`Skill`、`ToolSearch`、模式工具和
`Task` 被有意地排除在外，使定义仍是读者可以看到委派者能做什么的地方。

Permission mode（`permission: inherit`）和 session 模型（空 `model` 钉住）
已经跟随父级。工具能力则没有。一个已加载 `Skill`、MCP 或插件工具的父级
无法把其中任何能力交给它刚派生的 worker。保留在今天白名单上的内置项
（explorer、code-reviewer）仍是正确的默认值；而*应该*共享父级目录的
用户自定义 worker 没有可选的 opt-in。

总是继承会使每次委派都像 session 本身一样危险。仅把 `Skill` 放入可分配
列表仍会让 MCP 和插件工具成为第二个目录。

## 决策

1. Frontmatter 可以让定义选择加入父级工具继承：

   ```yaml
   tools: inherit
   # or
   tools: [inherit, Bash]
   ```

   `inherit` 设置 `SubagentDefinition.inheritTools`。额外的名称仍必须在
   `SUBAGENT_ASSIGNABLE_TOOLS` 上。内置项不选择加入。

2. 在 `Task` 派生时，`resolveSubagentToolNames` 将会话运行时的
   **活跃 `toolCatalog` 键**（包括父级被允许调用的延迟插件/MCP 工具）
   与任何声明的额外项求并集，然后丢弃 `SUBAGENT_INHERIT_DENY_TOOLS`：

   | 绝不继承 | 原因 |
   |---|---|
   | `Task` / `TaskWait` / `TaskList` / `TaskStop` | 不允许嵌套扇出 |
   | `EnterPlanMode` / `EnterGoalMode` | 模式保持父级的 |
   | `asktool` | 委派者没有用户 |
   | `new_context` | 压缩是父级运行时的标志 |
   | `ToolSearch` | 会在父级目录上激活延迟工具 |

   子级在没有 `ToolSearch` 的情况下接收完整的允许目录。继承强于父级
   首个请求的活跃集合；这正是把 Skill/MCP/插件工具交给 worker 的意义。

3. 派生时解析的名称驱动委派工具列表、变更框架、search/edit/Bash 指引，
   以及——当 `Skill` 存在时——父级已经收到的同一个 `# Skills` 目录。
   Task 目录打印 `inherit`（加上额外项），而不是倾倒每个 MCP 名称。

4. host-core 的用户子 Agent 扫描器在 `tools` 中保留 `inherit` token，
   使单独的 `tools: inherit` 仍出现在 `agents.active` 中，并能通过
   Settings 往返。编辑器暴露一个 inherit 复选框；保存绝不能剥离该
   token。

5. 省略 `tools` 的默认文档保持只读（`Read, Glob, Grep`）。`tools: "*"`
   仍表示七个可分配工具，而不是会话目录。除非定义选择加入 inherit，
   否则会话不能把变更能力借给一个只读委派者。

本决策修订 ADR 0062 §2 和被拒绝的替代方案「让委派者继承父级工具」：
继承现在是带拒绝列表的显式文档 opt-in，而不是静默的会话等同。

## 后果

- 用户自有的 worker 可以调用父级已有的 Skill/MCP/插件工具，而不会把
  explorer 变成嵌套 Agent。
- 继承 Bash/Edit/Write 就是继承变更能力。Permission mode 和外部路径
  闸门不变；`permission: inherit` 仍跟随会话。
- 定义仍是可读的授权：`tools: inherit` 在 Markdown 和 Settings 中可见。
- 子级的 `ToolSearch` / `new_context` 无法改变父级运行时状态。

## 已考虑的替代方案

- **用户 Agent 总是继承，内置项绝不继承。** 作为隐藏默认值被拒绝。
  Markdown opt-in 与 `permission: inherit` 形态相同。
- **仅继承当前活跃的工具。** 被拒绝，因为 MCP/插件工具延迟在
  `ToolSearch` 之后；worker 仍会缺少 issue 要求的目录，而继承
  `ToolSearch` 会在父级上激活工具。
- **只把 `Skill` 加入 `SUBAGENT_ASSIGNABLE_TOOLS`。** 被拒绝：没有
  MCP/插件工具，仍是第二个目录。
