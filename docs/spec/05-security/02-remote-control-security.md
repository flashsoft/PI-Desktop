# 远程 Agent 控制安全规范

- 状态：目标规范；post-MVP
- 决策：D373 / ADR 0205，由 D374 和 D375 修订
- 适用于：SSH 隧道上的 RACP-WS 和任何后续绑定：RACP-HTTP、
  保留的 RACP-GRPC，以及 Host 链路
- 不削弱：本地 MCP、host-core、插件或 provider 秘密边界

## 1. 安全目标

远程控制必须提供：

1. 经认证的用户和设备身份；
2. 限定到租户、Host、项目、会话、操作和角色的授权；
3. 传输中的机密性与完整性；
4. Rust host-core 无直接网络访问；
5. 宿主拥有的权限与工作区执行；
6. 可撤销与可审计；
7. 有界的资源使用与安全的断开行为；
8. 已完成或已准入的变更不被重放；以及
9. 远程权限上限，使远程控制者不能把会话变成无人值守执行。

本安全设计假设 Agent 可能被提示注入。prompt、工具结果、附件或
模型输出是不可信数据，不得授予已认证 principal 本不具有的权限。

## 2. 信任区

```text
┌──────────────────────┐       HTTPS/WSS        ┌─────────────────────┐
│ Remote Client        │ ──────────────────────▶ │ Remote Gateway      │
│ browser/native/CLI   │                         │ identity + routing  │
└──────────────────────┘                         └──────────┬──────────┘
                                                           │ outbound mTLS
                                                           │ Host link
                                                           ▼
                                               ┌─────────────────────────┐
                                               │ Agent Host               │
                                               │ session + policy owner   │
                                               ├──────────┬──────────────┤
                                               │ pi       │ Rust host    │
                                               │ sidecar  │ core         │
                                               └──────────┴──────────────┘
```

| 区 | 信任假设 | 要求的边界 |
|---|---|---|
| 远程客户端 | 已认证，但 UI 和 prompt 数据不可信 | 有作用域的会话或 bearer 凭据；默认无秘密权限 |
| Gateway | 用户托管的中继，可路由且暴露 | 认证、授权、限流、审计、仅临时缓冲，无原始宿主 RPC |
| Agent Host | 工作区旁的可信本地权威 | mTLS/设备身份、签名路由上下文、宿主策略、远程权限上限 |
| Node sidecar | Agent 运行时，不是策略所有者 | Main/Host 代理 allowlist |
| Rust host-core | 工作区、存储、工具、权限和秘密权威 | 仅 stdio；无公共监听器 |

## 3. 身份与登记

### 3.1 客户端到 Gateway

生产 Gateway 必须在路由前验证已确立的身份。D385 使远程控制在
构造上用户本地。路径中没有项目运营的身份或账户服务：客户端持有
的唯一凭据是配对时由用户自己的 Host 签发的设备 token（§3.4）。
Gateway（如果用户运行一个）自托管在用户的基础设施上，并以同样
由 Host 签发的设备凭据准入客户端；它在路由前验证 token 的 Host
id、过期时间和撤销状态。OIDC 联合和 pi-backend 账户服务超出
远程控制范围，此模型中不存在刷新 token。

因为浏览器无法在 `WebSocket` 和 `EventSource` API 上设置请求头，
Gateway 提供两种认证配置：

- **Header 配置**用于非浏览器客户端：访问 token 在每个请求和
  WebSocket 升级的 `Authorization` 头中发送。
- **Cookie 配置**用于浏览器客户端：设备配对后，自托管 Gateway
  或 Host 签发一个 `HttpOnly`、`Secure`、`SameSite=Lax` 或更严格
  的会话 cookie；WebSocket 升级和 SSE 请求由该 cookie 加每租户
  Origin allowlist 授权，每个变更携带随会话签发的 CSRF token。
  浏览器客户端也可以改用 header 配置经 `fetch` 流式接收事件。

两种配置中，访问 token 都不得放在查询字符串、WebSocket URL、
SSE URL、附件名或事件负载中。仅 bearer 的 API 仍对浏览器请求
验证 Origin。

Gateway 和 cookie 配置属于未排期的 Gateway 和浏览器里程碑
（D375）。第一个远程拓扑使用 header 配置，设备 token 通过 §3.4
的 SSH 引导配对获得。

