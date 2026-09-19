# PI-Desktop 基线冻结

- 基线版本：`0.4.18`
- 日期：`2026-09-14`
- 状态：`已冻结实现细节（Plan 检查点工件 + 批准/执行启动栅栏 + 协议 v11 + 架构 v16 + 宿主拥有的插件会话导入/读取/更新/删除 P0/P1 + 可选 shell 目录 + 无图标的 Composer 提示行 + 回合边界的上下文检查点压缩 + 会话作用域工作面板 + 按边缘划分的工作面板/聊天调整大小所有权 + 带随包发布快照的 models.dev 模型目录 + provider/运行时安全 + M5 加固 + 设置 IA + 项目归档 + 侧边栏组织 + 应用更新投递 + 三平台发布 + Extensions 页面密度与主题可读的操作 + 自定义全局 UI 字体 + ChatGPT 风格的逻辑项目组）`
- 语言策略：代码、标识符、提交信息 **English-first**；仓库文档 **中文 primary**（2026-09-19 修订，原冻结为 English-first）
- 后端策略：**Rust host core + pi agent sidecar**

> 版本历史：`0.3.4` 冻结了 provider/运行时安全决策
> （D001–D033）。`0.4.0` 吸收了 Codex 视觉对齐决策系列
> （D034+，权威来源 = decisions-log §D）和 M5 加固决策
> （D078–D083：签名通道、品牌图标、监督、渲染器沙箱、
> 日志通道、窗口状态）。`0.4.1` 冻结了来自 D090 / ADR 0013 的
> 紧凑四目的地设置目录。`0.4.2` 用 D092 / ADR 0015 的
> 窗口响应式布局替换了冻结的 720px 设置内容上限。
> `0.4.3` 通过 D093 / ADR 0016 采用了保留式多项目侧边栏标签、
> 非破坏性的项目/会话组织，以及以会话为根的工具隔离。
> `0.4.4` 通过 D095 移除了被动的 Composer 上下文栏。
> `0.4.5` 通过 D096/D102 和 ADR 0018 冻结了端到端思考级别与
> provider 预设。`0.4.6` 用 D120 / ADR 0022 的打包应用更新模式
> 取代 D020 的一概推迟，同时保留 D010。
> `0.4.7` 通过 D126 解除了 D010 的仅 macOS 发布范围：标签构建
> 为 macOS arm64、Windows x64 和 Linux x64 发布安装程序和
> electron-updater 订阅源。
> D285 在 arm64 通道之外增加了原生 macOS Intel x64 标签通道；两种
> macOS 架构都从各自匹配的 runner 发布 DMG/ZIP 工件。
> `0.4.8` 通过 D133 / ADR 0026 把持久的项目索引从首页侧边栏移入
> 设置，成为第五个**项目归档**目的地。
> `0.4.9` 通过 D136 / ADR 0027 让固定的 pi-ai 目录成为已知模型
> 元数据的权威来源，并移除了桌面自有的模型参数覆盖。
> ADR 0133 / D266 最初引入 models.dev 作为远程主来源；ADR 0134
> 取代了该回退设计，使 models.dev 成为唯一的元数据来源并附带一份
> 签入仓库的发布快照。pi-ai 仍是传输、OAuth 与账户可用性层。
> `0.4.10` 通过 D142 / ADR 0028 用运行时会话作用域上下文取代了
> 会话切换时破坏性的工作面板清空。
> `0.4.11` 通过 D158 / ADR 0030 采用了回合边界的模型上下文检查点
> 压缩，同时保留完整可见转录。ADR 0049 的上下文恢复修正案为自动
> 压缩失败增加了持久的保留尾部回退。D200 / ADR 0061 从模型窗口而
> 非设置推导预算，并移除了压缩设置。D203 / ADR 0064 随后重建该机制
> 以匹配 Codex：压缩仅内联进行；回合仍在继续时检查点携带摘要加最新
> 活跃用户消息；已完成回合不携带裸露的历史用户消息。面向模型的
> `new_context` 工具和两条预算提醒回归，每次压缩新增一行转录和一条
> 警告，并存在一个由内部开关控制的无摘要滚动族。
> `0.4.12` 通过 D160 / ADR 0031 统一了首页与线程内停靠的 Composer
> 提示行（不带前导品牌标记），同时保留其他位置的外壳品牌。
> `0.4.13` 通过 D188 / ADR 0052 用 Plan 运行状态取代 Chat 运行配置。
> Plan 是处于规划状态的同一个 pi Agent，保留权限模式选择，在该策略下
> 暴露 Bash，拒绝 Write/Edit/插件工具，并通过独立的宿主拥有批准转换
> 提交结构化计划。宿主协议为 v7，存储架构为 v8；持久的 Chat 值迁移
> 为 Plan，Agent 仍是默认值。
> `0.4.14` 通过 D189 / ADR 0053 用 `<workspaceRoot>/.pi/plan/*.md`
> 下不可变的宿主写入 Markdown 检查点取代该提案。SubmitPlan 接受
> title、Markdown 和 question；Markdown 字节精确保留，title/question
> 仍是结构化批准字段。批准只有 approve/reject，需显式选择权限且默认
> 为 Ask，并打开工件供审阅。待处理、排队和运行中的工作由启动进程
> 栅栏中断且不重放，已批准的会话保持 Agent。ADR 0054 增加了可选
> shell 目录，同时保留 Bash 协议名称。宿主协议为 v9，存储架构为 v10。
> `0.4.15` 通过 D196 / ADR 0058 修订了 D169 的 Extensions 呈现：
> 移除四卡片数字概览带，共享按钮表面使用语义化主题 token，使主要与
> 次要操作在深色和浅色主题下都保持可见。宿主协议与存储架构无变化。
> `0.4.16` 通过 D232 / ADR 0083 增加用户可选的全局 UI 字体：设置
> 外观卡片获得可搜索的字体选择器；选择持久化为
> `AppSettings.fontFamily` 并覆盖 `--font-sans`。四个开放许可
> （SIL OFL 1.1）字体族 —— Geist、Inter、Noto Sans SC 和
> LXGW WenKai —— 随包本地附带许可文本，已安装的系统字体族由
> Electron main 通过增量 allowlist 通道
> `pi-desktop/app/systemFonts` 枚举。宿主协议与存储架构无变化。
> `0.4.17` 通过 ADR 0249 用 ChatGPT 风格的宿主拥有逻辑项目组取代
> 渲染器拥有的多文件夹标签投影。一个组拥有自己的名称、有序的本地
> 根、共享指令、共享记忆和组内会话；其第一个根仍是唯一可见的宿主
> 工作区。增量组数据使用现有的 `kv` 扩展边界，因此存储架构与宿主
> 协议版本保持不变。
> `0.4.18` 把项目溢出操作重命名为 Edit project，并增加宿主支持的
> 逻辑项目根调整。编辑器保持 Primary 根固定，支持添加/移除符合条件的
> 附加根，并拒绝移除仍拥有聊天的根。

