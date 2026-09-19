# ADR 0114: 持久化 Provider 模型绑定与思考配置

- Status: Accepted
- Date: 2026-08-21
- Deciders: PI-Desktop core
- Updates ADR 0020 and ADR 0027

## 背景

provider studio 此前只存储一个 `defaultModelId`，并把上下文、输出
和思考能力的决策留在运行时/目录代码中。这使一个 provider 无法保
留多个模型的设置，并使自定义模型与未配置的默认值无法区分。新的
provider 对话框需要选择多个模型、为每个模型保留独立的限制，并允
许用户显式启用或禁用思考级别。

## 决策

`ProviderPublic`、`ProviderCreateInput` 和 `ProviderUpdateInput` 暴
露一个 `models: ModelBinding[]` 字段。一个绑定包含：

```ts
type ModelBinding = {
  id: string
  contextWindow: number
  maxTokens: number
  thinkingLevels: ThinkingLevel[]
  defaultThinkingLevel: ThinkingLevel | null
}
```

Rust host-core 将该数组持久化在 `providers.config_json.models` 下，
这使 provider 专属设置保持为新增性质，并留在现有的存储所有者
内。`default_model_id` 保留为兼容字段，并在新写入时镜像第一个绑
定。当前会话继续解析第一个绑定；未来的会话模型选择器可以选择另
一个绑定。

内置 pi-ai 目录对已知模型元数据保持权威。设置 UI 使用它的上下文
窗口、最大输出、推理标志和思考级别映射作为初始值，但把用户编辑
写入绑定。未知的自定义模型使用 128,000 上下文、8,192 最大输出、
无思考级别和 null 默认值。模型创建后可以手动启用思考。

## 迁移与兼容性

当存储的 provider 没有 `config_json.models` 数组时，host-core 用自
定义回退值从 `default_model_id` 实体化一个绑定。实体化的绑定由
`providers.list` / `providers.get` 返回；下一次 provider 创建/更新
会写入新数组。现有客户端可以继续发送或读取 `defaultModelId`，且
Electron 主进程在解析运行时模型时先回退到 `models[0]?.id`，再到
遗留字段。

## 后果

- 多个模型配置在重启和 provider 编辑后存活。
- 思考级别回退是确定性的：规范顺序为
  `off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`。
- 空的思考支持由 `thinkingLevels: []` 和
  `defaultThinkingLevel: null` 表示，而不是伪造的 `off` 选择。
- provider 存储契约以新增方式变更，无需新的 SQLite 表或迁移版
  本。
- 会话模型切换和路由策略明确保持在范围之外；第一个绑定是当前的
  运行时默认值。
