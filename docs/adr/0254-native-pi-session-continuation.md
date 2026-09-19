# ADR 0254：在其规范 JSONL 中继续原生 Pi session

- Status: Accepted
- Date: 2026-09-14
- Decision: D421
- Supersedes: 仅就 session 发现而言取代 baseline D007；一次性导入仍可用

## 背景

PI-Desktop 历来通过把 Pi session 压平进 Desktop 持有的 transcript 来导入
它们。该副本无法保留原生树、压缩、自定义条目，也无法接收此后从任一
应用发送的 turn。coding-agent SDK 已经拥有 v3 session 格式和原生
model/auth/resource 生命周期。

## 决策

1. Node agent sidecar 暴露按来源区分的 `pi-native` 适配器。它发现 Pi 的
   agent session 目录之下的文件，通过 `SessionManager.inMemory` 投影不可
   变的字节快照，并且只有在 prompt 被接受时才打开持久的
   `SessionManager`。
2. 原生身份是由规范文件路径加原生头部 id 派生的不透明组合。路径绝不
   越过 preload 边界。Electron 把原生摘要与 Rust 持有的 Desktop 摘要
   合并；Rust 仍是独占的 SQLite 和 Desktop transcript 所有者。
3. 原生继续使用 `createAgentSession`，搭配 Pi 的 `ModelRuntime`、
   `SettingsManager`、`DefaultResourceLoader`、保存的 provider/model/
   thinking 和原始的 `SessionManager`。没有 Desktop provider 回退，也不
   为模型上下文做 `UiMessage` 重建。
4. 第一个切片支持列表、详情、刷新、无工具的纯文本 Agent prompt
   （`noTools: "all"`）、停止，以及渲染进程本地的 pin/archive。内置和
   扩展模型工具保持禁用，直到设计出显式的 Desktop 权限桥；这不是完整
   的 Pi 工具对等。Rename、delete、move、revision、Plan/Goal、queue、
   collaboration、attachment 和 transcript 重写操作被拒绝；fork 和 side
   chat 由下方修订新增。
5. 协作式 sidecar 租约串行化 PI-Desktop 写入者。在每次 SDK 追加之前，
   适配器校验规范文件身份和全字节指纹；追加之后，它校验恰好增加了一
   行、带有预期条目和父级。分歧则以失败关闭。陈旧的租约仅在目标是未
   变更的、或具有相同文件身份、原始字节前缀和连续父链的完整仅追加
   扩展时，才为已死的本地 PID 回收。能力刷新暴露可回收的死主租约而不
   删除它们；只有获取才回收。活跃的、远程的、畸形的或不确定的所有权
   绝不被窃取。被拥有的空闲运行时保持可 prompt，而活跃运行时可停止并
   拒绝重叠直到结算。这无法让不合作的 Pi Web/CLI 进程遵守租约，因此
   乐观校验仍是强制的。
6. 版本不恰好是 v3、缺少结尾换行、缺少 cwd、保存的 provider/auth 不可
   用、项目资源不受信任、身份损坏，或存在另一个活跃租约，都会让
   session 保持可浏览但只读，并给出明确原因。投影绝不修复或迁移源
   文件。

## 后果

- Desktop session 及其宿主持有的持久化不变。
- 原生分支、压缩数据（包括 `retainedTail` 等未知字段）、自定义/上下文
  消息和未来未知条目保持原样，因为读取在内存中进行，写入是 SDK 仅
  追加。
- 不合作的写入者仍可能在 OS 追加操作内竞态。适配器在追加后检测前缀/
  后缀分歧，保留字节，处置运行时，并要求重载；完全的互斥需要 Pi 客户
  端采用共享租约协议。
- `@earendil-works/pi-coding-agent` 是捆绑 sidecar 的运行时依赖，其
  session 格式行为被版本钉住。
- `bindExtensions` 以 SDK 无头 UI（`mode: "print"`、`hasUI: false`）、
  错误所有权和显式不支持的 session 控件运行原生启动/资源发现。守卫
  和监听器先于启动；失败则处置 session 和租约。原生扩展是受信任的
  本地代码，不是 Desktop 插件或沙箱工具。