对于第一个可信设备原型，一次性配对码可以用于引导身份链接。它
必须短生命周期、单次使用、带外显示，并经 TLS 交换。配对码不得
变成长生命周期的 API token。

### 3.2 Agent Host 到 Gateway

Agent Host 必须出站发起生产连接。Host 链路使用双向 TLS 和每宿主
身份证书，或等效的签名设备凭据。

- 登记凭据是一次性的，在登记窗口后过期。
- Host 凭据限定到一个租户和 Host 身份。
- Gateway 在撤销后拒绝证书或设备凭据。
- 凭据轮换不向 Gateway 暴露 provider 秘密。
- Host 拒绝其服务器身份未固定到所配置产品信任根的 Gateway 连接。
- Host 从不接受未认证的入站控制套接字。
- Host 链路只认证 Gateway。中继连接上的用户权限仅来自 §3.3 的
  每连接路由上下文。

直接 LAN 或开发连接仍使用 TLS 和会过期的设备 token。不支持纯
`ws://`、纯 HTTP 和 URL 中的静态共享 token。

### 3.3 Host 能力上下文

Gateway 认证用户之后，为每个逻辑客户端连接签发一个短生命周期的
签名路由上下文：

```ts
type HostRouteContext = {
  tenantId: string
  hostId: string
  subject: string
  clientConnectionId: string
  sessionScopes: string[]
  roles: string[]
  issuedAt: string
  expiresAt: string
  tokenId: string
}
```

Agent Host 在执行任何变更之前验证签名、受众、Host id、过期时间
和会话范围。Gateway 的传输连接本身不是对会话的授权，一个
`clientConnectionId` 的路由上下文不能在另一个上重放。

### 3.4 SSH 引导配对（第一个远程拓扑）

桌面经用户自己的 SSH 会话在远程机器上引导 `pi-host`
（`02-architecture/05-remote-agent-control.md` §5.2）。信任论据是
SSH 登录已经证明了对该机器的 shell 访问；配对只把桌面设备绑定到
它启动的 Host。

- 配对 token 由 Host 在启动时生成，单次使用，在引导窗口内过期，
  且只经 SSH 通道传输；从不写入全局可读文件或 URL。
- 桌面经转发的 loopback 端口把它交换一次，换成存入安全存储的
  设备 token；Host 把该设备记录为该 Host 的 `owner`。
- Host 只绑定 loopback，且只接受来自 loopback 对端的设备 token；
  非 loopback 绑定要求 TLS 和同样的设备 token。
- 经 SSH 上传的引导脚本按桌面版本从 GitHub Releases 下载远程
  平台的 `pi-host` 包，验证随发布公布的 SHA-256，并安装到用户主
  目录下；桌面从不自己上传可执行字节。没有到 GitHub 出站访问的
  机器在第一个版本中无法被引导。
- 在 Host 上撤销设备 token，或从桌面移除该 Host，即结束配对；
  新的配对需要新的 SSH 引导。
- 远程 Host 的 provider 配置由引导步骤经 SSH 通道写入，作为 Host
  本地配置；从不跨越 RACP。

**SSH 凭据处理（ADR 0293）。** 对于用户以该方式配对的宿主，桌面
可以持有其 SSH 登录密码，规则如下：

- 密码由用户在设置中提供，经 OpenSSH 的 askpass 助手传给系统
  `ssh` 客户端，从不是 `ssh` 参数、环境变量值或 URL 的一部分。
- 凭据材料只以 `0700` 目录中 `0600` 文件的形式存在于磁盘上，
  且只在 `ssh` 子进程仍可能提示输入时存在，并在包括转发失败和
  `dispose` 在内的每条路径上移除。
- 它在静态时只通过与设备 token 相同的 OS 钥匙串加密持久化；无法
  解密的密码代价是失去该秘密，而不是失去已配对的宿主。
- 渲染器从不收到它：`RemoteHostSummary` 和
  `RemoteHostSshMetadata` 不携带秘密字段。
- 包含换行的密码无法在 askpass 往返中存活，会在任何远程命令运行
  之前被拒绝。Windows OpenSSH 无法执行该助手，会以附带补救措施
  的方式拒绝。
