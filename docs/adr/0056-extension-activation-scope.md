# ADR 0056: 用户持有的 MCP 服务器与 skill，以及共享的激活作用域

- 状态： 已接受（能力存储与 UI 部分已被 ADR 0112 取代）
- 日期： 2026-08-05

## 背景

到目前为止，给 PI-Desktop 添加 MCP 服务器或 skill 的唯一方式是编写插件。
ADR 0038 给了插件一个 `mcp` 贡献点，由 Electron 主进程通过 stdio 或 HTTP 桥
接；ADR 0039（经 D174 修订）给了它们一个 `skills` 贡献点，在 `Skill` 工具
之后发布模型调用的目录条目。两者都可行，但都与用户真正想做的事情形态不
符：

- 市面上的每个 MCP 服务器都以 JSON 片段分发——README 中的一个
  `mcpServers` 块。为了运行三行 JSON 而要求用户编写 manifest、打包并签名，
  是包了一层空壳。
- 一个 skill 就是一份 Markdown 文档。插件路径让最小的扩展背上最大的信封。

第二个缺口是可达范围。`enabled` 是每个插件一个布尔值，所以插件要么处处开
启要么处处关闭。一个既有工作 monorepo 又有个人项目的用户，拥有只属于其中
某一个的扩展：Jira MCP 服务器不该出现在关于副项目的会话里，而它的工具描
述仍在那里每一轮消耗上下文。变通办法——切换项目时手动切换扩展——既繁
琐又容易遗忘，而遗忘会让模型尝试调用仍可见的工具。

## 决策

### 1. 三种扩展共用一种激活形态

`packages/shared/src/activation.ts` 定义
`ActivationScope = { mode: "global" | "projects"; projects: string[] }`，
与 `enabled: boolean` **并列**存储，而不是编码进其中。插件、用户 MCP 服
务器与用户 skill 都携带这一对字段，因此一个控件渲染三者，一个谓词过滤三
者。

UI 显示的三态控件（`off` / `projects` / `global`）由 `activationState` 推
导，而非存储。保持 `enabled` 独立才能让用户把扩展收窄到两个项目、关闭它、
再打开它而无需重新挑选项目。

`isActiveInProject` 是唯一的匹配规则：

- 路径比较忽略大小写与结尾分隔符，因为 macOS 和 Windows 都会把同一目录以
  大小写不同的拼写交给我们，而一个静默停止匹配的作用域读起来就是 bug。
- 作用域路径也匹配其子目录，因此把作用域设为 monorepo 根可以覆盖在其内
  部包上打开的会话。
- `projects` 模式的扩展在完全没有项目的会话中是**不活跃**的。"这些项目"
  是关于项目的陈述；没有 workspace 的会话不在其中。
- 缺失或无法识别的作用域解析为 global，这正是本次变更之前安装的每个扩展
  的行为。

`normalizeProjectPath` 镜像 host-core 的 `normalize_project_path`，因此在选
择器中选定的路径与记录在 `projects` 表中的路径比较相等。

### 2. 作用域在目录组装**与**分发两处执行

只过滤目录是不够的：会话比列出其工具的 prompt 活得久，因此在会话中途重新
设定扩展作用域必须立即生效。每个界面都检查两次：

- 插件工具、skill 与命令：`pluginActiveInProject` 过滤逐轮目录，并在
  `tools.execute`、命令面板与命令执行中重新检查。
- 用户 MCP 工具：`UserMcpRuntime.toolsForProject` 过滤，且 `callTool` 在记
  录不再适用时以 `TOOL_NOT_FOUND` 和 "not active for this session" 拒绝。
- 用户 skill：`skills.active` 过滤，且 `loadUserSkillBody` 重新读取记录，
  在作用域已收窄时抛出异常。

主题刻意**不做**作用域：外观是应用级偏好，不是按项目的能力。

存在两个不同的"当前项目"，且不可互换。面向 agent 的界面按**会话的**
`projectPath` 过滤；面向应用的界面（面板、命令、扩展页）按**活动窗口的**
项目过滤。

### 3. 用户 MCP 服务器是 host-core 注册表，不是插件

`crates/host-core/src/mcp_servers.rs` 持有一个 `McpServerRecord` JSON 文件，
位于 `~/.agents/servers` 或 `<project>/.agents/servers`，没有插件包装。激
活状态是应用本地的，位于 `<data>/agent-capabilities/mcp.json`。层级感知的
RPC 是 `mcp.list`、`mcp.active`、`mcp.upsert`、`mcp.remove` 与
`mcp.setEnabled`；遗留的作用域形态输入是兼容字段。

Electron 主进程在 `UserMcpRuntime` 中持有进程与套接字，复用插件桥中的
`McpServerClient` 而不是另写一个客户端：

- 服务器在第一个能看到它的会话组装时连接，其工具列表被缓存，因此同一项目
  上的第二个会话没有成本。
- 握手失败的服务器保持失败状态，直到用户编辑它或按下 Test，因此会话组装
  永远不会付两次连接超时。
- 保存改变了**服务器是什么**的编辑（transport、command、args、env、url、
  headers）会断开连接；改变标签、描述或作用域则不会。过期的工具列表比缺
  失的更糟。
- 活跃进程上限为 16，与应用已有的按所有者资源上限同宽；超限的服务器被记
  录并跳过，而不是排队。
- 每个服务器保留插件桥自己的每服务器 64 个工具上限。

