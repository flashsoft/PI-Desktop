# ADR 0177: 用户可配置的出站代理

- 状态：已接受
- 日期：2026-09-08
- 决策者：PI-Desktop 核心团队
- 相关：D340、ADR 0083、ADR 0096、
  `04-ux/06-settings-ia.md`、`03-runtime/07-process-model.md`

## 背景

出站 HTTP 分布在多个进程中：

- Electron 主进程——模型发现、models.dev 刷新、插件 `net.fetch`、OAuth
  轮询、GitHub 相关抓取
- Agent sidecar（Node `fetch` / pi-ai）——LLM provider 调用
- host-core——市场目录和包的 `curl`
- Chromium 会话——默认会话、`persist:work-browser`、插件面板
- electron-updater——Chromium / Electron 网络栈

这些界面都不遵守任何产品设置。使用 Clash、V2Ray、企业 HTTP 代理或
SOCKS5 的用户，其应用内浏览器可以通过正常工作的 OS/TUN 代理，但模型
调用却静默失败，因为 Node 的 `fetch` 不使用系统代理。

一个设置控件应当把同一个代理应用到应用拥有的流量上。

## 决策

1. **设置 → 常规 → 网络** 将代理暴露为 System / Direct / Custom。Custom
   接受 `http`、`https`、`socks`、`socks5` 和 `socks5h` URL 以及绕过列表。
   持久化为现有宿主设置 blob 中可选的 `AppSettings.networkProxy`。不提升
   协议或存储 schema 版本。

2. **System**（默认）：Chromium `session.setProxy({ mode: "system" })`。
   Node sidecar 保持直连，除非进程已经从启动它的 shell 继承了代理环境
   变量。这保留了现今 GUI 应用的行为。

3. **Direct**：Chromium `{ mode: "direct" }`。代理环境变量键在 Electron
   主进程中被清除。host-core 市场 curl 使用 `--noproxy '*'`。

4. **Custom**：Chromium `proxyRules` + `proxyBypassRules`；Electron 主
   进程的 `fetch` 是 `net.fetch`，因此 SOCKS5 使用 Chromium 栈；sidecar
   设置 undici dispatcher（HTTP(S) 用 `ProxyAgent`，SOCKS5 CONNECT 加同
   一个 undici `fetch`）；host-core curl 从存储的设置获得 `--proxy` /
   `--noproxy`。默认绕过列表为 `localhost,127.0.0.1,::1,<local>`，使
   回环 MCP 和本地模型保持直连。

5. **不重写的部分**：工作区 Bash（host-core spawn 环境会剥离代理键，
   使凭据不会泄露到 `env` 中），以及用于 OAuth 的系统浏览器
   （`shell.openExternal`）。插件工具进程保持其剥离后的环境；
   `pi.net.fetch` 仍经过主进程。

6. **无需重启即可生效。** `settings.set` 更新 Chromium 会话（包括
   `session-created`）、主进程环境和 `sidecar.configure`。测试动作
   （`pi-desktop/network/testProxy`）通过提供的配置运行一次有界的
   Chromium fetch，且不持久化该配置。

7. **密钥。** 代理 userinfo 存放在设置 JSON 中，与其他非 API 密钥偏好
   并列。日志对密码脱敏。host-core 从不把 URL `set_var` 到其进程环境。
   Chromium `proxyRules` 不能包含 userinfo（会以
   `net::ERR_NO_SUPPORTED_PROXIES` 失败），也不能说 SOCKS5 用户名/密码，
   因此 Electron 主进程把 Chromium 指向一个 `127.0.0.1` SOCKS5 中继，
   由它注入存储的凭据（issue #490）。Node、undici 和 curl 保留带
   userinfo 的规范 URL。

## 后果

- LLM、市场、更新和应用内浏览器共享同一个代理。
- System 模式不会魔法般地让 Node 跟随 macOS/Windows 系统代理；需要
  模型调用走 Clash 的用户仍要选择 Custom（通常是
  `http://127.0.0.1:7890` 或 `socks5://127.0.0.1:1080`）。
- 把 `undici` 加入 sidecar 打包使 dispatcher 和 `fetch` 实现保持在同一
  个包上。

## 替代方案

- 仅用环境变量（`HTTP_PROXY`）：Node `fetch` 在没有 dispatcher 时会忽略
  它；SOCKS5 不完整；host-core Bash 会继承凭据。
- `app.commandLine.appendSwitch('proxy-server')`：无法在运行时更改。
- 按 provider 配置代理：无法覆盖市场、更新或浏览器。
