# ADR 0173: 插件拥有的 token 用量仪表板

- 状态：已接受
- 日期：2026-09-07
- 决策者：PI-Desktop 核心团队
- 相关：D103、D331、D335、ADR 0171、`04-ux/06-settings-ia.md`、
  E2E-186、市场插件 `pi.token-insights`

## 背景

ADR 0171 增加了宿主拥有的已完成轮次 token 历史和设置 → 用量入口。市场
插件 `pi.token-insights` 已经发布了私有的本地仪表板（热力图、KPI、
过滤器、连续记录、agent 工具），覆盖 PI-Desktop、Claude Code、Codex 和
OpenCode。同时保留两个界面会在偏好设置中重复一个更弱的、仅限
PI-Desktop 的矩阵。

插件不能写入 `pi.sqlite`（D002）。它们已经只读外观和 provider 标签。
宿主仍然需要 `session.endTurn.usage`，使子 agent 花费无需重写父级
`message.usage` 即可持久化。

## 决策

1. **设置中没有用量入口。** 偏好设置为常规、AI 和快捷键。搜索不索引
   用量标签页。
2. **`pi.token-insights` 是面向用户的仪表板。** 命令面板关键词
   （`usage`、`tokens`、`用量`）打开该插件。
3. **宿主持久化保留。** Electron 仍然把父级 `message_end` usage 加上
   `turn_end.subagentUsage` 汇总进 `session.endTurn.usage`。
   `stats.getTokenUsageHistory` 仍然是本地已完成轮次汇总的增量式宿主
   RPC / IPC。它不是设置页面。
4. **插件可以把宿主已完成轮次的余量并入其 PI-Desktop 事实立方体**——
   当这些总计超过 transcript assistant `meta.usage` 时——使子 agent
   花费可见且不重复计算 JSONL 消息。它仍然永不重写 `message.usage`。

## 后果

- 想要热力图的用户安装或打开 Token Insights。
- Electron 开始发送 `usage` 之前的历史轮次在宿主 RPC 中仍可能为零；
  插件的 JSONL 扫描仍然是那些天的回填来源。
- 后续包装 `stats.getTokenUsageHistory` 的第一方插件 API 是一项独立
  改动。

## 替代方案

- 在插件旁边保留设置 → 用量：否决（重复的信息架构）。
- 删除宿主轮次持久化：否决（D331 记账）。
- 让插件用 turns 表取代 JSONL：否决（会丢失逐消息的 model/provider
  排名和持久化之前的历史）。
