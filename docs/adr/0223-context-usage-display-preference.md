# ADR 0223: 上下文用量显示偏好

- Status: Accepted
- Date: 2026-09-11
- Deciders: PI-Desktop desktop UI maintainers
- Amends: 0184
- Related: [04-ux/06-settings-ia](../spec/04-ux/06-settings-ia.md) ·
  [04-ux/08-component-spec](../spec/04-ux/08-component-spec.md) ·
  [08-meta/decisions-log](../spec/08-meta/decisions-log.md) (D398) ·
  E2E-250

## Context

Composer 工具栏的上下文用量检查器（ADR 0184 / D347）总是以剩余容量
数字为先导：触发圆环、弹层标题、tooltip 和 `aria-label` 都显示剩余
token 数和百分比。一些用户觉得已用容量数字更直观——尤其是上下文负
载很轻、剩余数字接近整个窗口大小时，一眼看去几乎没有信息量。

## Decision

1. 新设置 `AppSettings.contextUsageDisplay`（`ContextUsageDisplay =
   "remaining" | "used"`）让用户选择上下文检查器以哪个数字为先导。
   默认值（以及缺失或无法识别值的回退）是 `"remaining"`，保持现有行
   为。
2. 当 `contextUsageDisplay` 为 `"used"` 时，Composer 工具栏圆环的弧
   长（`strokeDashoffset`）、触发器百分比和 token 标签、弹层标题、
   tooltip 和 `aria-label` 都切换到已用容量的一对数值，取代剩余容量
   的一对。圆环按 `usedRatio` 而不是 `remainingRatio` 成比例填充。
3. 警告和危险颜色阈值无论显示模式如何都保持基于**剩余**容量（剩余
   ≤ 25% → 警告，≤ 10% → 危险）。显示为“used 78%”的读数仍然会变
   成警告色，因为只剩 22%。
4. 设置 → AI → Defaults 新增一个 `ContextUsageDisplayRow`（分段控
   件：Remaining / Used），放在链接打开位置行之后、回车发送行之前。
5. 该变更仅限渲染进程：不涉及协议、存储 schema、宿主侧迁移或 IPC
   变更。host-core 的设置合并保留未知键，因此持久化的
   `contextUsageDisplay` 值无需 schema 版本提升即可跨升级存活。

## Consequences

- 偏好“我已经花了多少”心智模型的用户得到一致的显示；偏好原有
  “还剩多少”模型的用户默认看不到任何变化。
- 切换到 `"used"` 时圆环弧线方向在视觉上翻转，这是正确的对应关系：
  圆环越满表示消耗的上下文越多。
- 颜色语义在各模式间保持稳定，因此无论选择哪种显示方向，警告/危险
  信号都不会有歧义。
- 没有宿主或存储变更意味着没有迁移风险，也不需要提升协议版本。

## Rejected alternatives

- **布尔开关（show-used: true/false）：** 对互斥的显示模式来说，两
  值分段控件比复选框读起来更清晰，而且 `ContextUsageDisplay` 联合类
  型为未来的模式留出空间，无需类型重命名。
- **颜色阈值也跟随显示模式：** 被拒绝；这会让“used 90%”的圆环在
  只剩 10% 时仍显示绿色，具有危险的误导性。剩余容量是安全信号，必
  须在颜色上保持权威。
