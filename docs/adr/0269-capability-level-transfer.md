# ADR 0269：在全局和项目级别之间移动能力文档

- Status: Accepted for implementation
- Date: 2026-09-16
- Amends: ADR 0112（agent 能力管理根与 Settings IA——向能力界面新增跨级
  移动）
- Related: ADR 0056（用户持有的 MCP 服务器和 skill）、D193、D194

## 背景

ADR 0112 使 `.agents` 成为唯一的能力根，并把文件所有权与应用本地激活
状态分离：MCP 服务器或 skill 住在全局（`~/.agents/servers`、
`~/.agents/skills`）或项目内（`<project>/.agents/...`），而
`<data>/agent-capabilities/*.json` 记录它是否启用，全局文档有按项目的
覆盖。两个级别只能作为两个独立列表到达。因此改变能力的级别意味着在
一个级别删除文件并在另一个级别重新创建：用户必须重打文档，启用决定
丢失，一次失误就毁掉唯一的副本。Settings IA 中没有任何东西把这种切
换表达为一个动作。

用户确实会合法地改变对所有权的主意——一个临时服务器从一个项目毕业
到每个项目，或者一个全局实验结果证明属于一个仓库。本 ADR 记录 MCP 和
Skill 页面现在暴露的移动（`mcp.transfer` / `skills.transfer`）。

## 决策

### 1. 级别切换移动文档；它不复制

文件的级别*就是*它的所有权。复制会让源级别持有用户刚说过属于别处的
定义，因此同一能力会以两个名字出现两次，直到用户清理旧的——而两者
会漂移。源级别停止列出该条目，目的地持有唯一的文件。

移动是每个能力一个单元：`McpServerRegistry::transfer` 搬迁服务器的
JSON 文件，`UserSkillRegistry::transfer` 搬迁单个 Markdown 文档，或对
于常规的 `<skill>/SKILL.md` 形态，搬迁整个 skill 目录连同 `Skill` 调
用解析的同级资源（`directory_skill_root`、`copy_directory_contents`）。
`move_capability_file` 先尝试 `fs::rename`，使同文件系统的移动是原子
且廉价的，并对另一个挂载上的项目回退到复制后删除。当文档必须被重写
时（下面的重命名情况），目的地在源被移除之前写入，因此中断的移动留
下被遮蔽的副本，而不是完全没有能力。

### 2. 目的地冲突重命名到达的文档；绝不阻止移动

目的地级别可能已经拥有相同的 id，或以项目遮蔽全局的比较方式、不区分
大小写地拥有相同的显示名称/标签。覆盖已存在的文档是数据丢失，拒绝移
动则会在两边恰好同名时让级别切换变得无用。因此到达的文档按文件管理
器消除副本歧义的方式消除歧义：冲突的 id 取 `-2`/`-3`… 后缀（在 64 字
符 id 预算内，`suffixed_capability_id`），冲突的显示名称取 ` (2)`/
` (3)`… 后缀（`suffixed_display_name`）。已存在的条目及其文件保持原
样，RPC 响应以它落到的 id 返回记录，使 UI 能跟随重命名。

重命名 skill 只重写 frontmatter 的 `name` 行（`rewrite_document_name`）；
其他每个 frontmatter 字段、空白、行尾和正文都逐字节复制，因为用户要
求的是搬迁文档，不是重新格式化它。没有可解析 frontmatter 块的文档获
得一个全新的块，使重命名的文件仍可扫描。

Skill 的身份不是它的文件名，移动必须针对扫描器而不是文件系统规划。
目录用 `capability_id` 派生 skill 的 id：frontmatter `name` 的 slug 可
用时用它，否则用路径词干的 slug，最后手段是哈希。中文名，或 slug 已
属于另一个文档的名字，因此会落到文件名无法预测的 id 上。先选文件名
再从中读回 id 产生的正是本决策避免的失败：源文件已消失，而到达被报
告为缺失，同 id 文档静默失去扫描的去重并从 Settings 消失。
`plan_skill_placement` 现在为每个候选将占据的确切路径重放真实的
`capability_id`，只接受扫描列为自身记录的放置，而 `transfer` 按路径
——绝不按它选择的词干——解析到达的记录，因此状态条目写在目录将读
回的那个 id 之下。扫描仍拒绝的落点（空正文、超大文档）以其原始字节
回滚到源，因为还没有写入任何状态，响亮的错误胜过搁浅的文件。

