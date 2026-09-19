# ADR 0205: 远程 Agent 控制使用专用的宿主边界

- Status: Accepted for implementation (post-MVP); amended by D374 and D375
- Date: 2026-09-09
- Decision: D373 (amended by D374 and D375)
- Related: ADR 0004, ADR 0011, ADR 0203, ADR 0165,
  `02-architecture/05-remote-agent-control.md`,
  `03-runtime/19-remote-agent-control-protocol.md`,
  `05-security/02-remote-control-security.md`

## Context

PI-Desktop 目前在 Node sidecar 中嵌入 `pi-agent-core`。Electron 主进程
拥有 sidecar 和 Rust host-core 桥接，渲染进程通过类型化的 Electron
IPC 通信。本地 sidecar 和 host-core 边界使用 stdio NDJSON JSON-RPC。
ADR 0203 添加了一个可选的、仅限回环的 MCP 控制面，用于经过审查的
本地桌面自动化。

远程控制引入了不同的信任和生命周期问题。远程 UI 必须能够在轮次继续
进行时断开连接、在不丢失事件的情况下重连、回答宿主拥有的审批，并与
其他客户端共享会话。暴露现有的 IPC、`host.proxy` 或 host-core
JSON-RPC 会绕过当前的权限边界，并把 Electron 进程变成公共后端。

为本决策审查的 GitHub 实现收敛于一种分层模型：OpenAI Codex 和
Microsoft VS Code 使用 JSON-RPC 形态的交互式宿主协议；MCP 将本地
stdio 与远程 HTTP 流式传输分开；Google A2A 将规范的操作模型与
JSON-RPC、gRPC 和 HTTP/JSON 绑定分开。

## Decision

1. 保持 Electron 主进程、Node pi sidecar 和 Rust host-core 作为本地
   权限路径。Rust host-core 继续不绑定任何网络端口。
2. 定义一个逻辑上的 **Agent Host** 边界，拥有会话、轮次、事件序列、
   审批、附件、工作区策略和崩溃恢复。
3. 定义 **PI Remote Agent Control Protocol (RACP) v1** 作为传输中立
   的语义契约。
4. 使用基于 WSS 的 JSON-RPC 作为主要的交互式远程绑定，HTTP/JSON 加
   SSE 作为浏览器绑定，基于 TLS 的 gRPC 作为原生端和 Gateway-to-Host
   绑定。这些绑定 MUST 共享相同的状态机、游标、幂等性、授权和错误
   语义。
5. 在生产环境中，将认证、用户授权、路由、速率限制、吊销和审计放在
   独立的 Remote Gateway。Agent Host 以出站方式打开 Gateway 连接，使
   桌面不需要公共入站端口。
6. 在迁移期间，Electron 主进程可以在现有处理器之上托管一个仅供开发
   的门面。生产部署的目标是在工作区旁边运行独立的 Agent Host 进程
   组；线上契约不变。
7. 远程控制保持在 post-MVP。ADR 0004 对当前 MVP 仍然成立；本 ADR 是
   其 Follow-up 一节所要求的专门后续工作。
8. 不复用已撤回的 subagent A2A/Peer 协调机制。A2A 仅作为绑定分离的
   设计参考。

## Consequences

### Positive

- 本地安全边界保持完整。
- 运行中的 Agent 不依赖于任何一个 UI 连接。
- WebSocket、浏览器 HTTP/SSE 和 gRPC 客户端可以共享一个语义 API。
- 事件游标、快照、幂等性和审批生命周期都是显式的。
- Gateway 可以路由多个 Host，而不拥有工作区密钥或持久的 transcript
  事实。
- Go、Rust、Node 和浏览器客户端可以使用对其部署最自然的绑定，而不
  产生各自独立的产品行为。

### Costs and risks

- 需要一套 Host/Gateway 身份与吊销系统。
- 事件重放和快照保留增加了存储和测试复杂度。
- 长寿命的 WebSocket/gRPC 连接需要负载均衡和背压设计。
- 规范 schema 和生成的绑定一致性测试套件会成为发布界面。
- 独立 Agent Host 的抽取是一个迁移项目，而不是一次小的传输切换。

## Alternatives considered

### 暴露当前的 JSON-RPC stdio 端点

被拒绝。Stdio 是本地进程边界，没有远程身份模型，而且会暴露宿主内部
细节，而不是一个经过审查的控制界面。

### 所有链路都使用 gRPC

被拒绝。gRPC 适合类型化的服务间通信，但交互式 Agent 还需要浏览器兼
容性、服务器发起的审批/输入请求，以及方便的传输调试。gRPC 仍然是一
个必需的绑定，但不是唯一的绑定。

### 只使用基于 HTTP 的 JSON-RPC

作为完整设计被拒绝。它对命令来说很简单，但完整的远程控制会话需要一
条高效的双向路径来承载审批、输入、事件和取消。HTTP/SSE 仍然是带显
式响应端点的浏览器绑定。

### 将 Electron 主进程直接暴露在公共端口上

