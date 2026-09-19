# ADR 0148: 显式禁用应用键盘快捷键

- Status: Accepted
- Date: 2026-09-03
- Deciders: PI-Desktop core
- Related: Issue #31, E2E-072, ADR 0072, ADR 0076

## 背景

共享的应用快捷键设置支持缺失覆盖或自定义绑定，但删除覆盖总是恢复
默认值。用户无法有意解绑一个操作，且类 null 值被视为无效，然后被
静默解析回默认值。

## 决策

`AppSettings.keybindings` 对每个应用快捷键使用三种状态：

- 属性缺失时使用平台默认值；
- 有效的可移植绑定字符串覆盖默认值；
- 显式的 JSON `null` 表示 `Unbound`，并禁用派发。

无效字符串继续回退到默认值，使损坏或手工编辑的设置不会静默禁用
产品操作。设置 UI 把 Disable 与 Restore default 分开展示，显示本地化
的 Unbound 状态，并让未绑定的操作不参与冲突检查。应用快捷键映射由
渲染进程派发、macOS 菜单加速键和插件启动器共享。

当 `openPluginLauncher` 未绑定时，Electron 注销任何之前的全局加速
键；Windows 还会禁用 host-core 的 `Alt+Space` 钩子和聚焦窗口回退。
可配置的 macOS 原生 role 项在未绑定时使用无 role 的可点击项，因为
Electron 在省略 accelerator 时会恢复 role 的默认加速键。

该设置保留在既有的 JSON 设置对象中。不新增 IPC 方法、协议版本、
存储迁移或插件局部快捷键行为。该值是可移植的，不是 Electron
accelerator 字符串。

## 后果

- 用户可以禁用任何内置应用快捷键，同时不失去恢复默认值或记录新
  绑定的能力。
- `resolveKeybinding` 返回 `string | null`，因此所有消费方都必须
  显式处理无绑定状态。
- 既有设置保留其行为；缺失和有效字符串条目不变，只有新持久化的
  `null` 值会禁用操作。
- macOS 菜单点击在其可配置快捷键未绑定时仍然可用。
