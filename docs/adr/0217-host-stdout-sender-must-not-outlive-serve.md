# ADR 0217: 宿主 Stdout Sender 不得比 Serve 活得更久

- Status: Accepted
- Date: 2026-09-11
- Deciders: PI-Desktop core
- Related: D390 / ADR 0216, issue #211

## Context

ADR 0216 阻止了再生成把保留的 transcript 作为一条 NDJSON 行传输，也
阻止了超大行结束 stdin 读取器。这对 issue #211 中的 Windows 故障是必
要的，但并不充分。

在 v0.14.6 上，超过 64 MiB 的 NDJSON 行会让 stdin 读取器发送错误并中
断。随后 `serve()` 丢弃它的 stdout sender 并等待写入线程。在 macOS 和
Linux 上，这个等待会立即返回，因为没有其他东西持有该通道。在
Windows 上，`keyboard::start` 在 `OnceLock` 中为 Alt+Space 钩子存储了
一个强 `UnboundedSender`。这个克隆让写入线程阻塞在 `blocking_recv`
中，`serve()` 永不返回，host-core 保持存活。Electron 仍然认为子进程
可用，因此进行中的调用撞上 130 秒期限
（`host RPC timeout: session.replaceMessages`），而不是
`host-core exited`。第二次重试同样超时。遗留的轮次保持 `running`。

带有 null JSON-RPC id 的 `LIMIT_EXCEEDED` 应答有相同的客户端症状：
Electron 把 `id: null` 当作通知忽略，并等待期限耗尽。

在一个 4659 条消息 / 76 MB 的会话上实测：保留前缀的
`session.replaceMessages` 是一条 56.91 MiB 的行，在 macOS 上约 565 ms
完成。因此 130 秒的 Windows 超时并不是重写成本。在 v0.14.6 二进制
上，65 MiB 的行在 macOS 上约 50 ms 退出（`EPIPE` / 进程退出）。

## Decision

1. Windows 键盘钩子只保留 `WeakUnboundedSender`。发送快捷键时将其升
   级。丢弃 serve 的最后一个强 sender 仍然会关闭写入通道，因此
   host-core 可以在 stdin EOF 之后退出。
2. stdin 结束后，`serve()` 最多为 stdout 写入线程等待 5 秒，然后即
   使某个其他克隆泄漏了也返回。协议版本保持 11。
3. Electron 测量每个宿主 RPC 载荷的 UTF-8 字节长度，并在写入 stdin
   之前以 `LIMIT_EXCEEDED` 拒绝超过 64 MiB 的行。该常量位于
   `@pi-desktop/shared`，必须与 host-core 保持一致。
4. 如果宿主仍然看到超大行，它从被截断的前缀中窥视 JSON-RPC id，使
   `LIMIT_EXCEEDED` 应答能够被匹配。

`session.truncateFrom` 仍然是再生成路径（ADR 0216）。整份 transcript
的 `session.replaceMessages`（删除消息、未应答的智能停止）仍然存在；
如果这些载荷增长到超过 64 MiB，客户端预检就是防线。

## Alternatives considered

- **O(tail) 的 jsonl 截断：** 让再生成在巨型会话上更便宜，但无法解
  释 130 秒的 Windows 超时。推迟。
- **把 stdout 写入线程守护化：** 在某些平台上，进程退出仍然会等待非
  守护的 OS 线程。被拒绝，改为丢弃强 sender。
- **提升协议版本：** 宿主和 Electron 一起发布；v11 客户端所依赖的
  任何东西都没有被移除。被拒绝，与 ADR 0216 一致。

## Consequences

- Windows 上的 host-core 在 stdin EOF 之后退出，方式与 macOS/Linux 已
  有的行为相同。
- 超大的控制管道写入立即以 `LIMIT_EXCEEDED` 失败，而不是
  `host RPC timeout`。
- 遗留的强 sender 让 `serve()` 阻塞的时间不可能超过 5 秒。