> 当前的基线后修正案通过 ADR 0200 / D367 增加 P0/P1 宿主拥有的插件
> 会话 API，通过 ADR 0201 / D368 增加显式项目 id 加宿主拥有的会话
> 刷新，并通过 ADR 0203 / D370 增加可选加入的本地 MCP 控制面
> （目录与绑定由 D372 收紧）。协议 v11 保持不变；架构 v16 在架构 v15
> 之上增加宿主拥有的会话协作 ledger（D409 / ADR 0239）。架构 v15 在
> 架构 v14（增加插件来源 sidecar 与软删除标记）之上增加宿主拥有的
> 回合队列（D386 / ADR 0213）。会话变更、任意重新绑定、provider/模型
> 绑定、批量删除和标签操作仍然推迟；显式 `projectId` 是导入会话有限
> 的项目绑定例外。本地控制面仅限 loopback，不会重新打开已推迟的远程
> Gateway / WebUI 范围。ADR 0205 / D373 为未来的 post-MVP 里程碑定义
> 了远程 Agent Host、Gateway 和多绑定控制面目标；D374 把该目标修订为
> 一个规范性 WebSocket 绑定、一个无头 Agent Host 模块和完整的本地批准
> 词汇表，D375 安排 SSH 隧道远程 Host 先行，而 Gateway 与浏览器访问
> 保持未排期。它们都不改变当前的排除范围。

## 冻结决策

1. 产品名称：**PI-Desktop**
2. 桌面外壳：**Electron**
3. UI：**React + TypeScript + Vite + Tailwind**
4. UI 默认语言：**English**
5. 文档 / issue / 提交语言：仓库文档 **中文 primary**，issue / 提交信息 **English primary**（2026-09-19 修订）
6. Agent 引擎：**pi（`pi-ai` + `pi-agent-core`）**
7. 后端宿主核心：**Rust**
8. Agent 循环位置：**Node/TypeScript pi sidecar**（不在渲染器）
9. Electron main 角色：**薄编排器**
10. 桥接：**渲染器仅经 preload IPC**
11. 宿主服务传输：**Rust sidecar + stdio JSON-RPC（NDJSON）**
12. 存储所有权：**Rust host-core 独家拥有 SQLite**
13. MVP 领域：**本地编程 agent**
14. 默认模式：**Agent**
15. 产品运行选择器：**Agent | Plan**；内部的 `page = "chat"`
    值仍是会话表面的实现细节，不是一种运行模式
16. Agent 工具：**Read / Glob / Grep / Write / Edit / Bash**
17. 权限超时：**120s → deny**
18. 会话授权范围：**按 toolName**
19. `~/.pi` 一次性自动导入：**不在 MVP**。ADR 0254 增加了针对
    规范 Pi v3 JSONL 的只读原生会话发现与显式继续；它不会静默导入
    或复制会话到 Desktop 存储。
20. 不在 MVP：**Gateway / 远程 WebUI 控制**；本地 loopback MCP 控制
    是 D370 记录的基线后可选加入例外