- 密码模式是排他的：`PubkeyAuthentication=no` 且
  `NumberOfPasswordPrompts=1`。不尝试默认身份，因为加密的本地
  密钥会把唯一的 askpass 回答消耗为密钥口令。同时拥有密钥和密码
  的用户选择密钥模式。

## 4. 授权模型

### 4.1 角色矩阵

| 操作 | Viewer | Controller | Approver | Owner |
|---|---:|---:|---:|---:|
| 列出/获取可见宿主、项目和会话 | yes | yes | yes | yes |
| 订阅会话或宿主事件 | yes | yes | yes | yes |
| 读取会话历史 | yes | yes | yes | yes |
| 以 viewer 创建/附加 | yes | yes | yes | yes |
| 启动或排队回合 | no | yes | optional | yes |
| 停止、中断或取消会话回合 | no | yes | optional | yes |
| 解决工具批准（`allow-once`、`deny`） | no | 默认 no | yes | yes |
| 以 `allow-session` 解决工具批准 | no | no | policy | yes |
| 以权限模式解决 Plan/Goal 批准 | no | 默认 no | 显式 policy | yes |
| 回答输入请求 | no | yes | optional | yes |
| 上传附件 | no | yes | optional | yes |
| 撤销成员资格 | no | no | no | yes |
| 归档会话 | no | no | no | yes |
| 打开或使用会话终端 | no | policy | policy | yes |
| 通告中继工具 | no | no | no | yes |

角色检查是必要但不充分的。Host 还必须检查：

- 会话属于请求的租户和 Host；
- principal 被允许使用该会话的项目；
- 操作在会话状态中合法；
- 持久的权限/模式策略允许所提议的操作；
- 远程权限上限已应用于该回合；以及
- 请求的期望修订和幂等键有效。

### 4.2 不允许通过协议字段提权

以下客户端字段仅为建议性或被禁止：

- `permissionMode` 不能提升持久的会话策略；唯一被接受的权限模式
  字段是 Plan/Goal `approve` 上的显式选择，且按
  `allowedPermissionModes` 验证；
- `admission: "queue"` 不能绕过单回合执行；它只在 Host 队列中
  放置一个有界、可取消的条目；
- `workspaceRoot` 不能替换宿主拥有的项目绑定；
- `toolName` 不能选择 Host 目录之外的工具；
- `confirm` 不能替代批准请求或创建批准结果；
- `providerApiKey`、秘密值和秘密引用不能在回合负载中提供；以及
- 客户端不能冒称另一个 `principal`、`agentName`、`connectionId`
  或 `clientConnectionId`。

Host 从自己的会话和 provider 状态中选择有效的模型/provider 配置。
远程控制不会变成凭据中继。

### 4.3 远程权限上限

由远程 principal 启动的回合在会话持久权限模式与 Host 配置的
`remoteMaxPermissionMode` 两者较低者之下运行，排序为
`ask` < `accept-edits` < `auto`。默认上限是 `ask`。Host 运营者
可以提高它；principal 只有在持有 `approver` 且 Host 策略允许
approver 使用会话自身模式时才能超过它。应用的值以
`effectivePermissionMode` 报告，且从不改变持久会话模式。

该上限适用于 Gateway 路由的 principal。经 SSH 引导配对的桌面
设备（§3.4）在该 Host 上持有 `owner`，被豁免：SSH 登录已经授予
对该机器的 shell 访问，上限无可保留。其回合把会话自身模式报告为
`effectivePermissionMode`。Host 策略
`applyCeilingToPairedDevices`（默认关闭）为希望每个远程回合都从
`ask` 开始的运营者重新应用上限。

只有当 Host 策略允许远程会话授权时，才向远程 approver 提供
`allow-session`；否则请求的 `allowedDecisions` 省略它。远程做出
的会话授权与本地授权一样是按工具名的授权（冻结决策 18），并随
会话结束。

## 5. 网络与传输保护

### 5.1 TLS

- 公共 HTTP、SSE 和 WebSocket 端点必须使用 TLS 1.2 或更新版本；
  首选 TLS 1.3。保留的 gRPC 绑定继承同样的规则。
