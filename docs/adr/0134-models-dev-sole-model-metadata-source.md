# ADR 0134: 使用 models.dev 作为唯一的模型元数据来源，并附带本地快照

- Status: Accepted
- Date: 2026-08-29
- Deciders: PI-Desktop core
- Amends: ADR 0027, ADR 0133, D136, D266

## 背景

第一版 models.dev 集成仍在 pi-ai 中保留了第二条模型元数据路径。这
使一次包升级或一条 provider 专属的 pi 记录有可能改变 PI-Desktop
展示并发送给 sidecar 的模型名称、能力、限额、推理级别、输入模式或
价格。它也没有持久化完整的公开 models.dev 文档，因此模型更新依赖
进程保持在线。

models.dev 提供的记录发布的内容不止上下文和输出限额：还包括模型
描述、家族、附件、推理选项、工具和结构化输出支持、温度支持、知识/
发布元数据、输入/输出模态、权重、状态、交错、限额和成本层级。这些
字段需要一个稳定的持有者和一个本地离线快照。

## 决策

`https://models.dev/api.json` 是唯一的模型元数据/配置来源。

1. Electron 主进程在开发环境从 `resources/models.dev/api.json` 读取
   打包的公开文档，在打包构建中从 `<resources>/models.dev/api.json`
   读取。该文件是仓库/发布产物的一部分，而不是用户数据目录。
2. `scripts/release.mjs <version> --tag` 获取
   `https://models.dev/api.json`，校验它，原子地替换已签入的资源，
   并在打 tag 之前把该文件包含进发布提交。
3. 启动时，Electron 在无网络 I/O 的情况下读取打包快照。
   Settings → Model configuration 暴露 **Refresh model catalog**，
   它总是重新获取该 URL 并为当前进程替换内存快照；它绝不写入打包
   文件或用户缓存。
4. 解析器把所有受支持的 models.dev 字段映射到既有的 `ModelInfo`
   和 sidecar `ModelConfig`：`id`、`name`、`description`、`family`、
   `attachment`、`reasoning`、`reasoning_options`、`tool_call`、
   `structured_output`、`temperature`、`knowledge`、`release_date`、
   `last_updated`、`modalities.input/output`、`open_weights`、
   `limit.context` / `input` / `output`、含 audio/reasoning/cache/
   tier 价格的 `cost`、`interleaved`、`status`、`experimental` 和
   `provider`。Provider/model 匹配接受配置的 vendor key、归一化
   API URL、目录 provider 身份和无歧义的 vendor 前缀 ID；未加前缀
   的配置 ID 可以匹配 `vendor/model` 形式的目录 ID，而不改变用户
   可见的 ID。
5. 运行时把 models.dev 的 `ModelConfig` 传给 pi-ai 选定的线上适配器。
   pi-ai 仅作为请求序列化、OAuth 登录/账户可用性和流处理的实现
   依赖；其内置模型目录和模型能力函数不再被查询。
6. 不在 models.dev 中的模型仍可通过显式的通用文本模型形态运行，
   带保守限额且不声明推理/视觉能力。provider `/models` 发现和经
   认证的 OAuth 可用性仍提供 models.dev 未列出的 ID，但它们无法
   凭空创造元数据。

models.dev 推理映射保留与规范级别匹配的 `effort` 值
（`none` → `off`），把 `toggle`/`budget_tokens` 映射为 `off` +
`medium`，并在推理记录没有可用级别列表时使用
`low`/`medium`/`high`。输入和输出模态数组保留 `text`、`image`、
`audio`、`video` 和 `pdf`；当前文本 agent 选择器排除不能接受和
产出文本的模型，而原始打包快照保留这些记录供未来的界面使用。图片
附件使用 pi-ai 支持的临时图片块；PDF 能力从目录呈现，但在有原生
PDF 块的传输可用之前，PDF 文件仍是有界的文件引用。

## 后果

- 模型元数据有一个权威来源，并可从已签入的发布资源离线复现。
- 每次发布在打 tag 之前刷新目录，不需要数据库或 host-core schema
  迁移。
- 设置可以为当前进程立即获取更新的快照；下次应用启动会回到打包的
  发布快照，直到新的发布交付。
- Provider 绑定仍是用户持有的选择/覆盖；目录持有已发布的模型语义，
  通用回退持有未知 ID。
- models.dev 故障会保留最近的本地快照、provider 端点发现和显式
  自定义 ID。
- models.dev schema 的变更在发布前需要解析器 fixture 和源码/运行时
  契约测试。

## 备选方案

### 保留 pi-ai 作为模型元数据回退

否决：这会制造第二个权威，并允许包更新静默改变用户选择的模型配置。
它仅保留用于传输和 OAuth。

### 保留用户数据快照

否决：发布产物必须可复现，而用户缓存会让不同安装使用不同的模型
配置。设置刷新在下一次发布之前有意保持进程本地。

### 只在 provider 对话框打开时获取

否决：模型能力状态也被 Composer 和运行时启动需要；打包的发布快照
给所有界面一个确定性的基线。设置刷新仍是显式的远程操作。

## 参考

- `scripts/release.mjs` (release-time catalog refresh)
- `apps/desktop/resources/models.dev/api.json` (bundled snapshot)
- `apps/desktop/electron/main/models-dev-catalog.ts` (catalog parsing and refresh)
- `apps/desktop/electron/main/index.ts` (main-process loading and IPC)
- `apps/desktop/src/components/settings/ModelConfigPage.tsx` (settings refresh action)
- `packages/agent-runtime/src/model-capabilities.ts`
- `packages/agent-runtime/src/provider-binding.ts`
- `docs/spec/03-runtime/11-provider-model-system.md`
- `docs/spec/03-runtime/12-provider-config-schema.md`
- `docs/spec/03-runtime/13-model-catalog-and-selection.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-066, E2E-080, E2E-154)
