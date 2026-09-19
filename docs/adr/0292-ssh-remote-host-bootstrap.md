# ADR 0292: 远程宿主的 SSH 引导

- 状态：已接受，待实现
- 日期：2026-09-19
- 决策：D453
- 相关：ADR 0205（D373 / D374 / D375）、ADR 0285（D448）、ADR 0286（D449）、
  `02-architecture/05-remote-agent-control.md` §5.2、
  `05-security/02-remote-control-security.md` §3.4、
  `06-delivery/07-remote-control-rollout.md` §2 R2b

## 背景

ADR 0286 交付了桌面侧 R2a 内核，并明确把引导排除在范围外："今天每个已配对
宿主都假设回环 URL 已存在。"要到达另一台机器，用户得自己在那里安装
`pi-host`、启动它、自己打开 `ssh -L`，然后把得到的 URL 和一个配对令牌粘贴
进设置。

R2 的验收标准不接受这一点（rollout §2 R2b，安全规范 §3.4）。桌面必须能在
用户已经可以通过 SSH 到达的机器上安装并配对宿主，同时遵守安全规范固定的
两条边界：桌面从不上传可执行字节，也从不持有 SSH 密钥。

系统现状的三个性质塑造了设计：

- `release.yml` 把 `pi-host-<version>-<platform>-<arch>.tar.gz` 及其
  `.sha256` 发布到 `v<version>` GitHub Release，且包的构建矩阵只有 Linux
  x64。
- 已配对宿主是 `remote-hosts.json` 中的一个 URL，但被引导的宿主没有稳定的
  URL：转发的本地端口每次启动时才选定。
- `bootstrap/remote-hosts.ts` 已经拥有每个宿主的生命周期，因此引导插入该层
  而不是与它并列。

## 决策

引导由 `apps/desktop/electron/main/remote/` 下的五个模块、一个扩展的启动钩子
和一个新的 IPC 通道组成。

1. **系统 `ssh` 客户端是传输。** 调用外部 `ssh` 优于链接 SSH 库，因为这样
   用户的 `~/.ssh/config`、agent、跳板机和 `known_hosts` 原样生效，而且应用
   从不持有可泄露的密钥。`BatchMode=yes` 是这一点的保证：需要交互式密码或
   口令的宿主会立即以带类型的错误失败，而不是让模态框挂在看不见的提示
   后面。该模块总是设置 `StrictHostKeyChecking=accept-new`、
   `ConnectTimeout=15` 和 `ExitOnForwardFailure=yes`。

2. **纯的发布坐标（`pi-host-release.ts`）。** 产物按*远程*平台、以*桌面*的
   版本解析，发布管线公布的 SHA-256 是信任锚。`PUBLISHED_TARGETS` 是发布矩阵
   （今天是 `linux-x64`），因此任何其他目标在下载开始之前就
   以 `HOST_BOOTSTRAP_FAILED` 被拒绝，而不是在下载中途变成 404。URL 推导、
   `uname` 解析、校验和文件解析、恒定工作量的摘要比较，以及版本一致性规则
   都是纯函数，不碰网络也不碰 SSH。

3. **一个脚本在远程运行（`pi-host-bootstrap-script.ts`）。** 它下载钉住的
   URL、校验摘要、安装到 `$HOME/.pi-desktop/pi-host` 下、在回环地址上以
   `--pair`（重新）启动宿主，并回显 `PI_HOST_READY` /
   `PI_HOST_PAIRING_TOKEN`。它在 `umask 077` 下运行，因此单次使用的配对令牌
   只存在于引导目录内的工作文件和 SSH 通道的 stdout 上——绝不是全局可读
   路径，绝不是 URL（安全规范 §3.4）。每个失败都在输出
   `PI_HOST_BOOTSTRAP_FAILED <step>` 一行之后以非零退出，因此桌面报告的是
   失败的步骤而不是裸退出码。生成它是纯的，每个输入都经 `shellQuote` 做
   shell 引用，这让测试能真实执行生成的文本。

4. **`ssh-transport.ts` 是端口，不是依赖。** `exec` / `execWithInput` /
   `forward` / `dispose` 让编排器能对假实现做端到端测试而不派生进程；
   `createSystemSshTransport` 是唯一派生进程的实现。`execWithInput` 把脚本
   通过管道喂给 `sh -s`，因此脚本从不经历 argv 往返，也从不落到一个需要
   清理的远程文件里。到达 `ssh` argv 的值若为空或以 `-` 开头会被
   `assertSshArgument` 拒绝：作为独立 argv 条目，前导短横线会变成选项
   （`-oProxyCommand=…`），而不是目的地。

5. **转发是持久的、有归属的，不是顺带产物（`ssh-tunnel.ts`）。** 持久化
   记录存的是 SSH 描述符而不是 URL；管理器预留一个回环端口，运行
   `ssh -N -L 127.0.0.1:<local>:127.0.0.1:<remotePort>`，并在每次启动时推导
   `ws://127.0.0.1:<port>/v1/racp/ws`，因此重启会先重建隧道再连接，而不是
   拨打一个陈旧的端口。引导自己的转发是*被收养*的，而不是关掉重开，因此
   配对只花一条隧道的代价。转发只有在本地端口接受连接后才算就绪，因为
   健康的 `ssh -N -L` 什么都不打印。

