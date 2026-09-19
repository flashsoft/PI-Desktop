# ADR 0259：插件声明的 provider 是 Host 持有的行

- Status: Accepted for implementation
- Date: 2026-09-15
- Decision: D427
- Related: ADR 0011, `07-plugins/02-plugin-manifest-schema.md`, `07-plugins/13-plugin-permissions-matrix.md`, `03-runtime/04-data-storage.md`, `03-runtime/12-provider-config-schema.md`

## 背景

集成 LLM 服务的插件今天有两个界面：agent 工具，或通过受信任扩展 API
（ADR 0258）注册的 session 作用域 agent 实现。两者都不会把该服务放入
原生 provider 列表，因此用户无法为 session 选择它，插件最终会在 Host
的注册表旁维护一个私有的 provider 注册表。

Host 是 provider 行、provider 凭据、模型目录缓存和 Settings provider
列表的唯一所有者。在插件侧注册表中复制该状态会让同一服务拥有两个身份
和两个生命周期，并会把用户安装的服务从管理其他所有端点的设置界面中
隐藏。

所有权是需要决策的部分：provider 行不再只是「用户的」，Host 必须能够
分辨它是谁的行。

## 决策

1. 在插件 manifest 中新增 `contributes.providers[]`。条目形态由
   `07-plugins/02-plugin-manifest-schema.md` §5.4 固定：`id`、必需的
   `name`、可选的 `vendorKey`、`baseUrl`、`apiStyle`、`authKind`，以及
   1..64 个 `models`。
2. Host 把每个声明物化为 `providers` 中的真实行，而不是插件侧注册表。
   行 id 是 `plugin:<pluginId>:<declaredId>`，由该插件拥有，并出现在原生
   Settings → Provider 列表中，因此可以像任何用户创建的行一样为
   session 选择。
3. Schema v17 新增可空的 `providers.owner_plugin_id` 列及其部分索引。
   迁移是增量的：每个 v17 之前的行都是用户行，保持 NULL 所有者。公共
   provider 载荷携带 `ownerPluginId`。
4. 声明在每次插件加载时从 manifest 重新读取，并对其声明的字段（name、
   vendorKey、baseUrl、authKind、apiStyle、models）具有权威性。声明不
   拥有的值——存储的 header 和 OAuth 账户标签——在刷新间保留。
5. 凭据留在 Host 密钥存储中，使用与任何 provider 相同的引用：
   `secret:provider:<id>:api_key` 和 `secret:provider:<id>:oauth`。插件
   既不持有也不导出凭据，该行对模型解析、发现和连接测试而言是普通
   运行时行。
6. 用户路径拒绝插件持有的行。`providers.update` 和 `providers.delete`
   以 `PROVIDER_OWNED_BY_PLUGIN` 错误失败，因为 manifest 声明会在下一
   次加载时覆盖用户编辑，且只有插件自己的生命周期能决定该行已消失。
7. 禁用插件保留其行并设置 `enabled = 0`，因此重新启用会恢复用户已存
   储的凭据。卸载插件或从声明中移除条目会连同两个凭据引用一起删除
   该行，因此之后的重新声明绝不能继承陈旧的 token。
8. 非空声明需要新的高风险 `provider.register` 权限。没有它而声明
   provider 的 manifest 校验失败，权限矩阵和 manifest schema 记录该
   授权。
9. 对账在 `plugins.enable`、`plugins.disable`、`plugins.loadDev`、
   `plugins.uninstall` 时运行，并在宿主启动时为每个已注册插件运行一
   次。provider 同步失败记录为警告；绝不改变插件启用状态。
10. OAuth 是分阶段的，尚未发布：`oauth` 块或 `authKind: "oauth"` 在
    manifest 校验时被拒绝（`plugin OAuth providers are not supported in
    this release` / `unsupported authKind oauth`），因为 Host 没有插件
    OAuth 登录流程。`provider.oauth` 权限和 Host 持有的登录流程是未来
    工作，今天不可用。
11. 插件 SDK 镜像相同的编写时规则，要求相同的权限，并为插件行派生
    `providers` 能力 token。

## 后果

- 插件提供的服务是一等 provider：它通过与用户行相同的 Host 路径列出、
  发现模型和解析，无需新的线上适配器。
- Provider 行现在有所有者，因此每个改变行的 Host 路径必须尊重
  `owner_plugin_id`；用户路径不能再假定它拥有正在编辑或删除的行。
- 未经审查的 manifest 可以向用户的 provider 列表添加行。高风险权限、
  安装确认，以及 v1.1 的本地导入和开发插件限制约束了这种暴露。
- 凭据的持久性与声明相同：从 manifest 移除条目或卸载插件会删除已存
  储的 key 或 token。
- 插件侧界面被刻意收窄（没有 OAuth、没有插件持有的 header、没有用户
  编辑），因此行无法成为绕过 provider 配置 schema 的可写侧通道。
- v15→v16 的 session 协作步骤现在盖上自己的版本 `16` 而不是最新的
  schema 常量，因此 v15 文件可以在一次启动中走完 v15→v16→v17。

## 已考虑的替代方案

### 仅 sidecar 的 provider 注册表

被拒绝：同一服务会存在两次，带有 UI、模型目录缓存、session 绑定和
Host 密钥存储无法寻址的私有身份。只有插件自己的面板能选择它，而每个
遍历 `providers` 的 Host 功能——默认模型、子 Agent 目录、连接测试、
模型发现——都需要第二条代码路径。

### 让插件通过 `providers.create` 写 provider 行

被拒绝：插件宿主不是第二个 provider 作者。它必须持有 provider 写权限，
用户自己的编辑和声明会在每次加载时争夺同一行，而且行不会绑定到插件
生命周期，因此卸载会留下孤儿。Manifest 声明加 Host 对账保持所有权显式，
且插件写路径是单向的。

### 把插件 provider 存储在数据库之外

被拒绝：插件数据目录中的 JSON 文件无法参与 provider 行所锚定的关系
状态。模型目录缓存、session provider/model 绑定、凭据元数据和审计行
都引用 `providers.id`；文件还会把 provider 身份移出单一写入者存储
（ADR 0011），并使 Settings 列表依赖于插件文件是否可读。
