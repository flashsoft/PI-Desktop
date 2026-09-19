# ADR active-turn-steering: 将输入框转向绑定到活跃的持久轮次

- 状态：已接受
- 日期：2026-09-12
- Issue：https://github.com/vastsa/PI-Desktop/issues/164

## 背景

输入框（Composer）可以排队后续消息，但无法重定向一个正在运行的轮次。
第二个提示会被正确地以 `AGENT_BUSY` 拒绝。pi-agent-core 已经提供了
`Agent.steer`；Codex 的 [turn/steer 契约](https://learn.chatgpt.com/docs/app-server#steer-an-active-turn)
提供了 expected-turn 准入模型。

## 决策

Send/Enter 保持为后续消息。Alt+Enter（macOS 上为 Option+Enter）使用一条
增量添加的 `agent/steer` 通道，并携带 `expectedTurnId`。现有的队列切片
乐观地提交输入，并恢复被拒绝的草稿。agent IPC 处理器复用针对运行中模型
和工作区的附件校验；sidecar 在异步准备完成后重新检查目标，然后调用
`Agent.steer`。

转向保留活跃配置和持久轮次。已启动的工具先完成，下一次模型请求才会消费
输入。运行时在轮次的收尾边界以及等待委派期间处理准入。Stop 关闭准入，
并把已接受的输入保留为历史，而不独立重放它。

现有的事件持久化模块通过 outbox 记录输入。`precedingAssistant` 在用户行
之前为尚未完成的回复预留位置。Host 追加允许一个终止态的 assistant 替换
自己的流式预留，同时保留顺序和轮次所有权；已完成的行在重放时保持不可变。
恢复流程就地更新预留。持久化的 `UiMessage.steering` 标记保护输入不被
Smart Stop 影响，包括渲染进程重载之后；不需要单独的渲染进程提交注册表。
Host 来源判定把指向某个已被认领的协作交付轮次的转向视为额外的人类输入：
它必须指向该交付所属的会话，不继承该交付的 agent 来源，并剥离任何客户端
提供的 `session_message`（D597）。

## 后果与验证

不需要新的 provider 传输、host 协议版本或存储迁移。流式预留更新是
仅追加消息持久化的唯一例外。现有回归套件覆盖周边行为；
E2E-AGENT-alt-enter-steers-active-turn 描述了完整旅程，并在完成渲染态
E2E 验证之前保持为 Draft。
