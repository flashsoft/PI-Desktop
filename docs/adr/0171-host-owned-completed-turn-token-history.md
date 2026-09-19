# ADR 0171: 宿主拥有的已完成轮次 token 历史

- 状态：已接受（由 ADR 0173 修订）
- 日期：2026-09-07
- 决策者：PI-Desktop 核心团队
- 相关：D103、D157、D331、D335、ADR 0014、ADR 0173、
  `03-runtime/04-data-storage.md` §4.6、
  `03-runtime/06-host-rpc-protocol.md`、
  `04-ux/06-settings-ia.md`、E2E-186

## 背景

`turns` 表已经存储 `input_tokens`、`output_tokens` 和 `usage_json`，
`session.endTurn` 也已经接受 `usage`。但 Electron 从未发送它。每条消息
的芯片（D103）从 assistant 的 `meta_json` 读取 provider usage。把子
agent 花费混入这些芯片会让上下文检查器和组合轮次总计虚高。

仍然需要一个持久的已完成轮次总计，以便后续的仪表板无需新的 schema
版本即可展示用户实际花费了多少——包括子 agent。

## 决策

1. **父级 `message.usage` 保持为 provider 报告值。** 子 agent 总计永不
   合并进 assistant 行。
2. **轮次汇总为 `session.endTurn.usage`。** Electron 汇总持久轮次中每个
   父级 assistant `message_end` 的 usage，并加上 `turn_end.subagentUsage`
   增量。只有这个总和存储在 `turns` 上。
3. **`stats.getTokenUsageHistory` 是一个增量式宿主 RPC。** 它在有界的本地
   日历窗口内读取已完成轮次，按 `day` / ISO `week` / `month` 分桶，填充
   空桶，且不提升 `PROTOCOL_VERSION` 或 `SCHEMA_VERSION`。
   `idx_turns_ended_at` 在启动时以 `CREATE INDEX IF NOT EXISTS` 创建。
4. **面向用户的仪表板不在设置中。** ADR 0173 将该界面移至市场插件
   `pi.token-insights`。本 RPC 仍然存在，使包含子 agent 花费的本地已完成
   轮次历史有宿主所有者。Electron 开始发送 `usage` 之前的历史行可能为
   零。

## 后果

- 上下文检查器和 D103 芯片保持精确的 provider 数值。
- 新的已完成轮次会填充宿主历史；较早的轮次可能为零。
- 热力图位于 `pi.token-insights`（ADR 0173）。
- 后续从 transcript `meta.usage` 回填将是一项独立改动。

## 替代方案

- 用子 agent 花费重写父级 `message.usage`：否决（D103）。
- 在宿主设置页扫描 JSONL transcript：否决（无界、所有者错误）。市场
  插件可以扫描本地工具元数据，包括 JSONL。
