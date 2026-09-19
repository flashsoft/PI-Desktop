# ADR 0076: 在 host-core 中捕获 Windows 保留的插件启动器组合键

- 状态： 已接受
- 日期： 2026-08-12
- 决策者： PI-Desktop 核心
- 相关： D211 · ADR 0072 · E2E-120

## 背景

Windows 为活动窗口系统菜单保留 `Alt+Space`。因此 Electron 的
`globalShortcut` 可能拒绝插件启动器的默认绑定，而渲染进程的
`before-input-event` 回退只在 PI-Desktop 聚焦时有效。

## 决策

Host-core 为默认的 `Alt+Space` 绑定安装一个狭窄的 Windows
`WH_KEYBOARD_LL` 钩子。它消费匹配的 keydown，通过现有 JSON-RPC 通知传输发
出 `keyboard.shortcut`，并让 Electron 切换插件启动器。Electron 在生效绑定
变化时发送加法式的 `keyboard.setGlobalShortcut` 宿主方法；钩子只在生效的
Windows 绑定是 `Alt+Space` 时启用。其他平台与自定义绑定保留 Electron 的正
常全局快捷键路径。

钩子不检查或持久化文本，也不暴露新的渲染进程或插件能力。如果钩子安装失
败，聚焦窗口回退仍可用，且失败被记录。

## 后果

- 默认的 Windows 启动器组合键在其他应用位于前台时也能工作，且不会打开该
  应用的系统菜单。
- 宿主二进制持有一个小型平台特定输入集成，而 Electron 仍负责窗口创建与插
  件面板访问。
- 协议版本与存储 schema 不变，因为该方法与通知是加法式的，且 Electron 是
  唯一消费者。
