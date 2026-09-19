# ADR 0206: 扩展 provider 重试并显示有界进度

- Status: Accepted
- Date: 2026-09-10
- Deciders: PI-Desktop core
- Related: D378, E2E-096, E2E-149, ADR 0091, ADR 0128, ADR 0196

## Context

PI-Desktop 已经拥有 provider 重试，因此请求建立阶段和流中途的失败共享
同一个计数器，pi-ai 不会通过嵌套重试循环放大尝试次数。当前五次速率
限制重试和四次其他瞬时重试的预算，仍然会比产品目标行为更早地把短暂
的 provider 故障暴露给用户。活动轮次行也只显示重试次数，因此无法告
诉用户当前等待还有多久，或这次重试在预算中处于什么位置。

## Decision

1. `PROVIDER_RATE_LIMITED` 和被接纳的非 429 瞬时 provider 错误，各自
   在首次 provider 尝试之后获得十次重试的共享预算。建立阶段和流失败
   继续在各自类别内从同一预算中扣减，provider 尝试至多十一次。两个
   类别保持分离。
2. `packages/shared` 中的 `PROVIDER_RETRY_MAX_RETRIES` 是运行时和渲染
   进程使用的唯一预算常量。主会话、内置 subagent 和一次性 composer
   增强继续使用相同的重试预算和分类。pi-ai 的嵌套重试保持禁用。
3. 延迟行为不变，除了非 429 的计划表在头四次等待之后的重试保持其
   8 秒上限。provider 响应头、30 秒 429 上限、可中止性、仅失败请求
   重放和终止诊断保持 ADR 0091 和 ADR 0128 所定义的行为。
4. 活动轮次的重试状态使用当前的 `retryDelayMs` 和 `since` 渲染整秒
   倒计时，并显示共享预算，例如 `Retrying in 0s · attempt 9/10`。它
   仍然是紧凑的状态行，不会产生中间的 transcript 错误。
5. 认证、模型选择、格式错误请求、上下文、变更、压缩和其他非
   provider 的恢复策略不变。

## Consequences

- 短暂的 provider 故障可以在一个更长、仍有界的同轮次窗口内恢复，而
  不会复制 assistant 消息或生命周期错误。
- 持续性的 provider 故障需要更长时间才会浮出水面，但仍然可中止，并
  在重试预算耗尽后以一条结构化的终止错误结束。
- 用户可以在同一状态行中看到当前等待和重试预算，包括最后一次重试
  期间。
- 不改变宿主协议、存储 schema、provider 配置或嵌套 SDK 重试行为。

## Alternatives

### 增大 pi-ai 的 `maxRetries`

被拒绝，因为嵌套重试会放大尝试次数、模糊阶段共享，并重新引入运行
时可中止策略之外由 provider 控制的休眠。

### 速率限制和其他瞬时失败共用一个预算

被拒绝，因为速率限制和上游故障需要不同的延迟尺度，且一个类别不应
消耗另一个类别的恢复预算。

### 只显示固定的 `/10` 标签

被拒绝，因为状态已经携带了准确倒计时所需的延迟和开始时间；推导剩
余秒数能让 UI 在等待期间保持有用，而不是显示过期信息。

## References

- `docs/spec/03-runtime/02-agent-runtime.md` §5d
- `docs/spec/03-runtime/08-error-codes.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` E2E-096, E2E-149
- `docs/spec/08-meta/decisions-log.md` D378
- `packages/shared/src/provider-retry.ts`
- `packages/agent-runtime/src/provider-retry.ts`
- `apps/desktop/src/components/ChatTranscript.tsx`