工具名加 `mcp_` 前缀（`userMcpToolName`），与插件桥的 `plugin_` 区分，因
此两个命名空间不会冲突，审计行也能说明哪个注册表服务了这次调用。

`commandPolicy` 为 `trusted`，子进程 cwd 是用户主目录：没有插件持有该服务
器，所以没有插件根可以把沙箱套上去，而用户输入的命令是他们自己的。

### 4. 粘贴 `mcpServers` 块是主要添加方式

`packages/shared` 中的 `parseMcpImport` 接受用户剪贴板上真正有的东西：
`mcpServers` 文档、`servers` 拼写、裸映射，或单个服务器对象。它从 `url`
的存在推断 `http`，因为市面上一半的配置省略 `type`；强制转换非字符串的
env 与 header 值；丢弃非字符串 args；尊重 `disabled: true`；并把一次导入
限制在 32 个服务器。

格式错误的条目是**报告，而非致命**——导入返回它理解的内容加上逐条说明
跳过原因，因为一次 15 个服务器的粘贴里有一条坏条目不该全有或全无。

### 5. 用户 skill 每个就是一份 Markdown 文档

`crates/host-core/src/user_skills.rs` 扫描 `~/.agents/skills` 或
`<project>/.agents/skills` 下的 Markdown 文档。激活状态是应用本地的，位于
`<data>/agent-capabilities/skills.json`；skill 文档中不写入注册表或 enabled
字段。RPC：`skills.list`、`skills.active`、`skills.create`、
`skills.import`、`skills.update`、`skills.read`、`skills.remove` 与
`skills.setEnabled`。

交付契约保持 D174 的不变：描述进入 prompt，正文只在模型调用 `Skill` 时获
取，且文档以 128 KiB 封顶。这就是编辑器要求描述并把它置于正文之上的原
因——描述是必须挣回其上下文成本的部分，也是在模型询问之前它唯一能看到
的部分。

用户 skill id 是裸的；插件 skill id 包含 `/`。`loadUserSkillBody` 拒绝任何
带 `/` 的 id 并回退到插件目录，因此两个命名空间无需注册表查询即可分离。

## 后果

- 添加 MCP 服务器是一次粘贴，编写 skill 是把 Markdown 打进面板。两者都不
  涉及 manifest、打包或签名。
- 对从不设置作用域的对象，插件 `enabled` 语义不变，因此无需迁移：缺失的
  作用域读作 global。
- 扩展页仍是双标签（`installed`、`market`）的插件界面。能力管理现在是三
  个独立的设置 > Agent 页面；把新类型合并进已安装列表仍被拒绝。
- 项目作用域的扩展对没有 workspace 的会话不贡献任何东西。这是有意的，且
  作用域控件写明了这一点，但它是用户可能被惊讶一次的行为。
- 现在有两个注册表以 JSON 文件形式存在于 SQLite 之外。它们是用户编写的
  配置，受益于可读与可手工编辑，且都不需要事务。
- `SCHEMA_VERSION` 不变。插件作用域存在于现有插件记录中；两个新注册表是
  文件。

## 备选方案

### 继续要求插件包装

已拒绝。这是现状，它把两种最常见的扩展——一个 JSON 片段和一份
Markdown 文件——定价为发布软件的成本。

### 把 "off" 编码为第三种激活模式

已拒绝。`mode: "off"` 为了挺过一次关闭往返仍必须携带项目列表，而每个消
费者随后都必须记住 `projects` 在一个名为 `off` 的模式中是有意义的。独立
的布尔值表达同一件事而没有这个陷阱。

### 跨所有能力类型合并为一个"扩展"列表

已拒绝。插件是安装的，MCP 服务器是配置的，skill 是编写的，subagent 是全
局 prompt 文档。它们的行需要真正不同的操作能力。因此扩展页继续聚焦已安
装插件与市场，而设置 > Agent 持有三个独立的能力页面。

### 只过滤目录，不过滤分发

已拒绝。模型能看到的工具就是它会尝试调用的工具，而在用户收窄作用域之前
组装的会话仍记得那个名字。只在一处执行意味着重新设定作用域与下一个
prompt 之间的窗口是一个洞。

### 按会话而非按项目设定作用域

已拒绝。用户按他们正在工作的代码库思考扩展，而不是按单个对话，而且按会
话的选择在同一项目的每个新会话上都得再做一次。

### 让项目作用域的扩展适用于无项目会话

已拒绝，这个看似"安全"的默认值恰恰相反：它会让 `projects` 模式比读起来
更宽，而它会静默扩展进的会话，正是那些没有 workspace 边界来收容它们的会
话。

## 参考

- `packages/shared/src/activation.ts`, `packages/shared/src/mcp-import.ts`
- `packages/plugin-sdk/src/index.ts` (`userMcpToolName`)
- `crates/host-core/src/mcp_servers.rs`, `crates/host-core/src/user_skills.rs`
- `crates/host-core/src/plugins.rs`, `crates/host-core/src/rpc/mod.rs`
- `apps/desktop/electron/main/user-mcp.ts`,
  `apps/desktop/electron/main/index.ts`
- `apps/desktop/src/pages/PluginsPage.tsx`,
  `apps/desktop/src/components/extensions/*`
- `apps/desktop/src/styles/extensions.css`
- `docs/spec/07-plugins/01-plugin-system.md`,
  `docs/spec/07-plugins/03-plugin-api.md`
- 决定 D192、D193、D194；扩展 D015、D174、ADR 0038、ADR 0039
