# ADR 0245：加固 MCP 市场的公共网络边界

- Status: Accepted
- Date: 2026-09-14
- Related: ADR 0142, ADR 0177, PR #285

## 背景

MCP 市场从 Electron Main 获取用户可配置的 Registry 和目录来源。语法上的
HTTPS 检查和单独的 DNS 查找不足以强制公共网络边界：DNS rebinding 来源
可以在校验时解析为公共地址，而在 HTTP 客户端连接时解析为私有地址。
无界的目录响应也可能耗尽主进程。

官方 Registry 还发布包版本和启动器参数。丢弃这些字段会使安装解析为可
变的 latest 内容，而不是 Registry 所描述的版本。

## 决策

1. 共享的渲染进程和 Main URL 校验只接受无凭据的 HTTPS。Loopback、
   未指定、私有、CGNAT、链路本地、多播、保留、文档、基准测试、ULA、
   站点本地、IPv4 映射和 IPv4 兼容地址范围都被拒绝，包括 URL 归一化和
   尾点形式。
2. Electron Main 在请求前立即解析每个主机名，拒绝任何非公共结果，并
   将选定的公共地址钉到实际的 HTTPS socket 上，同时保留原始主机作为
   TLS SNI 和 HTTP Host。重定向是手动的、仅 HTTPS 的，并在每一跳重新
   校验和重新钉住，最多五次重定向。
3. 市场来源响应限定为 4 MiB，DNS 和 HTTP 请求共享八秒截止时间，每次
   调用最多处理 16 个来源，内存中的目录/搜索缓存是有界的。
4. Registry 的 npm 包在存在版本时映射为 `identifier@version`，PyPI 包
   映射为 `identifier==version`。运行时和包参数按顺序保留。只有具有
   公共 HTTPS 端点的 `streamable-http` remote 可安装；remote header 占位
   符变成显式的安装表单值。
5. 市场 HTTP 目录条目限定为公共 HTTPS 端点。手动的用户自有 MCP 配置
   保留现有的本地/LAN 端点策略。MCP HTTP 重定向绝不把 authorization、
   cookie、proxy-authorization 或 API-key header 转发到另一个 origin，
   响应读取仍受传输截止时间和正文上限约束。

## 后果

- 公共市场数据无法利用 DNS rebinding 把 Main 获取器变成私有网络请求，
  但以操作系统和代理自身的网络行为为准。
- 缓慢、超大、畸形或配置过多的来源作为单个来源失败，不会让 Main 进程
  无界增长。
- 安装就 Registry 包版本而言是可复现的，并保留发布者提供的启动语义。
- Registry/目录条目不能被用作私有 MCP 端点的市场捷径；用户仍可通过
  ADR 0142 允许的显式 MCP 编辑器添加此类端点。
- Main 市场请求使用钉住的 Node HTTPS socket。它们不继承 Electron
  session 的代理解析，因此仅有系统代理的环境在存在代理感知的钉住
  dispatcher 之前，可能把来源报告为不可用；自定义 HTTP(S) 代理环境
  支持遵循 Node 运行时。不会隐式向市场来源发送任何凭据。

## 已考虑的替代方案

- **预检 DNS 后接普通 fetch：** 被拒绝，因为两次解析留下 DNS rebinding
  竞态。
- **仅允许官方 Registry 主机名的允许列表：** 被拒绝，因为产品支持用户
  自托管的目录和 Registry 来源。
- **安装 Registry 的最新包：** 被拒绝，因为它忽略 Registry 选定和发布
  的版本。
