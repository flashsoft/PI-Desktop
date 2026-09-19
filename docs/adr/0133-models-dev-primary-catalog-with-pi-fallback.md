# ADR 0133: 使用 models.dev 作为主要模型目录，pi-ai 作为回退

- Status: Superseded by ADR 0134
- Date: 2026-08-29
- Deciders: PI-Desktop core
- Amends: ADR 0027, D136, D243

## 背景

PI-Desktop 锁定的 `@earendil-works/pi-ai` 包提供高质量的运行时
适配器和一个有用的内置模型目录，但其模型覆盖面和发布节奏并不代表
当前完整的市场。因此 provider 设置无法可靠地从目录提供用户期望的
当前模型名称、限额、模态或能力标志。

应用已经具备主进程的模型发现路径和一个 Rust 持有的按 provider
缓存。模型元数据必须留在渲染进程之外，provider 凭据不得发送给目录
服务，且当没有公共目录认识自定义/本地 provider 时它们必须保持可用。

## 决策

使用 `https://models.dev/api.json` 作为主要远程模型目录。

1. Electron 主进程以有界超时获取该固定 URL，并只解析 PI-Desktop
   需要的 provider/model 字段。渲染进程绝不获取该 URL，请求中也不
   携带任何 API 密钥、OAuth token 或其他 provider 凭据。
2. models.dev provider 先按配置的 `vendorKey` 匹配，其次按归一化的
   provider API URL 匹配。精确的模型 ID 匹配提供 `ModelInfo` 和
   运行时模型配置所使用的显示名、上下文/输出限额、输入模态、价格
   提示、推理选项、工具调用标志和结构化输出标志。
3. 已配置模型的目录优先级为：
   `models.dev` → `pi-ai` → provider 端点发现 → 通用默认值。
   锁定的 pi-ai 目录仍是 models.dev 记录不可用或缺失时的回退，并在
   models.dev 没有等价物时提供适配器专属的兼容性数据。provider 端点
   发现对自定义和账户专属的模型 ID 保持可用。
4. 既有的 `ModelBinding` 仍是所选 provider/model 的显式用户配置。
   目录数据提供默认值和能力元数据；对绑定的编辑继续控制其配置的
   限额和启用的推理级别。
5. 远程快照在每个 Electron 进程中最多加载一次，除非未来有显式的
   刷新策略取代它。获取失败会保留任何成功的内存快照并直接落空，
   而不清除 Rust 持有的 provider 缓存。既有的 provider 缓存存储其
   当前的归一化字段；主进程用最新目录重新装饰缓存行。
6. `ModelInfo.catalogSource` 只是面向渲染进程的标注。它记录
   `models.dev` 或 `pi-ai`，不改变宿主 RPC/存储 schema，也不持久化
   原始远程文档。

models.dev 的推理选项映射到 PI-Desktop 的规范级别：可识别的 effort
值被保留（`none` 变为 `off`）；开关和 token 预算选项用 `off` 加
`medium` 作为启用代表；没有级别列表的推理记录使用保守的
`low`/`medium`/`high` 集合。输入或输出模态不是文本的条目不在文本
agent 的模型选择器中提供。

## 后果

- 设置和 Composer 可以使用当前的广泛 provider/model 目录，而不需要
  在应用中携带大型静态矩阵。
- 通过缓存的 provider 行、pi-ai 的内置目录、provider 发现和自由
  输入的模型 ID，离线和目录不可用时的运行仍然可能。
- 远程目录可以独立于应用发布更新名称和限额，因此需要基于 fixture
  的解析器和优先级测试。
- models.dev 不定义 provider 的线上适配器。所选 API 风格和 pi-ai
  兼容性数据仍然决定请求序列化；目录条目无法为未知 ID 授予不受
  支持的传输或图片能力。
- 远程目录故障不是致命的，且不得抹掉用户选择的绑定或凭据。

## 备选方案

### 保持 pi-ai 作为唯一目录

否决，因为其原生目录更窄，市场覆盖可能落后于 models.dev，尽管它
仍是最好的本地回退和适配器来源。

### 在渲染进程中获取 models.dev

否决，因为目录加载属于 Electron 主进程，保持一个网络边界，并避免
把 provider 凭据或远程响应处理与渲染进程状态混在一起。

### 完全替换 provider 发现

否决，因为自定义/本地端点和经过认证的厂商目录可能暴露公共目录中
没有的模型。发现机制仍是这些情况下的回退。

## 参考

- `apps/desktop/electron/main/models-dev-catalog.ts`
- `apps/desktop/electron/main/index.ts`
- `packages/agent-runtime/src/model-capabilities.ts`
- `docs/spec/03-runtime/11-provider-model-system.md`
- `docs/spec/03-runtime/12-provider-config-schema.md`
- `docs/spec/03-runtime/13-model-catalog-and-selection.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md` (E2E-066, E2E-080, E2E-154)
