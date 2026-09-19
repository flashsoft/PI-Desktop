# ADR 0142: 允许非 loopback 的 HTTP MCP 端点，并显式披露风险

- Status: Accepted
- Date: 2026-09-01
- Related: [ADR 0038](0038-plugin-mcp-bridge.md), [ADR 0056](0056-extension-activation-scope.md), Issue #25

## 背景

自托管的 MCP 服务器常部署在私有 LAN 上，只暴露纯 HTTP 端点。既有
的 MCP 客户端已经支持 streamable HTTP，但校验拒绝每一个非 loopback
的 `http://` URL。即使用户是刻意配置该服务器的，这也阻止了诸如
`http://192.168.1.20:8080/mcp` 这样的常见配置。

旧的限制也适用于插件声明的 MCP 服务器。移除它绝不能移除插件权限
或插件出口边界：HTTP 端点可以观察凭据、工具参数和工具结果，而纯
HTTP 不提供机密性或完整性。

## 决策

1. 用户持有和插件声明的 MCP 服务器接受绝对的 `http://` 和
   `https://` URL。不受支持的 scheme 和畸形 URL 仍然无效。
2. 用户 MCP 编辑器对非 loopback HTTP 显示显式警告：凭据和工具调用
   可能被拦截。该警告是告知性的；输入并保存用户持有的 MCP 端点
   即为用户的同意。
3. 插件声明的 HTTP MCP 服务器仍需要 `mcp.server.remote`，且其主机
   必须被 `manifest.net.domains` 覆盖。相同的警告显示在面向插件的
   审查界面中。既有的高风险权限仍是向远程端点发送工具调用的同意。
4. MCP HTTP 客户端禁用自动重定向跟随，将重定向限制为五跳，只允许
   HTTP(S) 重定向目标，并对每一跳调用可选的端点策略。插件重定向到
   其声明网络白名单之外的主机时，在下一次请求之前被阻止。
5. Marketplace 目录和包下载策略不变。非 loopback 的 HTTP 包下载仍被
   拒绝，因为本决策针对的是 MCP 运行时连接，而不是插件分发。

## 后果

- LAN 托管的自研 MCP 服务器无需 TLS 终结即可工作。
- 网络白名单对插件持有的出口流量仍具有权威性，包括重定向目标。
- 用户和插件审查者可以看到连接何时未加密，但宿主无法让纯 HTTP
  服务器抵御网络拦截。可信网络部署仍是一项运维要求。
- SDK、渲染进程、host-core、客户端测试、安全文档和 E2E 场景必须
  描述同一套 HTTP 策略。
