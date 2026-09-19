# ADR 0098: 将每个厂商 OAuth 账号视为独立的 provider 行

- Status: Accepted for implementation
- Date: 2026-08-18
- Deciders: PI-Desktop core
- Related: D240, ADR 0095, D027, D028, D031

## 背景

厂商账号的第一个实现把 pi-ai 厂商 id 用作本地身份。Electron 主进
程为每个厂商保留一个 provider 行 id 和一个 `CredentialStore`，因
此第二次登录只能复用第一个账号。渲染进程还在 AI provider 列表中
显示 OAuth 行，而另一个独立的"厂商账号"卡片管理着同样的行。它
的退出登录操作清除了凭据但留下了 provider 行，使两个界面产生分
歧。

多账号是真实需求：一个用户可能为同一个厂商拥有分开的个人、工作
或团队订阅。账号边界也必须是安全边界，因为刷新令牌和访问令牌绝
不得从一个账号跨越到另一个账号。

## 决策

1. **provider 行 id 就是账号身份。** 每次成功登录都从一个新的
   `authKind: "oauth"` provider 行开始，即使另一行具有相同的
   `vendorKey`。其 OAuth 凭据只存储在
   `secret:provider:<providerId>:oauth`。
2. **每个账号获得一个限定作用域的 pi-ai 集合。** Electron 主进程
   为每个 provider 行创建一个 `MutableModels` 实例和一个
   `CredentialStore`。该存储只在该实例内接受内置厂商 id，并将其
   翻译为行专属的密钥引用。刷新串行化按行 id 键控，因此并发账号
   无法对彼此的令牌做读-改-写。
3. **厂商账号拥有 OAuth 行的生命周期。** 厂商账号卡片列出每个本
   地账号，允许重复选择厂商选择器，并通过 `providers.delete` 移除
   账号。因此 host-core 会一并清除行、OAuth 密钥、API key 密钥和
   密钥元数据。没有凭据的陈旧行保持可见并显示为 `Needs sign-in`，
   直到用户移除它。
4. **AI 服务和厂商账号是分开的设置界面。** AI 服务列表只包含
   API key 和自定义/无认证服务。已连接的 OAuth 行仍可供默认模型
   选择器和运行时使用，但只能在厂商账号中编辑和删除。
5. **运行时绑定端到端使用 provider id。** sidecar 绑定表只存储会
   话允许的 OAuth provider 行 id。其 `provider.resolveAuth` 请求针
   对该集合校验，主进程解析对应的行作用域集合。厂商 key 绝不在
   sidecar 边界被用作有歧义的账号查找。
6. **有歧义的子代理别名关闭失败。** 子代理固定配置可以使用精确
   的 provider id。厂商/名称别名只有在解析到恰好一个 provider 行
   时才被接受；重复的厂商账号要求精确的行 id，而不是静默选择第
   一个账号。

## 后果

- 账号列表可以为同一厂商包含多行，并用稳定的序号为重复行加注标
  签以便扫读。
- 移除被选为默认的账号会清除默认值或将其修复为第一个剩余的就绪
  provider。
- 现有 OAuth 行在升级后仍可读；下一次登录会创建新行，而不是修
  改现有行。
- IPC 宿主协议和 SQLite schema 不需要新表或新版本。渲染进程使用
  Electron 主进程的 `providers/oauth/delete` invoke 通道，它委托给
  现有的宿主 provider 删除契约。

## 替代方案

- **每个厂商保留一个共享凭据并添加账号标签。** 被拒绝：凭据存储
  和 pi-ai 模型集合是按厂商键控的，一个账号会覆盖或刷新另一个账
  号。
- **把 OAuth 行保留在通用 AI 服务列表中。** 被拒绝：它为同一个对
  象呈现两个所有者，并使删除语义不清晰。
- **移除账号时只清除 OAuth 密钥。** 被拒绝：它会留下一个不可用
  的 provider 行、陈旧的默认身份和一个误导性的服务条目。

## 参考

- `docs/adr/0095-vendor-account-oauth-login.md`
- `docs/spec/03-runtime/11-provider-model-system.md` §8a and §17
- `docs/spec/03-runtime/12-provider-config-schema.md` §3 and §9
- `docs/spec/03-runtime/01-ipc-protocol.md` vendor accounts
- `docs/spec/04-ux/06-settings-ia.md` Model configuration
- `docs/spec/06-delivery/04-e2e-test-plan.md` E2E-151
- `apps/desktop/electron/main/oauth.ts`
- `apps/desktop/electron/main/agent-sidecar.ts`
