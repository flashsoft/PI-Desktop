# ADR 0274：开发插件在加载之前经过审查

- Status: Accepted for implementation
- Date: 2026-09-17
- Deciders: PI-Desktop core
- Related: [ADR 0005](0005-user-installable-plugin-system.md) ·
  [ADR 0110](0110-plugin-panel-chrome-spacing-contract.md) ·
  [07-plugins/12](../spec/07-plugins/12-plugin-ipc-and-host-services.md) ·
  [07-plugins/13](../spec/07-plugins/13-plugin-permissions-matrix.md)

## 背景

插件的权限由用户在加载时批准，该批准就是上限：热重载绝不放宽它
（`plugin-runtime.ts`，`reloadDevPlugin`）。这条规则周围有两个洞。

第一，加载开发插件文件夹从来不是一次审查。文件夹选择器用 manifest 声
明的权限调用 `plugins.loadDev` 和 `PluginRuntime.loadFromPath`，因此声
明*就是*授权。守卫 marketplace 安装路径的权限审查模态
（`PluginDialogs.tsx`）对开发插件不可达——而那正是插件作者实际工作
的地方。

第二，手动 **Reload** 把注册表行的权限列表当作批准，并通过
`loadFromPath` 的 `granted ∩ declared` 过滤器传递它。因此新增了权限的
manifest 编辑会在该权限被丢弃的情况下*静默*重载，然后 `watchDevPlugin`
把交集记录为新上限。插件带着部分损坏回来，原因不可见，之后每次保存
都撞上 `PERMISSION_DENIED: manifest now requests ui.microphone; load the
plugin again to review`——这条建议指向的是一个什么也不审查的选择器。

## 决策

1. 选择开发插件文件夹是请求，不是同意。`plugin/loadDev` 返回
   `{ canceled: false, review }`，其中 `review` 是经过校验的声明
   （`PluginPermissionReview`）：id、名称、版本、每个声明的权限，以及
   超出当前批准的部分。此时不注册任何东西，也不加载任何东西。
2. `plugin/loadDevConfirm` 提交答案。它注册文件夹（`plugins.loadDev`，
   从 manifest 重写注册表行），仅以接受的权限加载它，并武装以上限为
   同一接受集合的 watcher。
3. `plugin/reload` 把 manifest 与**记录的批准**
   （`PluginRuntime.devApproval`）比较，绝不与注册表行比较。权限名称
   和文件 scope 都被比较：新 glob 就是要求更多，与新权限完全一样。什
   么都没新增时立即重载——普通的编辑/保存/重载循环绝不能变成对话
   框。
4. 有新增时，`plugin/reload` 返回审查而不是加载。插件在当前批准下继
   续运行，直到用户通过 `plugin/reloadConfirm` 回答——它在接受的集
   合下重载，并使该集合成为新上限。
5. 脚手架流程（`plugin/createFromTemplate`）写入文件，然后返回相同的
   审查。注册脚手架插件与任何选择的文件夹一样走经过审查的加载。
6. 确认中的路径和身份来自宿主：渲染进程发送 id（或它刚选择的路径）
   和接受的权限列表，绝不为已注册的插件发送自己选择的路径。
7. 热重载拒绝的 `PERMISSION_DENIED` 文本现在指明一个存在的动作：
   *从 Plugins 页面重载它以审查*。
8. 两个审查通过一个 `PermissionGroups` 组件渲染，因此安装审查和开发
   审查在什么是危险的这一点上不会漂移。

## 后果

- 插件作者在选择文件夹的时刻，以及之后每次编辑要求更多时，看到与
  marketplace 安装相同的权限审查。运行时执行的是答案，而不是
  manifest。
- 静默放宽的 manifest 编辑不再能产生半工作的插件：它要么带着用户的
  答案被应用，要么根本不被应用。
- 对不可读的 manifest 不授予任何东西：声明在成为审查之前被校验，读
  取失败拒绝整个流程。
- 注册表行在每次经过审查的加载时重写，因此它总是陈述当前声明而不是
  首次加载时的那个；*批准*是 watcher 上限，这才是对重载重要的记录。
- 即使在开发中，放宽仍需要用户决定，因此热重载守卫存在的安全性质在
  修复后存活。