- ModelRuntime 初始化本地目录/认证快照而不做模型网络刷新；要求精确的
  已保存 provider/model/auth。原生 Composer 就绪使用 `canPrompt`，独立
  于 Desktop provider 密钥。
- Desktop 终端完成跟随 SDK prompt 结算（在 `agent_settled` 钩子和最终
  持久化之后），而不是中间的 `agent_end`。持久用户确认把调用方乐观
  ID 对账到 SDK ID，而不改变原生条目 ID 或对文本去重。中止刷新原生
  详情，绝不重写/恢复持久用户行。
- 原生 compact 和按 session 寻址的 queue push/list 在宿主访问之前以
  `NATIVE_PI_UNSUPPORTED` 失败。Queue remove/prioritize 保留现有的不
  透明 **host turnId** 契约，而不是 session/来源契约。原生路径绝不创建
  宿主队列条目；未来的原生队列支持需要显式的来源/session 协议扩展。
- 列表仍会同步解析完整的已变化和未变化文件。投影缓存和有界异步扫描
  被推迟；本切片不对大型目录的响应性设界。

## 修订：原生 side-chat fork（2026-09-14）

本修订描述的 `sidechat:` 面板和标签页已被 ADR 0268 移除；它们路由到的
`session.fork` 能力保留在原处，并由 Fork 动作使用。

`session/fork` 现在按来源区分。Desktop 来源保留现有的 Rust
`session.fork` 契约；`native-pi:` 来源路由到 sidecar 的
`native.session.fork`，它以普通的 `SessionDetail` 返回子级。渲染进程
绝不提供或接收文件路径。

原生 fork 通过 SDK（`SessionManager.inMemory` + `createBranchedSession`）
从父级快照分支，因此祖先关系、标签重新链接、压缩重设父级和未知条目都
遵循 SDK 自己的规则。父级文件及其活跃管理器绝不改变；子级是父级
session 目录中新的 v3 JSONL，其头部 `parentSession` 指向规范源路径。
子级元数据（标题，以及兜底的 model/thinking）在内存中追加。发布会写入
一个完整的临时文件（从确切载荷捕获设备/inode 加内容哈希），然后在验证
暂存文件仍是那个 inode、具有那些确切字节之后，将其硬链接到最终名称；
已发布的子级在任何投影或注册之前针对同一身份/哈希验证。失败的 fork
绝不暴露部分子级，绝不覆盖或重命名已存在的文件，并且只移除设备/inode
和内容仍与本操作自己写入内容匹配的文件。被改动的暂存或已发布文件以
`NATIVE_PI_SESSION_CHANGED` 失败关闭，其不确定的字节被保留而不是删除。
源字节和我们自己的运行/打开状态在发布前立即重新检查；漂移则失败关闭。
与窗口的其余部分一样，在验证和链接之间行动的不合作外部写入者超出协作
租约契约；快照检查尽其所能捕捉，且绝不触碰父级。

当所选分支没有保存模型时，子级记录**父 session 保存的** provider/model；
当分支完全没有保存 thinking-level 变化时，它记录父级保存的级别。显式
的分支值（包括 "off"）总是胜出。没有 Desktop provider/auth 回退。Fork
是纯数据复制：它不执行模型，也不加载项目资源，因此在父级 provider 不
可用或项目不受信任时仍然允许。这并不授予 prompt 就绪——子级报告相同
的只读原因，并保留现有的 auth/trust 闸门直到满足。

Side-chat 面板流式显示原生回复：`NativePiRuntime` 在临时行 id 下投影
`message_start`/`message_update`，而终止的 `message_end` 在增量的
`replacesMessageId` 字段中指名那个确切 id，因此渲染进程只通过
`projectMessageEnd` 重新键控那一行（活跃的、缓存/保留的和 side-chat
投影共享同一个接缝）；普通的 Desktop 完成不携带该字段，也绝不触碰其他
行。持久用户确认也对账 side-chat 投影。关闭面板只移除渲染进程注册和
标签页；子级仍是侧栏和标题/项目搜索中的原生 session，并作为普通对话
重新打开。在原生 turn 运行时发送会在 Desktop 队列之前失败，给出可见
消息并保留草稿；原生 session 仍不能入队。
