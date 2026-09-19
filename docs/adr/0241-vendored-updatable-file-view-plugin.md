# ADR 0241：将文件视图作为 vendored、可更新的插件发布

- Status: Accepted (supersedes ADR 0105; issue #304)
- Date: 2026-09-13
- Deciders: PI-Desktop core
- Related: [ADR 0104](0104-plugin-contributed-work-panel-views.md) ·
  [ADR 0105](0105-files-as-a-bundled-plugin.md) ·
  [ADR 0109](0109-open-files-with-the-os-associated-application.md) ·
  [ADR 0111](0111-reveal-files-in-file-manager.md) ·
  [ADR 0169](0169-classified-file-preview-and-live-workspace-events.md) ·
  [07-plugins/07-plugin-marketplace](../spec/07-plugins/07-plugin-marketplace.md)

## 背景

捆绑的 `pi.files` 视图（ADR 0105）只能浏览和预览 workspace，别无其他：
不能编辑，没有 image、CSV、JSON 或 SQLite 界面，文本预览还有行数上限。
任何超出查看文件的操作都意味着离开应用。

`pi.file-manager` 是一个第三方插件，在同一个公共通道上恰好覆盖了那个
界面——`contributes.views`、基于 `pluginBridge` 的沙箱页面、`ui.view`
加上 root 为 `workspace`、scope 为 `**` 的 `fs.read`，没有仅宿主能力。
它也通过官方 marketplace 发布。

引入它引出两个本 ADR 回答的问题：编辑器的写入如何被中介，以及应用内的
副本如何与 marketplace 中的副本保持一致。

## 决策

1. 捆绑的文件视图是 `pi.file-manager`，vendored 到
   `apps/desktop/resources/plugins/`。vendored 文件是上游发布版自己的
   产物，逐字节一致，唯一例外是 manifest 中新增的 `license` 字段；
   `UPSTREAM.md` 记录仓库、tag、commit 和校验和。`pi.files` 被移除，
   停止随附某个捆绑插件的构建不会留下孤立的注册表行（ADR 0104）。
2. 它只声明 `ui.view` 和 `fs.read`（`root: workspace`、`scope: ["**"]`）
   ——与被替换的视图所声明的权限相同。页面是沙箱化的，只能通过公共
   bridge 到达宿主。
3. 编辑写入是插件自己的：其宿主进程保留路径围栏、原子写入、
   `mtime`/大小冲突检测和写入审计。宿主权限网关不中介这些写入。
   manifest 无法表达整树写入，而且此宿主本来就没有对插件进程的 `fs`
   访问做沙箱，因此捆绑该插件并不授予任何第三方插件尚未拥有的能力。
   该边界在 manifest 的 `safetyNotes` 中声明，也是本记录存在的部分原因。
4. **捆绑意味着默认且不可移除，而不是冻结。** 捆绑插件不能被卸载，
   但可以从 marketplace 更新，且该更新在下一次启动后仍然保留：
   - 只要本次构建没有附带*严格更新*的版本，`sync_builtin` 就保留
     source 不是 `builtin` 的已安装行。应用更新仍能到达从未安装过任何
     内容的用户，而过期的安装无法钉住该插件。
   - `uninstall` 按 id 对本次构建随附的插件集合拒绝执行，该集合在每次
     启动时从磁盘重建。更新后的捆绑插件保持不可卸载，而本次构建停止
     随附的插件重新变为可移除。
5. 目录版本只有在严格新于已安装版本时才作为更新提供。相等不是更新，
   更旧的目录条目也不是——那会是披着更新外观的降级。
6. 面板标题是 manifest 的本地化标题，与任何插件一样。渲染进程不为它
   携带标签，也不硬编码任何 view id。

## 后果

- 工作面板的文件界面是 vendor 副本，因此应用自身的发布周期不再决定
  视图何时改进；由上游发布决定，用户无需等待应用更新即可获取。
- 维护该副本是刻意的行为：`UPSTREAM.md` 和
  `apps/desktop/test/bundled-plugins.test.mjs` 钉住 vendored 发布版，
  因此悄悄修改或半途的重新同步会使构建失败。
- 「不可卸载」现在与「来自 `resources/plugins`」分离。
  `PluginSummary.bundled` 承载这一区分；它在每次启动时重新计算，在
  它存在之前写入的注册表中默认为 false。
- marketplace 继续列出捆绑插件并提供其更新。该条目是获取更新版本的
  受支持路径，而不是令人困惑的重复项。
- 用户更新过的插件在保持捆绑的同时保留 marketplace/`local` 来源。
  任何基于 `source == "builtin"` 的推理都不得用于回答「这是否受保护」
  ——见上文的注册表规则。
- 捆绑视图的文件系统可达范围是插件自己的；插件路径围栏中的缺陷不会
  被宿主网关捕获。这与任何已安装插件处于相同的信任位置，是为了换取
  一个有能力、可更新的文件视图而刻意采取的。

## 已考虑的替代方案

### 在 `pi.files` 中重新实现缺失的查看器和编辑

被拒绝：这会重复一个有人维护的第三方插件，而行数上限、媒体查看器、
结构化查看器和 SQLite 浏览是留在宿主中的一大块界面。公共通道的存在
正是为了让第一方界面不必住在那里。

### 以只读方式捆绑，把编辑留给 marketplace 副本

被拒绝：同一个插件不分叉就无法提供两个能力级别，而只读默认值会让最
常见的请求——修改这一行——得不到回应。无论哪种方式，写入路径都不变。

### 让捆绑副本永远胜出，不提供更新

被拒绝：那样用户只能通过更新应用来获得更新的上游发布版，这违背了
vendor 一个已发布插件的意义。严格更新规则让两个方向都保持诚实。

### 隐藏捆绑 id 的 marketplace 条目

被拒绝：该条目是更新上游发布版的发布位置。隐藏它会移除本 ADR 建立的
更新路径。
