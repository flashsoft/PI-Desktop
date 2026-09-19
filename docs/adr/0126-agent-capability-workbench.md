# ADR 0126: Agent 能力页面是一个可以创作的工作台

- Status: Accepted
- Date: 2026-08-27
- Related: ADR 0063, ADR 0112, D193, D194, D202
- Baseline: `0.10.8`

## 背景

`d24e1ee0` 把 Skills、MCP 和 Subagents 从 Extensions 移到了
Settings > Agent。这次移动带上了列表和启用开关，但顺手删掉了
`SkillEditorSheet.tsx` 和 `SubagentEditorSheet.tsx`。宿主侧从未被
缩减：`skills.create`、`skills.update`、`skills.remove`、
`skills.read`、`skills.reveal`、`subagents.create`、`subagents.update`、
`subagents.remove` 和 `mcp.remove` 都仍然通过 `api.ts` 和
`rpc/mod.rs` 端到端解析。只是渲染进程不再调用它们。

页面被留下的形态带来了三个问题：

1. **层级是结构，而不是过滤器。** 每个页面堆叠一个 Global 卡片块和
   一个 Project 卡片块，各自带有自己的标题、自己的解析路径、自己的
   计数和自己的操作。一个只有四个 skill 的页面把大部分高度花在两个
   标题上，而项目选择器只能在第二个块内部、第一个列表下方才能触达。
2. **一个待完成的请求锁住整个页面。** 行以 `busy={loading || busyKey
   !== null}` 和 `disabled={loading || busyKey !== null}` 渲染，因此
   切换任何一个能力会禁用页面上的每个控件，包括无关层级的行。
3. **一次切换会闪出骨架屏。** `toggle()` 成功时会 await `load()`，
   而 `load()` 无条件设置 `loading`，因此一次开关会把整个列表替换
   为骨架行然后再重建。

这些合在一起让页面读起来是能力被罗列的地方，而不是能力被管理的
地方。D202 还把 Subagents 页面冻结为"一个固定高度的全局列表"，
把只读形态写进了决策日志。

## 决策

1. **每个页面一个工作台。** Skills、MCP 和 Subagents 各自在一个抬升
   面板上方渲染一个工具栏。工具栏持有：以分段控件形式呈现、带实时
   计数的层级过滤器，一个搜索框，项目选择器，以及页面的主要操作。
   层级变成一个列表之上的过滤器，而不是一对分区；在面板内部，每个
   层级是一个分组标题行（层级名、解析出的 `.agents` 路径、计数）
   后跟其行。每行还带自己的层级徽标，因此滚离分组标题的行仍能说明
   它属于哪里。
2. **页面可以创作。** 创建、编辑和删除为全部三种能力回归 Settings，
   通过恢复的编辑器面板和早已存在的宿主调用实现。新能力落在过滤器
   所指向的层级，主要操作的 tooltip 会指明该目的地。破坏性行操作
   位于每行的溢出菜单中，并在触发前先进入预备状态：第一次按下会把
   该项重新标注为请求确认，预备状态会在几秒后或菜单关闭时自动失效。
   这仅在 Subagents 页面的呈现上覆盖 D202 的"一个固定高度的全局
   列表、没有项目选择器"；subagent 仍然仅限全局，这正是该页面没有
   层级过滤器和项目选择器的原因。
3. **忙碌按行计算，刷新不是首绘。** 只有存在进行中请求的行处于忙碌
   状态；页面其余部分保持可交互。页面记录自己是否已经完成过首次
   水合：骨架屏只在首绘时渲染，之后的每次加载保留屏幕上已有的行，
   在将刷新告知辅助技术的同时使列表变暗。
4. **启用状态是乐观的。** 开关先在本地翻转，宿主调用随后进行，只有
   宿主拒绝时才恢复之前的位置。成功不需要重新加载，因为本地补丁已经
   与宿主所做的操作一致——这既消除了骨架屏闪烁，也省去了每次切换
   的一次往返。
5. **`skills.reveal` 接受层级。** `revealUserSkill` 和
   `IPC.invoke.skillReveal` 处理器现在接受 `{ id, level?, projectPath?
   }` 并转发给 `skills.read`，后者一直都能解析这两个字段。处理器仍
   接受裸 id 字符串，因此没有调用方会被破坏。

## 后果

- 能力的读取和管理发生在同一个地方，Settings 页面不再依赖
  Extensions 来完成宿主早已支持的创作。
- 显示（reveal）项目级 skill 会打开该项目的文件。此前只发送 id，
  因此一个没有同 id 全局对应物的项目 skill 无法被解析。
- D202 冻结的页面形态在呈现层面被取代。它设定的数据边界——
  `~/.agents/subagents` 下仅限全局的文档、启用状态存于
  `<data>/agent-capabilities/subagents.json`、不写入 Markdown——
  保持不变。
- `maxTurns` 在 Subagents 编辑器中可表达为"无限制"。该字段旧的
  渲染进程默认值（24）来自 `f8868b81` 移除的
  `DEFAULT_SUBAGENT_MAX_TURNS` 常量；解析器现在把缺失的 `maxTurns`
  视为不限制，`UserSubagentInput` 把 `0` 视为清除覆盖，因此编辑器
  将该字段留空，而不是施加一个手写文档本来不会有的上限。
- 除 `skillReveal` 载荷拓宽外，该改动仅限渲染进程。没有 host-core
  变更，没有新 RPC，没有存储或 schema 变更。
