# ADR 0271：在反复无应答失败后重建共享 provider 传输

- Status: Accepted for implementation
- Date: 2026-09-16
- Related: [Error codes](../spec/03-runtime/08-error-codes.md) · [Agent runtime](../spec/03-runtime/02-agent-runtime.md) · [ADR 0212](0212-remove-diagnostic-timing-log-streams.md) · issue #234

## 背景

长 session 上的一个 turn 在约 112 秒内重试 Codex 请求十次，每次尝试都报
告 `NETWORK_ERROR: fetch failed`；同一 provider、模型和网络上的新 turn
立即成功。日志记录携带 `phase=stream`、`streamMs=1~2` 和
`retryAttempt=10`，别无其他。

对该证据有两种解读，而第一种是错的：

- `phase=stream` 配上两毫秒的流，看起来像响应头到达*之后*的失败，那意
  味着连接是好的，重试假设是空的。
- 这一对实际上是指纹相反的东西：pi-agent-core 为**从未**发出 `start`
  就结束的流发出 `message_start`，因此 `streamMs` 衡量的是合成的
  start/end 对，而不是已开始的流。`providerWaitMs=112442` 覆盖整个重试
  循环，每次尝试在 `phase=request` 重试中花费数秒，十次尝试中的每一次
  都在任何响应之前死去。

错误解读的后果是共享传输从未被触碰：`node-proxy.ts` 安装一个进程级的
undici dispatcher（`ProxyAgent`、SOCKS5 agent 或普通 agent），而
`closeActiveDispatchers()` 只在设置变化时运行。因此一个池没有注意到就
死去的池化连接在整个重试预算内保持使用，而第一手的 `error.cause`——
node 和 undici 保存 `ENOTFOUND`、`ECONNRESET`、`UND_ERR_SOCKET` 或 TLS
代码的地方——在分类之前已经被 pi-ai 压平成 `errorMessage` 字符串，因
此日志只能说 `networkCategory: unknown`。

## 决策

1. 在原始 Error 仍存在的地方描述被拒绝的 provider fetch：
   `provider-retry.ts` 中的 fetch 包装器对活跃的 cause 链运行
   `describeNetworkFailure`，并报告与直接分类的网络错误相同的经过校验
   的字段（`networkCategory`、`networkCode`、`networkSyscall`、
   `networkHost`），而不是让裸的 `fetch failed` 回退到 `unknown`。字段
   形态、边界和脱敏仍由 `agent-errors.ts` 拥有；不引入新的错误码和新
   的本地化字符串。
2. 随诊断报告传输路由（`networkRoute`：`direct`、`environment-proxy`、
   `http-proxy`、`socks5-proxy`），使代理跳上的失败无需从 errno 推断即
   可读。
3. 对从未收到响应的失败报告 `phase: request`。phase 描述尝试实际发生
   了什么，而不是哪个消息生命周期浮现了它。
4. 当一个来源**反复**以这种方式失败时重建共享传输：在同一 turn 内对
   同一来源第二次连续无应答失败之后，每段连续 streak 一次，进程级每
   30 秒至多一次，绝不因 `dns` 失败（名称解析发生在 socket 存在之前）。
   重建意味着从已应用的设置重建配置的路由。
5. 先交换再关闭：替换 dispatcher 先被安装，然后先前的用 `close()` 关
   闭——绝不用 `destroy()`——如果被关闭的池就是捕获的原始
   dispatcher 引用，则重新指向它。在途请求在它们被派发的池上完成。

## 后果

- issue #234 的下一次发生是可诊断的：日志指明层和路由，重试指示器指
  明 errno。
- Turn 现在可以把一次重试尝试花在新的池上，因此从不自行恢复的传输停
  止被复用。重建不改变重试预算、退避曲线或错误分类。
- 其他 session 能观察到重建：它们的空闲池化 socket 被关闭，因此下一
  个请求要付新的 TCP/TLS 握手。这是延迟代价，绝不是正确性代价，30 秒
  节流加按来源 streak 约束了它。
- `dns` 中断期间的传输失败不触发重建，这是刻意的：搅动池会为不可能
  的收益付出代价。

## 已考虑的替代方案

- **每次失败都重建。** 被拒绝：dispatcher 是进程级的，因此一个
  session 的单一瞬时失败会搅动其他每个 session 的池，长时间中断会每
  次尝试重建一次。
- **从不重建。** 被拒绝：它让同一来源上反复的无应答失败没有恢复路径，
  这正是被报告的行为。
- **按 session 的 dispatcher。** 本次变更拒绝：它改变每个 provider 请
  求的传输所有权模型和代理/绕过组合，这是更大且独立的架构决策。
- **保留原始 cause 消息及其 `name`。** 被拒绝：它会把自由文本的
  provider 文本（URL、header 值、查询字符串）放进日志和 transcript，
  而相比 errno、类别和路由只有很小的诊断收益。