- 绑定 loopback 并经 SSH 端口转发到达的 `pi-host`，可以在绑定地址
  和对端地址都是 loopback 且出示有效设备 token 时接受纯 `ws://`；
  SSH 通道提供机密性，与 ADR 0203 的 loopback 规则一致。任何非
  loopback 绑定都要求 TLS。
- 生产 Host 链路必须使用双向 TLS 或等效的设备绑定认证通道。
- 证书验证必须包含主机名或服务身份验证；禁用验证不是产品支持的
  开发捷径。
- WebSocket 升级凭据（header 或 cookie）在接受连接之前验证。

### 5.2 Origin 与跨站控制

- Gateway 为每个租户维护显式的浏览器 Origin allowlist，并在来自
  浏览器的每次 WebSocket 升级和 SSE 请求上检查它。
- 仅本地的端点按 ADR 0203 要求绑定 loopback 并验证 loopback
  Origin。
- Cookie 配置的会话使用 `SameSite` 保护，并在每个变更上携带 CSRF
  token，包括经已打开 WebSocket 发送的变更。
- URL 中的 bearer token 一律拒绝。
- CORS 只暴露必需的方法、头部和响应类型。

### 5.3 请求绑定与重放保护

每个变更携带一个与 principal 绑定的幂等键。Host 至少在整个活跃
回合生命周期内保存键和结果，并拒绝以不同负载字节复用。Gateway
重试必须保留键和追踪上下文。

带有过期路由上下文、陈旧会话修订或已撤销连接的请求，在到达
Agent 运行时之前失败。

## 6. 工作区、文件与附件安全

1. 远程请求标识一个会话，而不是任意文件系统根。
2. Host 针对该会话的持久项目或 scratch 根解析每个工具路径。
3. 远程客户端发送附件字节或不透明附件 id，从不发送本地绝对路径
   或 `file://` URL。
4. Host 在回合可以引用附件之前验证声明大小、实际大小、MIME 策略、
   SHA-256 和过期时间。
5. 附件存储对所属租户、Host 和会话私有。
6. 上传不可执行，也不会被自动加入工具根。
7. 不接受 Gateway URL 抓取作为附件来源，防止经远程控制请求的
   SSRF。
8. 工作区读写继续使用当前的宿主沙箱、忽略规则、路径检查和权限
   策略。
9. 在 Gateway 之后，上传目标由 Gateway 服务。Gateway 只强制大小
   上限，把字节以有界分块中继到 Host，在 `attachment/complete`
   成功或上传过期时删除自己的副本，且从不在其他地方检查、持久化
   或服务这些字节。

## 7. 工具与批准安全

远程控制必须使用现有的宿主拥有工具执行路径。它不得暴露：

- 原始 `host.proxy` 调用；
- 原始 Rust host-core 方法；
- 通用的 Electron IPC 调用；
- provider 秘密 get/set/delete 方法；
- 任意进程派生；或
- 与已禁用权限模式等效的远程能力。

批准请求包含有界的脱敏摘要。客户端为活跃请求提交决定；它不提交
待批准后执行的工具调用。决策词汇是本地的那一套：工具的
`allow-once`、`allow-session` 和 `deny`；Plan 和 Goal 契约的带显式
权限模式的 `approve` 或 `reject`。Host 在一次操作中验证请求 id、
会话 id、回合 id、principal 角色、过期时间、允许的决定、权限模式
选择和当前状态。

待处理请求是 Host 状态。Rust host-core 保存待处理权限表及其计时
器；Agent Host 通过 `permissions.pending` 读取它，使晚附加的客户
端收到未决请求。该读取与请求事件同样脱敏，从不返回超出有界预览
的工具参数。

批准寿命是 Host 策略。本地默认保持 120 秒后拒绝（冻结决策 17）。
远程订阅者附加期间默认为 30 分钟（D375）；运营者可以在界限内
缩短或延长它，被阻塞的工具等待该寿命，除非本地或远程决定更早到
达，客户端断开从不延长它。

在断开、过期、中止、崩溃或回合完成之后到达的批准响应是空操作，
或结构化的 陈旧/过期 错误。它从不重启回合。第一个有效决定在
本地和远程客户端之间胜出；之后的有效响应收到已存储的结果。

