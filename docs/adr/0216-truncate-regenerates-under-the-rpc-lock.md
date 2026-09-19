# ADR 0216: 截断再生成在 RPC 锁之下进行

- Status: Accepted
- Date: 2026-09-10
- Deciders: PI-Desktop core
- Related: D199 / ADR 0060, D258 / ADR 0127, D307, issue #211

## Context

重试、再生成和编辑重发此前从 Electron 主进程截断实时 transcript：先对
整个历史调用 `session.get`，对被丢弃的尾部调用 `session.saveRevision`，
然后用保留的前缀调用 `session.replaceMessages`。

这个往返把保留的 transcript 作为一条 NDJSON JSON-RPC 行传输。宿主
stdin 对超过 64 MiB 的行会通过结束读取器来拒绝，而每个非 Bash RPC
只等待 130 秒。因此，一个几千条消息的会话（磁盘上几十 MB）会以
`host RPC timeout: session.replaceMessages` 失败，而此时 host-core 可
能仍在重写。客户端超时不会取消宿主任务，所以第二次重试会再排队一次
完整重写。上一个轮次可能保持 `running`，因为 `beginTurn` 从未运行。

ADR 0060 已经把轮次完成归档移离这条路径。截断仍然在使用整份
transcript 原语。

## Decision

1. `session.truncateFrom` 是宿主拥有的截断：`{ sessionId, fromMessageId? ,
   truncateBefore? }`。它针对持久 transcript 解析边界（身份优先，计数
   作为旧版回退），中止遗留的运行中轮次，像 Electron 过去那样归档被
   丢弃的再生成尾部，并在状态锁之下重写保留的前缀。RPC 结果是计数
   和可选的分页元数据。没有任何 transcript 快照跨越进程边界。
2. `agent/prompt` 在请求截断时调用该方法，只为启动配置加载一次有界
   的 `session.get`，并在截断之后处置 sidecar 会话。它在这条路径上
   不再调用 `session.replaceMessages` 或 `session.saveRevision`。
3. 超过 64 MiB 的 NDJSON 请求行会被排空到下一个换行符，并以
   `LIMIT_EXCEEDED` 应答。它不再结束 stdin 读取器。
4. 协议版本保持 11。宿主和 Electron 一起发布；没有该方法的宿主会让
   调用失败，而再生成在实时 transcript 被截断之前已经把这视为致命
   错误。

`session.replaceMessages` 保留给真正替换整个数组的调用方（删除消息、
未应答的智能停止）。作为基于锁之外快照的读-改-写，它仍然是不安全的。

## Alternatives considered

- **为 `session.replaceMessages` 提高 130 秒期限：** 64 MiB stdin 上
  限仍然会杀死或拒绝该行。作为唯一修复被拒绝。
- **把保留的数组分块到多个 RPC：** 快照仍然在锁之外，且仍然与
  `session.appendMessage` 竞争。被拒绝。
- **提升协议版本：** 握手要求一起发布的组件之间精确相等，而且 v11
  客户端所依赖的任何东西都没有改变。被拒绝，与 ADR 0060 一致。

## Consequences

- 在数千条消息的会话上重试和再生成，不再依赖通过 JSON-RPC 传输保留
  的前缀。
- 遗留的 `running` 轮次在同一把锁内被结清为 `aborted`，因此随后的
  `beginTurn` 不会得到 `AGENT_BUSY`，UI 失败也不会在 sqlite 中留下
  `running`。
- 超大的控制管道行不再拖垮 host-core。
- 在 Windows 上，Alt+Space 钩子中遗留的强 stdout sender 仍然可能在
  stdin 结束后让 host-core 保持存活（issue #211 中的 130 秒超时）。
  见 ADR 0217。
