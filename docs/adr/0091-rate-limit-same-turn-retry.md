# ADR 0091: 将 provider 速率限制路由到有界的同轮重试

- Status: Accepted
- Date: 2026-08-14 (amended 2026-08-19)
- Deciders: PI-Desktop core
- Related: D233, D245, E2E-149, ADR 0050, D186

## 背景

provider 的 HTTP 429 是暂时性的，但它既可能发生在响应建立之前，
也可能发生在流已经开始之后。旧的实现把这两种情况分给 pi-ai 的一
次建立重试和运行时的一次流中重放。这使持续但仍可恢复的速率限制
过早暴露给用户，并让有效预算取决于失败发生在哪个阶段。

OpenCode 的会话重试策略提供了行为参照：速率限制以有限的最大次
数静默重试，provider 的重试头优先于客户端退避，等待可中止，且只
渲染最终耗尽的失败。PI-Desktop 必须保持该行为，但不引入
OpenCode，也不通过 pi-ai 自己的包装层叠乘重试次数。

## 决策

1. `PROVIDER_RATE_LIMITED` 拥有一个运行时重试预算：初始 provider
   尝试之后最多重试五次。该预算由请求建立和流恢复共享，因此无论
   429 发生在哪里，一轮最多有六次 provider 尝试。pi-ai 的嵌套重
   试在该路径上被禁用。
2. 每次 429 重试都是静默且可中止的。延迟优先级为
   `retry-after-ms`、`retry-after` 秒数、`retry-after` HTTP-date，
   然后是 OpenCode 风格的指数退避——从 2 秒开始，最多 25% 正向
   抖动。每个服务器或计算出的延迟都封顶为 30 秒。运行时从底层
   fetch 捕获状态和响应头，因为 pi-ai 的正常响应回调不暴露失败
   的响应。
3. 流式开始之前的 429 由 provider 流适配器重试。流式开始之后的
   429 由运行时在从模型上下文中移除失败的 assistant 消息后重
   放。两条路径使用同一个控制器和同一个预算。两个阶段都在对
   provider 消息分类之前应用捕获到的响应状态，因此即使响应体是
   通用的，429 仍会进入 429 预算，而已知的不可重试分类仍是终态
   的。主会话和每个内置子代理都使用此策略。
4. 中间的 assistant 错误、生命周期结束事件和重复的 assistant 气
   泡都被抑制。恢复的尝试复用原来可见的 assistant 消息 id，并发
   出一个终态生命周期事件。失败的尝试不会被持久化进下一次模型
   上下文。
5. 认证、模型选择、畸形请求、上下文和其他不可重试的失败不进入
   429 路径。现有的非 429 暂时性行为保持独立有界：一次建立重试
   和一次流中重放。
6. 第五次 429 重试失败后，正常的 assistant 错误和生命周期错误各
   发出一次。诊断保留脱敏的 provider 错误、`phase`、
   `providerStatus`、有界的等待/计时段，以及 `retryAttempt: 5`。
   在等待期间中止会取消计时器并阻止后续 provider 请求。

## 后果

- 短暂的 provider 速率限制突发无需错误卡片、toast 或手动操作即
  可恢复，无论 429 在建立阶段还是流式阶段到达。
- 持续的速率限制保持有界：总共六次尝试、最多五次退避、单次等待
  最长 30 秒。最终失败保持可见且可操作。
- 来自 OpenAI 兼容网关等 provider 的重试头会被遵守，而畸形或过
  大的值无法无限期扣住一轮。
- 主会话和子代理不会漂移到不同的速率限制策略，生命周期消费方收
  到一个连贯的 assistant 轮次。

## 替代方案

- 保留 pi-ai 的建立重试并再增加一次运行时重试。被拒绝：嵌套的包
  装层会叠乘尝试次数，并使预算取决于阶段。
- 把每个 provider 失败都重试五次。被拒绝：凭据、模型 id、畸形请
  求和上下文溢出不会通过重复修复。
- 保留一次同轮重试并依赖 UI 的手动操作。被拒绝：它过早暴露暂时
  性 429，且违背了为 provider 边界要求的 OpenCode 风格行为。

## 参考

- OpenCode session retry behavior (behavioral reference only)
- `docs/spec/03-runtime/02-agent-runtime.md` §5d
- `docs/spec/03-runtime/08-error-codes.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` E2E-149
- `docs/spec/08-meta/decisions-log.md` D245
- `packages/agent-runtime/src/provider-retry.ts`
- `packages/agent-runtime/src/runtime.ts`
- `packages/agent-runtime/src/subagent.ts`