6. **版本一致性在转发存在之前检查。** 下载的就是桌面的版本——没有版本
   协商——且 `PI_HOST_READY.version` 必须等于它（有无 `v` 前缀都容忍）。
   不匹配在任何转发存在之前抛出 `HOST_VERSION_MISMATCH`（D375），桌面在
   退出途中拆掉它派生的 SSH 进程，而不是留下一个连了一半的宿主。

7. **注册表存描述符，不存 URL。** `metadata.transport = "ssh"` 加
   `metadata.ssh`（host，可选 port / user / identity 文件、`remotePort`、
   `version`）。`remote-hosts.json` 是用户可编辑的，因此描述符在每次读取时
   重新校验：缺失 host 或 `remotePort` 超出 1..65535 会把记录降级为"不是
   SSH 宿主"，而不是用垃圾参数派生 `ssh`。本次改动之前写入的记录不带
   `transport`，读作 `direct`。

8. **一个 IPC 通道和一次配对交换。** `pi-desktop/remoteHost/bootstrap` 加入
   `list` / `pair` / `remove` 的行列，携带的是宿主，绝不是凭据。
   `connection/pair` 交换被抽取为 `exchangePairingToken`，供粘贴 URL 路径和
   引导路径共用，且它在每条路径上都关闭其一次性连接。`bootstrapHost` 在
   持久化记录之前收养转发，因为设备令牌只在那条转发上有效。

## 不变量

- 应用不存储、不提示、不传输任何 SSH 密钥。引导触及的唯一凭据是系统
  `ssh` 客户端自己解析的那些。
- 没有可执行字节经过 SSH 通道。远程脚本自己下载包；桌面发送的字节是
  stdin 上的脚本文本。
- `pi-host` 保持只绑定回环。桌面通过转发到达它，从不打开自己的监听器。
- 渲染进程保持传输无关。`RemoteHostSummary.transport` 是可选的，渲染为
  一个标签；没有渲染进程调用对它分支。
- 空注册表保持完整 no-op：不连接任何东西，不打开任何隧道。
- 失败的引导不留下任何运行中的东西：除非调用方收养了转发，其传输会被
  处置；连接失败的 SSH 宿主的隧道会被关闭，而不是闲置着。

## 范围外

R2b 及之后仍然开放：

- ADR 0286 中的**终端工作面板客户端（第 5 阶段）**和**反向工具中继
  （第 6 阶段）**。两者仍未构建。
- **经 SSH 通道的 provider 配置。** 规范 §3.4 和 §5.2 把它列为引导步骤的
  一部分，但它需要宿主侧的 provider schema 工作，不在本次改动中，因此
  刚引导好的宿主在配置 provider 之前仍会以 `MODEL_NOT_CONFIGURED` 关闭
  `turn/start`。
- **重同步看门狗**：`resync.required` 事件仍被丢弃。
- **非 Linux 远程目标，以及 Windows 作为*远程*目标。** 只发布
  `linux-x64`，因此两者都在下载开始之前被拒绝。

## 考虑过的替代方案

- **用 `ssh2` 式库代替系统客户端。** 被拒绝：它重新实现用户已有的 config、
  agent 和跳板机语义，还要求用户重新输入应用绝不应持有的凭据。
- **在桌面下载产物再上传。** 被安全规范 §3.4 拒绝：桌面从不上传可执行
  字节。
- **让脚本自己读取发布的 `.sha256`。** 被拒绝：桌面应持有信任锚，这也让
  脚本的输入只有一个 URL 加一个摘要。
- **在注册表中存转发后的 URL。** 读取路径更简单，但本地端口跨启动不稳定，
  重启后会拨打一个无人监听的端口。被拒绝，改用描述符。
- **把宿主装进用户级服务管理器。** 被拒绝：脚本安装到 `$HOME` 下，并重启
  它自己的 pidfile 跟踪的进程，这使引导保持零特权。

## 测试

发布规则和脚本生成器是纯的，由 `node --test` fixture 覆盖；生成器的测试
对产出的文本运行 `sh -n`，并在打桩的 `PATH` 下真实执行它。编排器对假
传输、假校验和抓取、预留端口和假配对交换做端到端运行，因此步骤顺序、
摘要失败路径、无转发的版本不匹配路径，以及"收养而非重开"规则都在不派生
进程的情况下得到断言。

## 后果

- `remote-hosts.json` 增加第二种记录形态并保持向后兼容：现有记录不带
  `transport`，读作 `direct`。
- 没有 GitHub 出站访问的机器仍然无法被引导（D375）。
- 桌面现在会派生 `ssh` 进程，这是新变化，对端点安全工具可见；此前远程栈
  只打开出站的 WebSocket 连接。
- 16 个新的 `settings.remoteHosts` i18n 键必须在每个随附语言中翻译，因为
  目录类型是穷尽的。
- 无新的运行时依赖：引导没有给 `apps/desktop` 增加 SSH 库、HTTP 客户端或
  归档工具。