被拒绝。这会扩大桌面攻击面，将公共可用性与 UI 进程耦合，并给一个面
向网络的进程过多的本地生命周期权限。

### 将本地 MCP 扩展为公共远程 API

被拒绝。MCP 仍然是本地的、经过审查的桌面自动化界面。RACP 需要持久
的 Sessions、Turns、游标、多客户端角色、Gateway 身份和绑定对等性，
这些都在当前 MCP 契约之外。

### 恢复历史上的 A2A/Peer 技术栈

被拒绝。ADR 0165 移除它是因为 subagent 协调不是产品需求。远程控制
协议是客户端到宿主的控制，而不是 subagent 消息传递。

## Amendment (D374)

Date: 2026-09-10。一次实施前审查发现，D373 草案在分层上是正确的，
但与它必须包装的桌面不匹配，且要求的内容超出了 v1 所能承载的范围。
以下变更适用于上文的决策 3、4 和 6，以及四份远程规范。

1. **一个规范性的 v1 绑定。** `RACP-WS` 是 v1 中唯一的规范性绑定。
   `RACP-HTTP` 是同一契约的浏览器配置文件，必须在任何浏览器客户端
   之前交付。`RACP-GRPC` 是保留的、非必需的，若被采用则从契约源生
   成。决策 4 的“MUST share”规则适用于每个交付的绑定。
2. **一个 IDL。** RACP 资源以 typebox schema 的形式编写在
   `packages/shared` 中（冻结决策 28）。JSON Schema fixture、文档表
   格和任何 Protobuf 文件都从它们生成。草案的“JSON 为规范、proto 由
   生成产生”方向被撤回。
3. **先做无头 Agent Host 模块。** 决策 6 的 Electron 门面被
   `packages/agent-host` 取代，这是一个不依赖 Electron 的模块，拥有
   会话与轮次准入、每会话轮次队列、审批协调器、内存事件日志和快照
   构建器。桌面 IPC、本地 MCP 和 RACP 是该模块的三个调用方，因此独
   立 Host 的抽取是移动一个模块，而不是重新拆分主进程。
4. **完整的本地决策词汇。** 远程审批为工具提供 `allow-once`、
   `allow-session` 和 `deny`，为 Plan 和 Goal 契约提供带显式权限模
   式的 `approve` 或 `reject`；输入请求携带 asktool 问题和跳过语义。
   Plan 或 Goal 审批是会话级的转移，其寿命超过提交它的轮次。
5. **游标携带 epoch；delta 是短暂的。** 游标是
   `{ epoch, sequence }`。流式 delta、工具进度和活动阶段实时投递，
   从不排序、从不重放、也从不计入重放窗口；快照改为携带活动条目。
   第一个事件日志驻留在 Agent Host 内存中，重启即开始新的 epoch；
   将其移入 host-core 需要单独的 ADR。
6. **宿主拥有的轮次队列。** `turn/start` 立即准入，或进入一个有界的
   Host 队列，每个客户端（包括本地桌面）都能看到它。渲染进程的内存
   prompt 队列会在多于一个客户端可以控制会话之前被替换。
   `turn/stop`（优雅）和 `turn/interrupt`（中止）是独立的操作。
7. **待处理请求是 Host 状态。** Rust host-core 暴露
   `permissions.pending`，使晚接入的客户端能收到未决请求，且远程决
   策会关闭本地桌面卡片。
8. **远程权限上限与审批寿命。** 远程发起的轮次在会话模式与 Host 配
   置的上限（默认为 `ask`）两者中较低者之下运行。本地 120 秒拒绝超
   时保持为默认值；启用了远程控制的 Host 可以为远程订阅者接入期间
   提出的审批配置更长的有界寿命。
9. **Host 链路中继配置文件。** Gateway-to-Host 连接复用逻辑客户端连
   接，使服务器发起的审批请求和附件字节无需入站端口即可到达正确的
   端点；Gateway 只在 Host 确认之前缓冲上传字节。
10. **浏览器认证配置文件。** 浏览器无法在 WebSocket 和 EventSource
    API 上设置请求头，因此 cookie 配置文件（HttpOnly cookie、Origin
    白名单、CSRF token）是浏览器路径，header 配置文件是非浏览器路
    径；两种路径都继续禁止 URL token。
11. **身份来源与租户。** Gateway 可以校验 OIDC/OAuth 2.0 provider
    或第一方产品账户 token；该选择在 rollout R3 启动时记录（已被
    D375 第 10 条取代，后者确定了 PI 账户服务）。首次部署是单租户
    的；`tenantId` 保留在每条路由中，跨租户测试在有多租户测试设施
    后运行。
12. **目录新增。** 添加 `host/list`、`project/list`、
    `session/history`、host 范围的事件订阅和 `turn/cancel`；被推迟
    的本地操作按名称列出，以便没有任何绑定发明替代品。

## Amendment (D375)

Date: 2026-09-10。现在由已记录的需求而非传输广度来排列里程碑。
Issue #176 和 #140 要求从本地桌面操作远程 Linux 或 WSL 机器上的项
目；issue #100 要求在消息渠道上接收任务和审批通知，并能用简单命令
回复；没有已记录的请求要求桌面的浏览器或手机客户端。下面的设计门
答案由维护者于同日选定。

