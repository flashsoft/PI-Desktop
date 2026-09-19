# ADR 0266：插件 fs 根跟随调用方 Session

- **Status**: Accepted
- **Date**: 2026-09-16
- **Related**: [ADR 0016](0016-sidebar-organization-and-multi-project-tabs.md) ·
  [ADR 0249](0249-chatgpt-style-logical-project-groups.md) ·
  [ADR 0263](0263-project-folder-roots-for-plugin-views.md) ·
  [ADR 0264](0264-host-mediated-actions-follow-the-browsed-folder.md) ·
  [07-plugins/03-plugin-api](../spec/07-plugins/03-plugin-api.md) ·
  [07-plugins/13-plugin-permissions-matrix](../spec/07-plugins/13-plugin-permissions-matrix.md)

## 背景

D093 给侧栏多个保留的项目标签页，同时 shell 保持一个选定的宿主
workspace，并且它固定了本 ADR 所扩展的规则：**工具执行从持久 session
项目解析其根**，因此后台 session 在另一个标签页变为活跃时保留自己的
根。ADR 0016 和 ADR 0249 把这种分离带入项目模型，ADR 0263 / ADR 0264
使视图浏览的文件夹成为插件本地且按项目的。

该规则从未到达插件。每个 `pi.fs.*` 请求的根解析为

```ts
rule.root === "userSelected" ? loaded.userRoot : this.services.getWorkspacePath()
```

而 `getWorkspacePath()` 是单一的窗口全局可见 workspace。因此两个项目上
的两个 session 会用窗口恰好显示的那个项目来衡量每一次插件 fs 调用：
从 session B（项目 B）调用的插件 agent 工具在用户切换标签页后读取项目
A 的根；而当完全没有可见 workspace 时（临时聊天），同一个工具对所有
session 同时失败 `NOT_FOUND`（"No workspace is open"）。四个路径安全闸
门——权限、realpath 包含、拒绝列表、声明的 scope/同意——都是正确的；
只有它们衡量的目录是错的。

## 决策

1. **`workspace` 根解析发起调用的工具 session 的项目。**
   `plugin-runtime.ts` 中新的私有 helper `fsRoot(loaded, rule)` 读取在途
   工具的 `sessionId`，询问增量的宿主服务
   `getWorkspacePathForSession(sessionId)`，并把它应答的项目作为根。可
   见 workspace 只是回退，不是首要答案。
2. **Session 是根跟随的维度；回退是可见 workspace。** 面板 bridge 调用
   没有工具 session，宿主不跟踪的 session——尚未启动的运行时——完全
   像以前一样解析可见 workspace。
3. **`userSelected` 模式不变。** 它保留用户通过 `requestDirectory()` 选
   择的目录，具有相同的仅内存生命周期。
4. **`plugin-services.ts` 从它为 D093 已经保留的 `sessionProjects` 映
   射接线该服务。** 不引入新的事实来源，插件运行时不缓存任何东西：每
   次调用读取宿主当前的答案。
5. **没有一个路径安全闸门改变。** 权限、realpath 包含、拒绝列表、带运
   行时同意的声明 scope 仍以相同顺序在解析出的根上运行。只有
   `workspace` 根命名*哪个*目录改变了。
6. **Session 根在没有可见 workspace 时也能解析。** 临时聊天没有可见
   workspace，因此它的插件工具以前会同时全部失败；有了 session 项目，
   它们按 session 继续工作。该状态下的面板调用仍失败关闭，因为它没有
   其他可解析的东西。

## 后果

- 两个项目上的两个 session 不再串话：插件 agent 工具在发起它的
  session 的项目之下读写，无论哪个标签页活跃。
- 面板 bridge 的 fs 调用保持其旧含义：它们跟随可见 workspace。
- 只在一个项目上运行过一个 session 的插件完全看不到变化。
- `workspace` 根的 `NOT_FOUND` 现在更窄、更精确：发起 session 的项目和
  可见 workspace 都未解析出。
- 插件运行时读取宿主已经拥有的 session 元数据，因此该变更不增加存储
  状态、不需要迁移、不需要新的插件权限。

## 已考虑的替代方案

### 保留可见 workspace 并让工具传递项目 id

被拒绝：宿主已经知道发起的 session，因此插件必须学习并转发一个它并不
拥有的项目标识符，而插件提供的根会是其 manifest 从未声明的授权。

### 在插件进程内解析 session 的项目

被拒绝：session 到项目的映射是宿主持有的 session 元数据（D093），把它
复制进沙箱化的插件进程会使它脱离保持其最新的宿主权威。

### 让可见 workspace 跟随活跃 session

被拒绝：可见 workspace 是用户正在看的东西，ADR 0016 与 D093 刻意在一
个选定的宿主 workspace 之上保留多个保留标签页。为了修复插件查找而改
变用户所见是颠倒因果。

### 对宿主不跟踪的 session 回退到最后的可见 workspace

作为无操作被拒绝：未跟踪的 session 加上没有可见 workspace，正是
session 根存在就是为了保持工作的临时聊天情况，因此回退保持为「可见
workspace，当存在时」。
