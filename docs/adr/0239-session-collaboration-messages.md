# ADR 0239：宿主持有的 session 协作消息

- Status: Accepted; amended by D446
- Date: 2026-09-13
- Decision: D409 (amended by D446)
- Amends: ADR 0237, ADR 0165, ADR 0213

## 背景

Session Orchestrator 必须在两个方向上寻址已存在的持久 session、复用其
上下文、投递完成回调，并暴露可靠状态。轮询 assistant 文本无法确定一个
turn 的结果。插件设置绝不能成为 session 身份、授权或执行状态的权威。

## 决策

Rust host-core 拥有一个以 message ID 为键的持久 session 通信账本，引用
现有的源和目标 Session ID。Session ID 仍是唯一的 session 身份。Message ID
标识投递和幂等性，绝不构成第二个 worker 或 work 身份。一次投递在执行前
绑定到其实际的持久 turn，结果从该 turn 的持久化终态派生。

官方插件组合经过审查的桌面操作来完成 spawn、send、status、result 和
取消。宿主从相关联的插件工具调用中认证发送方 Session ID；插件无法提供
伪造的发送方。现有目标 session 保留其 project、model、上下文和权限。
新 session 继承发起 session 的 project 和 permission mode。自主 session
创建与双向消息传递分别设界。

Agent Host 现有的准入和 turn 队列仍是执行所有者。账本在出队和进程失败
后仍保留投递。忙碌的目标将消息入队；空闲的目标立即启动它。恢复的工作
遵循现有的启动栅栏，绝不会仅因为应用重启就被重放。权限检查仍由宿主
持有；session 消息传递不能将目标的有效权限提升到发起操作的授权上限
之上。

消息具有明确的 task、message 或 completion 出处，随 transcript 持久化，
并与人类输入分开渲染。实时模型 prompt 和恢复的历史使用相同的来源框架。
Session 消息不是新的人类授权，不参与用户消息编辑或重新生成。被接受的、
进入已认领投递 turn 的用户 steering 仍是人类输入：它不会获得投递来源，
并且客户端提供的 `session_message` 会被剥离（D597）。

被请求的完成回调最多向源 session 产生一条持久完成消息。它引用原始投递
和实际 turn 结果。完成消息绝不请求另一次自动回调。宿主对自主通信链设界，
并保留投递失败以供被动检查。取消保留 session 及其历史。

插件从宿主的公共 model 目录获取可用模型。未指定模型时，从启用了 AI 委派
的绑定中选择；如果没有启用的绑定，则使用配置的默认值。显式请求针对真实
配置的 key、ID、别名、名称和支持的能力意图解析。模糊或未匹配的请求返回
候选或明确的错误，而不会悄悄替换为无关模型。复用 session 不会重新选择
其模型。

现有的 session 列表悬停卡片获得一个按需的宿主投影，包含其创建来源、
当前任务、最近交流、当前状态和绑定到 turn 的结果。该投影是有界的，支持
键盘焦点，不加载完整 transcript，也不为每个侧栏行增加一次读取。

## 兼容性与验证

存储迁移是增量的。现有对话、插件设置和核心 Task 家族保持不变。这是对
ADR 0165 已撤回的跨 session 协调功能的一次刻意的插件中介例外；旧的
A2A broker、工具和协议不会恢复。ADR 0237 的仅父级消息限制和基于轮询的
结果推断被取代。

验证覆盖并发发送方、持久身份、复用、队列准入、跨重载的来源保留、恰好
一次的回调创建、失败和取消结果、权限上限、模型解析、悬停生命周期，以及
相关的 host/Electron E2E 旅程。

## 修订（2026-09-18，D446）：完成通知自身的回复可以保持沉默

Issue #504：完成 prompt 声明通知无需确认，然而运行时的沉默 turn 恢复
（spec 02-agent-runtime §5e）对由此产生的沉默进行了重试，并在一个已经
成功的任务之后报告了 `EMPTY_MODEL_RESPONSE`。本修订界定一个例外；上述
其他决策均不变。

- 对完成通知的第一个已落定 assistant 回复可以在没有可见文本、没有工具
  调用的情况下结束，而不触发沉默 turn 恢复或 `EMPTY_MODEL_RESPONSE`。
  该回复作为已完成消息以正常终止生命周期发出。Provider 错误和中止保持
  其处理方式；对同一尝试的 provider 重试保留该例外。
- 该例外恰好覆盖那一次回复。无论第一个已落定响应是沉默、文本还是工具
  批次，它都会被消耗，因此在同一次运行中跟随工具结果或被接受的用户
  steering 之后的回复是普通的。一旦一条被接受的 steering 消息进入模型
  上下文，该例外也会被撤销，并且每次新运行都会重新计算它。
- 只有 Main 从排队的宿主账本记录解析出的出处才能启用它：`kind: completion`、
  当前目标 session，以及非空的 message 和 reply-to ID。Prompt 文本、插件
  或模型内容、task 和普通 message 投递、复制的通知框架以及恢复的历史都
  不能。不添加任何协议字段或调用方权限。
- 一条被接受的沉默回复仍不值得重发。Main 将其持久化为空的已完成行
  （渲染进程隐藏，宿主中为 `NULL` 文本），但运行时将其排除在自己的条目
  和 pi 的 transcript 状态之外，上下文投影丢弃任何没有内容块的
  assistant，与恢复的 transcript 已有的行为一致。因此下一次请求不会
  携带可能让 provider 拒绝或跳过的空 assistant 消息。

验证：针对被接受形态、信任边界、工具批次、provider 重试、回复前后的
steering 以及上下文排除的运行时单元覆盖；针对真实宿主账本、sidecar 和
本地 SSE provider 的 `pnpm test:e2e:session-completion`。参见
E2E-SESSION-completion-notice-allows-silence。
