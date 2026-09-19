# ADR 0074: 插件的原生通知权限

- 状态： 已接受
- 日期： 2026-08-12

## 背景

插件的 `notify` 能力目前只暴露应用内 Toast。PI-Desktop 已经为终结任务结果使
用 Electron 的原生通知 API，但该界面有意由应用持有，并以持久任务通知收件
箱为支撑。插件需要一种向操作系统请求通知访问并投递原生通知的方式，而不获
得对 Electron 对象或任务收件箱的访问。

Electron 不暴露跨平台的、只读的通知权限查询，也没有为其主进程
`Notification` 类提供单独的权限请求方法。原生投递通过通知生命周期报告成功
或失败，且操作系统策略可能在不报告持久状态的情况下压制横幅。

## 决策

保持 `pi.ui.notify` 为向后兼容的应用内 Toast。在 `pi.ui` 下新增三个权限门
控的 API：

- `getNotificationPermission()` 返回 `granted`、`denied`、`unknown` 或
  `unsupported`。
- `requestNotificationPermission()` 执行一次短促的原生通知探测，并返回尽力
  而为的结果。
- `showNativeNotification({ title, body? })` 发送原生通知并返回
  `{ shown, permission }`。

三个 API 都使用现有的低风险 manifest `notify` 权限。Electron 主进程持有原
生对象，限制 title/body 长度，并让插件通知与持久任务收件箱保持分离。原生
插件通知不创建收件箱行，点击时也不产生会话激活事件。

权限结果刻意是尽力而为的。在观测到原生结果之前，或操作系统不报告时，API
返回 `unknown`；不支持的平台返回 `unsupported`。这避免假装 Electron 能可靠
反映一个它无法查询的平台设置。

## 后果

- 插件可以提供操作系统级的提醒与状态更新，同时仍处于现有的插件权限评审之
  后。
- 现有插件保持其 Toast 行为与源码兼容性。
- 插件必须处理 `unknown`、`denied` 与 `unsupported`，不能假设原生横幅已投
  递。
- 任务通知收件箱仍由应用持有，不能用作插件的持久化或导航通道。

## 已考虑的备选方案

- 用原生投递替换 `pi.ui.notify`：已拒绝，因为它静默改变现有插件行为，并把
  Toast 与 OS 通知混为一谈。
- 添加平台特定的权限包：本次 API 修订拒绝；它会在没有统一 Electron 权限契
  约的情况下增加平台特定的依赖。
- 允许插件构造 Electron `Notification` 对象：被插件隔离边界拒绝。