远程会话的目录包含远程 Host 的工具加上配对桌面通告用于中继的
工具：其用户配置的 MCP 服务器和不需要会话工作区的插件工具。中继
工具在桌面自己的插件权限和确认规则下于桌面上执行，从不在 Host
上执行，也从不针对远程工作区；Host 的权限决定先于中继请求，Host
只发送 Agent 的参数而从不发送秘密，丢失的中继连接使工具失败而
不中断回合。provider 秘密从不沿任一方向跨越 RACP；远程 Host 的
provider 经 SSH 引导通道配置（§3.4）。

会话终端是 Host 机器上以 `pi-host` 用户身份运行、以会话根为工作
目录的 shell。只有 SSH 配对的 owner 设备或持有显式 `terminal`
作用域的 principal 可以打开它；Gateway 路由的 principal 需要从
策略获得该作用域。终端输出是临时的，只能从终端的有界重放环恢复。

## 8. Gateway 与租户隔离

Gateway 里程碑未排期（D375）。这些规则在其排期时生效，保留于此
以使契约不漂移。

- 每条路由以 `(tenantId, hostId, sessionId)` 键控。
- 用户本地部署恰好有一个租户，即 Host 自身；PI 从不运营共享
  Gateway（D385）。
- 第一个部署是单租户。路由已携带 `tenantId`，因此第二个租户是
  运营变更而不是协议变更；多租户测试床存在后运行跨租户隔离测试。
- 客户端不能枚举其签名范围之外的 Host 或会话 id。
- Gateway 缓存包含不透明 id 和路由元数据，不含 provider 秘密。
- Host 重连只有在身份和租户匹配后才替换旧连接；陈旧链路被关闭。
- 一个租户的限流和事件队列独立于其他租户。
- 日志和指标只在保留策略允许的地方携带租户/宿主/会话标识符；
  prompt 和工具内容默认排除。

## 9. 滥用控制与资源上限

Gateway 和 Host 执行其配置限制中较低者：

| 资源 | 初始目标 |
|---|---:|
| 每 principal 控制请求 | 120/分钟 |
| 每会话回合启动 | 20/分钟 |
| 每会话排队回合 | 8 |
| 每 Host 并发客户端 | 16 |
| 每连接并发订阅 | 8 |
| 请求/事件帧 | 1 MiB |
| Prompt 负载 | 256 KiB |
| 附件 | 50 MiB |
| 每 principal 进行中附件上传 | 4 |
| 事件发送队列 | 4 MiB 或 1,000 条持久事件 |
| 每会话打开的终端 | 2 |

限流响应包含重试提示，但从不披露其他租户的配额。慢客户端先丢失
临时事件，并在丢失持久事件之前以可恢复游标断开。Host 从不在
停止读取的远程客户端上无限期阻塞 Agent 回合。

## 10. 审计与可观测性

每个远程控制变更产生一条结构化审计记录，包含：

- `traceId`、`connectionId`、`clientConnectionId`、`principal`、
  `tenantId`、`hostId`；
- 会话和回合 id；
- 操作和结果，包括已启动回合的准入模式和
  `effectivePermissionMode`；
- 授权决定和角色；
- 幂等键哈希，而不是原始键；
- 适用时的事件 epoch 和 sequence 范围；以及
- 错误码，或带所选权限模式的批准决定。

审计记录默认不得包含 provider 凭据、原始 prompt 文本、原始工具
参数、原始工具输出、附件字节或批准秘密。运行时日志器可以在现有
脱敏策略下记录有界的脱敏摘要。

指标应覆盖连接数、重连、认证失败、授权失败、事件滞后、
重放/重同步计数、epoch 变更、队列深度、回合准入延迟、批准延迟、
队列丢弃和 Host 可用性。

所选传输支持时，追踪传播使用 W3C `traceparent`。Gateway 必须在
Host 链路上保留 trace id。

## 11. 撤销与事件响应

Gateway 必须能够撤销：

- 一个用户会话；
- 一个 Host 设备；
- 一个客户端连接；
- 一个会话成员资格；以及
- 一个待处理附件或上传目标。

撤销会关闭活跃连接、阻止新变更、取消被撤销 principal 提交的排队
回合，并保持 Agent Host 的本地回合策略不变。只有当被撤销范围或
事件策略显式要求时才中断运行中的回合；撤销不得静默重放或回滚
已完成的回合。

