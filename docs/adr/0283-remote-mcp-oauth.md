# ADR 0283: 远程 MCP 服务器 OAuth 2.1 认证

- **状态**：已接受
- **日期**：2026-09-18
- **相关**：[ADR 0038](0038-plugin-mcp-bridge.md) ·
  [ADR 0098](0098-multiple-vendor-oauth-accounts.md) ·
  [ADR 0142](0142-allow-non-loopback-http-mcp.md) ·
  [03-runtime/01-ipc-protocol](../spec/03-runtime/01-ipc-protocol.md) ·
  [03-runtime/06-host-rpc-protocol](../spec/03-runtime/06-host-rpc-protocol.md)

## 背景

远程 HTTP MCP 服务器（如 Notion、Linear 或定制的企业服务器）通常用
OAuth 2.1 授权而非静态令牌保护端点。Model Context Protocol 规定通过
RFC 9728（OAuth Protected Resource Metadata）和 RFC 8414（Authorization
Server Metadata）做授权发现，通过 RFC 7591 做动态注册，通过 RFC 8707 做
资源指示。

PI-Desktop 此前的 MCP 实现只支持静态 HTTP 头。用户不得不手动获取 Bearer
令牌，否则无法连接受 OAuth 保护的服务器。

## 决策

1. **认证架构**：
   - OAuth 登录在 Electron 主进程中通过 `McpOAuthManager` 运行，镜像
     `VendorOAuth` 的非阻塞模式（ADR 0098）：`mcp/oauth/start` 立即返回
     `{ ok: true, loginId }`，并通过 `pi-desktop/mcp/oauth/event` 流式推送
     进度、授权 URL、完成或失败事件。
   - 用户与浏览器交互期间 IPC 调用从不阻塞。用户或 UI 取消会触发
     `pi-desktop/mcp/oauth/cancel`，关闭回环监听器并中止登录。
2. **回环与安全边界**：
   - 回环回调服务器严格绑定到 IPv4 回环地址 `127.0.0.1` 的临时端口
     （`port 0`），重定向 URI 按 RFC 8252 格式化为
     `http://127.0.0.1:<port>/callback`（避免 IPv6 回环解析不一致）。
   - 在回环 HTML 完成页上渲染的入站查询参数（`error`、`error_description`、
     `code`、`state`）严格做 HTML 实体转义，以消除反射型 XSS。
   - 按 ADR 0142，发现和令牌请求使用 `redirect: "manual"`，防止静默的
     跨主机重定向攻击。
3. **MCP 协议合规**：
   - RFC 8707 的 `resource` 指示在授权端点和令牌交换/刷新请求上都传递，
     指向通过 RFC 9728 发现的受保护资源 URI。
   - 动态客户端注册（RFC 7591）凭据（`clientId`、`clientSecret`）被缓存，
     并在对同一注册端点的后续登录中复用。
   - 令牌有效期（`expires_in`）按数字或字符串（如 `"3600"`）解析，计算出
     绝对过期时间。
4. **令牌存储与隔离**：
   - OAuth 令牌从不到达渲染进程。它们存储在 host-core 的加密密钥项中，
     键为 `secret:mcp:<serverId>:oauth`。
   - 令牌刷新操作按服务器串行化，防止与轮换中的刷新令牌产生竞态。
   - 移动或重命名 MCP 服务器（`mcp.transfer`）会把对应的
     `secret:mcp:<serverId>:oauth` 迁移到新 ID。
5. **运行时集成**：
   - `UserMcpRuntime` 把有效的 OAuth 访问令牌作为
     `Authorization: Bearer <token>` 注入活动的 HTTP MCP 连接。
   - 令牌刷新或重新授权会使陈旧的连接条目失效，活动客户端立即采用更新
     后的凭据。
   - 如果工具调用返回 401 Unauthorized，该服务器被标记为
     `authRequired: true` 和 `state: "failed"`。

## 后果

- 需要 OAuth 2.1 PKCE 的远程 HTTP MCP 服务器可以从设置 UI 安全地完成授权。
- 长时间运行的浏览器交互不会阻塞 IPC 通道，也不会在窗口重载或退出时留下
  孤儿 HTTP 监听器。
- 令牌材料不进入渲染进程和普通日志。

## 修订（2026-09-18）——落地加固

- 授权服务器端点（`authorization_endpoint`、`token_endpoint`、
  `registration_endpoint`、发现的 `authorization_servers` 和
  `resource_metadata`）必须是 HTTPS。回环 `http://127.0.0.1` / `localhost` /
  `::1` 仍然允许，本地 mock 和 LAN 回环 AS 仍可用。MCP 资源 URL 本身仍可
  以是 `http://`（ADR 0142）。
- 动态客户端注册优先使用 RFC 8252 的无端口 `http://127.0.0.1/callback`，
  外加当前的精确 URI。仅当该无端口 URI 已在案，或当前精确重定向 URI 匹配
  时，才复用已存储的客户端；否则注册新客户端。登录还会尝试重新绑定之前
  使用的回环端口，以便要求精确 URI 的严格 AS 继续工作。
- 回环 `/callback` 先校验 `state`，再看 `error` 或 `code`。`state` 不匹配
  的是杂散请求，不中止登录。匹配的回调只被消费一次（重放返回 409）。
- 刷新时的 `invalid_grant` 删除已存储的密钥项；瞬时 5xx 保留现有访问令牌。
- `mcp/oauth/start` 把列出的 `McpServerRecord` 透传给 `onAuthorized`，使
  不在当前工作区运行时中的项目级服务器在登录后仍能完成握手。
- scope 选择仍是 MVP 启发式（有广告时用 `default`，否则用
  `scopes_supported[0]`）。没有按服务器的 scope 选择器、设备码流程或 DPoP。
