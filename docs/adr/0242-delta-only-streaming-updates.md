# ADR 0242：仅增量的合并流式更新

- Status: Accepted
- Date: 2026-09-14
- Decision: D412
- Amends: ADR 0127, ADR 0130, ADR 0149, ADR 0153
- Issue: #299

## 背景

长 Agent turn 以 200+ tokens/s 从 provider 流入，但 PI-Desktop 以低得多
的速率显示它们，而且 turn 运行越久越慢。停止后加新 prompt 会恢复速度；
同一 turn 后来的短 thinking 块仍然缓慢。Subagent 表现出同样的滞后。
TTFT 正常。

每个 `message_update` 都会压平完整的 assistant 快照，用 `startsWith` 与
累积字符串比较，把整个 `UiMessage` 通过 `JSON.stringify` 写到 sidecar
stdout，然后 AgentHost 的 `boundPayload()` 又为检查帧大小再序列化一次。
渲染进程批处理只在这些工作之后才运行。因此长度为 n 的流在热路径上
花费约 O(n²) 的字节和 CPU，并让管线积压。

渲染进程已经把历史与活跃尾部分开，但活跃的 `AssistantTurn` 在每个
token 上重建每个 activity part，并把新的 delegation `Map` 交给每个
`ActivityGroup`，因此同一 turn 中的历史分组会随尾部一起重新渲染。

RACP 已经把 `item.delta` 记录为非持久增量文本，完整行在
`item.completed` 中完成。但本地事件仍在每次更新时携带完整快照。

## 决策

在运行时中保留 `currentAssistant` 作为内存权威。在仅追加的流式路径上，
发出带有以下内容的 `message_update`：

- `stream: "delta"`
- `deltaText` / `deltaThinking`
- 当 provider 替换而非追加时的 `resetText` / `resetThinking`
- 精简的 `message` 身份（id、role、status、createdAt、model/provider、
  parentToolCallId、agentName），不增长 `content` / `thinking`

`DesktopAgentRuntime` 中的 16ms 合并器连接待处理的增量，并在
`tool_start`、`tool_end`、`message_end`、`error`、`abort`、重试快照和
其他语义事件之前立即冲刷，以保持顺序。

`message_start` 和 `message_end` 仍携带完整 `UiMessage`。重试和其他
快照替换省略 `stream`，仍替换活跃行。

第一方消费方应用增量：

- AgentHost 修补 `activeItems`，并对小型增量帧跳过 `JSON.stringify`
- Electron main 从增量重建 inflight 检查点快照
- 渲染进程连接同帧增量，然后修补活跃的 `UiMessage`

transcript 投影复用未变化的 activity part，并在 delegation 状态/计时
`Map` 内容未变化时保持其稳定。只有活跃尾部的 ActivityGroup 接收
`runtimeActivity`。

协议版本保持 11。新字段是增量的。忽略 `stream` 并用 `message` 替换的
消费方仍会收到作为权威行的 `message_end`。

## 后果

- 跨进程流式字节随新块增长，而不随累积快照增长。
- 长 turn 不再形成让后来的短块排队等待的序列化积压。
- 活跃 turn 中的历史 activity 分组不再为每个尾部 token 重新渲染。
- 崩溃恢复检查点仍能看到重建的完整快照。
- 远程 RACP `item.delta` 载荷符合文档化的增量契约。

## 替代方案

- 只在渲染进程合并：被拒绝；O(n²) 的序列化已经在 sidecar 和 main 中
  发生。
- 丢弃 token 或把防抖提高到 50ms：被拒绝；那是掩盖积压而不是消除它。
- 新增 `message_delta` 事件类型：不必要；在现有 `message_update` 上的
  增量字段让旧消费方继续编译。