21. 扩展模型：**用户可安装的插件系统**
22. 插件第一阶段：**commands / panel / agentTools / skills**
23. 插件运行时目标：**独立进程**；M4 可使用宿主管理的沙箱运行时
24. 插件市场：**协议已定义，实现推迟**
25. 插件包格式：**`.piplug`（zip）**
26. 插件信任第一步：**sha256 校验和；签名随后**
27. 首个发布平台：**仅 macOS arm64** —— 在 `0.4.7`/D126 中解除；
    标签构建现在发布原生 macOS arm64 与 Intel x64、Windows x64，
    以及 Linux x64 AppImage、deb 和 rpm 工件
28. TS schema 库：**typebox**
29. i18n 库：**i18next**
30. Bash：**非交互、流式，从可选 shell 目录解析；默认超时 60s，
    可有界覆盖**
31. 引导：**内联清单**
32. 可观测性 MVP：**仅本地日志**
33. 错误模型：**共享 AppError 错误码注册表**
34. Provider 覆盖：**经 pi-ai 原生 + OpenAI 兼容 + 自定义实现通用覆盖**
35. 模型策略：**无封闭 allowlist；models.dev 发布目录、通用未知 ID
    和自由形式模型 ID**
36. Provider 存储：**Rust SQLite 配置 + OS 秘密存储引用**
37. 秘密后端：**safeStorage 为主 + 加密文件回退**
38. 工作区忽略：**denylist + 默认值 + `.pi-desktopignore`**
39. 工具结果限制：**按工具预算（搜索 128KB / 4000 行，shell 96KB /
    4000 行）；仅当结果被截短时才有 `truncated`**
40. 设置目录：**Basics / Model configuration / Import / Project archive /
    Info**；项目归档拥有持久的项目发现、归档、恢复与重新打开工作流；
    插件管理仍是应用外壳独立的 **Plugins** 目的地
41. 侧边栏组织：**保留式逻辑项目组，宿主拥有有序本地根，渲染器本地的
    项目/会话置顶、归档、折叠与排序元数据**
42. 项目激活：**经现有 `project.set` 的单一可见宿主工作区；组的会话
    与上下文默认到 primary 根，而注册组根下的显式绝对路径使用宿主规范
    包含判断**
43. 上下文管理：**Codex 形态的 pi 原生检查点摘要 —— 在确定性的
    请求前硬栅栏处内联压缩；回合继续时摘要仅加最新活跃用户消息
    （已完成回合之后不含裸露的历史用户消息）、持久的宿主检查点，
    以及一次溢出重试。模型可以通过 `new_context` 请求新窗口；每次
    压缩新增一行转录和一条警告。无面向用户的设置**
44. Plan 工具与策略：**Read / Glob / Grep / BrowserPreview / Bash 外加
    `EnterPlanMode` 和 `SubmitPlan`；Write/Edit/插件与未知工具被拒绝。
    Bash 遵循 `ask`、`accept-edits` 或 `auto`，因此 Plan 是规划意图，
    而不是严格的只读安全配置。**
45. Plan 检查点：**`SubmitPlan(title, markdown, question)` 使 host-core
    把精确的 Markdown 字节保存在一个新的唯一
    `<workspaceRoot>/.pi/plan/*.md` 工件中，而 title/question 仍是现有
    `plan_approvals` 行中的结构化字段。该行记录工件 path/hash/size 和
    执行字段。approve/reject 是仅有的操作；批准显式选择 `ask`、
    `accept-edits` 或 `auto`，UI 默认为 Ask，打开工件供审阅，并在
    30 个绝对分钟后以 `PLAN_APPROVAL_TIMEOUT` 过期。**
46. Plan 恢复与 shell：**启动事务在服务 RPC 之前把先前的 pending、
    queued 和 running Plan 工作标记为 interrupted，不重放；已批准的
    中断执行让会话保持 Agent。配置仅限空闲时，每个会话有一个运行中
    回合。渲染器可以在回合运行期间暂存一份最新的下一回合配置，但
    只在宿主报告空闲后才提交该选择。`defaultCommandShell` 选择平台
    目录条目；不可用的持久选择回退到第一个可用平台 shell，每个回合
    固定有效的 ID/方言，宿主在 60 秒默认超时内流式输出之前拒绝过期
    身份。**

## 权威来源

- 规范索引：`docs/spec/README.md`
- 导航：`docs/spec/NAV.md`
- 决策日志：`docs/spec/08-meta/decisions-log.md`
- ADR：`docs/adr/`
- 示例插件：`examples/plugins/hello`

## 交付状态

**M6 — Plan** 已于 2026-08-05 按这些冻结细节实现并验收：

1. 共享的 Plan/会话/shell 契约与协议 v10
2. 架构 v10 迁移、不可变 plan 工件，以及 `plan_approvals`
   执行字段/启动栅栏
3. Rust 权威的 Plan 策略、shell 身份与进程取消
4. 单 Agent 的 SubmitPlan/批准/执行状态转换
5. 渲染器工件批准、shell 选择与 EN/zh-CN UX
6. 聚焦的迁移、策略、流式、超时、恢复验证，以及渲染的
   EN/zh-CN 验证

冻结的协议保持 v9，存储架构保持 v10。未来的变更必须保留自动化的
M6 场景 E2E-104 至 E2E-117，或在更改契约之前更新相关决策记录。
