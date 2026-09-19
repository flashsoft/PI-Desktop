# ADR 0168: 由主进程管控的 `openExternal` http(s)/mailto 允许列表

- 状态：已接受
- 日期：2026-09-06
- 决策者：PI-Desktop 核心团队
- 相关：D330、ADR 0109、GitHub pull request #45

## 背景

聊天 markdown、插件面板、插件启动器、OAuth 登录和内嵌预览最终都会调用
Electron 的 `shell.openExternal`。主窗口和启动器的
`setWindowOpenHandler` 此前直接转发原始 URL。prompt 注入的 `file:`、
`javascript:`、`ms-msdt:` 或自定义 URI scheme 会在用户点击后到达操作
系统的协议处理器。

插件 `pi.shell.openExternal` 已经有文档规定仅支持 HTTP(S) 和 `mailto:`
（ADR 0109）。预览和插件视图处理器使用 `/^https?:/i` 前缀检查，这比
解析 URL 更弱，且未覆盖应用外壳。

## 决策

1. Electron 主进程拥有一个解析器（`parseAllowedExternalUrl`）。URL 只有
   在 `new URL` 得到 `http:`、带主机名且书写了 `//` 的 `https:`，或带
   地址的 `mailto:` 时才会到达 `shell.openExternal`。打开方收到规范化后
   的 href。控制字符 fail-closed。
2. 不允许的 URL 抛错。无法暴露错误的调用方（window-open 处理器）捕获
   并忽略。OAuth 将拒绝视为"浏览器未打开"。插件保持 `INVALID_ARGUMENT`。
3. 工作区文件在现有路径关卡之后继续使用 `shell.openPath`。预览的"在
   浏览器中打开"对 http(s)/mailto 使用允许列表，对根目录内的 `file:`
   页面使用 `openPath`。
4. 主进程构造的 URL（GitHub 反馈、releases）仍会通过解析器。

## 后果

- 来自聊天、插件或 `window.open` 的自定义 URI scheme 无法启动 OS 处理器。
- `mailto:` 仍然是受支持的插件和链接目标。
- `https:alert(1)` 式样的特殊 scheme 填充被拒绝。

## 已考虑的替代方案

### 仅允许 http/https，阻止 mailto

否决：这会破坏有文档记录的插件 API 和 ADR 0109。

### 前缀正则 `/^https?:/i`

否决：它会匹配没有主机名的 `https:payload`，且与插件运行时的 `://`
检查不一致。

### 返回 `false` 而不是抛错

否决：OAuth 已经把被拒绝的 `openExternal` promise 映射为
`opened: false`。静默返回 `false` 会误报成功。
