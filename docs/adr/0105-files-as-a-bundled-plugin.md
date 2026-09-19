# ADR 0105: 将 Files 作为捆绑插件发布；Review 保留在宿主中

- Status: Superseded by [ADR 0241](0241-vendored-updatable-file-view-plugin.md)
- Date: 2026-08-19
- Deciders: PI-Desktop core
- Related: [ADR 0019](0019-work-panel-subsystems.md) ·
  [ADR 0104](0104-plugin-contributed-work-panel-views.md) ·
  [ADR 0108](0108-remove-built-in-interactive-terminal.md) ·
  [07-plugins/13-plugin-permissions-matrix](../spec/07-plugins/13-plugin-permissions-matrix.md)

> Superseded by ADR 0241. Files is no longer a bundled first-party plugin: the
> work panel's file view is now a vendored, updatable third-party plugin
> (`pi.file-manager`). The reasoning below still holds and is what the
> replacement inherits — the view is an ordinary plugin on the public
> `contributes.views` channel, and Review stays with the transcript. The
> terminal clause was already superseded by ADR 0108.

## 背景

工作面板有一个面向插件贡献视图的公共扩展点。捆绑的 Files 浏览器
应该走那条公共路径，而不是继续作为特殊的仅供宿主的视图。Review
按 ADR 0043 仍归消息所有，因此有不同的所有权边界。

## 决策

1. `pi.files` 是从 `apps/desktop/resources/plugins/` 发布的第一方插
   件，像第三方插件一样通过 `contributes.views` 贡献其视图。
2. 捆绑插件默认启用、不可卸载，但可被用户禁用。其文件系统访问使
   用公共的权限门控读取 API。
3. 只有 Files *工具*迁移。transcript 拥有的 `file:<path>` 资源和
   Review 产物仍由宿主渲染，并保持消息/会话作用域。
4. 浏览器外框和 agent CDP 作为捆绑插件 `pi.browser` 发布
   （ADR 0170）。访客 `WebContentsView` 和调试器仍是宿主窗口机
   制，只通过公共的 `pi.browser.*` API 触达。
5. 此前在宿主中保留交互式终端的提案已被 ADR 0108 取代。没有插件
   PTY API，也没有私有的捆绑插件通道。

## 后果

- 发布的插件是公共贡献视图和文件系统 API 的真实消费方；这些 API
  的缺口会被第一方功能发现。
- 启动器列出 Browser 和活跃的插件视图。Review 和文件资源由会话产
  物打开。
- 插件信任边界保持不变：没有任何插件权限可以生成交互式 shell。

## 考虑过的替代方案

### 将 Files、Review 和交互式终端保留为宿主工具

Files 被拒绝：这会使公共插件扩展点得不到检验。Review 保持宿主所
有，因为其证据属于 transcript 消息。交互式终端被移除而非迁移；
ADR 0108 记录了原因。

### 给捆绑插件私有宿主能力

被拒绝：私有通道无法检验公共插件 API，并且会重新制造本 ADR 意在
减少的宿主/插件信任分裂。
