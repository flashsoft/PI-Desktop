# ADR 0225: 从生效会话上下文恢复延迟工具

- Status: Accepted
- Date: 2026-09-11
- Related issue: #225
- Related pull request: #231

## Context

惰性工具激活让可选 schema 不进第一个 provider 请求，但新 prompt 此前
会清空活动的延迟集合，同时在模型上下文中保留成功的 `ToolSearch` 行
和工具结果。因此模型可能看到某个能力可用的证据，而下一个请求却省略
了它的 schema。模式切换之后也会出现同样的不匹配。

## Decision

在每次新 prompt 之前和模式切换之后，sidecar 清空其内存中的延迟激活
集合，并从生效的 `buildSessionContext` 投影中恢复它。成功的
`ToolSearch` 结果贡献其 `addedToolNames`；延迟工具的成功结果贡献该工
具的名称。只有当名称仍在当前模式的延迟目录中时才会被恢复。失败的、
被中断的或缺失结果的占位符行会被忽略，assistant/user 的散文文本绝不
会被解析为激活证据。

现有的工具注册表、宿主权限检查、工作区和 scratch 收容、超时和审计行
为保持不变。压缩和模式目录重建继续定义哪些历史标记是生效的。

## Consequences

- provider 请求与生效 transcript 中保留的成功工具证据保持一致。
- 运行时重启后，当某个延迟能力的成功标记仍在生效上下文中时，可以复
  用它，而无需把可选 schema 移入核心集合或授予新权限。
- 失败的、被中断的、过期的和模式不允许的激活不会复活延迟工具。

## Alternatives

### 保持清空集合并要求新的搜索

被拒绝，因为模型仍然收到成功的激活标记，可能调用其 schema 不在请求
中的工具。

### 解析 assistant 或 user 散文文本中的工具名

被拒绝，因为散文文本不是权威的激活证据，可能激活一个从未成功过或已
不再被允许的能力。

## References

- `docs/adr/0048-lazy-per-turn-tool-activation.md`
- `docs/spec/03-runtime/02-agent-runtime.md` §7.1
- `docs/spec/03-runtime/03-tools-and-permissions.md` §2.1
- `docs/spec/06-delivery/04-e2e-test-plan.md` E2E-008a