1. **第一种远程拓扑：桌面作为 SSH 隧道上 `pi-host` 的远程客户端。**
   `pi-host` 包打包了无头模块、Node sidecar 和该平台的 host-core 二
   进制，版本与桌面一致。通过用户自己的 SSH 会话上传的引导脚本从
   GitHub Releases 下载它，校验已发布的 SHA-256，将其绑定到回环地
   址启动，并与桌面配对。它通过 `RACP-WS` header 配置文件上的 SSH
   端口转发到达；仅当绑定和对端都是回环且出示了设备 token 时才接受
   裸 `ws://`。第一版不支持无法出站访问 GitHub 的机器。
2. **桌面 RACP 客户端适配器。** Electron 主进程通过现有的
   `lib/api.ts` 界面向渲染进程呈现一个远程 Host；渲染进程保持传输
   无关，并按能力隐藏未覆盖的功能。
3. **远程宿主配置文件（RACP v1.1）。** `session/configure`、
   `session/fork`、`session/rename`、`session/delete`、
   `session/compact`、`workspace/list`、`workspace/read`、
   `workspace/diff`，以及 `terminal/open`、`terminal/input`、
   `terminal/resize`、`terminal/close` 操作加入目录，使模式、模型、
   工作面板的文件和 diff，以及远程机器上的终端都能对远程会话工作。
4. **同一里程碑中的反向工具中继。** 配对的桌面用 `tools/advertise`
   广播其用户配置的 MCP 服务器和无工作区依赖的插件工具；Host 将它
   们合并进远程会话的目录，并在 Host 的权限决策之后，通过桌面上的
   `tool/execute` 服务器请求、在桌面自己的插件权限下执行它们。需要
   工作区或文件系统访问的插件工具被排除。R2 作为一个里程碑交付。
5. **远程会话所有权划分。** Transcript、工具、工作区、权限、
   provider 密钥、`~/.agents` 定义、在 Host 上配置的 MCP 服务器和计
   划任务都驻留在远程 Host 上。远程 Host 的 provider 配置通过 SSH
   引导通道写入，绝不通过 RACP。
6. **上限豁免作为 Host 策略。** 通过 SSH 引导配对的桌面设备持有
   `owner`，默认豁免于远程权限上限，因为 SSH 访问已经超过上限所保
   留的一切；Host 策略 `applyCeilingToPairedDevices` 会重新应用它。
7. **持久化的轮次队列。** 排队的轮次及其幂等键由 Rust host-core 持
   久化，重启后按序恢复，并保留到某个控制器接入为止。schema 版本提
   升在 R1 启动时由它自己的 ADR 记录。
8. **远程审批寿命。** 当远程订阅者接入时，默认审批寿命为 30 分钟，
   操作者可在有界范围内调整；本地 120 秒默认值不变。
9. **第二个排定里程碑：出站消息集成。** Host 旁边的一个适配器首先
   将脱敏的事件摘要中继到 webhook，然后通过出站渠道中继到 Telegram
   和 Slack，并在关联主体的角色下把固定的命令词汇映射到轮次和审批
   操作。它不打开任何监听器，也绝不阻塞轮次。
10. **Gateway 身份来源。** 当 Gateway 被排定时，它校验 pi-backend 仓
    库所规定的 PI 账户服务的第一方 token；不计划 OIDC 联邦。
11. **未排定。** 带 Host 链路的 Gateway、带 cookie 认证的浏览器配置
    文件，以及保留的 gRPC 绑定，都保留其规范，只由后续的产品决策排
    定。
12. **验收。** E2E-231 和 E2E-232 是已排定里程碑的验收目标；
    E2E-227 和 E2E-228 在其里程碑被排定时适用。

## Amendment (D385)

Date: 2026-09-10。维护者要求远程控制在构造上就是用户本地的：路径中
不得有任何项目运营的身份、账户或中继服务，且用户的客户端绝不得通
过项目运行的服务进行认证。

1. **没有第一方身份。** D375 第 10 条被撤回。客户端持有的唯一凭据
   是配对时由用户自己的 Host 签发的设备 token。OIDC 联邦和
   pi-backend 账户服务不在远程控制范围内。
2. **Gateway 仅作为自托管中继。** PI 不运营 Gateway。如果 Gateway
   拓扑有朝一日被排定，用户在自己的基础设施上运行它，它以 Host 签
   发的设备凭据准入客户端；其路由上下文携带 Host id，而不是项目的
   租户。
3. **出站连接都是用户自己的。** Host 只连接用户的 SSH 主机、用户用
   自己的 bot token 或 webhook 配置的消息渠道、用户配置的模型
   provider，以及只读的、经校验和验证的 `pi-host` GitHub Releases
   下载。
4. **不变。** SSH 隧道拓扑、设备配对、消息集成以及每一个 RACP 形态
   都已经满足这条规则；规范只改动措辞，不改动结构。
