# ADR 0095: 用厂商账号登录代替粘贴 API key

- Status: Accepted for implementation
- Date: 2026-08-18
- Deciders: PI-Desktop core
- Related: D237, D240, ADR 0098, D028, D031, ADR 0012, ADR 0020, ADR 0027

## 背景

provider 行此前只有一种认证方式：用户粘贴 API key，host-core 将其
加密存储在 `secret:provider:<id>:api_key` 下，Electron 主进程在每
次启动时读回明文，使 sidecar 可以用固定的
`{ auth: { apiKey } }` 为请求签名。已经为厂商订阅付费的用户——
Claude Pro/Max、ChatGPT Plus/Pro、GitHub Copilot——必须另外购买
API 额度才能使用 PI-Desktop。

`@earendil-works/pi-ai` 已经提供了协议侧所需的一切：七个 OAuth
流程、一个 `CredentialStore` 契约和带锁的 token 刷新。它没有提供
的是宿主那一半——它自己的 `auth/types.d.ts` 写明"The app
persists a credential after login via `modify(...)`. Login/logout
orchestration is app-owned."PI-Desktop 此前没有这一半。

两个性质使这不只是多一个设置字段。厂商访问令牌约一小时过期，因
此在启动时解析一次的凭据会在会话中途变陈旧。而刷新令牌比 API
key 危险得多：它可以按需铸造新凭据，因此现有的"启动时读取密钥
并交给 sidecar"模式对它不可接受。

## 决策

1. **凭据是同一个 provider 行上的第二个密钥。** OAuth 凭据序列化
   为 JSON，通过现有的加密密钥存储存放在
   `secret:provider:<id>:oauth` 下，与——绝不代替——
   `secret:provider:<id>:api_key` 并列。`has_secret` 的含义拓宽为
   "拥有任一凭据"，因此渲染进程中的每个就绪检查无需改动即可继续
   工作；新的 `has_oauth` 用于区分两者，以驱动角标和隐藏 key 输
   入框。`auth_kind` 新增取值 `oauth`；它本来就是自由字符串，因
   此宿主协议版本和存储 schema 都不变。

2. **登录编排位于 Electron 主进程的 `oauth.ts`。** 它在
   host-core 的 `secrets.*` RPC 之上实现 `CredentialStore`，按
   provider 串行化 `modify`，使 pi-ai 的带锁刷新假设成立，并通过
   `pi-desktop/providers/oauth/*` 下的五个新 invoke 通道和一个事
   件通道把 pi-ai 的 `AuthInteraction` 桥接为渲染进程事件。浏览
   器回调、设备码、选择和粘贴验证码步骤都是同一个事件流，因此
   渲染进程渲染的是厂商要求的东西，而不是按厂商编写的脚本；取
   消会中止本地回调服务器或轮询循环。

3. **厂商列表是派生的，不是枚举的。** 卡片来自
   `models.getProviders().filter(p => p.auth.oauth)`，因此第一天就
   支持全部七个厂商，且 pi-ai 中新增或移除流程的厂商无需此处改
   动。因为 `auth/oauth/load.js` 通过变量说明符的动态 import 加
   载流程——一条 electron-vite 无法打包的路径——主进程在启动时
   调用一次 `registerBunOAuthFlows()` 以静态注册它们。

4. **sidecar 按请求解析认证，且永远看不到刷新令牌。** OAuth 行
   的启动负载携带 `apiKey: ""`。运行时注入一个 `resolveAuth` 回
   调，调用新的宿主代理方法 `provider.resolveAuth`；该方法由主进
   程自己应答，绝不转发给 host-core。主进程根据它在每次启动时重
   写的绑定表校验 `(sessionId, providerId)` 对，拒绝其他任何请
   求。应答是短命的 `ModelAuth` —— `apiKey`、`headers`、
   `baseUrl` —— pi-ai 直接透传，因此 Copilot 的按账号端点和
   Kimi 的仅头部认证都无需特例。pi-ai 在每次流式调用时调用
   `getAuth` 且不缓存任何东西，只在过期后于存储锁下刷新，因此
   这既正确又廉价。

5. **厂商行的身份跨轮次保持稳定。** `matches()` 比较 provider
   行，其 `apiKey` 恒为 `""`；每次启动新建的 `resolveAuth` 闭
   包是函数属性，经 `JSON.stringify` 后消失。因此 OAuth 会话复用
   其温热的运行时，而不是每小时或每轮重建一次。

6. **模型发现和连接测试经由账号进行。** 对 OAuth 行，
   `providers.listModels` 读取已认证的目录（`models.getAvailable`，
   它应用厂商自己的 `filterModels`，因此 Copilot 显示订阅实际包
   含的内容），而不是用它没有的 key 去探测 `/models`；连接测试
   通过解析认证来证明账号有效。登录在行配置中存储一个非秘密的
   账号标签，并从所选模型决定该行的 `apiStyle`——一个厂商可能
   跨多种线路 API。原来"一个厂商一行"的假设被 ADR 0098 修订：
   现在每次登录都创建独立的行和凭据作用域。为此新增了两种样
   式：`openai_codex_responses` 和 `pi_messages`。

## 后果

- 订阅用户从设置 → 模型配置登录并正常选择模型；七个受支持的厂
  商都不需要 API 额度。
- 权限边界收紧而非放宽。sidecar 此前无条件收到一个长期有效的
  API key；对厂商行它现在只收到一个可撤销的、约一小时有效的令
  牌，且仅针对其会话绑定的那个 provider，完全没有刷新令牌。
- 厂商登录依赖主进程存活以应答 `provider.resolveAuth`；轮次中途
  的宿主或主进程重启会让请求失败，而不是用陈旧令牌签名，这正是
  预期的失败方向。
- API key 行不受影响：相同的存储、相同的启动负载、相同的解析
  路径。两种凭据类型保持在同一个 provider 存储域中；每个 OAuth
  账号拥有自己的 provider 行和密钥引用（ADR 0098）。

## 替代方案

- **在启动时解析一次凭据并放入负载。** 被拒绝：Codex 令牌约一小
  时过期，长会话会在轮次中途断掉；刷新会改变负载并使 `matches()`
  每轮都不命中，从而重建运行时并丢弃温热状态；而且它会把一个用
  户从未输入的令牌放进运行模型指导代码的进程。
- **把凭据存储交给 sidecar，让 pi-ai 在进程内刷新。** 被拒绝：那
  会把刷新令牌——持久性秘密——交给最不被信任的进程，并违背现
  有的宿主代理白名单规则：sidecar 不得能够拉取密钥或修改配置。
- **把 OAuth 凭据存入新的专用表或文件。** 被拒绝：加密密钥存储
  已经提供了恰好需要的保证，第二个后端需要自己的生命周期、删除
  路径和审计。
- **先发布两三个厂商。** 被拒绝：列表派生自 pi-ai 的目录，限制
  它意味着写一个硬编码白名单——更多代码换来更少覆盖。

## 参考

- `docs/spec/03-runtime/11-provider-model-system.md`
- `docs/spec/03-runtime/12-provider-config-schema.md`
- `docs/spec/03-runtime/14-secrets-storage.md`
- `docs/spec/03-runtime/01-ipc-protocol.md`
- `docs/spec/06-delivery/04-e2e-test-plan.md`
- `apps/desktop/electron/main/oauth.ts`, `apps/desktop/electron/main/agent-sidecar.ts`
- `packages/agent-runtime/src/provider-binding.ts`
- `crates/host-core/src/secrets.rs`, `crates/host-core/src/providers.rs`
- Decision D237, D028, D031
