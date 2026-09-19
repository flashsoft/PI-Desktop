# ADR 0221: 思考级别规范值不做翻译直接渲染

- Status: Accepted
- Date: 2026-09-11
- Deciders: PI-Desktop desktop UI maintainers
- Amends: D369, ADR 0202
- Related: [02-i18n-english-first](../spec/04-ux/02-i18n-english-first.md) ·
  [08-component-spec](../spec/04-ux/08-component-spec.md) · E2E-219

## Context

思考级别是 provider 绑定、会话配置、运行时结果和模型元数据共享的协
议值。渲染进程此前在 Composer、模型配置和委托卡片中翻译这些相同的
值，这使得一个稳定的技术值随所选应用语言而变化。

## Decision

1. Composer、模型配置和委托界面按原样渲染规范值 `off`、`minimal`、
   `low`、`medium`、`high`、`xhigh` 和 `max`。
2. 思考级别值不是 locale 目录条目。这些值现有的本地化标签从每个已
   交付的目录中移除。
3. `off` 和 `omit` 按照 ADR 0202 的规定继续在委托说明中省略。本修
   订只改变呈现；生效元数据、钳制、provider 请求、协议和存储不变。

## Consequences

用户在每种语言下都看到同样无歧义的值，provider/运行时术语也保持易
于与配置和诊断对照。这些值有意保持小写，因为那是它们在传输和存储
中的规范表示。

## Verification

`apps/desktop/test/thinking-ui.test.mjs` 验证渲染进程不向 i18n 请求思
考级别标签，而是直接渲染这些值。`packages/i18n/test/catalogs.test.mjs`
验证被移除的思考级别键在每个已交付的目录中都不存在。E2E-219 覆盖实
时、窄布局和恢复的委托呈现。
