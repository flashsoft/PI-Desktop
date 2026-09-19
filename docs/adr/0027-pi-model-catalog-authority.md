# ADR 0027: 让 pi-ai 成为模型元数据的权威

- 状态: 已接受
- 日期: 2026-07-27

## 背景

PI-Desktop 此前从 pi-ai 读取推理提示，但重建了一个更小的运行时模型，
带桌面端自有的默认值和 provider 级覆盖。因此已知模型丢失了 pi 的
上下文窗口、输出上限、输入模式、定价、请求头和部分兼容性记录。
Settings 还允许用户独立于所选模型替换推理支持、thinking 级别、
上下文大小、输出大小和 temperature。

这种分裂的所有权使模型行为取决于两套配置。它还要求 PI-Desktop 修补
单个模型的语义，例如 MiMo 的 thinking 方言和 Claude 自适应 off 行为。

## 决策

对于从 pi-ai 内置目录解析出的每个模型，pi-ai 是模型元数据和兼容性
行为的唯一权威。

- Electron 主进程解析一个完整的可序列化 pi 模型快照：名称、base
  URL、推理标志、thinking 级别映射、输入模式、定价、上下文窗口、
  输出上限、请求头和兼容性数据。
- Sidecar 原样使用该快照，只替换运行时连接身份：所选模型 id、配置
  的 provider id、所选 API 适配器和显式配置的端点 URL。
- PI-Desktop 不改写已知模型的推理支持、thinking 级别、上下文上限、
  输出上限、temperature 或兼容性标志。
- Provider Settings 不再暴露模型参数覆盖，模型菜单不再为未知模型
  启用推理。
- pi 无法识别的自由形式模型 id 仍然允许。它使用显式的通用纯文本、
  非推理回退和保守的运行时上限。这保留了开放的自定义 provider
  路径，而不声称 pi 尚未发布的模型能力。
- 缓存/发现的模型列表仍是选择和离线发现数据；它们不覆盖运行时
  模型语义。
- 对已知模型的修正属于上游 pi-ai 或 pi-ai 升级，而不是 PI-Desktop
  的模型专属补丁。

这取代 D102 和 D096/D107 的 provider 覆盖条款。它不改变 ADR 0018
的持久会话 thinking 级别枚举或 transcript 处理。

## 后果

- 已知模型在原生和兼容端点上保留钉住的 pi-ai 版本发布的完整元数据。
- PI-Desktop 少维护一个模型矩阵，也不会悄悄偏离 pi 的适配器。
- 更新 pi-ai 可能有意改变可用的 thinking 级别或模型上限，必须由
  目录解析测试覆盖。
- 未知自定义模型仍可用于文本，但模型专属的推理、视觉、定价和大
  上下文保证要等到 pi 识别它们。
- 遗留的 provider 覆盖字段出于兼容性在持久化记录中可能仍然可读，
  但不再影响运行时解析。

## 备选方案

### 在 pi 元数据之上合并 provider 覆盖

否决，因为它保留双重所有权，并可能产生所选适配器或模型不支持的
组合。

### 只从 pi 保留 thinking 兼容性

否决，因为它会继续丢弃上下文、输出、输入、定价和其他模型专属
字段。

### 拒绝未知模型 id

否决，因为这会违反产品的自由形式自定义 provider 策略，并把内置
目录变成封闭白名单。

## 参考

- `docs/spec/03-runtime/02-agent-runtime.md`
- `docs/spec/03-runtime/11-provider-model-system.md`
- `docs/spec/03-runtime/12-provider-config-schema.md`
- `docs/spec/03-runtime/13-model-catalog-and-selection.md`
- `docs/spec/04-ux/06-settings-ia.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `docs/spec/08-meta/decisions-log.md` (D136)
