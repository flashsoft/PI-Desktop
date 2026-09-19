# ADR 0295: 会话 thinking 参数省略

- 状态：已接受
- 日期：2026-09-20
- 决策者：PI-Desktop 运行时与 UX 维护者
- 修订：ADR 0194、ADR 0144、ADR 0221
- 相关：D456、E2E-203a

## 背景

子代理已经提供 `thinkingLevel: omit`（ADR 0194）：agent 簿记状态保持
`off`，但请求使用低层 provider 流，因此不合成任何 thinking 覆盖。会话此前
只接受七个规范等级。显式的 `off` 与省略该参数并不等价；适配器经常把
`off` 序列化为 `reasoning_effort: "none"` 或 `thinking: disabled`。用户需要
在 Composer 的模型 × 推理菜单上有这第三种选择。

## 决策

1. 在七个规范等级之外，持久化 `omit` 作为一种会话 `thinkingLevel`。模型
   绑定的 `thinkingLevels` 和目录能力列表保持为七个规范值；`omit` 是客户
   端选择器，不是已发布的能力。
2. 只要所选模型暴露至少一个已启用的规范等级，Composer 推理菜单就在前面
   追加 `omit`。徽标渲染规范字符串 `omit`（ADR 0221）。非推理模型保持仅
   `off` 的菜单。
3. 运行时钳制在推理模型上保留 `omit`，否则映射为 `off`。agent 簿记保持
   `off`；父级流使用与子代理相同的低层省略路径
   （`thinkingLevelMap.off = null`）。
4. Schema v19 重建 `sessions`，使 CHECK 包含 `omit`。握手协议版本不变。

## 后果

- Composer 可以让 provider 适配器的默认 thinking 行为保持控制，而不必禁用
  thinking。
- 现有会话保留其存储的规范等级。
- 子代理继承父级的 `omit` 时继续保持省略。