Provider 凭据轮换仍是 Agent Host 操作。远程客户端不能使用控制
协议导出、测试或替换秘密，除非增加单独、明确规定的凭据管理能力。

## 12. 安全验收门

1. 在显式隔离的本地测试床之外，纯 HTTP 和 `ws://` 被拒绝。
2. Rust host-core 没有公共监听器，远程客户端无法寻址它。
3. viewer 不能启动回合或解决批准。
4. controller 不能选择未授权的会话、工作区、工具、模型、权限
   模式或 provider 秘密。
5. 被提示注入的工具结果不能改变已认证的 principal 或角色。
6. 重复的变更键不能创建重复的回合或批准。
7. 过期/已撤销的凭据不能恢复连接或上传字节。
8. 多租户测试床存在后，跨租户的 Host、会话、事件、附件和审计
   访问被拒绝。
9. 事件重放从不跨越会话或 principal 范围。
10. Gateway 和 Host 日志不含 provider 秘密或未脱敏的工具数据。
11. 慢客户端不能耗尽 Host 内存或停滞 Agent 回合。
12. Host 崩溃、Gateway 重连和客户端重连都不重放已准入的执行。
13. 远程发起的回合从不报告高于配置上限的
    `effectivePermissionMode`，且除非策略允许，否则不存在
    `allow-session`。
14. 浏览器 WebSocket 和 SSE 连接只在带 Origin 和 CSRF 检查的
    cookie 配置下成功，或经 `fetch` 在 header 配置下成功；URL
    token 在两者中都失败。在浏览器里程碑排期时适用。
15. 中继的服务器发起批准请求恰好被回答一次，且回答只到达提出它
    的 Host。在 Gateway 里程碑排期时适用。
16. 绑定 loopback 的 `pi-host` 只接受带有效设备 token 的 loopback
    对端；无 TLS 的非 loopback 绑定无法启动。
17. 配对 token 单次使用，只经 SSH 通道到达，且不能被交换两次或
    从非 loopback 对端交换。
18. 远程会话只暴露远程 Host 的工具目录；桌面插件工具和桌面 MCP
    服务器从不针对远程工作区执行，provider 秘密从不跨越 RACP。
19. 中继工具从不在 Host 上执行，也从不接收 Host 秘密；Host 的
    批准先于中继请求；丢失的中继连接使工具失败而不中断回合。
20. 会话终端只对 SSH 配对的 owner 或持有 `terminal` 作用域的
    principal 打开，其工作目录在会话根内。
21. SSH 登录密码只由用户提供，只经 askpass 助手到达 `ssh`，只
    加密存储，且从不出现在进程参数列表、渲染器或日志行中。

## 13. 修订历史

D374（2026-09-10）增加了浏览器 cookie/header 认证配置、两个被
接受的身份来源、远程权限上限、本地决策词汇、远程批准寿命策略、
Host 链路和 Gateway 附件中继规则、单租户优先条款，以及验收门
13–15。

D375（2026-09-10）增加了 SSH 引导配对（§3.4）、SSH 端口转发后
`pi-host` 的 loopback 规则、SSH 配对 owner 设备的上限豁免、远程
工具目录和 provider 配置规则、验收门 16–18，并把 Gateway 和
cookie 配置条款标记为属于未排期里程碑。

同日记录的 D375 设计门答复把身份来源固定为 PI 账户服务、
`pi-host` 的 GitHub Releases 下载、带验收门 19–20 的中继和终端
规则、30 分钟远程批准寿命，以及 `applyCeilingToPairedDevices`
策略。

D385（2026-09-10）撤回了第一方身份来源：远程控制在构造上用户
本地，每个凭据都由用户自己的 Host 签发，任何 Gateway 都是自托管
的并以这些设备凭据准入客户端。

D454（2026-09-19）为引导增加了 SSH 密码认证（§3.4，ADR 0293）：
上述凭据处理规则和验收门 21。它只对密码目标放宽
`BatchMode=yes`，配合 `NumberOfPasswordPrompts=1` 和
`PubkeyAuthentication=no`，并保持密钥或 agent 为默认路径。