同样的推理使 id 冲突不区分大小写：macOS 和 Windows 对 `MyServer.json`
和 `myserver.json` 都返回同一个文件，因此按字面比较 id 的移动会覆盖
它从未列出的定义。

该预先存在的 `capability_id` 规则的一个产物在这里被接受而不是改变：
必须加后缀的非 ASCII 名称获得 ASCII 字符，而这些字符单独成为它的
slug。因此落在同名者旁边的中文名 skill 落到 id `2`，而不是可读的词
干。让 slug 忽略纯数字余量会改变每个导入文档的识别方式，这是比级别
移动更宽的决策。

### 3. 激活状态跟随文档

状态是应用本地且无所有权的，因此留下旧启用的移动会静默改变能力是否
运行，而在源级别留下条目的移动会留下指向那里已不再存在的 id 的指针。
因此 `set_moved_capability_state` 丢弃源级别对旧 id 的状态——通过
`CapabilityState::forget`，包括被移动的全局文档拥有的每个项目覆盖——
并把源行当时显示的值写到目的地：

- 移入项目存储该项目自己的状态；
- 移入全局把该值存储为新的全局默认值，绝不是另一个项目的覆盖，因为
  移动对它留下的项目只字未提。

全局源读取可能携带 `projectPath`，这正是可见值在其中解析的上下文；
`CapabilityTarget` 保留该字段，使「所有者」和「状态上下文」两种含义
永不混淆。

### 4. 两端是显式的，同目录移动是无操作

`mcp.transfer` / `skills.transfer` 接受 `{ id, from, to }`，每一端是一
个 `{ level, projectPath? }` 目标，而不是单一级别和隐式的「另一边」：
两端绝不可能被相互错误推导，没有 `projectPath` 的项目级端以
`CAPABILITY_INVALID` 失败。`CapabilityTarget::same_directory` 使两端命
名同一目录的移动成为返回当前记录的无操作，因此冗余提供该动作的 UI
绝不可能重写文件。

### 5. 全局 `.agents` 根有重定向接缝

`PI_DESKTOP_AGENTS_DIR` 重指全局能力根，如同 `PI_DESKTOP_DATA_DIR` 重
指应用本地数据目录；空值回退到 home 目录（`AGENTS_DIR_ENV`、
`global_agents_dir`）。跨级移动跨越真实 home 目录和项目，因此没有该接
缝，功能的全局一半只能针对开发者自己的 `~/.agents` 测试，而隔离或便
携安装无法把其全局能力放在用户 home 之外。它是测试和安装接缝，不是
用户设置，不在 Settings 中暴露。

## 后果

- 能力恰好有一个家。Settings 行从源组消失并出现在目的组，这就是移动
  发生的确认；同级重复在构造上不可能。
- 目录 skill 在移动后继续工作，因为其资源随文档旅行；重命名的目录
  skill 写在其新 id 之下。
- 冲突保持有产出：两个定义都以用户能区分的名称存活，代价是用户必须
  认出 `-2` 名称是他们刚移动的那个。
- 被移动的全局文档丢弃其其他项目的覆盖。那些条目不再命名任何全局
  文档，因此保留它们会是一个不存在能力的状态；这些项目只是回退到无
  条目。
- 移动由宿主持有，不触碰渲染进程的级别查询：`mcp.list` /
  `mcp.active` / `skills.list` / `skills.active` 在扫描后报告结果，文
  档本身从不携带 `enabled`。
- 验证：transfer、rename、state 和目录资源路径由 host-core 注册表测
  试覆盖，移动菜单目的地规则在
  `apps/desktop/test/agent-capability-settings.test.mjs` 中有源代码契
  约测试。渲染旅程规定为 E2E-CAPABILITY-move-across-levels，在执行渲
  染 E2E 运行之前保持 Draft。
