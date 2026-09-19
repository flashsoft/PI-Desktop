# ADR 0050: 有界 provider 流恢复与诊断

- 状态： 已接受（经 D259 与 D378 修订，见下）
- 日期： 2026-08-04

## 修订（D259，2026-09）

决定 D259 取代了本 ADR 第 2 和第 3 点中的重试算法。请求建立阶段的"一次
provider 级重试"以及流已开始后的"750 ms 退避后重试一次"被替换为一个共享
的、有界的非 429 瞬时失败预算：首次尝试之后重试四次（共五次 provider 尝
试），无论失败落在请求建立阶段还是流中途都从同一池中扣减，采用确定性的
1 s / 2 s / 4 s / 8 s 调度并以 8 s 封顶，且优先遵循 `retry-after` 头。
`PROVIDER_ERROR` 加入了 `STREAM_FAILED`、`NETWORK_ERROR`、`TIMEOUT` 所在的
可重试集合。常量位于
`packages/agent-runtime/src/provider-retry.ts`
（`PROVIDER_TRANSIENT_MAX_RETRIES`、`PROVIDER_SETUP_RETRY_INITIAL_DELAY_MS`、
`PROVIDER_SETUP_MAX_RETRY_DELAY_MS`）。429 限流预算保持独立。决定 D378
（ADR 0206，2026-09-10）随后把两个预算都提高到首次尝试之后重试十次，共
享为 `PROVIDER_RETRY_MAX_RETRIES`，同时为非 429 等待保留 1 s / 2 s / 4 s
调度及其 8 s 封顶。本 ADR 的其他内容（分类、单一可见气泡、诊断、变更恢
复）仍然成立。下文原文按原样保留以作记录。

## 背景

provider 重试层覆盖了建立请求期间的失败，但 provider 也可能在 assistant
流已开始之后终止。此前的 runtime 把常见的 `terminated` 消息归类为通用的
`PROVIDER_ERROR`，结束该轮，并让 regenerate 创建新 runtime 并重新播种
transcript。这使瞬时流失败代价高昂，也让长时间的 provider 等待难以从日志
归因。

重复的变更失败有相关的代价：模型可能持续修补一个过时的 patch，或用过期
上下文重试 `Edit`，而不是对目标文件取一份新快照。

## 决策

PI-Desktop 应用以下有界恢复策略：

1. 把 `terminated`、过早的流关闭以及等价的不完整流消息归类为可重试的
   `STREAM_FAILED` 错误。只在 `AppError.details` 中保留安全的、低基数的
   provider status/code 字段。
2. 为 pi-ai 请求建立配置一次 provider 级重试，延迟可中断并以 8 秒封顶。
   转发持久会话 id，使支持请求亲和性的 provider 适配器可以复用它。
3. 当流已开始后发生瞬时的 `STREAM_FAILED`、`NETWORK_ERROR` 或 `TIMEOUT`，
   在同一轮内经过 750 ms 可中止退避后重试一次。从下一个模型上下文中移除
   失败的 assistant，复用其可见的 assistant 消息 id，并替换部分内容而不
   是创建重复气泡。第二次失败是终结性的。
4. 在可用时附上 `phase`、`providerWaitMs`、`streamMs`、provider
   status/code 与 `retryAttempt`。这些字段仅用于诊断；消息保持脱敏与有
   界，除现有的截断摘要外绝不包含凭据或原始 provider 响应体。
5. 变更指令为小范围唯一替换选择 `Edit`，为连贯的整文件重写选择 `Write`。
   编辑不匹配后，agent 遵循行锚定契约的重新读取或完整揭示恢复，并且在同
   一 prompt 内每个路径可有三次计数失败。第三次计数的失败 `Edit`，或第三
   次失败的 shell patch 命令，返回 pi-agent-core 的终止工具提示，使 agent
   带着确切的不匹配停止。Shell 的 `apply_patch`、`git apply` 与 `patch`
   被显式视为 patch 命令；prompt 指示 agent 改用 `Edit` 或 `Write`。agent
   不得手工编辑 unified-diff 产物，也不得对同一路径发起并发变更。

## 后果

- 单次瞬时流终止不再强制 regenerate 或新的 transcript/runtime 边界。
- 渲染进程对恢复的轮次只看到一个 assistant 气泡和一个终结生命周期。
- provider 错误仍可从 agent 计时与应用会话日志诊断，而不暴露密钥。
- 重试预算有限：持续中断、认证错误、上下文失败与第二次流失败保持可见且
  可处理，而不是进入无界循环。
- 变更恢复是确定性且有界的。真正过期的文件或无效的 shell patch 在第二次
  失败后需要新的用户/模型决策，而不是又一次自动工具轮次。

## 备选方案

### 在同一轮内重试每个 provider 错误

已拒绝，因为认证、模型选择、畸形请求与上下文错误无法通过重放同一请求修
复。

### 无限重试流失败

已拒绝，因为它会掩盖持续中断、消耗 provider 配额，并阻止用户重新掌控会
话。

### 为每次流尝试创建新的 assistant 气泡

已拒绝，因为部分和失败的尝试会看起来像多个回答，并使持久 transcript 对
账复杂化。

### 让 patch 修复完全由 prompt 驱动

已拒绝，因为仅靠措辞无法可靠约束模型的重试循环。宿主的唯一上下文检查与
按会话的变更串行化仍是执行边界，而 runtime 的终止工具提示在
pi-agent-core 中强制第二次 Edit 或 shell-patch 失败即停止。

## 参考

- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/03-runtime/03-tools-and-permissions.md`
- `docs/spec/03-runtime/08-error-codes.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- 决定 D186
