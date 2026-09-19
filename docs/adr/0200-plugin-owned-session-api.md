# ADR 0200: 宿主拥有的插件会话导入与所有权 API

- Status: Accepted
- Date: 2026-09-09
- Decision: D367

## Context

插件需要迁移和检查来自外部工具的对话历史。现有的
`session.getLlmContext` API 有意限于进行中的工具调用，而核心的
`session.import` 边界接受宿主会话摘要并可绑定项目。复用其中任何
一种形态都会让插件能够选择核心会话身份，或在其所有权边界之外创建
项目记录。

## Decision

为插件拥有的导入会话添加独立的 P0/P1 `pi.session` 域：

- `import`、`importBatch`、`list`、`get`、`listMessages`、`rename`
  和 `delete` 通过新的插件权限和增量式宿主 RPC 方法暴露。
- manifest 声明 `contributes.sessionSources`。Electron 权限网关在
  宿主派发之前拒绝未声明的来源。
- host-core 生成会话、消息和内部工具调用 id。幂等键是
  `session_import_origins` 中的 `(pluginId, source, externalId)`；
  插件只能查询或修改自己的行。
- 导入的会话默认没有活动的 project/provider/model 绑定。ADR 0201
  添加了显式的宿主创建 project-id 可选加入；原始值作为历史 JSON
  保留以供检查，不作为实时的授权或执行配置使用。
- `trash` 软删除并隐藏一行，同时保留其 transcript 和来源；`purge`
  级联删除该行并移除 transcript 文件。对已 trash 的行执行 purge
  对其所属插件仍然可用。
- 宿主和 Electron 运行时强制有界的内容、工具值、载荷深度、消息/
  批次大小、严格时间戳、保留键清洗，以及每个插件的滚动导入/删除
  限额。
- P2/P3 操作（会话创建、消息修改、绑定、批量删除和标签）保持推迟，
  不以权限形式表示。

Schema v14 添加 `sessions.deleted_at` 和来源 sidecar。JSON-RPC 协议
保持 v11，因为这些方法是增量式的，且只有 Electron 主进程能提供可信
的插件 id。

## Consequences

插件 API 可以安全地支持外部历史迁移，而不暴露 SQLite、transcript、
宿主 id 或其他插件的会话。存储层获得一次迁移和一个软删除状态，
常规核心会话列表必须排除该状态。未来的 P2/P3 工作必须扩展此所有权
模型，而不是复用核心会话导入器。

## Verification

覆盖范围包括 manifest/来源校验、运行时权限与载荷检查、宿主幂等性、
批次跳过/回滚语义、所有权过滤、list/get/rename、消息分页/截断、
工具保留键清洗、trash 到 purge 生命周期、兼容迁移的 schema 创建，
以及速率限制。按照仓库策略，完整的 UI E2E 执行仍然推迟；场景
E2E-214 和 E2E-215 已记录在 E2E 计划中。
