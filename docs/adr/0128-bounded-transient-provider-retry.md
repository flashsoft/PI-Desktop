# ADR 0128: 瞬时 provider 失败共享一个有界预算

- Status: Accepted
- Date: 2026-08-21
- Deciders: PI-Desktop core
- Related: D259, E2E-096, E2E-149, ADR 0050, ADR 0091, D186, D245

## 背景

上游网关故障在 OpenAI 兼容端点上很常见。一个回答
`OpenAI API error (502): {"type":"api_error","message":"Upstream API
request failed."}` 的中继报告的是一次短暂的上游故障，而不是被拒绝的
请求：同一个提示词通常在下一次尝试就能成功。

ADR 0091 给了 HTTP 429 一个共享的五次重试预算，但刻意让其他所有
瞬时失败留在旧的分离策略上：请求建立阶段一次重试、流中段一次重放，
各自由自己的布尔值守卫。随之而来的是两个缺口。第一，在响应头之前
到达的 502 会消耗掉唯一一次建立阶段重试，因此第二个 502 会变成
终态错误卡片，尽管第三次尝试很可能成功。第二，流阶段完全排除
`PROVIDER_ERROR`，因此流中段的网关故障根本不会被重放。内置子代理
更严格：它们的认定要求 `phase === "request"`，因此 delegate 在第一次
流中段瞬时错误时就失败。三个 provider 入口点（主会话、子代理、
Composer 增强）已经漂移成三种不同的策略。

非 429 的退避还忽略 `Retry-After`。发出带显式 `Retry-After` 的
502/503 的网关，无论服务器要求什么，都会按固定的 750 ms 流中段
计时器或 500 ms 建立阶段计时器被重试。

## 决策

1. 非 429 的瞬时 provider 失败共享一个有界的逻辑轮次预算：初次尝试
   之后重试四次，共五次 provider 尝试。该预算由请求建立和流交付共享，
   因此在阶段之间移动的故障无法重置或放大它。
2. 预算恰好接纳 `NETWORK_ERROR`、`TIMEOUT`、`STREAM_FAILED` 和
   `PROVIDER_ERROR`。`PROVIDER_ERROR` 现在在流阶段和建立阶段都被
   接纳。其他所有分类——包括来自畸形 400/422 请求的不可重试
   `PROVIDER_ERROR`——保持终态。
3. 重试延迟优先尊重服务器。`retry-after-ms`、`retry-after` 秒数，
   然后是 `retry-after` HTTP 日期，优先于客户端退避，非 429 路径
   上限为 8 秒。捕获的响应头为任何可能携带可用延迟的状态码保留
   （429、408、409 和 5xx），而不再只限 429。没有可用响应头时，等待
   按 1、2、4、8 秒的纯加倍时间表进行，两个阶段完全一致且确定
   （无抖动），因为它调节的是一次失败的请求，而不是同步的限流
   突发。
4. 主会话、内置子代理和一次性 Composer 增强使用相同的错误码、相同
   的预算大小和相同的延迟优先级。
5. 重试保持静默且可中止，429 保留其来自 ADR 0091 的独立五次重试
   预算。两个预算互不消耗。
6. 预算耗尽时发出一条终态 assistant 错误和一条生命周期错误，对持续
   的非 429 瞬时失败携带 `retryAttempt: 4`。
7. 只重放失败的请求。会话、transcript 和工具状态不受影响：失败的
   assistant 消息离开下一个模型上下文，其可见消息 id 被复用，因此
   重试绝不重启轮次或重跑已完成的工具调用。

## 后果

- 短暂的上游 502/503/504 突发可以在不出现错误卡片的情况下恢复，
  无论它发生在响应头之前还是流中段。
- 持续的上游故障保持有界且可见：五次尝试、最多四次退避共 15 秒，
  单次等待上限 8 秒。
- 终态非 429 错误之前的最坏延迟变大，但有界：四次等待（15 秒退避）
  而不是一次。
- 声明自己节奏的网关会被尊重，而畸形或过大的响应头值无法拖住一个
  轮次。
- 三个 provider 入口点不可能再漂移成不同的瞬时失败策略。

## 备选方案

- 改为提高 pi-ai 的 `maxRetries`。否决，理由记录在 ADR 0091：嵌套
  包装器会放大尝试次数，使预算依赖于阶段，并重新引入不可中止的
  SDK sleep。
- 把非 429 瞬时失败并入 429 预算。否决：限流和网关故障需要不同的
  延迟尺度，而一个共享计数器会让 502 突发消耗限流预算。
- 对每个可重试的分类都重试三次。否决：`EMPTY_MODEL_RESPONSE`
  和上下文失败有自己的恢复路径，重新发送相同请求无法修复它们。

## 参考

- `docs/spec/03-runtime/02-agent-runtime.md` §5d
- `docs/spec/03-runtime/08-error-codes.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` E2E-096, E2E-149
- `docs/spec/08-meta/decisions-log.md` D259
- `packages/agent-runtime/src/provider-retry.ts`
- `packages/agent-runtime/src/runtime.ts`
- `packages/agent-runtime/src/subagent.ts`
- `packages/agent-runtime/src/prompt-enhancement.ts`
